import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditedPrisma } from "@/lib/audit";
import { getAuthUser, requireRole } from "@/lib/api-auth";
import { canAccessCandidate } from "@/server/scope";
import { updateCandidateDetailsSchema } from "@/lib/validations";

const STAFF_ROLES = ["regional_recruiter", "country_supervisor", "inhouse_supervisor", "director", "admin"] as const;

// GET /api/candidates/:id — single candidate detail, RBAC-scoped.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, [...STAFF_ROLES]);
  if (guardRes) return guardRes;

  const { id } = await params;

  const candidate = await prisma.candidate.findUnique({
    where: { id },
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
      consent_at: true,
      return_reason: true,
      created_at: true,
      user_id: true,
      recruiter_id: true,
      country_id: true,
      user: { select: { full_name: true, email: true, phone: true } },
      recruiter: { select: { id: true, full_name: true } },
      country: { select: { id: true, name: true } },
      documents: { select: { id: true, type: true, verification_status: true } },
    },
  });
  if (!candidate) {
    return NextResponse.json({ error: { code: "not_found", message: "Candidate not found." } }, { status: 404 });
  }

  const allowed = await canAccessCandidate(user!, candidate);
  if (!allowed) {
    return NextResponse.json({ error: { code: "forbidden", message: "Forbidden." } }, { status: 403 });
  }

  return NextResponse.json({ data: candidate });
}

// PATCH /api/candidates/:id — progressive detail edits + consent capture
// (SRS FR-2.5, FR-2.8). Lifecycle status transitions go through
// /status instead, which has its own role-gating and screening checks.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, ["regional_recruiter", "country_supervisor", "admin"]);
  if (guardRes) return guardRes;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "invalid_json", message: "Invalid JSON" } }, { status: 400 });
  }

  const parsed = updateCandidateDetailsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Validation failed", details: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    );
  }

  const candidate = await prisma.candidate.findUnique({
    where: { id },
    select: { user_id: true, recruiter_id: true, country_id: true },
  });
  if (!candidate) {
    return NextResponse.json({ error: { code: "not_found", message: "Candidate not found." } }, { status: 404 });
  }

  const allowed = await canAccessCandidate(user!, candidate);
  if (!allowed) {
    return NextResponse.json({ error: { code: "forbidden", message: "Forbidden." } }, { status: 403 });
  }

  const { date_of_birth, consent_given, ...rest } = parsed.data;

  const updated = await auditedPrisma(user!.userId).candidate.update({
    where: { id },
    data: {
      ...rest,
      ...(date_of_birth ? { date_of_birth: new Date(date_of_birth) } : {}),
      ...(consent_given !== undefined
        ? { consent_given, consent_at: consent_given ? new Date() : null }
        : {}),
    },
    select: {
      id: true,
      full_name: true,
      nationality: true,
      date_of_birth: true,
      passport_number: true,
      phone: true,
      email: true,
      desired_role: true,
      consent_given: true,
      consent_at: true,
    },
  });

  return NextResponse.json({ data: updated });
}
