import type { Role, ScopeLevel } from "@prisma/client";

/**
 * "One defined controlling position and approval point per process" (SRS
 * FR-3.5): a recruiter-scope report has exactly one reviewer role (the
 * country supervisor); a country-scope report has exactly one reviewer
 * role (in-house supervisor / director). Admin is the universal override,
 * matching every other role-gated workflow in this codebase.
 */
export function canReviewReport(role: Role, scopeLevel: ScopeLevel): boolean {
  if (role === "admin") return true;
  if (scopeLevel === "recruiter") return role === "country_supervisor";
  if (scopeLevel === "country") return role === "inhouse_supervisor" || role === "director";
  return false;
}

/** Who may create/submit a new report at a given scope (SRS FR-3.4). */
export function canSubmitReport(role: Role, scopeLevel: ScopeLevel): boolean {
  if (role === "admin") return true;
  if (scopeLevel === "recruiter") return role === "regional_recruiter";
  if (scopeLevel === "country") return role === "country_supervisor";
  return false;
}
