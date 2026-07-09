import type { Role } from "@prisma/client";

export type LifecycleStatus =
  | "identified"
  | "screened"
  | "guided_to_apply"
  | "submitted"
  | "reported"
  | "verified"
  | "approved";

export const STATUS_ORDER: LifecycleStatus[] = [
  "identified",
  "screened",
  "guided_to_apply",
  "submitted",
  "reported",
  "verified",
  "approved",
];

// A recruiter drives a candidate up to and including "reported" — the
// hand-off point to their supervisor (SRS FR-2.1). A supervisor picks up
// from "reported" onward, or returns a candidate to an earlier stage for
// correction (FR-2.7).
const RECRUITER_MAX_STATUS: LifecycleStatus = "reported";
const SUPERVISOR_MIN_STATUS: LifecycleStatus = "reported";

// Country Supervisor's ceiling is "Verified" (Candidate Status Lifecycle
// stage 6, Regional Supervisory Operational Workflow p.5) — "Approved"
// (stage 7) is explicitly In-House Supervisor's controlling position
// ("Approved by In-House"), not a country-tier action.
const IN_HOUSE_ROLES: Role[] = ["inhouse_supervisor", "director"];

export interface TransitionCheck {
  allowed: boolean;
  reason?: string;
  isReturn: boolean;
}

/**
 * Role-gated lifecycle transition rules (SRS FR-2.4, FR-2.5, FR-2.7).
 * Screening-gate evaluation for the guided_to_apply transition happens
 * separately (server/services/screening.ts) — this only decides whether
 * the requester's role may attempt the move at all.
 */
export function canSetLifecycleStatus(role: Role, from: LifecycleStatus, to: LifecycleStatus): TransitionCheck {
  const fromIdx = STATUS_ORDER.indexOf(from);
  const toIdx = STATUS_ORDER.indexOf(to);
  const isReturn = toIdx < fromIdx;

  if (toIdx === fromIdx) {
    return { allowed: false, reason: "Candidate is already in that status.", isReturn: false };
  }

  if (role === "admin") {
    return { allowed: true, isReturn };
  }

  if (role === "regional_recruiter") {
    if (isReturn) {
      return { allowed: false, reason: "Recruiters cannot move a candidate backward — only a supervisor can return one.", isReturn };
    }
    if (from === "guided_to_apply" && to === "submitted") {
      return {
        allowed: false,
        reason: "Submission happens automatically once a real job application exists — submit one yourself on the candidate's behalf, or wait for them to apply through their own account.",
        isReturn,
      };
    }
    if (toIdx > STATUS_ORDER.indexOf(RECRUITER_MAX_STATUS)) {
      return { allowed: false, reason: "Only a supervisor can verify or approve a candidate.", isReturn };
    }
    return { allowed: true, isReturn };
  }

  if (IN_HOUSE_ROLES.includes(role)) {
    if (!isReturn && fromIdx < STATUS_ORDER.indexOf(SUPERVISOR_MIN_STATUS)) {
      return { allowed: false, reason: "A candidate must be reported by a recruiter before a supervisor can act on it.", isReturn };
    }
    return { allowed: true, isReturn };
  }

  if (role === "country_supervisor") {
    if (from === "approved" || to === "approved") {
      return { allowed: false, reason: "Only In-House can approve a candidate, or reverse an approval.", isReturn };
    }
    if (!isReturn && fromIdx < STATUS_ORDER.indexOf(SUPERVISOR_MIN_STATUS)) {
      return { allowed: false, reason: "A candidate must be reported by a recruiter before a supervisor can act on it.", isReturn };
    }
    return { allowed: true, isReturn };
  }

  return { allowed: false, reason: "This role cannot update candidate status.", isReturn };
}
