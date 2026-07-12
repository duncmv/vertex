import { prisma } from "@/lib/prisma";
import { auditedPrisma } from "@/lib/audit";
import type { ReportCycle } from "@prisma/client";

interface WeeklyContent {
  candidates?: unknown[];
  challenges?: string;
  performance_updates?: string;
}

interface MonthlyContent {
  summary?: { total?: number };
  challenges?: string;
  performance_updates?: string;
}

/**
 * "Country supervisors submit weekly reports automatically after
 * consolidating from the recruiters' weekly reports. Also submit monthly
 * reports consolidated from all the recruiters' reports" — called after a
 * recruiter report is verified (PATCH /api/reports/:id/verify). Fires the
 * country report the moment no recruiter report for this exact type/period
 * is still awaiting review (some recruiters may never file for a given
 * period — e.g. leave — so this doesn't wait for every recruiter, only for
 * every *submitted* report to be resolved), and only if at least one was
 * actually verified. A daily report never auto-consolidates — recruiters'
 * daily notes stay a recruiter-to-supervisor channel, matching how the
 * Regional Recruiter phase left "daily is good with the current structure"
 * unchanged.
 */
export async function maybeAutoConsolidate(
  countryId: string,
  type: ReportCycle,
  periodStart: Date,
  periodEnd: Date
): Promise<void> {
  if (type === "daily") return;

  const siblings = await prisma.report.findMany({
    where: {
      scope_level: "recruiter",
      country_id: countryId,
      type,
      period_start: periodStart,
      period_end: periodEnd,
    },
    select: {
      id: true,
      status: true,
      content: true,
      submitter: { select: { full_name: true } },
    },
  });

  const verified = siblings.filter((r: (typeof siblings)[number]) => r.status === "verified");
  const stillPending = siblings.some((r: (typeof siblings)[number]) => r.status === "submitted");
  if (stillPending || verified.length === 0) return;

  const alreadyConsolidated = await prisma.report.findFirst({
    where: { scope_level: "country", country_id: countryId, type, period_start: periodStart, period_end: periodEnd },
    select: { id: true },
  });
  if (alreadyConsolidated) return;

  const supervisor = await prisma.user.findFirst({
    where: { role: "country_supervisor", assigned_country_id: countryId },
    select: { id: true },
  });
  if (!supervisor) return;

  let candidatesTotal = 0;
  const challenges: { recruiter: string; text: string }[] = [];
  const performanceUpdates: { recruiter: string; text: string }[] = [];

  for (const r of verified) {
    const content = r.content as WeeklyContent & MonthlyContent;
    candidatesTotal += type === "weekly" ? (content.candidates?.length ?? 0) : (content.summary?.total ?? 0);
    if (content.challenges) challenges.push({ recruiter: r.submitter.full_name, text: content.challenges });
    if (content.performance_updates) performanceUpdates.push({ recruiter: r.submitter.full_name, text: content.performance_updates });
  }

  const db = auditedPrisma(supervisor.id);

  const countryReport = await db.report.create({
    data: {
      type,
      scope_level: "country",
      country_id: countryId,
      submitted_by: supervisor.id,
      period_start: periodStart,
      period_end: periodEnd,
      status: "submitted",
      content: {
        auto_consolidated: true,
        recruiter_reports: verified.map((r: (typeof verified)[number]) => ({ id: r.id, recruiter: r.submitter.full_name })),
        candidates_total: candidatesTotal,
        challenges,
        performance_updates: performanceUpdates,
      },
    },
    select: { id: true },
  });

  await prisma.report.updateMany({
    where: { id: { in: verified.map((r: (typeof verified)[number]) => r.id) } },
    data: { parent_report_id: countryReport.id, status: "consolidated" },
  });
}
