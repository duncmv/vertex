import { describe, it, expect } from "vitest";
import { canSetLifecycleStatus } from "./candidateLifecycle";

describe("canSetLifecycleStatus", () => {
  describe("regional_recruiter", () => {
    it("can advance forward up to reported", () => {
      expect(canSetLifecycleStatus("regional_recruiter", "identified", "screened").allowed).toBe(true);
      expect(canSetLifecycleStatus("regional_recruiter", "screened", "guided_to_apply").allowed).toBe(true);
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

    it("cannot manually mark a candidate submitted — that only happens once a real application exists", () => {
      const result = canSetLifecycleStatus("regional_recruiter", "guided_to_apply", "submitted");
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/real job application/i);
    });
  });

  describe("country_supervisor", () => {
    it("cannot act before a candidate has been reported", () => {
      const result = canSetLifecycleStatus("country_supervisor", "screened", "guided_to_apply");
      expect(result.allowed).toBe(false);
      expect(result.reason).toMatch(/must be reported/i);
    });

    it("can verify and approve once reported", () => {
      expect(canSetLifecycleStatus("country_supervisor", "reported", "verified").allowed).toBe(true);
      expect(canSetLifecycleStatus("country_supervisor", "verified", "approved").allowed).toBe(true);
    });

    it("can return a candidate to an earlier stage (marked isReturn)", () => {
      const result = canSetLifecycleStatus("country_supervisor", "reported", "screened");
      expect(result.allowed).toBe(true);
      expect(result.isReturn).toBe(true);
    });
  });

  describe("inhouse_supervisor and director", () => {
    it("behave the same as country_supervisor for gating purposes", () => {
      expect(canSetLifecycleStatus("inhouse_supervisor", "reported", "verified").allowed).toBe(true);
      expect(canSetLifecycleStatus("director", "reported", "verified").allowed).toBe(true);
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
