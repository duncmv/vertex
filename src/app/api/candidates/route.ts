import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditedPrisma } from "@/lib/audit";
import { getAuthUser, requireRole } from "@/lib/api-auth";
import { scopeCandidatesToRequester } from "@/server/scope";
import { registerCandidateSchema } from "@/lib/validations";

const STAFF_ROLES = ["regional_recruiter", "country_supervisor", "inhouse_supervisor", "director", "admin"] as const;

// GET /api/candidates — role-scoped candidate list (SRS FR-1.2, FR-2.3).
// A regional_recruiter sees only candidates they sourced; a
// country_supervisor sees their assigned country; in-house/director/admin
// see everything. Powers the /recruiter, /supervisor, and /management
// portal landing pages.
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, [...STAFF_ROLES]);
  if (guardRes) return guardRes;

  const scope = await scopeCandidatesToRequester(user!);

  const candidates = await prisma.candidate.findMany({
    where: scope,
    select: {
      id: true,
      source: true,
      lifecycle_status: true,
      nationality: true,
      date_of_birth: true,
      passport_number: true,
      full_name: true,
      phone: true,
      email: true,
      desired_role: true,
      consent_given: true,
      return_reason: true,
      created_at: true,
      user: { select: { full_name: true, email: true } },
      recruiter: { select: { id: true, full_name: true } },
      country: { select: { id: true, name: true } },
      documents: { select: { id: true, type: true, verification_status: true } },
    },
    orderBy: { created_at: "desc" },
    take: 100,
  });

  return NextResponse.json({ data: candidates });
}

// POST /api/candidates — a recruiter registers a new lead (SRS FR-2.1).
// Defaults the candidate's country to the recruiter's own assigned
// country; attribution (recruiter_id, source) is set server-side, never
// trusted from the request body.
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, ["regional_recruiter", "admin"]);
  if (guardRes) return guardRes;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "invalid_json", message: "Invalid JSON" } }, { status: 400 });
  }

  const parsed = registerCandidateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Validation failed", details: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    );
  }

  const recruiter = await prisma.user.findUnique({
    where: { id: user!.userId },
    select: { assigned_country_id: true },
  });

  const { date_of_birth, country_id, ...rest } = parsed.data;

  const candidate = await auditedPrisma(user!.userId).candidate.create({
    data: {
      ...rest,
      date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
      country_id: country_id ?? recruiter?.assigned_country_id ?? undefined,
      source: "recruiter_sourced",
      recruiter_id: user!.role === "admin" ? undefined : user!.userId,
      lifecycle_status: "identified",
    },
    select: {
      id: true,
      full_name: true,
      nationality: true,
      desired_role: true,
      lifecycle_status: true,
      country: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: candidate }, { status: 201 });
}
