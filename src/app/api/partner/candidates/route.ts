import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditedPrisma } from "@/lib/audit";
import { getAuthUser, requireRole } from "@/lib/api-auth";
import { submitPartnerCandidateSchema } from "@/lib/validations";

// GET /api/partner/candidates — a partner sees only its own submissions
// (SRS FR-5.1). Scoped by Partner.user_id, not a role-wide query — a
// partner has no visibility into any other agency's candidates.
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, ["partner"]);
  if (guardRes) return guardRes;

  const partner = await prisma.partner.findUnique({ where: { user_id: user!.userId } });
  if (!partner) return NextResponse.json({ error: { code: "not_found", message: "Partner record not found." } }, { status: 404 });

  const candidates = await prisma.partnerCandidate.findMany({
    where: { partner_id: partner.id },
    include: {
      preferred_country_1: { select: { name: true } },
      preferred_sector: { select: { name: true } },
    },
    orderBy: { submitted_at: "desc" },
  });

  return NextResponse.json({ data: candidates });
}

// POST /api/partner/candidates — the partner's own candidate-submission
// form (Agency Application Form Sections 2-6). Deliberately does NOT
// create a Candidate/Application — this candidate never enters Vertex's
// internal recruiter/screening/verification funnel; the partner has
// already handled that themselves. Best-effort notifies staff by email.
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, ["partner"]);
  if (guardRes) return guardRes;

  const partner = await prisma.partner.findUnique({ where: { user_id: user!.userId } });
  if (!partner) return NextResponse.json({ error: { code: "not_found", message: "Partner record not found." } }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "invalid_json", message: "Invalid JSON" } }, { status: 400 });
  }

  const parsed = submitPartnerCandidateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Validation failed", details: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    );
  }

  const [country1, sector, currentLocationCountry] = await Promise.all([
    prisma.country.findUnique({ where: { id: parsed.data.preferred_country_1_id } }),
    prisma.sector.findUnique({ where: { id: parsed.data.preferred_sector_id } }),
    prisma.country.findUnique({ where: { id: parsed.data.current_location_country_id } }),
  ]);
  if (!country1) return NextResponse.json({ error: { code: "not_found", message: "Preferred country (option 1) not found." } }, { status: 404 });
  if (!sector) return NextResponse.json({ error: { code: "not_found", message: "Preferred type of work not found." } }, { status: 404 });
  if (!currentLocationCountry) return NextResponse.json({ error: { code: "not_found", message: "Current location country not found." } }, { status: 404 });

  const db = auditedPrisma(user!.userId);
  const candidate = await db.partnerCandidate.create({
    data: {
      partner_id: partner.id,
      full_name: parsed.data.full_name,
      nationality: parsed.data.nationality,
      date_of_birth: new Date(parsed.data.date_of_birth),
      passport_number: parsed.data.passport_number,
      passport_expiry: new Date(parsed.data.passport_expiry),
      phone: parsed.data.phone,
      email: parsed.data.email,
      second_nationality: parsed.data.second_nationality,
      current_occupation: parsed.data.current_occupation,
      highest_education: parsed.data.highest_education,
      home_address: parsed.data.home_address,
      whatsapp_number: parsed.data.whatsapp_number,
      marital_status: parsed.data.marital_status,
      preferred_country_1_id: parsed.data.preferred_country_1_id,
      preferred_country_2_id: parsed.data.preferred_country_2_id,
      preferred_country_3_id: parsed.data.preferred_country_3_id,
      preferred_sector_id: parsed.data.preferred_sector_id,
      earliest_travel_date: new Date(parsed.data.earliest_travel_date),
      prior_eu_visa_applied: parsed.data.prior_eu_visa_applied,
      documents_available: parsed.data.documents_available,
      payment_plan_acknowledged: parsed.data.payment_plan_acknowledged,
      current_location_country_id: parsed.data.current_location_country_id,
      holds_schengen_visa: parsed.data.holds_schengen_visa,
      prior_visa_refusals: parsed.data.prior_visa_refusals,
      available_for_embassy_appointment: parsed.data.available_for_embassy_appointment,
      willing_to_start_within_30_days: parsed.data.willing_to_start_within_30_days,
      preferred_contact_channel: parsed.data.preferred_contact_channel,
    },
  });

  try {
    const { sendPartnerCandidateSubmittedEmail } = await import("@/lib/email");
    await sendPartnerCandidateSubmittedEmail(partner.name, candidate.full_name);
  } catch (err) {
    console.error("Failed to send partner-candidate submission notification.", err);
  }

  return NextResponse.json({ data: candidate }, { status: 201 });
}
