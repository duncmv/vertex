import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, requireRole } from "@/lib/api-auth";
import { computeApplicantFlow, computeVerifiedCandidates, computeConversionRates } from "@/server/services/kpi";

// GET /api/inhouse/overview — everything the In-House Supervisor's
// Country Overview dashboard needs, pre-scoped to their one assigned
// country server-side (same fail-closed posture as scope.ts) rather than
// trusting a client-supplied country_id.
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, ["inhouse_supervisor", "admin"]);
  if (guardRes) return guardRes;

  const supervisor = await prisma.user.findUnique({
    where: { id: user!.userId },
    select: { assigned_country_id: true, assigned_country: { select: { id: true, name: true } } },
  });

  if (!supervisor?.assigned_country_id) {
    return NextResponse.json({ error: { code: "no_country", message: "You are not yet assigned a country." } }, { status: 422 });
  }

  const countryId = supervisor.assigned_country_id;

  const [recruiters, candidateFunnel, pendingCountryReports, activeCampaignTargets, countrySupervisor] = await Promise.all([
    prisma.user.findMany({
      where: { role: "regional_recruiter", assigned_country_id: countryId },
      select: { id: true, full_name: true },
      orderBy: { full_name: "asc" },
    }),
    computeApplicantFlow({ countryId, periodStart: new Date(0), periodEnd: new Date() }),
    prisma.report.count({ where: { scope_level: "country", country_id: countryId, status: "submitted" } }),
    prisma.campaignTarget.findMany({
      where: { country_id: countryId, campaign: { status: "active" } },
      select: { id: true, metric: true, target_value: true, campaign: { select: { id: true, name: true } } },
      orderBy: { created_at: "desc" },
    }),
    // For the Supervisory Performance Scorecard panel (§7) — the one
    // Country Supervisor In-House scores, matching the existing confirmed
    // single-country scoping.
    prisma.user.findFirst({
      where: { role: "country_supervisor", assigned_country_id: countryId },
      select: { id: true, full_name: true },
    }),
  ]);

  // Which recruiters have a "daily" report covering today, for the
  // compliance readout — a plain overlap check on period_end rather than
  // assuming an exact date match, since a daily report's own period_start/
  // period_end shape is the recruiter-reports feature's concern, not this
  // dashboard's.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const todaysDailyReports = await prisma.report.findMany({
    where: {
      type: "daily",
      scope_level: "recruiter",
      country_id: countryId,
      period_end: { gte: startOfToday, lte: endOfToday },
    },
    select: { submitted_by: true },
  });
  const submittedTodayIds = new Set(todaysDailyReports.map((r: (typeof todaysDailyReports)[number]) => r.submitted_by));

  const filters = { countryId, periodStart: new Date(0), periodEnd: new Date() };
  const campaignTargets = await Promise.all(
    activeCampaignTargets.map(async (t: (typeof activeCampaignTargets)[number]) => {
      const actualValue =
        t.metric === "conversion_rate"
          ? (await computeConversionRates(filters)).overall
          : await computeVerifiedCandidates(filters);
      return {
        id: t.id,
        metric: t.metric,
        targetValue: t.target_value,
        actualValue,
        campaignName: t.campaign.name,
      };
    })
  );

  return NextResponse.json({
    data: {
      country: supervisor.assigned_country,
      recruiterCount: recruiters.length,
      dailyCompliance: {
        submitted: recruiters.filter((r: (typeof recruiters)[number]) => submittedTodayIds.has(r.id)).length,
        total: recruiters.length,
        recruiters: recruiters.map((r: (typeof recruiters)[number]) => ({ id: r.id, full_name: r.full_name, submittedToday: submittedTodayIds.has(r.id) })),
      },
      candidateFunnel,
      pendingCountryReports,
      campaignTargets,
      countrySupervisor,
    },
  });
}
