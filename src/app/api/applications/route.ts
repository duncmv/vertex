import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { submitApplicationSchema } from "@/lib/validations";
import { getAuthUser, requireAuth } from "@/lib/api-auth";

// GET /api/applications — candidate sees their own, admin sees all
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  const guardRes = requireAuth(user);
  if (guardRes) return guardRes;

  if (user!.role === "admin") {
    const applications = await prisma.application.findMany({
      include: {
        candidate: {
          select: {
            documents: { select: { id: true, type: true } },
            user: { select: { full_name: true, email: true } },
          },
        },
        job: { select: { title: true, country: true, city: true } },
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
    include: { job: { select: { id: true, title: true, country: true, city: true, salary_range: true } } },
    orderBy: { submitted_at: "desc" },
  });

  return NextResponse.json(applications);
}

// POST /api/applications — authenticated candidate
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

  const candidate = await prisma.candidate.findUnique({
    where: { user_id: user!.userId },
    include: { user: true, documents: { select: { type: true } } },
  });
  if (!candidate) return NextResponse.json({ error: "Candidate profile not found." }, { status: 404 });

  const hasCv = candidate.documents.some((d: { type: string }) => d.type === "cv");
  const hasPassport = candidate.documents.some((d: { type: string }) => d.type === "passport");
  if (!hasCv || !hasPassport) {
    return NextResponse.json(
      { error: "You must upload both your CV and Passport scan before applying." },
      { status: 400 }
    );
  }

  const job = await prisma.job.findUnique({ where: { id: parsed.data.job_id } });
  if (!job || job.status !== "active") {
    return NextResponse.json({ error: "Job not found or no longer active." }, { status: 404 });
  }

  const existing = await prisma.application.findUnique({
    where: { candidate_id_job_id: { candidate_id: candidate.id, job_id: parsed.data.job_id } },
  });
  if (existing) {
    return NextResponse.json({ error: "You have already applied to this job." }, { status: 409 });
  }

  // Ensure payment is completed if fee required
  if (job.application_fee && job.application_fee > 0) {
    const payment = await prisma.payment.findFirst({
      where: {
        user_id: user!.userId,
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

  const application = await prisma.application.create({
    data: {
      candidate_id: candidate.id,
      job_id: parsed.data.job_id,
      cover_letter: parsed.data.cover_letter,
    },
  });

  // Import dynamically if needed or just let it fire and forget
  try {
    const { sendApplicationConfirmationEmail } = await import("@/lib/email");
    await sendApplicationConfirmationEmail(candidate.user.email, candidate.user.full_name, job.title);
  } catch (err) {
    console.error("Failed to trigger confirmation email.", err);
  }

  return NextResponse.json(application, { status: 201 });
}
