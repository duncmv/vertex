import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditedPrisma } from "@/lib/audit";
import { updateApplicationStatusSchema } from "@/lib/validations";
import { getAuthUser, requireRole } from "@/lib/api-auth";

// "Approved by In-House" is the framework's controlling position for this
// decision (Regional Supervisory Operational Workflow p.5) — admin
// retains override access, not primary ownership.
const APPLICATION_REVIEWER_ROLES = ["inhouse_supervisor", "director", "admin"] as const;

// PUT /api/applications/[id] — In-House Supervisor/Director updates status
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, [...APPLICATION_REVIEWER_ROLES]);
  if (guardRes) return guardRes;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = updateApplicationStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const application = await auditedPrisma(user!.userId).application.update({
    where: { id },
    data: { application_status: parsed.data.application_status },
    include: {
      candidate: { include: { user: true } },
      job: true,
      preferred_sector: true,
    }
  });

  // This legacy hiring-status field is distinct from the candidate's own
  // lifecycle_status — Case creation (SRS FR-4.1/4.2) is now triggered by
  // Candidate.lifecycle_status reaching "approved" (see
  // /api/candidates/[id]/status), the real framework-defined trigger
  // ("Approved by In-House"), not this field.

  // A recruiter-sourced candidate with no linked account yet has no email
  // to send to (SRS FR-2.1) — skip rather than crash.
  if (application.candidate.user) {
    try {
      const { sendStatusUpdateEmail } = await import("@/lib/email");
      await sendStatusUpdateEmail(
        application.candidate.user.email,
        application.candidate.user.full_name,
        application.job?.title ?? application.preferred_sector?.name ?? "your Vertex programme",
        parsed.data.application_status
      );
    } catch (err) {
      console.error("Failed to send status update email.", err);
    }
  }

  return NextResponse.json(application);
}

// GET /api/applications/[id] — In-House/Director/admin, or the owning candidate
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      candidate: { include: { user: { select: { full_name: true, email: true } } } },
      job: true,
    },
  });

  if (!application) return NextResponse.json({ error: "Application not found." }, { status: 404 });

  const isReviewer = (APPLICATION_REVIEWER_ROLES as readonly string[]).includes(user.role);
  if (!isReviewer && application.candidate.user_id !== user.userId) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  return NextResponse.json(application);
}
