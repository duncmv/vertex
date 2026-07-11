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
      screening_result: true,
      screening_evaluated_at: true,
      created_at: true,
      user_id: true,
      recruiter_id: true,
      country_id: true,
      second_nationality: true,
      passport_expiry: true,
      current_occupation: true,
      highest_education: true,
      home_address: true,
      whatsapp_number: true,
      marital_status: true,
      user: { select: { full_name: true, email: true, phone: true } },
      recruiter: { select: { id: true, full_name: true } },
      country: { select: { id: true, name: true } },
      documents: { select: { id: true, type: true, verification_status: true, uploaded_at: true } },
      applications: {
        orderBy: { submitted_at: "desc" },
        select: {
          id: true,
          application_status: true,
          submitted_at: true,
          preferred_country_1: { select: { id: true, name: true } },
          preferred_country_2: { select: { id: true, name: true } },
          preferred_country_3: { select: { id: true, name: true } },
          preferred_sector: { select: { id: true, name: true } },
          earliest_travel_date: true,
          prior_eu_visa_applied: true,
          documents_available: true,
          current_location_country: { select: { id: true, name: true } },
          holds_schengen_visa: true,
          prior_visa_refusals: true,
          available_for_embassy_appointment: true,
          willing_to_start_within_30_days: true,
          preferred_contact_channel: true,
          payment_plan_acknowledged: true,
        },
      },
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

  const { date_of_birth, passport_expiry, consent_given, ...rest } = parsed.data;

  const updated = await auditedPrisma(user!.userId).candidate.update({
    where: { id },
    data: {
      ...rest,
      ...(date_of_birth ? { date_of_birth: new Date(date_of_birth) } : {}),
      ...(passport_expiry ? { passport_expiry: new Date(passport_expiry) } : {}),
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
      second_nationality: true,
      passport_expiry: true,
      current_occupation: true,
      highest_education: true,
      home_address: true,
      whatsapp_number: true,
      marital_status: true,
    },
  });

  return NextResponse.json({ data: updated });
}
