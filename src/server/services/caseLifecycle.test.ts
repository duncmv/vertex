import { describe, it, expect } from "vitest";
import { canSetCaseStage, CASE_STAGE_ORDER } from "./caseLifecycle";

describe("CASE_STAGE_ORDER", () => {
  it("has all 11 stages from SRS FR-4.1", () => {
    expect(CASE_STAGE_ORDER).toHaveLength(11);
    expect(CASE_STAGE_ORDER[0]).toBe("application_submitted");
    expect(CASE_STAGE_ORDER[CASE_STAGE_ORDER.length - 1]).toBe("travel_settlement");
  });
});

describe("canSetCaseStage", () => {
  it("a recruiter can advance a case forward", () => {
    const check = canSetCaseStage("regional_recruiter", "application_submitted", "verification");
    expect(check.allowed).toBe(true);
    expect(check.isReturn).toBe(false);
  });

  it("a recruiter cannot move a case backward", () => {
    const check = canSetCaseStage("regional_recruiter", "offer_issued", "verification");
    expect(check.allowed).toBe(false);
    expect(check.isReturn).toBe(true);
  });

  it("a recruiter can advance all the way to the final stage", () => {
    const check = canSetCaseStage("regional_recruiter", "visa_approved", "travel_settlement");
    expect(check.allowed).toBe(true);
  });

  it("a supervisor can move a case backward to correct it", () => {
    const check = canSetCaseStage("country_supervisor", "permit_processing", "verification");
    expect(check.allowed).toBe(true);
    expect(check.isReturn).toBe(true);
  });

  it("a supervisor can also advance a case forward", () => {
    const check = canSetCaseStage("inhouse_supervisor", "final_payment", "visa_application");
    expect(check.allowed).toBe(true);
    expect(check.isReturn).toBe(false);
  });

  it("admin can move a case in either direction", () => {
    expect(canSetCaseStage("admin", "verification", "offer_issued").allowed).toBe(true);
    expect(canSetCaseStage("admin", "offer_issued", "verification").allowed).toBe(true);
  });

  it("rejects setting a case to its current stage", () => {
    const check = canSetCaseStage("admin", "verification", "verification");
    expect(check.allowed).toBe(false);
  });

  it("a candidate cannot move their own case", () => {
    const check = canSetCaseStage("candidate", "application_submitted", "verification");
    expect(check.allowed).toBe(false);
  });
});
