import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  computeAgentSignups,
  computeRecruiterResponseRate,
  computeApplicantFlow,
  computeConversionRates,
  computeKpiSummary,
  computeTargetsVsActuals,
  computePartnerPerformance,
  type KpiFilters,
} from "./kpi";

// Integration tests against the real test DB — KPI math is exactly the
// kind of logic where a silent off-by-one gives management a wrong number
// they'll act on, so it's worth verifying against real aggregation queries.

let regionId: string;
let countryId: string;
let recruiterId: string;
let candidateIds: string[] = [];
let campaignId: string;
let filters: KpiFilters;
let partnerId: string;
let partnerCandidateIds: string[] = [];

beforeAll(async () => {
  const region = await prisma.region.create({ data: { name: "KPI Test Region" } });
  regionId = region.id;

  const country = await prisma.country.create({ data: { name: "KPI Test Country", region_id: regionId } });
  countryId = country.id;

  const recruiter = await prisma.user.create({
    data: { full_name: "KPI Recruiter", email: "kpi-recruiter@test.local", role: "regional_recruiter", assigned_country_id: countryId },
  });
  recruiterId = recruiter.id;

  // One candidate at each of 5 distinct stages — chosen so every funnel
  // math path (flow, reached-or-later, stage conversion) has a non-trivial
  // value to verify against, not just 0s and 1s.
  const stages = ["identified", "screened", "guided_to_apply", "submitted", "approved"] as const;
  for (const lifecycle_status of stages) {
    const candidate = await prisma.candidate.create({
      data: { source: "recruiter_sourced", recruiter_id: recruiterId, country_id: countryId, lifecycle_status },
    });
    candidateIds.push(candidate.id);
  }

  const campaign = await prisma.campaign.create({
    data: { name: "KPI Test Campaign", criteria: {}, created_by: recruiterId, start_date: new Date("2020-01-01"), end_date: new Date("2020-12-31") },
  });
  campaignId = campaign.id;
  await prisma.campaignTarget.create({
    data: { campaign_id: campaignId, metric: "agent_signups", country_id: countryId, target_value: 10 },
  });

  filters = {
    recruiterId,
    periodStart: new Date(Date.now() - 60_000),
    periodEnd: new Date(Date.now() + 60_000),
  };

  const partner = await prisma.partner.create({
    data: {
      name: "KPI Test Partner",
      partner_type: "travel_agency",
      country_of_operation: "Kenya",
      contact_name: "Partner Contact",
      contact_email: "kpi-partner@test.local",
      contact_phone: "+254700000000",
    },
  });
  partnerId = partner.id;

  // 2 candidates sourced via this partner — 1 approved, 1 not — so both
  // candidatesSourced and approved have a non-trivial, distinguishable value.
  for (const lifecycle_status of ["approved", "identified"] as const) {
    const candidate = await prisma.candidate.create({
      data: { source: "partner_sourced", partner_id: partnerId, country_id: countryId, lifecycle_status },
    });
    partnerCandidateIds.push(candidate.id);
  }
});

afterAll(async () => {
  await prisma.campaignTarget.deleteMany({ where: { campaign_id: campaignId } });
  await prisma.campaign.delete({ where: { id: campaignId } });
  await prisma.candidate.deleteMany({ where: { id: { in: candidateIds } } });
  await prisma.candidate.deleteMany({ where: { id: { in: partnerCandidateIds } } });
  await prisma.partner.delete({ where: { id: partnerId } });
  await prisma.user.delete({ where: { id: recruiterId } });
  await prisma.country.delete({ where: { id: countryId } });
  await prisma.region.delete({ where: { id: regionId } });
  await prisma.$disconnect();
});

describe("computeAgentSignups", () => {
  it("counts candidates created within the period, scoped to the recruiter", async () => {
    expect(await computeAgentSignups(filters)).toBe(5);
  });

  it("returns 0 for a scope with no matching candidates", async () => {
    expect(await computeAgentSignups({ ...filters, recruiterId: "nonexistent" })).toBe(0);
  });
});

describe("computeRecruiterResponseRate", () => {
  it("is the percentage of candidates that moved past 'identified'", async () => {
    // 4 of 5 candidates are beyond "identified".
    expect(await computeRecruiterResponseRate(filters)).toBe(80);
  });
});

describe("computeApplicantFlow", () => {
  it("counts candidates per lifecycle stage", async () => {
    const flow = await computeApplicantFlow(filters);
    expect(flow).toMatchObject({
      identified: 1,
      screened: 1,
      guided_to_apply: 1,
      submitted: 1,
      reported: 0,
      verified: 0,
      approved: 1,
    });
  });
});

describe("computeConversionRates", () => {
  it("computes the overall identified-to-approved rate", async () => {
    const { overall } = await computeConversionRates(filters);
    expect(overall).toBe(20); // 1 approved out of 5 identified-or-later
  });

  it("computes each stage-to-stage conversion", async () => {
    const { byStage } = await computeConversionRates(filters);
    const find = (from: string) => byStage.find((s) => s.from === from);
    expect(find("identified")?.rate).toBe(80); // 5 -> 4
    expect(find("screened")?.rate).toBe(75); // 4 -> 3
    expect(find("submitted")?.rate).toBe(50); // 2 -> 1
  });
});

describe("computeKpiSummary", () => {
  it("bundles all four KPIs together", async () => {
    const summary = await computeKpiSummary(filters);
    expect(summary.agentSignups).toBe(5);
    expect(summary.recruiterResponseRate).toBe(80);
    expect(summary.applicantFlow.approved).toBe(1);
    expect(summary.conversion.overall).toBe(20);
  });
});

describe("computePartnerPerformance", () => {
  it("counts candidates sourced and approved per partner within the period", async () => {
    const results = await computePartnerPerformance(filters);
    const partner = results.find((p) => p.partnerId === partnerId);
    expect(partner).toMatchObject({ partnerName: "KPI Test Partner", candidatesSourced: 2, approved: 1 });
  });

  it("omits partners with no candidates sourced in the period", async () => {
    const results = await computePartnerPerformance({ periodStart: new Date("2000-01-01"), periodEnd: new Date("2000-01-02") });
    expect(results.find((p) => p.partnerId === partnerId)).toBeUndefined();
  });
});

describe("computeTargetsVsActuals", () => {
  it("pairs each CampaignTarget with its real computed actual", async () => {
    const results = await computeTargetsVsActuals(campaignId, filters);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ metric: "agent_signups", targetValue: 10, actualValue: 5, countryId });
  });
});
