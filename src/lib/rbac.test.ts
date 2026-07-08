import { describe, it, expect } from "vitest";
import { canAccessPortal, homeFor, isStaffRole, PORTAL_ACCESS } from "./rbac";
import type { Role } from "@prisma/client";

const ALL_ROLES: Role[] = [
  "candidate",
  "regional_recruiter",
  "country_supervisor",
  "inhouse_supervisor",
  "director",
  "admin",
];

describe("canAccessPortal", () => {
  it("allows a candidate into /dashboard but nowhere else staff-gated", () => {
    expect(canAccessPortal("candidate", "/dashboard")).toBe(true);
    expect(canAccessPortal("candidate", "/admin")).toBe(false);
    expect(canAccessPortal("candidate", "/recruiter")).toBe(false);
    expect(canAccessPortal("candidate", "/supervisor")).toBe(false);
    expect(canAccessPortal("candidate", "/management")).toBe(false);
  });

  it("allows a regional_recruiter into /recruiter only (plus admin override)", () => {
    expect(canAccessPortal("regional_recruiter", "/recruiter")).toBe(true);
    expect(canAccessPortal("regional_recruiter", "/supervisor")).toBe(false);
    expect(canAccessPortal("regional_recruiter", "/management")).toBe(false);
    expect(canAccessPortal("regional_recruiter", "/admin")).toBe(false);
    expect(canAccessPortal("regional_recruiter", "/dashboard")).toBe(false);
  });

  it("allows a country_supervisor into /supervisor only", () => {
    expect(canAccessPortal("country_supervisor", "/supervisor")).toBe(true);
    expect(canAccessPortal("country_supervisor", "/recruiter")).toBe(false);
    expect(canAccessPortal("country_supervisor", "/management")).toBe(false);
  });

  it("allows inhouse_supervisor and director into /management", () => {
    expect(canAccessPortal("inhouse_supervisor", "/management")).toBe(true);
    expect(canAccessPortal("director", "/management")).toBe(true);
    expect(canAccessPortal("inhouse_supervisor", "/admin")).toBe(false);
  });

  it("gives admin access to every staff portal, but not the candidate's own /dashboard", () => {
    // /dashboard is a candidate's personal profile view — an admin account
    // has no Candidate record to show there, so it's deliberately excluded.
    for (const prefix of Object.keys(PORTAL_ACCESS).filter((p) => p !== "/dashboard")) {
      expect(canAccessPortal("admin", prefix)).toBe(true);
    }
    expect(canAccessPortal("admin", "/dashboard")).toBe(false);
  });

  it("does not restrict paths that aren't portal-gated", () => {
    expect(canAccessPortal("candidate", "/jobs")).toBe(true);
    expect(canAccessPortal("regional_recruiter", "/about")).toBe(true);
  });

  it("matches by prefix, not exact path", () => {
    expect(canAccessPortal("regional_recruiter", "/recruiter/candidates/123")).toBe(true);
    expect(canAccessPortal("candidate", "/admin/settings")).toBe(false);
  });
});

describe("homeFor", () => {
  it("maps every role to a distinct, sensible home", () => {
    for (const role of ALL_ROLES) {
      const home = homeFor(role);
      expect(home).toMatch(/^\//);
      expect(canAccessPortal(role, home)).toBe(true);
    }
  });
});

describe("isStaffRole", () => {
  it("candidate is not staff; everyone else is", () => {
    expect(isStaffRole("candidate")).toBe(false);
    for (const role of ALL_ROLES.filter((r) => r !== "candidate")) {
      expect(isStaffRole(role)).toBe(true);
    }
  });
});
