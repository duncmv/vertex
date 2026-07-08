import { describe, it, expect } from "vitest";
import { canReviewReport, canSubmitReport } from "./reportWorkflow";

describe("canSubmitReport", () => {
  it("only a regional_recruiter can submit a recruiter-scope report", () => {
    expect(canSubmitReport("regional_recruiter", "recruiter")).toBe(true);
    expect(canSubmitReport("country_supervisor", "recruiter")).toBe(false);
    expect(canSubmitReport("inhouse_supervisor", "recruiter")).toBe(false);
  });

  it("only a country_supervisor can submit a country-scope report", () => {
    expect(canSubmitReport("country_supervisor", "country")).toBe(true);
    expect(canSubmitReport("regional_recruiter", "country")).toBe(false);
  });

  it("admin can submit at any scope", () => {
    expect(canSubmitReport("admin", "recruiter")).toBe(true);
    expect(canSubmitReport("admin", "country")).toBe(true);
  });
});

describe("canReviewReport", () => {
  it("only a country_supervisor reviews recruiter-scope reports — the one controlling position", () => {
    expect(canReviewReport("country_supervisor", "recruiter")).toBe(true);
    expect(canReviewReport("regional_recruiter", "recruiter")).toBe(false);
    expect(canReviewReport("inhouse_supervisor", "recruiter")).toBe(false);
  });

  it("only in-house or director review country-scope reports", () => {
    expect(canReviewReport("inhouse_supervisor", "country")).toBe(true);
    expect(canReviewReport("director", "country")).toBe(true);
    expect(canReviewReport("country_supervisor", "country")).toBe(false);
  });

  it("admin can review at any scope", () => {
    expect(canReviewReport("admin", "recruiter")).toBe(true);
    expect(canReviewReport("admin", "country")).toBe(true);
  });

  it("a candidate can never review a report", () => {
    expect(canReviewReport("candidate", "recruiter")).toBe(false);
    expect(canReviewReport("candidate", "country")).toBe(false);
  });
});
