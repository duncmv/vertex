import { describe, it, expect } from "vitest";
import { canSetLifecycleStatus } from "./candidateLifecycle";

describe("canSetLifecycleStatus", () => {
  describe("regional_recruiter", () => {
    it("can advance forward up to reported, except the two system-only stages", () => {
      expect(canSetLifecycleStatus("regional_recruiter", "identified", "screened").allowed).toBe(true);
      expect(canSetLifecycleStatus("regional_recruiter", "submitted", "reported").allowed).toBe(true);
    });

    it("cannot verify or approve", () => {
      const result = canSetLifecycleStatus("regional_recruiter", "reported", "verified");
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/only a supervisor/i);
    });

    it("cannot move a candidate backward", () => {
      const result = canSetLifecycleStatus("regional_recruiter", "guided_to_apply", "screened");
      expect(result.allowed).toBe(false);
      expect(result.isReturn).toBe(true);
    });

    it("cannot manually mark a candidate guided_to_apply — that only happens once the candidate claims their invite and creates an account", () => {
      const result = canSetLifecycleStatus("regional_recruiter", "screened", "guided_to_apply");
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/claims their emailed invite/i);
    });

    it("cannot manually mark a candidate submitted — that only happens once required documents are uploaded", () => {
      const result = canSetLifecycleStatus("regional_recruiter", "guided_to_apply", "submitted");
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/documents are uploaded/i);
    });
  });

  describe("country_supervisor", () => {
    it("cannot act before a candidate has been reported", () => {
      const result = canSetLifecycleStatus("country_supervisor", "screened", "guided_to_apply");
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/must be reported/i);
    });

    it("can verify once reported", () => {
      expect(canSetLifecycleStatus("country_supervisor", "reported", "verified").allowed).toBe(true);
    });

    it("cannot approve — that's In-House's controlling position (Regional Supervisory Operational Workflow, Candidate Status Lifecycle stage 7)", () => {
      const result = canSetLifecycleStatus("country_supervisor", "verified", "approved");
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/only in-house/i);
    });

    it("cannot touch a candidate that's already approved, including reversing the approval", () => {
      const result = canSetLifecycleStatus("country_supervisor", "approved", "verified");
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/only in-house/i);
    });

    it("can return a candidate to an earlier stage (marked isReturn)", () => {
      const result = canSetLifecycleStatus("country_supervisor", "reported", "screened");
      expect(result.allowed).toBe(true);
      expect(result.isReturn).toBe(true);
    });
  });

  describe("inhouse_supervisor and director", () => {
    it("can verify, same as country_supervisor", () => {
      expect(canSetLifecycleStatus("inhouse_supervisor", "reported", "verified").allowed).toBe(true);
      expect(canSetLifecycleStatus("director", "reported", "verified").allowed).toBe(true);
    });

    it("can also approve, unlike country_supervisor", () => {
      expect(canSetLifecycleStatus("inhouse_supervisor", "verified", "approved").allowed).toBe(true);
      expect(canSetLifecycleStatus("director", "verified", "approved").allowed).toBe(true);
    });

    it("can reverse an approval", () => {
      const result = canSetLifecycleStatus("inhouse_supervisor", "approved", "verified");
      expect(result.allowed).toBe(true);
      expect(result.isReturn).toBe(true);
    });
  });

  describe("admin", () => {
    it("is unrestricted in either direction", () => {
      expect(canSetLifecycleStatus("admin", "identified", "approved").allowed).toBe(true);
      expect(canSetLifecycleStatus("admin", "approved", "identified").allowed).toBe(true);
    });
  });

  describe("candidate", () => {
    it("cannot update their own lifecycle status", () => {
      expect(canSetLifecycleStatus("candidate", "identified", "screened").allowed).toBe(false);
    });
  });

  it("rejects a no-op transition to the same status", () => {
    const result = canSetLifecycleStatus("admin", "screened", "screened");
    expect(result.allowed).toBe(false);
  });
});
