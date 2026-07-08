import { config } from "dotenv";
import path from "path";
config({ path: path.resolve(__dirname, "../.env") });

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Creates a real, known-password admin account for E2E tests that need to
// exercise authenticated access (not just the unauthenticated-redirect
// path) — cleaned up by global-teardown.ts alongside everything else
// matching @test.local.
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
  } finally {
    await prisma.$disconnect();
  }
}
