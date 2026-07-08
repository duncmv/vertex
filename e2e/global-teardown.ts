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
    await prisma.user.deleteMany({ where: { email: { startsWith: "e2e-", endsWith: "@test.local" } } });
  } finally {
    await prisma.$disconnect();
  }
}
