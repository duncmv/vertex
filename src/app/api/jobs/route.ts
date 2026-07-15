import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createJobSchema } from "@/lib/validations";
import { getAuthUser, requireRole } from "@/lib/api-auth";
import { getPublicJobsList } from "@/server/services/publicJobs";
export const dynamic = "force-dynamic";

// Job postings are Marketing's sole responsibility — a role deliberately
// kept outside the three-tier operational hierarchy (Regional Supervisory
// Operational Workflow). Admin keeps override access.
const JOB_MANAGER_ROLES = ["marketing", "admin"] as const;

// GET /api/jobs — public paginated listing. Also called directly
// (in-process, not over HTTP) by the homepage and /jobs listing Server
// Components — see server/services/publicJobs.ts for why.
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const result = await getPublicJobsList({
    page: Number(searchParams.get("page") || 1),
    limit: Number(searchParams.get("limit") || 10),
    country: searchParams.get("country") || undefined,
    category: searchParams.get("category") || undefined,
    q: searchParams.get("q") || undefined,
  });

  return NextResponse.json(result);
}

// POST /api/jobs — Marketing (admin retains override)
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, [...JOB_MANAGER_ROLES]);
  if (guardRes) return guardRes;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = createJobSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const job = await prisma.job.create({ data: parsed.data });
  return NextResponse.json(job, { status: 201 });
}
