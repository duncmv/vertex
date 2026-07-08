import { prisma } from "@/lib/prisma";
import type { Prisma, CandidateLifecycleStatus, CampaignMetric, CampaignTarget } from "@prisma/client";

export interface KpiFilters {
  countryId?: string;
  regionId?: string;
  recruiterId?: string;
  periodStart: Date;
  periodEnd: Date;
}

const LIFECYCLE_ORDER: CandidateLifecycleStatus[] = [
  "identified",
  "screened",
  "guided_to_apply",
  "submitted",
  "reported",
  "verified",
  "approved",
];

function candidateWhere(filters: KpiFilters): Prisma.CandidateWhereInput {
  return {
    created_at: { gte: filters.periodStart, lte: filters.periodEnd },
    ...(filters.recruiterId ? { recruiter_id: filters.recruiterId } : {}),
    ...(filters.countryId ? { country_id: filters.countryId } : {}),
    ...(filters.regionId ? { country: { region_id: filters.regionId } } : {}),
  };
}

/**
 * "Agent sign-ups" (SRS FR-3.2): new candidates the agent network brought
 * in during the period, at whatever scope (recruiter/country/region/all)
 * the caller asks for.
 */
export async function computeAgentSignups(filters: KpiFilters): Promise<number> {
  return prisma.candidate.count({ where: candidateWhere(filters) });
}

/**
 * "Agency response rate" (SRS FR-3.2) has no further definition in the SRS
 * and no Agency/Partner entity exists yet (that's Phase 5) — interpreted
 * here as how responsive the recruiter network itself was: the percentage
 * of candidates identified in the period who were actually screened (i.e.
 * got a real follow-up from their recruiter), not left sitting at
 * "identified". Documented as a deliberate, disclosed interpretation.
 */
export async function computeRecruiterResponseRate(filters: KpiFilters): Promise<number> {
  const where = candidateWhere(filters);
  const [total, responded] = await Promise.all([
    prisma.candidate.count({ where }),
    prisma.candidate.count({
      where: { ...where, lifecycle_status: { not: "identified" } },
    }),
  ]);
  return total === 0 ? 0 : Math.round((responded / total) * 1000) / 10;
}

/** "Applicant flow" (SRS FR-3.2): funnel counts by pre-application lifecycle stage. */
export async function computeApplicantFlow(filters: KpiFilters): Promise<Record<CandidateLifecycleStatus, number>> {
  const rows = await prisma.candidate.groupBy({
    by: ["lifecycle_status"],
    where: candidateWhere(filters),
    _count: { _all: true },
  });
  const flow = Object.fromEntries(LIFECYCLE_ORDER.map((s) => [s, 0])) as Record<CandidateLifecycleStatus, number>;
  for (const row of rows) {
    const status = row.lifecycle_status as CandidateLifecycleStatus;
    flow[status] = row._count?._all ?? 0;
  }
  return flow;
}

export interface StageConversion {
  from: CandidateLifecycleStatus;
  to: CandidateLifecycleStatus;
  rate: number;
}

/**
 * "Conversion rate" (SRS FR-3.2): overall identified→approved rate, plus a
 * stage-by-stage breakdown for the funnel view. A candidate currently
 * sitting at stage N is counted as having cleared every stage before N
 * (lifecycle stages are strictly sequential — see candidateLifecycle.ts),
 * so "reached this stage or later" is just an index comparison, not a
 * separate historical query.
 */
export async function computeConversionRates(filters: KpiFilters): Promise<{ overall: number; byStage: StageConversion[] }> {
  const flow = await computeApplicantFlow(filters);
  const reachedOrLater = (idx: number) =>
    LIFECYCLE_ORDER.slice(idx).reduce((sum, status) => sum + flow[status], 0);

  const totalIdentified = reachedOrLater(0);
  const totalApproved = flow.approved;
  const overall = totalIdentified === 0 ? 0 : Math.round((totalApproved / totalIdentified) * 1000) / 10;

  const byStage: StageConversion[] = [];
  for (let i = 0; i < LIFECYCLE_ORDER.length - 1; i++) {
    const fromCount = reachedOrLater(i);
    const toCount = reachedOrLater(i + 1);
    byStage.push({
      from: LIFECYCLE_ORDER[i],
      to: LIFECYCLE_ORDER[i + 1],
      rate: fromCount === 0 ? 0 : Math.round((toCount / fromCount) * 1000) / 10,
    });
  }

  return { overall, byStage };
}

export interface KpiSummary {
  agentSignups: number;
  recruiterResponseRate: number;
  applicantFlow: Record<CandidateLifecycleStatus, number>;
  conversion: { overall: number; byStage: StageConversion[] };
}

export async function computeKpiSummary(filters: KpiFilters): Promise<KpiSummary> {
  const [agentSignups, recruiterResponseRate, applicantFlow, conversion] = await Promise.all([
    computeAgentSignups(filters),
    computeRecruiterResponseRate(filters),
    computeApplicantFlow(filters),
    computeConversionRates(filters),
  ]);
  return { agentSignups, recruiterResponseRate, applicantFlow, conversion };
}

export interface TargetVsActual {
  campaignTargetId: string;
  metric: CampaignMetric;
  countryId: string | null;
  regionId: string | null;
  targetValue: number;
  actualValue: number;
}

/**
 * "Targets vs actuals" (SRS FR-3.2): for every CampaignTarget on a
 * campaign, compute the real current value for that same metric/scope
 * and compare. `actualValue` for "conversion_rate" is the overall rate;
 * for "agent_signups"/"applicant_flow" it's a count.
 */
export async function computeTargetsVsActuals(campaignId: string, filters: Pick<KpiFilters, "periodStart" | "periodEnd">): Promise<TargetVsActual[]> {
  const targets = await prisma.campaignTarget.findMany({ where: { campaign_id: campaignId } });

  return Promise.all(
    targets.map(async (target: CampaignTarget) => {
      const scoped: KpiFilters = {
        ...filters,
        countryId: target.country_id ?? undefined,
        regionId: target.region_id ?? undefined,
      };

      let actualValue: number;
      switch (target.metric) {
        case "agent_signups":
          actualValue = await computeAgentSignups(scoped);
          break;
        case "conversion_rate":
          actualValue = (await computeConversionRates(scoped)).overall;
          break;
        case "applicant_flow":
        default: {
          const flow = await computeApplicantFlow(scoped);
          actualValue = Object.values(flow).reduce((a, b) => a + b, 0);
          break;
        }
      }

      return {
        campaignTargetId: target.id,
        metric: target.metric,
        countryId: target.country_id,
        regionId: target.region_id,
        targetValue: target.target_value,
        actualValue,
      };
    })
  );
}
