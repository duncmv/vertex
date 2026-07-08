import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";

// E2E tests exercise the real dev server/database (there's no separate test
// instance to spin up cheaply) — this sweeps up anything the suite created
// so dev data doesn't accumulate across runs. Scoped to the "e2e-" prefix
// specifically (not all of @test.local) so it never touches manually
// created dev fixtures that happen to share the .test.local convention.
export default async function globalTeardown() {
  const prisma = new PrismaClient();
  try {
    // Candidates lose their recruiter_id (SetNull) rather than being
    // deleted when the recruiter is removed, so clean them up explicitly
    // first — otherwise every run leaves an orphaned candidate behind.
    await prisma.candidate.deleteMany({
      where: { recruiter: { email: { startsWith: "e2e-", endsWith: "@test.local" } } },
    });
    await prisma.user.deleteMany({ where: { email: { startsWith: "e2e-", endsWith: "@test.local" } } });
    await prisma.country.deleteMany({ where: { name: "E2E Country" } });
    await prisma.region.deleteMany({ where: { name: "E2E Region" } });
    // Application rows cascade with the Job (onDelete: Cascade in schema).
    await prisma.job.deleteMany({ where: { title: "E2E Test Job" } });
  } finally {
    await prisma.$disconnect();
  }
}
