import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createJobSchema } from "@/lib/validations";
import { getAuthUser, requireRole } from "@/lib/api-auth";
export const dynamic = "force-dynamic";

// Job postings are Marketing's sole responsibility — a role deliberately
// kept outside the three-tier operational hierarchy (Regional Supervisory
// Operational Workflow). Admin keeps override access.
const JOB_MANAGER_ROLES = ["marketing", "admin"] as const;

// GET /api/jobs — public paginated listing
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") || 10)));
  const country = searchParams.get("country") || undefined;
  const category = searchParams.get("category") || undefined;
  const q = searchParams.get("q") || undefined;
  const skip = (page - 1) * limit;

  const where = {
    status: "active" as const,
    ...(country ? { country: { contains: country, mode: "insensitive" as const } } : {}),
    ...(category ? { category: { equals: category } } : {}),
    ...(q ? {
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { job_description: { contains: q, mode: "insensitive" as const } }
      ]
    } : {})
  };

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        title: true,
        country: true,
        city: true,
        category: true,
        salary_range: true,
        status: true,
        created_at: true,
        _count: { select: { applications: true } },
      },
    }),
    prisma.job.count({ where }),
  ]);

  return NextResponse.json({ jobs, total, page, pages: Math.ceil(total / limit) });
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
