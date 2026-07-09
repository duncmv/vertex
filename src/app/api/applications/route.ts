import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditedPrisma } from "@/lib/audit";
import { submitApplicationSchema } from "@/lib/validations";
import { getAuthUser, requireAuth } from "@/lib/api-auth";
import { isStaffRole } from "@/lib/rbac";
import { canAccessCandidate, scopeCandidatesToRequester } from "@/server/scope";

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

// POST /api/applications — an authenticated candidate submits for
// themselves, or a recruiter/supervisor submits on behalf of a
// recruiter-sourced lead who has no account yet (SRS FR-2.1). Either path
// creates a real Application record, which is what actually advances a
// candidate's lifecycle_status to "submitted" — that status is no longer
// something a recruiter can just flip manually (see candidateLifecycle.ts).
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireAuth(user);
  if (guardRes) return guardRes;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = submitApplicationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  let candidate;
  if (parsed.data.candidate_id) {
    if (!isStaffRole(user!.role)) {
      return NextResponse.json({ error: "Only staff can submit an application on behalf of a candidate." }, { status: 403 });
    }
    candidate = await prisma.candidate.findUnique({
      where: { id: parsed.data.candidate_id },
      include: { user: true, documents: { select: { type: true } } },
    });
    if (!candidate) return NextResponse.json({ error: "Candidate not found." }, { status: 404 });
    if (!(await canAccessCandidate(user!, candidate))) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  } else {
    candidate = await prisma.candidate.findUnique({
      where: { user_id: user!.userId },
      include: { user: true, documents: { select: { type: true } } },
    });
    if (!candidate) return NextResponse.json({ error: "Candidate profile not found." }, { status: 404 });
  }

  const hasCv = candidate.documents.some((d: { type: string }) => d.type === "cv");
  const hasPassport = candidate.documents.some((d: { type: string }) => d.type === "passport");
  if (!hasCv || !hasPassport) {
    return NextResponse.json(
      { error: "A CV and Passport scan must be uploaded before applying." },
      { status: 400 }
    );
  }

  // A candidate already mid-pipeline shouldn't be able to submit a second,
  // conflicting Candidate Information Form — resubmission belongs to
  // whichever staff role owns that stage (e.g. a supervisor Return).
  const existing = await prisma.application.findFirst({
    where: { candidate_id: candidate.id, application_status: { not: "rejected" } },
  });
  if (existing) {
    return NextResponse.json({ error: "This candidate already has an active application on file." }, { status: 409 });
  }

  // job_id stays for when real job matching exists — jobs aren't listed on
  // the platform yet, so this is optional and usually absent.
  let job = null;
  if (parsed.data.job_id) {
    job = await prisma.job.findUnique({ where: { id: parsed.data.job_id } });
    if (!job || job.status !== "active") {
      return NextResponse.json({ error: "Job not found or no longer active." }, { status: 404 });
    }

    // Ensure payment is completed if fee required. A recruiter-sourced
    // candidate with no linked account has no way to have paid themselves —
    // block rather than silently skip the fee requirement.
    if (job.application_fee && job.application_fee > 0) {
      if (!candidate.user_id) {
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

  const [country1, sector] = await Promise.all([
    prisma.country.findUnique({ where: { id: parsed.data.preferred_country_1_id } }),
    prisma.sector.findUnique({ where: { id: parsed.data.preferred_sector_id } }),
  ]);
  if (!country1) return NextResponse.json({ error: "Preferred country (option 1) not found." }, { status: 404 });
  if (!sector) return NextResponse.json({ error: "Preferred type of work not found." }, { status: 404 });

  const db = auditedPrisma(user!.userId);

  const application = await db.application.create({
    data: {
      candidate_id: candidate.id,
      job_id: parsed.data.job_id,
      cover_letter: parsed.data.cover_letter,
      preferred_country_1_id: parsed.data.preferred_country_1_id,
      preferred_country_2_id: parsed.data.preferred_country_2_id,
      preferred_country_3_id: parsed.data.preferred_country_3_id,
      preferred_sector_id: parsed.data.preferred_sector_id,
      earliest_travel_date: new Date(parsed.data.earliest_travel_date),
      prior_eu_visa_applied: parsed.data.prior_eu_visa_applied,
      current_location_country: parsed.data.current_location_country,
      holds_schengen_visa: parsed.data.holds_schengen_visa,
      prior_visa_refusals: parsed.data.prior_visa_refusals,
      available_for_embassy_appointment: parsed.data.available_for_embassy_appointment,
      willing_to_start_within_30_days: parsed.data.willing_to_start_within_30_days,
      preferred_contact_channel: parsed.data.preferred_contact_channel,
      payment_plan_acknowledged: parsed.data.payment_plan_acknowledged,
    },
  });

  // Auto-advance the pre-application lifecycle now that a real submission
  // exists (SRS FR-2.4) — only from guided_to_apply, so this doesn't
  // clobber a candidate a supervisor has already moved further along.
  if (candidate.lifecycle_status === "guided_to_apply") {
    await db.candidate.update({ where: { id: candidate.id }, data: { lifecycle_status: "submitted" } });
  }

  const recipientEmail = candidate.user?.email ?? candidate.email;
  const recipientName = candidate.user?.full_name ?? candidate.full_name;
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
