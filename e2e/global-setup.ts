import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Creates real, known-password accounts for E2E tests that need to exercise
// authenticated access (not just the unauthenticated-redirect path) —
// cleaned up by global-teardown.ts alongside everything else matching
// e2e-*@test.local. A dedicated Region/Country is created too, rather than
// depending on prisma/seed.ts having been run, so this suite is
// self-contained.
export default async function globalSetup() {
  const prisma = new PrismaClient();
  try {
    const password_hash = await bcrypt.hash("E2ETestPassword123!", 12);
    await prisma.user.upsert({
      where: { email: "e2e-admin@test.local" },
      update: { role: "admin", password_hash, email_verified: true },
      create: {
        full_name: "E2E Admin",
        email: "e2e-admin@test.local",
        password_hash,
        role: "admin",
        email_verified: true,
      },
    });

    const region = await prisma.region.upsert({
      where: { name: "E2E Region" },
      update: {},
      create: { name: "E2E Region" },
    });
    const country = await prisma.country.upsert({
      where: { name: "E2E Country" },
      update: {},
      create: { name: "E2E Country", region_id: region.id },
    });

    const supervisor = await prisma.user.upsert({
      where: { email: "e2e-supervisor@test.local" },
      update: { role: "country_supervisor", password_hash, email_verified: true, assigned_country_id: country.id },
      create: {
        full_name: "E2E Supervisor",
        email: "e2e-supervisor@test.local",
        password_hash,
        role: "country_supervisor",
        email_verified: true,
        assigned_country_id: country.id,
      },
    });

    await prisma.user.upsert({
      where: { email: "e2e-recruiter@test.local" },
      update: {
        role: "regional_recruiter",
        password_hash,
        email_verified: true,
        assigned_country_id: country.id,
        supervisor_id: supervisor.id,
      },
      create: {
        full_name: "E2E Recruiter",
        email: "e2e-recruiter@test.local",
        password_hash,
        role: "regional_recruiter",
        email_verified: true,
        assigned_country_id: country.id,
        supervisor_id: supervisor.id,
      },
    });

    // Job has no unique field to upsert against — check-then-create.
    const existingJob = await prisma.job.findFirst({ where: { title: "E2E Test Job" } });
    const job =
      existingJob ??
      (await prisma.job.create({
        data: {
          title: "E2E Test Job",
          country: "Kenya",
          city: "Nairobi",
          job_description: "A job created solely for the E2E suite's real-application submission test.",
          requirements: "None — this posting exists only for automated testing.",
          status: "active",
          application_fee: 0,
        },
      }));

    // A candidate with a real, logged-in-able account and a real, still-
    // pending application — built directly rather than walked through the
    // full Phase 2 screening-gate + invite-email flow (already covered by
    // candidate-lifecycle.spec.ts), so the Phase 4 case-workflow E2E test
    // can focus on what's new: an admin approving the application through
    // the real UI (exercising the actual case-auto-creation hook, not a
    // pre-baked one), stage advance, and the candidate signing their own
    // contract.
    const caseCandidateUser = await prisma.user.upsert({
      where: { email: "e2e-case-candidate@test.local" },
      update: { role: "candidate", password_hash, email_verified: true },
      create: {
        full_name: "E2E Case Candidate",
        email: "e2e-case-candidate@test.local",
        password_hash,
        role: "candidate",
        email_verified: true,
      },
    });

    const caseCandidate = await prisma.candidate.upsert({
      where: { user_id: caseCandidateUser.id },
      update: {},
      create: { user_id: caseCandidateUser.id, source: "self_registered", lifecycle_status: "approved" },
    });

    await prisma.application.upsert({
      where: { candidate_id_job_id: { candidate_id: caseCandidate.id, job_id: job.id } },
      update: { application_status: "submitted" },
      create: { candidate_id: caseCandidate.id, job_id: job.id, application_status: "submitted" },
    });
  } finally {
    await prisma.$disconnect();
  }
}
