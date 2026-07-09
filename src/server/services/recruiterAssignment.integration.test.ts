import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { assignNextRecruiterForCountry } from "./recruiterAssignment";

// Integration test against the real test DB — round-robin correctness
// depends on real ordering (created_at) across real rows, not just logic
// in isolation.

let regionId: string;
let emptyCountryId: string;
let soloCountryId: string;
let duoCountryId: string;
let recruiterAId: string;
let recruiterBId: string;
const candidateIds: string[] = [];
const userIds: string[] = [];

beforeAll(async () => {
  const region = await prisma.region.create({ data: { name: "Recruiter Assignment Test Region" } });
  regionId = region.id;

  const [empty, solo, duo] = await Promise.all([
    prisma.country.create({ data: { name: "RA Test Empty Country", region_id: regionId } }),
    prisma.country.create({ data: { name: "RA Test Solo Country", region_id: regionId } }),
    prisma.country.create({ data: { name: "RA Test Duo Country", region_id: regionId } }),
  ]);
  emptyCountryId = empty.id;
  soloCountryId = solo.id;
  duoCountryId = duo.id;

  const solo1 = await prisma.user.create({
    data: { full_name: "RA Solo Recruiter", email: "ra-solo-recruiter@test.local", role: "regional_recruiter", assigned_country_id: soloCountryId },
  });
  userIds.push(solo1.id);

  const a = await prisma.user.create({
    data: { full_name: "RA Recruiter A", email: "ra-recruiter-a@test.local", role: "regional_recruiter", assigned_country_id: duoCountryId },
  });
  recruiterAId = a.id;
  userIds.push(a.id);

  const b = await prisma.user.create({
    data: { full_name: "RA Recruiter B", email: "ra-recruiter-b@test.local", role: "regional_recruiter", assigned_country_id: duoCountryId },
  });
  recruiterBId = b.id;
  userIds.push(b.id);
});

afterAll(async () => {
  await prisma.candidate.deleteMany({ where: { id: { in: candidateIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.country.deleteMany({ where: { id: { in: [emptyCountryId, soloCountryId, duoCountryId] } } });
  await prisma.region.delete({ where: { id: regionId } });
  await prisma.$disconnect();
});

describe("assignNextRecruiterForCountry", () => {
  it("returns null when no recruiter covers that country", async () => {
    expect(await assignNextRecruiterForCountry(emptyCountryId)).toBeNull();
  });

  it("always returns the only recruiter covering that country", async () => {
    const first = await assignNextRecruiterForCountry(soloCountryId);
    const second = await assignNextRecruiterForCountry(soloCountryId);
    expect(first).toBe(userIds[0]);
    expect(second).toBe(userIds[0]);
  });

  it("returns the first recruiter (creation order) when no candidate has been assigned yet", async () => {
    expect(await assignNextRecruiterForCountry(duoCountryId)).toBe(recruiterAId);
  });

  it("rotates to the next recruiter after one is assigned", async () => {
    const c1 = await prisma.candidate.create({
      data: { source: "self_registered", country_id: duoCountryId, recruiter_id: recruiterAId },
    });
    candidateIds.push(c1.id);

    expect(await assignNextRecruiterForCountry(duoCountryId)).toBe(recruiterBId);
  });

  it("wraps back around to the first recruiter after the last one", async () => {
    const c2 = await prisma.candidate.create({
      data: { source: "self_registered", country_id: duoCountryId, recruiter_id: recruiterBId },
    });
    candidateIds.push(c2.id);

    expect(await assignNextRecruiterForCountry(duoCountryId)).toBe(recruiterAId);
  });
});
