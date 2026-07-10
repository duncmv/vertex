import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, requireRole } from "@/lib/api-auth";
import { computeKpiSummary, computeTargetsVsActuals, computePartnerPerformance, type KpiFilters } from "@/server/services/kpi";

// GET /api/kpi — Management/Control dashboard data (SRS FR-3.1, FR-3.2,
// FR-3.8). Restricted to the roles the dashboard itself is for — a
// recruiter/supervisor already has their own scoped views on
// /recruiter and /supervisor.
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, ["inhouse_supervisor", "director", "admin"]);
  if (guardRes) return guardRes;

  const { searchParams } = req.nextUrl;
  const periodStartParam = searchParams.get("period_start");
  const periodEndParam = searchParams.get("period_end");

  // Default window: last 90 days, if the caller doesn't specify one.
  const periodEnd = periodEndParam ? new Date(periodEndParam) : new Date();
  const periodStart = periodStartParam ? new Date(periodStartParam) : new Date(periodEnd.getTime() - 90 * 24 * 60 * 60 * 1000);

  const filters: KpiFilters = {
    periodStart,
    periodEnd,
    countryId: searchParams.get("country_id") ?? undefined,
    regionId: searchParams.get("region_id") ?? undefined,
    recruiterId: searchParams.get("recruiter_id") ?? undefined,
  };

  const campaignId = searchParams.get("campaign_id");

  const [summary, targetsVsActuals, partnerPerformance] = await Promise.all([
    computeKpiSummary(filters),
    campaignId ? computeTargetsVsActuals(campaignId, filters) : Promise.resolve(null),
    computePartnerPerformance(filters),
  ]);

  return NextResponse.json({ data: { summary, targetsVsActuals, partnerPerformance } });
}
