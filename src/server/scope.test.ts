import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { scopeCandidatesToRequester, canAccessCandidate } from "./scope";
import type { JwtPayload } from "@/lib/jwt";

// Integration tests against a real (local, disposable) Postgres database —
// this is exactly the kind of authorization logic where a bug is a data
// leak, not a cosmetic issue, so it's worth testing against real queries
// rather than mocking Prisma.

let regionId: string;
let countryAId: string;
let countryBId: string;
let recruiterA: string;
let supervisorA: string;
let candidateInA: string;
let candidateInB: string;

function actor(userId: string, role: JwtPayload["role"]): JwtPayload {
  return { userId, email: `${userId}@test.local`, role };
}

beforeAll(async () => {
  const region = await prisma.region.create({ data: { name: "Test Region" } });
  regionId = region.id;

  const countryA = await prisma.country.create({ data: { name: "Test Country A", region_id: regionId } });
  const countryB = await prisma.country.create({ data: { name: "Test Country B", region_id: regionId } });
  countryAId = countryA.id;
  countryBId = countryB.id;

  const recruiter = await prisma.user.create({
    data: { full_name: "Recruiter A", email: "recruiter-a@test.local", role: "regional_recruiter", assigned_country_id: countryAId },
  });
  recruiterA = recruiter.id;

  const supervisor = await prisma.user.create({
    data: { full_name: "Supervisor A", email: "supervisor-a@test.local", role: "country_supervisor", assigned_country_id: countryAId },
  });
  supervisorA = supervisor.id;

  const candA = await prisma.candidate.create({
    data: { source: "recruiter_sourced", recruiter_id: recruiterA, country_id: countryAId },
  });
  candidateInA = candA.id;

  const candB = await prisma.candidate.create({
    data: { source: "recruiter_sourced", country_id: countryBId },
  });
  candidateInB = candB.id;
});

afterAll(async () => {
  await prisma.candidate.deleteMany({ where: { id: { in: [candidateInA, candidateInB] } } });
  await prisma.user.deleteMany({ where: { id: { in: [recruiterA, supervisorA] } } });
  await prisma.country.deleteMany({ where: { id: { in: [countryAId, countryBId] } } });
  await prisma.region.delete({ where: { id: regionId } });
  await prisma.$disconnect();
});

describe("scopeCandidatesToRequester", () => {
  it("scopes a regional_recruiter to only their sourced candidates", async () => {
    const where = await scopeCandidatesToRequester(actor(recruiterA, "regional_recruiter"));
    const results = await prisma.candidate.findMany({ where: { AND: [where, { id: { in: [candidateInA, candidateInB] } }] } });
    expect(results.map((r) => r.id)).toEqual([candidateInA]);
  });

  it("scopes a country_supervisor to their assigned country", async () => {
    const where = await scopeCandidatesToRequester(actor(supervisorA, "country_supervisor"));
    const results = await prisma.candidate.findMany({ where: { AND: [where, { id: { in: [candidateInA, candidateInB] } }] } });
    expect(results.map((r) => r.id)).toEqual([candidateInA]);
  });

  it("fails closed for a country_supervisor with no assigned country", async () => {
    const unassigned = await prisma.user.create({
      data: { full_name: "Unassigned Supervisor", email: "unassigned-sup@test.local", role: "country_supervisor" },
    });
    try {
      const where = await scopeCandidatesToRequester(actor(unassigned.id, "country_supervisor"));
      const results = await prisma.candidate.findMany({ where: { AND: [where, { id: { in: [candidateInA, candidateInB] } }] } });
      expect(results).toHaveLength(0);
    } finally {
      await prisma.user.delete({ where: { id: unassigned.id } });
    }
  });

  it("gives admin, director, and inhouse_supervisor unrestricted access", async () => {
    for (const role of ["admin", "director", "inhouse_supervisor"] as const) {
      const where = await scopeCandidatesToRequester(actor("whoever", role));
      const results = await prisma.candidate.findMany({ where: { AND: [where, { id: { in: [candidateInA, candidateInB] } }] } });
      expect(results.map((r) => r.id).sort()).toEqual([candidateInA, candidateInB].sort());
    }
  });
});

describe("canAccessCandidate", () => {
  it("allows the recruiter who sourced the candidate", async () => {
    const allowed = await canAccessCandidate(actor(recruiterA, "regional_recruiter"), {
      user_id: null,
      recruiter_id: recruiterA,
      country_id: countryAId,
    });
    expect(allowed).toBe(true);
  });

  it("denies a recruiter who did not source the candidate", async () => {
    const allowed = await canAccessCandidate(actor("some-other-recruiter", "regional_recruiter"), {
      user_id: null,
      recruiter_id: recruiterA,
      country_id: countryAId,
    });
    expect(allowed).toBe(false);
  });

  it("allows the country_supervisor for that candidate's country", async () => {
    const allowed = await canAccessCandidate(actor(supervisorA, "country_supervisor"), {
      user_id: null,
      recruiter_id: recruiterA,
      country_id: countryAId,
    });
    expect(allowed).toBe(true);
  });

  it("denies a country_supervisor for a different country", async () => {
    const allowed = await canAccessCandidate(actor(supervisorA, "country_supervisor"), {
      user_id: null,
      recruiter_id: null,
      country_id: countryBId,
    });
    expect(allowed).toBe(false);
  });
});
