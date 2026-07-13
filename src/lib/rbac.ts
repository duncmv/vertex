import type { Role } from "@prisma/client";

/**
 * Central role/portal permission table (SRS FR-1.1, FR-1.2).
 * Every route/page authorization check should read from here rather than
 * reimplementing "who can see what" locally.
 */

// Portal path prefix -> roles allowed to access it.
export const PORTAL_ACCESS: Record<string, Role[]> = {
  "/dashboard": ["candidate"],
  "/recruiter": ["regional_recruiter", "admin"],
  "/supervisor": ["country_supervisor", "admin"],
  "/inhouse": ["inhouse_supervisor", "admin"],
  "/management": ["director", "admin"],
  "/marketing": ["marketing", "admin"],
  "/partner": ["partner", "admin"],
  "/admin": ["admin"],
};

// Where each role lands after login / when redirected away from a portal it can't access.
export const ROLE_HOME: Record<Role, string> = {
  candidate: "/dashboard",
  regional_recruiter: "/recruiter",
  country_supervisor: "/supervisor",
  inhouse_supervisor: "/inhouse",
  director: "/management",
  marketing: "/marketing/jobs",
  partner: "/partner",
  admin: "/admin",
};

// Roles that manage other staff (used for supervisor-assignment validation,
// SRS FR-1.3) — the three-tier operational hierarchy only. "marketing" and
// "partner" are deliberately excluded: marketing is solely responsible for
// job postings and partner is an external agency's own login (SRS
// FR-5.1) — neither is part of this hierarchy, and shouldn't incidentally
// inherit the broader candidate/application access several checks gate on
// isStaffRole().
export const STAFF_ROLES: Role[] = [
  "regional_recruiter",
  "country_supervisor",
  "inhouse_supervisor",
  "director",
  "admin",
];

export function isStaffRole(role: Role): boolean {
  return STAFF_ROLES.includes(role);
}

export function canAccessPortal(role: Role, pathname: string): boolean {
  const prefix = Object.keys(PORTAL_ACCESS).find((p) => pathname.startsWith(p));
  if (!prefix) return true; // not a portal-gated path
  return PORTAL_ACCESS[prefix].includes(role);
}

export function homeFor(role: Role): string {
  return ROLE_HOME[role] ?? "/";
}

// Every role-based portal shell (including the candidate's own /dashboard,
// rebuilt on PortalShell 2026-07-13 to match the others) renders its own
// chrome and should NOT also get the public marketing Navbar/Footer/chat
// widgets.
const INTERNAL_PORTAL_PREFIXES = ["/admin", "/recruiter", "/supervisor", "/inhouse", "/management", "/marketing", "/partner", "/dashboard"];

export function isInternalPortalPath(pathname: string): boolean {
  return INTERNAL_PORTAL_PREFIXES.some((p) => pathname.startsWith(p));
}
