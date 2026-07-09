import type { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { auditedPrisma } from "@/lib/audit";

export type CaseStage =
  | "application_submitted"
  | "verification"
  | "offer_issued"
  | "initial_payment"
  | "permit_processing"
  | "permit_delivered"
  | "final_payment"
  | "visa_application"
  | "visa_guidance"
  | "visa_approved"
  | "travel_settlement";

// SRS FR-4.1's full 11-stage journey.
export const CASE_STAGE_ORDER: CaseStage[] = [
  "application_submitted",
  "verification",
  "offer_issued",
  "initial_payment",
  "permit_processing",
  "permit_delivered",
  "final_payment",
  "visa_application",
  "visa_guidance",
  "visa_approved",
  "travel_settlement",
];

const SUPERVISOR_ROLES: Role[] = ["country_supervisor", "inhouse_supervisor", "director"];

export interface CaseTransitionCheck {
  allowed: boolean;
  reason?: string;
  isReturn: boolean;
}

/**
 * Role-gated case-stage transition rules (SRS FR-4.2). Unlike the Phase 2
 * candidate lifecycle, the SRS doesn't define a fixed hand-off boundary
 * between recruiter and supervisor for the 11 case stages — a case is a
 * long-running, multi-month logistics process a recruiter drives
 * end-to-end (arranging permits, visas, travel), with supervisors able to
 * step in or correct at any point rather than only past one gate. So the
 * rule mirrors the candidate lifecycle's shape (recruiter advances
 * forward only; only a supervisor+ can move a case backward) without
 * reusing its single hard boundary.
 */
export function canSetCaseStage(role: Role, from: CaseStage, to: CaseStage): CaseTransitionCheck {
  const fromIdx = CASE_STAGE_ORDER.indexOf(from);
  const toIdx = CASE_STAGE_ORDER.indexOf(to);
  const isReturn = toIdx < fromIdx;

  if (toIdx === fromIdx) {
    return { allowed: false, reason: "Case is already at that stage.", isReturn: false };
  }

  if (role === "admin") {
    return { allowed: true, isReturn };
  }

  if (role === "regional_recruiter") {
    if (isReturn) {
      return { allowed: false, reason: "Recruiters cannot move a case backward — only a supervisor can return one.", isReturn };
    }
    return { allowed: true, isReturn };
  }

  if (SUPERVISOR_ROLES.includes(role)) {
    return { allowed: true, isReturn };
  }

  return { allowed: false, reason: "This role cannot update case status.", isReturn };
}

/**
 * SRS FR-4.1/4.2: a Case is the start of the mobility lifecycle — it only
 * makes sense once an application has actually been approved, and there's
 * exactly one Case per Application. Idempotent: calling this again for an
 * application that already has a case is a no-op, returning the existing
 * one, so callers don't need to check first.
 */
export async function createCaseForApprovedApplication(applicationId: string, actorId: string) {
  const existing = await prisma.case.findUnique({ where: { application_id: applicationId } });
  if (existing) return existing;

  const db = auditedPrisma(actorId);
  const newCase = await db.case.create({ data: { application_id: applicationId } });
  await db.caseStageEvent.create({ data: { case_id: newCase.id, stage: "application_submitted" } });
  return newCase;
}
