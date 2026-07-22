import { prisma } from "@/lib/prisma";
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

export interface ConsolidationRosterEntry {
  id: string;
  full_name: string;
  reportId: string | null;
  status: string | null;
}

export interface ConsolidationPreview {
  // Every recruiter (or, for the inhouse tier, the one country supervisor
  // — portfolio-of-one) in scope, cross-referenced against whether they
  // have a report for this exact period — so the supervisor can see who's
  // missing before deciding whether to submit now or wait.
  roster: ConsolidationRosterEntry[];
  verifiedReportIds: string[];
  alreadyConsolidated: boolean;
  content: {
    executive_summary?: string;
    kpis: ReportContentRow[];
    issues: ReportContentRow[];
    achievements: ReportContentRow[];
    priorities: ReportContentRow[];
  };
}

const CHILD_ROLE_BY_SCOPE: Record<string, "regional_recruiter" | "country_supervisor"> = {
  recruiter: "regional_recruiter",
  country: "country_supervisor",
};

/**
 * Supervisor/In-House-initiated preview for a weekly or monthly
 * consolidated report (Supervisory Reporting Framework §4.2/§4.3, §5.2/
 * §5.3): given a type + exact period, finds the matching source reports
 * (recruiter-scope for a country report, country-scope for a portfolio
 * report) and computes what the consolidated content *would* look like
 * from the verified ones — without writing anything. The supervisor
 * reviews this, fills in whatever manual-only fields the framework
 * requires, and submits explicitly (POST /api/reports with
 * child_report_ids) — there is no automatic/background submission.
 */
export async function buildConsolidationPreview(
  childScopeLevel: ScopeLevel,
  parentScopeLevel: ScopeLevel,
  countryId: string,
  type: ReportCycle,
  periodStart: Date,
  periodEnd: Date
): Promise<ConsolidationPreview> {
  const [siblings, roster] = await Promise.all([
    prisma.report.findMany({
      where: { scope_level: childScopeLevel, country_id: countryId, type, period_start: periodStart, period_end: periodEnd },
      select: { id: true, status: true, content: true, submitted_by: true, submitter: { select: { full_name: true } } },
    }),
    prisma.user.findMany({
      where: { role: CHILD_ROLE_BY_SCOPE[childScopeLevel], assigned_country_id: countryId },
      select: { id: true, full_name: true },
      orderBy: { full_name: "asc" },
    }),
  ]);

  const verified = siblings.filter((r: (typeof siblings)[number]) => r.status === "verified");

  const alreadyConsolidated = await prisma.report.findFirst({
    where: { scope_level: parentScopeLevel, country_id: parentScopeLevel === "inhouse" ? null : countryId, type, period_start: periodStart, period_end: periodEnd },
    select: { id: true },
  });

  const reportBySubmitter = new Map<string, (typeof siblings)[number]>(siblings.map((r: (typeof siblings)[number]) => [r.submitted_by, r]));

  return {
    roster: roster.map((u: (typeof roster)[number]) => {
      const report = reportBySubmitter.get(u.id);
      return { id: u.id, full_name: u.full_name, reportId: report?.id ?? null, status: report?.status ?? null };
    }),
    verifiedReportIds: verified.map((r: (typeof verified)[number]) => r.id),
    alreadyConsolidated: !!alreadyConsolidated,
    content: {
      executive_summary: verified
        .map((r: (typeof verified)[number]) => (r.content as ReportContent).executive_summary)
        .filter(Boolean)
        .join(" "),
      kpis: mergeKpis(verified as { content: ReportContent }[]),
      issues: taggedRows(verified as { content: ReportContent; submitter: { full_name: string } }[], "issues"),
      achievements: taggedRows(verified as { content: ReportContent; submitter: { full_name: string } }[], "achievements"),
      priorities: taggedRows(verified as { content: ReportContent; submitter: { full_name: string } }[], "priorities"),
    },
  };
}

export async function previewCountryConsolidation(countryId: string, type: ReportCycle, periodStart: Date, periodEnd: Date) {
  return buildConsolidationPreview("recruiter", "country", countryId, type, periodStart, periodEnd);
}

export async function previewInhouseConsolidation(countryId: string, type: ReportCycle, periodStart: Date, periodEnd: Date) {
  return buildConsolidationPreview("country", "inhouse", countryId, type, periodStart, periodEnd);
}
