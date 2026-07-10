import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auditedPrisma } from "@/lib/audit";
import { submitApplicationSchema, newCandidatePersonalInfoSchema } from "@/lib/validations";
import { getAuthUser, requireAuth } from "@/lib/api-auth";
import { isStaffRole } from "@/lib/rbac";
import { canAccessCandidate, scopeCandidatesToRequester } from "@/server/scope";
import { assignNextRecruiterForCountry } from "@/server/services/recruiterAssignment";
import { rateLimit } from "@/lib/rate-limit";

// GET /api/applications — a candidate sees their own; every staff role
// sees applications scoped exactly like the candidate list itself (SRS
// FR-2.1 "guide and track applications" — a recruiter needs this for
// their own sourced candidates, not just admin). Reuses
// scopeCandidatesToRequester so the two views can never drift apart.
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireAuth(user);
  if (guardRes) return guardRes;

  if (isStaffRole(user!.role)) {
    const candidateScope = await scopeCandidatesToRequester(user!);
    const applications = await prisma.application.findMany({
      where: { candidate: candidateScope },
      include: {
        candidate: {
          select: {
            full_name: true,
            documents: { select: { id: true, type: true, verification_status: true } },
            user: { select: { full_name: true, email: true } },
            recruiter: { select: { id: true, full_name: true } },
            country: { select: { id: true, name: true } },
          },
        },
        job: { select: { title: true, country: true, city: true } },
        preferred_country_1: { select: { name: true } },
        preferred_sector: { select: { name: true } },
      },
      orderBy: { submitted_at: "desc" },
    });
    return NextResponse.json(applications);
  }

  // Candidate: find their own
  const candidate = await prisma.candidate.findUnique({ where: { user_id: user!.userId } });
  if (!candidate) return NextResponse.json({ applications: [] });

  const applications = await prisma.application.findMany({
    where: { candidate_id: candidate.id },
    include: {
      job: { select: { id: true, title: true, country: true, city: true, salary_range: true } },
      preferred_country_1: { select: { name: true } },
      preferred_sector: { select: { name: true } },
    },
    orderBy: { submitted_at: "desc" },
  });

  return NextResponse.json(applications);
}

// POST /api/applications — the Candidate Information Form. The first
// thing anyone fills in: a candidate submitting anonymously (no account
// yet — the whole point is that screening happens before an account
// exists), a recruiter entering a walk-in lead who has none either, or
// (less commonly now) an existing candidate/lead completing or
// resubmitting theirs. Creating a brand-new Candidate this way sets
// lifecycle_status "identified"; a self-service submission with no
// recruiter gets one round-robin-assigned by current-location country.
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = submitApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  type ExistingCandidate = Prisma.CandidateGetPayload<{
    include: { user: true; documents: { select: { type: true } } };
  }>;

  let candidate: ExistingCandidate | null = null;
  let isNewCandidate = false;

  if (parsed.data.candidate_id) {
    if (!user || !isStaffRole(user.role)) {
      return NextResponse.json({ error: "Only staff can submit an application on behalf of a candidate." }, { status: 403 });
    }
    candidate = await prisma.candidate.findUnique({
      where: { id: parsed.data.candidate_id },
      include: { user: true, documents: { select: { type: true } } },
    });
    if (!candidate) return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
    if (!(await canAccessCandidate(user, candidate))) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  } else if (user && user.role === "candidate") {
    candidate = await prisma.candidate.findUnique({
      where: { user_id: user.userId },
      include: { user: true, documents: { select: { type: true } } },
    });
    if (!candidate) return NextResponse.json({ error: "Candidate profile not found." }, { status: 404 });
  } else if (user && !isStaffRole(user.role)) {
    // An authenticated, non-staff, non-candidate role (shouldn't really
    // exist, but fail closed rather than silently treating them as a new
    // anonymous submitter).
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  } else {
    // Anonymous self-service, or staff entering a brand-new walk-in lead.
    isNewCandidate = true;
  }

  let newCandidateInfo: ReturnType<typeof newCandidatePersonalInfoSchema.parse> | null = null;
  if (isNewCandidate) {
    if (!user) {
      const ip = req.headers.get("x-forwarded-for") ?? "unknown";
      const rl = rateLimit(`applications-new:${ip}`, { max: 5, windowMs: 60_000 });
      if (!rl.success) {
        return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
      }
    }
    const infoParsed = newCandidatePersonalInfoSchema.safeParse(parsed.data);
    if (!infoParsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: infoParsed.error.flatten().fieldErrors },
        { status: 422 }
      );
    }
    newCandidateInfo = infoParsed.data;
  }

  // A candidate already mid-pipeline shouldn't be able to submit a second,
  // conflicting Candidate Information Form — resubmission belongs to
  // whichever staff role owns that stage (e.g. a supervisor Return). Not
  // relevant for a brand-new candidate, who by definition has none yet.
  if (candidate) {
    const existing = await prisma.application.findFirst({
      where: { candidate_id: candidate.id, application_status: { not: "rejected" } },
    });
    if (existing) {
      return NextResponse.json({ error: "This candidate already has an active application on file." }, { status: 409 });
    }
  }

  // Partner attribution (SRS FR-5.1) — staff-only; an anonymous self-service
  // submission or a logged-in candidate can never attribute their own
  // sourcing partner.
  if (parsed.data.partner_id && !(user && isStaffRole(user.role))) {
    return NextResponse.json({ error: "Only staff can attribute a candidate to a partner." }, { status: 403 });
  }
  const partner = parsed.data.partner_id
    ? await prisma.partner.findUnique({ where: { id: parsed.data.partner_id } })
    : null;
  if (parsed.data.partner_id && !partner) {
    return NextResponse.json({ error: "Partner not found." }, { status: 404 });
  }

  // job_id stays for when real job matching exists — jobs aren't listed on
  // the platform yet, so this is optional and usually absent.
  let job = null;
  if (parsed.data.job_id) {
    job = await prisma.job.findUnique({ where: { id: parsed.data.job_id } });
    if (!job || job.status !== "active") {
      return NextResponse.json({ error: "Job not found or no longer active." }, { status: 404 });
    }

    // Ensure payment is completed if fee required. A candidate with no
    // linked account (brand-new, or a recruiter-sourced lead) has no way
    // to have paid themselves — block rather than silently skip the fee
    // requirement.
    if (job.application_fee && job.application_fee > 0) {
      if (!candidate?.user_id) {
        return NextResponse.json({
          error: "This position requires a paid application fee, which only the candidate can pay from their own account. Ask them to create an account first.",
        }, { status: 402 });
      }
      const payment = await prisma.payment.findFirst({
        where: {
          user_id: candidate.user_id,
          job_id: job.id,
          payment_status: "completed"
        }
      });

      if (!payment) {
        return NextResponse.json({
          error: "An application fee is required for this position. Please complete the payment first.",
          requiresPayment: true,
          jobId: job.id
        }, { status: 402 });
      }
    }
  }

  const [country1, sector, currentLocationCountry] = await Promise.all([
    prisma.country.findUnique({ where: { id: parsed.data.preferred_country_1_id } }),
    prisma.sector.findUnique({ where: { id: parsed.data.preferred_sector_id } }),
    prisma.country.findUnique({ where: { id: parsed.data.current_location_country_id } }),
  ]);
  if (!country1) return NextResponse.json({ error: "Preferred country (option 1) not found." }, { status: 404 });
  if (!sector) return NextResponse.json({ error: "Preferred type of work not found." }, { status: 404 });
  if (!currentLocationCountry) return NextResponse.json({ error: "Current location country not found." }, { status: 404 });

  const db = auditedPrisma(user?.userId ?? null);

  if (isNewCandidate && newCandidateInfo) {
    const isStaffSubmission = !!user && isStaffRole(user.role);
    // Only an actual Regional Recruiter self-assigns as the owner; any
    // other staff role (a supervisor stepping in, say) triggers the same
    // round-robin assignment an anonymous submission would, rather than
    // incorrectly attributing the lead to a non-recruiter.
    let recruiterId: string | null;
    if (user?.role === "regional_recruiter") {
      recruiterId = user.userId;
    } else if (user?.role === "admin") {
      recruiterId = null;
    } else {
      recruiterId = await assignNextRecruiterForCountry(parsed.data.current_location_country_id);
    }

    candidate = await db.candidate.create({
      data: {
        full_name: newCandidateInfo.full_name,
        nationality: newCandidateInfo.nationality,
        date_of_birth: new Date(newCandidateInfo.date_of_birth),
        passport_number: newCandidateInfo.passport_number,
        passport_expiry: new Date(newCandidateInfo.passport_expiry),
        second_nationality: parsed.data.second_nationality,
        current_occupation: parsed.data.current_occupation,
        highest_education: parsed.data.highest_education,
        home_address: parsed.data.home_address,
        phone: newCandidateInfo.phone,
        whatsapp_number: parsed.data.whatsapp_number,
        email: newCandidateInfo.email,
        marital_status: parsed.data.marital_status,
        consent_given: true,
        consent_at: new Date(),
        source: parsed.data.partner_id ? "partner_sourced" : isStaffSubmission ? "recruiter_sourced" : "self_registered",
        recruiter_id: recruiterId,
        country_id: parsed.data.current_location_country_id,
        partner_id: parsed.data.partner_id ?? null,
        lifecycle_status: "identified",
      },
      include: { user: true, documents: { select: { type: true } } },
    });
  }

  const activeCandidate = candidate!;

  const application = await db.application.create({
    data: {
      candidate_id: activeCandidate.id,
      job_id: parsed.data.job_id,
      cover_letter: parsed.data.cover_letter,
      preferred_country_1_id: parsed.data.preferred_country_1_id,
      preferred_country_2_id: parsed.data.preferred_country_2_id,
      preferred_country_3_id: parsed.data.preferred_country_3_id,
      preferred_sector_id: parsed.data.preferred_sector_id,
      earliest_travel_date: new Date(parsed.data.earliest_travel_date),
      prior_eu_visa_applied: parsed.data.prior_eu_visa_applied,
      documents_available: parsed.data.documents_available,
      current_location_country_id: parsed.data.current_location_country_id,
      holds_schengen_visa: parsed.data.holds_schengen_visa,
      prior_visa_refusals: parsed.data.prior_visa_refusals,
      available_for_embassy_appointment: parsed.data.available_for_embassy_appointment,
      willing_to_start_within_30_days: parsed.data.willing_to_start_within_30_days,
      preferred_contact_channel: parsed.data.preferred_contact_channel,
      payment_plan_acknowledged: parsed.data.payment_plan_acknowledged,
    },
  });

  // Auto-advance only applies to an existing candidate somehow already at
  // guided_to_apply resubmitting — a brand-new candidate always starts at
  // identified, several stages earlier.
  if (!isNewCandidate && activeCandidate.lifecycle_status === "guided_to_apply") {
    await db.candidate.update({ where: { id: activeCandidate.id }, data: { lifecycle_status: "submitted" } });
  }

  const recipientEmail = activeCandidate.user?.email ?? activeCandidate.email;
  const recipientName = activeCandidate.user?.full_name ?? activeCandidate.full_name;
  if (recipientEmail && recipientName) {
    try {
      const { sendApplicationConfirmationEmail } = await import("@/lib/email");
      await sendApplicationConfirmationEmail(recipientEmail, recipientName, job?.title ?? "your Vertex programme");
    } catch (err) {
      console.error("Failed to trigger confirmation email.", err);
    }
  }

  return NextResponse.json(application, { status: 201 });
}
