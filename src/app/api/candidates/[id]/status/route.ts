import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditedPrisma } from "@/lib/audit";
import { getAuthUser, requireRole } from "@/lib/api-auth";
import { canAccessCandidate } from "@/server/scope";
import { canSetLifecycleStatus, type LifecycleStatus } from "@/server/services/candidateLifecycle";
import { createCaseForApprovedApplication } from "@/server/services/caseLifecycle";
import { evaluateScreeningGateForCandidateId } from "@/server/services/screening";
import { updateCandidateStatusSchema } from "@/lib/validations";
import { sendCandidateInviteEmail } from "@/lib/email";

// PATCH /api/candidates/:id/status — role-gated lifecycle transition
// (SRS FR-2.4), screening-gate enforced on guided_to_apply (FR-2.5), and
// the supervisor verification-return workflow (FR-2.7).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, [
    "regional_recruiter",
    "country_supervisor",
    "inhouse_supervisor",
    "director",
    "admin",
  ]);
  if (guardRes) return guardRes;

  const { id } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: { code: "invalid_json", message: "Invalid JSON" } }, { status: 400 });
  }

  const parsed = updateCandidateStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "validation_error", message: "Validation failed", details: parsed.error.flatten().fieldErrors } },
      { status: 422 }
    );
  }

  const candidate = await prisma.candidate.findUnique({
    where: { id },
    select: {
      lifecycle_status: true,
      user_id: true,
      recruiter_id: true,
      country_id: true,
      full_name: true,
      email: true,
    },
  });
  if (!candidate) {
    return NextResponse.json({ error: { code: "not_found", message: "Candidate not found." } }, { status: 404 });
  }

  const allowedToTouch = await canAccessCandidate(user!, candidate);
  if (!allowedToTouch) {
    return NextResponse.json({ error: { code: "forbidden", message: "Forbidden." } }, { status: 403 });
  }

  // Conflict-of-interest guard, same principle as document verification:
  // the recruiter who sourced a candidate cannot also perform the
  // supervisor's verify/return action on it, even if their role would
  // otherwise permit it (e.g. an admin who happens to be listed as the
  // sourcing recruiter).
  const target = parsed.data.lifecycle_status as LifecycleStatus;
  const transition = canSetLifecycleStatus(user!.role, candidate.lifecycle_status as LifecycleStatus, target);
  if (!transition.allowed) {
    return NextResponse.json({ error: { code: "invalid_transition", message: transition.reason } }, { status: 422 });
  }

  if (transition.isReturn && !parsed.data.return_reason) {
    return NextResponse.json(
      { error: { code: "return_reason_required", message: "A reason is required when returning a candidate to an earlier stage." } },
      { status: 422 }
    );
  }

  if (target === "guided_to_apply") {
    const screening = await evaluateScreeningGateForCandidateId(id);
    // Persisted regardless of outcome — "screening result" is its own
    // standard report-content field (Regional Supervisory Operational
    // Workflow p.7), not just a live gate check that vanishes once the
    // request completes.
    await auditedPrisma(user!.userId).candidate.update({
      where: { id },
      data: { screening_result: screening.passed, screening_evaluated_at: new Date() },
    });
    if (!screening.passed) {
      return NextResponse.json(
        { error: { code: "screening_gate_failed", message: "Candidate has not cleared the screening gate.", details: screening.failures } },
        { status: 422 }
      );
    }
  }

  const updated = await auditedPrisma(user!.userId).candidate.update({
    where: { id },
    data: {
      lifecycle_status: target,
      return_reason: transition.isReturn ? parsed.data.return_reason : null,
    },
    select: {
      id: true,
      lifecycle_status: true,
      return_reason: true,
    },
  });

  // Invite the candidate to self-serve once they've been screened (SRS
  // FR-2.1) — lets them browse real jobs and submit a genuine application
  // themselves. Skipped if they already have an account, or there's no
  // email to invite yet (a phone-only lead can still be screened).
  if (target === "screened" && !candidate.user_id && candidate.email) {
    sendCandidateInviteEmail(id, candidate.email, candidate.full_name ?? "there").catch(console.error);
  }

  // A Case is the start of the Phase 4 mobility lifecycle (SRS FR-4.1/4.2)
  // — it opens once a candidate is actually "Approved by In-House"
  // (Regional Supervisory Operational Workflow p.5), the real trigger,
  // not the legacy Application.application_status field. Attached to
  // their most recent application.
  if (target === "approved") {
    const application = await prisma.application.findFirst({
      where: { candidate_id: id },
      orderBy: { submitted_at: "desc" },
    });
    if (application) {
      await createCaseForApprovedApplication(application.id, user!.userId);
    }
  }

  return NextResponse.json({ data: updated });
}
