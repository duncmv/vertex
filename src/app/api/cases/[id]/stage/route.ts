import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auditedPrisma } from "@/lib/audit";
import { advanceCaseStageSchema } from "@/lib/validations";
import { getAuthUser, requireRole } from "@/lib/api-auth";
import { canAccessCase } from "@/server/scope";
import { canSetCaseStage, type CaseStage } from "@/server/services/caseLifecycle";

const CASE_ACCESS_ROLES = ["regional_recruiter", "country_supervisor", "inhouse_supervisor", "director", "admin"] as const;

// PATCH /api/cases/:id/stage — advance or return a case's stage (SRS FR-4.2).
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getAuthUser(req);
  const guardRes = requireRole(user, [...CASE_ACCESS_ROLES]);
  if (guardRes) return guardRes;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = advanceCaseStageSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 422 });
  }

  const caseRecord = await prisma.case.findUnique({
    where: { id },
    include: {
      application: { include: { candidate: { include: { user: true } }, job: true, preferred_sector: true } },
      stage_events: { where: { completed_at: null } },
    },
  });
  if (!caseRecord) return NextResponse.json({ error: "Case not found." }, { status: 404 });

  const allowed = await canAccessCase(user!, {
    user_id: caseRecord.application.candidate.user_id,
    recruiter_id: caseRecord.application.candidate.recruiter_id,
    country_id: caseRecord.application.candidate.country_id,
  });
  if (!allowed) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const check = canSetCaseStage(user!.role, caseRecord.current_stage as CaseStage, parsed.data.stage);
  if (!check.allowed) {
    return NextResponse.json({ error: check.reason ?? "Transition not allowed." }, { status: 403 });
  }

  const db = auditedPrisma(user!.userId);

  // Close out the currently-open stage event.
  for (const openEvent of caseRecord.stage_events) {
    await db.caseStageEvent.update({ where: { id: openEvent.id }, data: { completed_at: new Date() } });
  }

  await db.caseStageEvent.create({
    data: {
      case_id: id,
      stage: parsed.data.stage,
      owner_id: user!.userId,
      notes: parsed.data.notes,
    },
  });

  await db.case.update({
    where: { id },
    data: {
      current_stage: parsed.data.stage,
      stage_deadline: parsed.data.stage_deadline ? new Date(parsed.data.stage_deadline) : null,
    },
  });

  // 90-day retention follow-up (SRS FR-4.7) auto-starts once a case
  // reaches the final stage — travel & settlement.
  if (parsed.data.stage === "travel_settlement") {
    const existingFollowUp = await prisma.retentionFollowUp.findUnique({ where: { case_id: id } });
    if (!existingFollowUp) {
      const dueAt = new Date();
      dueAt.setDate(dueAt.getDate() + 90);
      await db.retentionFollowUp.create({ data: { case_id: id, due_at: dueAt } });
    }
  }

  const updated = await prisma.case.findUnique({
    where: { id },
    include: { stage_events: { orderBy: { entered_at: "asc" } } },
  });

  // SRS FR-4.8: automated stage-based notification — best-effort, never
  // blocks the stage change itself (same pattern as every other email in
  // this codebase; a candidate without a linked account yet is skipped).
  if (caseRecord.application.candidate.user) {
    const { sendCaseStageUpdateEmail } = await import("@/lib/email");
    sendCaseStageUpdateEmail(
      caseRecord.application.candidate.user.email,
      caseRecord.application.candidate.user.full_name,
      caseRecord.application.job?.title ?? caseRecord.application.preferred_sector?.name ?? "your programme",
      parsed.data.stage
    ).catch((err) => console.error("Failed to send case stage update email.", err));
  }

  return NextResponse.json({ data: updated });
}
