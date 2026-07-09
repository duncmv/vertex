import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditedPrisma } from "@/lib/audit";
import { getAuthUser, requireAdmin } from "@/lib/api-auth";
import { sendStatusUpdateEmail, sendInterviewInvitationEmail } from "@/lib/email";
import { createCaseForApprovedApplication } from "@/server/services/caseLifecycle";

// GET /api/admin/applications/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  const guardRes = requireAdmin(user);
  if (guardRes) return guardRes;

  const { id } = await params;
  try {
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        candidate: {
          include: {
            // full_name/email/phone are the fallback fields for a
            // recruiter-sourced candidate with no linked account yet — user
            // being null is a real, reachable state (SRS FR-2.1), not an
            // edge case to assume away.
            user: { select: { full_name: true, email: true, phone: true, country: true } },
            documents: { select: { id: true, type: true, verification_status: true } },
          }
        },
        job: true,
      }
    });

    if (!application) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    return NextResponse.json(application);
  } catch (err) {
    console.error("Failed to fetch application:", err);
    return NextResponse.json({ error: "Failed to fetch application details" }, { status: 500 });
  }
}

// PUT /api/admin/applications/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  const guardRes = requireAdmin(user);
  if (guardRes) return guardRes;

  const { id } = await params;
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const existingApp = await prisma.application.findUnique({
      where: { id },
      include: {
        candidate: { include: { user: true } },
        job: true
      }
    });

    if (!existingApp) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updateData: any = {};
    if (body.application_status !== undefined) updateData.application_status = body.application_status;
    if (body.internal_notes !== undefined) updateData.internal_notes = body.internal_notes;
    if (body.interview_date !== undefined) updateData.interview_date = body.interview_date ? new Date(body.interview_date) : null;

    const updated = await auditedPrisma(user!.userId).application.update({
      where: { id },
      data: updateData,
    });

    // A Case is the start of the Phase 4 mobility lifecycle (SRS FR-4.1/4.2)
    // — this is the second of two admin paths that can approve an
    // application (the other is the list view's inline status dropdown),
    // so both must open the case, not just one.
    if (body.application_status === "approved") {
      await createCaseForApprovedApplication(id, user!.userId);
    }

    // A recruiter-sourced candidate with no linked account yet has no
    // email to send to (SRS FR-2.1) — skip rather than crash.
    if (existingApp.candidate.user) {
      if (body.application_status && body.application_status !== existingApp.application_status) {
        await sendStatusUpdateEmail(
          existingApp.candidate.user.email,
          existingApp.candidate.user.full_name,
          existingApp.job.title,
          body.application_status
        );
      }

      if (body.interview_date && (!existingApp.interview_date || new Date(body.interview_date).getTime() !== existingApp.interview_date.getTime())) {
        await sendInterviewInvitationEmail(
          existingApp.candidate.user.email,
          existingApp.candidate.user.full_name,
          existingApp.job.title,
          new Date(body.interview_date)
        );
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Error updating application:", err);
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
  }
}
