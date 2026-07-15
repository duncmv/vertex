import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createJobSchema } from "@/lib/validations";
import { getAuthUser, requireRole } from "@/lib/api-auth";
import { getPublicJobById } from "@/server/services/publicJobs";
export const dynamic = "force-dynamic";

const JOB_MANAGER_ROLES = ["marketing", "admin"] as const;

// GET /api/jobs/[id] — public. Also called directly (in-process, not over
// HTTP) by /jobs/[id]'s Server Component — see server/services/publicJobs.ts.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await getPublicJobById(id);
  if (!job) return NextResponse.json({ error: "Job not found." }, { status: 404 });
  return NextResponse.json(job);
}

// PUT /api/jobs/[id] — Marketing (admin retains override)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, [...JOB_MANAGER_ROLES]);
  if (guardRes) return guardRes;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = createJobSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const job = await prisma.job.update({ where: { id }, data: parsed.data });
  return NextResponse.json(job);
}

// DELETE /api/jobs/[id] — Marketing (admin retains override)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, [...JOB_MANAGER_ROLES]);
  if (guardRes) return guardRes;

  await prisma.job.delete({ where: { id } });
  return NextResponse.json({ message: "Job deleted." });
}
