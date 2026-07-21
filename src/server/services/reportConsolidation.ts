import { prisma } from "@/lib/prisma";
import { auditedPrisma } from "@/lib/audit";
import type { ReportCycle, ScopeLevel } from "@prisma/client";

// Mirrors src/lib/validations.ts's reportContentSchema — a local, loosely
// typed shape (content is stored as Json) rather than importing the
// Zod-inferred type, matching this file's existing convention.
interface ReportContentRow {
  label: string;
  target?: number;
  actual?: number;
  comment?: string;
  detail?: string;
  action?: string;
  owner?: string;
  due_date?: string;
  status?: string;
  escalation?: boolean;
  evidence?: string;
  business_impact?: string;
  planned_activity?: string;
  target_measure?: string;
  support_required?: string;
}

interface ReportContent {
  executive_summary?: string;
  kpis?: ReportContentRow[];
  issues?: ReportContentRow[];
  achievements?: ReportContentRow[];
  priorities?: ReportContentRow[];
}

// Sums target/actual for matching KPI labels across a set of reports —
// used both for recruiter→country and country→inhouse roll-ups.
function mergeKpis(reports: { content: ReportContent }[]): ReportContentRow[] {
  const byLabel = new Map<string, ReportContentRow>();
  for (const r of reports) {
    for (const kpi of r.content.kpis ?? []) {
      const existing = byLabel.get(kpi.label) ?? { label: kpi.label, target: 0, actual: 0 };
      existing.target = (existing.target ?? 0) + (kpi.target ?? 0);
      existing.actual = (existing.actual ?? 0) + (kpi.actual ?? 0);
      byLabel.set(kpi.label, existing);
    }
  }
  return Array.from(byLabel.values());
}

// Concatenates a row-shaped section (issues/achievements/priorities)
// across reports, tagging each row with whose report it came from so the
// consolidated view doesn't lose attribution.
function taggedRows(reports: { content: ReportContent; submitter: { full_name: string } }[], key: "issues" | "achievements" | "priorities"): ReportContentRow[] {
  const out: ReportContentRow[] = [];
  for (const r of reports) {
    for (const row of r.content[key] ?? []) {
      out.push({ ...row, detail: row.detail ? `[${r.submitter.full_name}] ${row.detail}` : `[${r.submitter.full_name}]` });
    }
  }
  return out;
}

async function consolidate(
  childScopeLevel: ScopeLevel,
  parentScopeLevel: ScopeLevel,
  countryId: string,
  type: ReportCycle,
  periodStart: Date,
  periodEnd: Date,
  parentSubmitterRole: "country_supervisor" | "inhouse_supervisor"
): Promise<void> {
  if (type === "daily") return;

  const siblings = await prisma.report.findMany({
    where: { scope_level: childScopeLevel, country_id: countryId, type, period_start: periodStart, period_end: periodEnd },
    select: { id: true, status: true, content: true, submitter: { select: { full_name: true } } },
  });

  const verified = siblings.filter((r: (typeof siblings)[number]) => r.status === "verified");
  const stillPending = siblings.some((r: (typeof siblings)[number]) => r.status === "submitted");
  if (stillPending || verified.length === 0) return;

  const alreadyConsolidated = await prisma.report.findFirst({
    where: { scope_level: parentScopeLevel, country_id: parentScopeLevel === "inhouse" ? null : countryId, type, period_start: periodStart, period_end: periodEnd },
    select: { id: true },
  });
  if (alreadyConsolidated) return;

  const submitter = await prisma.user.findFirst({
    where: { role: parentSubmitterRole, assigned_country_id: countryId },
    select: { id: true },
  });
  if (!submitter) return;

  const typedVerified = verified as (typeof verified)[number][];
  const db = auditedPrisma(submitter.id);

  const parentReport = await db.report.create({
    data: {
      type,
      scope_level: parentScopeLevel,
      country_id: parentScopeLevel === "inhouse" ? null : countryId,
      submitted_by: submitter.id,
      period_start: periodStart,
      period_end: periodEnd,
      status: "submitted",
      content: {
        auto_consolidated: true,
        source_reports: typedVerified.map((r) => ({ id: r.id, submitter: r.submitter.full_name })),
        executive_summary: typedVerified
          .map((r) => (r.content as ReportContent).executive_summary)
          .filter(Boolean)
          .join(" "),
        kpis: mergeKpis(typedVerified as { content: ReportContent }[]),
        issues: taggedRows(typedVerified as { content: ReportContent; submitter: { full_name: string } }[], "issues"),
        achievements: taggedRows(typedVerified as { content: ReportContent; submitter: { full_name: string } }[], "achievements"),
        priorities: taggedRows(typedVerified as { content: ReportContent; submitter: { full_name: string } }[], "priorities"),
        pipeline: [],
        activity: [],
        competencies: [],
        // Auto-generated from already-verified sources — certified by
        // construction, same reasoning as the pre-existing auto-consolidation.
        certified: true,
      },
    },
    select: { id: true },
  });

  await prisma.report.updateMany({
    where: { id: { in: typedVerified.map((r) => r.id) } },
    data: { parent_report_id: parentReport.id, status: "consolidated" },
  });
}

/**
 * "Country supervisors submit weekly/monthly reports automatically after
 * consolidating from the recruiters' reports" — called after a recruiter
 * report is verified (PATCH /api/reports/:id/verify). Fires the country
 * report the moment no recruiter report for this exact type/period is
 * still awaiting review (some recruiters may never file for a given
 * period — e.g. leave — so this doesn't wait for every recruiter, only for
 * every *submitted* report to be resolved), and only if at least one was
 * actually verified. A daily report never auto-consolidates — recruiters'
 * daily notes stay a recruiter-to-supervisor channel.
 */
export async function maybeAutoConsolidate(countryId: string, type: ReportCycle, periodStart: Date, periodEnd: Date): Promise<void> {
  await consolidate("recruiter", "country", countryId, type, periodStart, periodEnd, "country_supervisor");
}

/**
 * Supervisory Reporting Framework §5 — an In-House Supervisor's own
 * weekly/monthly portfolio report auto-submits upward to Management/
 * Director once their (single, per the existing confirmed portfolio-of-
 * one scoping) country's report is verified — the same event-driven
 * pattern as recruiter→country above, not a background scheduler.
 */
export async function maybeAutoConsolidateToInhouse(countryId: string, type: ReportCycle, periodStart: Date, periodEnd: Date): Promise<void> {
  await consolidate("country", "inhouse", countryId, type, periodStart, periodEnd, "inhouse_supervisor");
}
