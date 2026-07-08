import { describe, it, expect } from "vitest";
import { evaluateScreeningGate } from "./screening";

function baseCandidate() {
  return {
    full_name: "Jane Doe",
    nationality: "Kenyan",
    date_of_birth: new Date("1995-01-01"),
    passport_number: "P12345678",
    phone: "+254700000000",
    email: "jane@example.com",
    desired_role: "Warehouse Operative",
    consent_given: true,
    user: null,
    documents: [
      { type: "cv", verification_status: "pending" },
      { type: "passport", verification_status: "pending" },
    ],
  };
}

describe("evaluateScreeningGate", () => {
  it("passes a fully complete candidate", () => {
    const result = evaluateScreeningGate(baseCandidate());
    expect(result.passed).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it("prefers the linked User's identity over the candidate's own fields", () => {
    const candidate = {
      ...baseCandidate(),
      full_name: null,
      phone: null,
      email: null,
      user: { full_name: "Linked User", email: "linked@example.com", phone: "+254711111111" },
    };
    const result = evaluateScreeningGate(candidate);
    expect(result.passed).toBe(true);
  });

  it("fails when nationality is missing", () => {
    const result = evaluateScreeningGate({ ...baseCandidate(), nationality: null });
    expect(result.passed).toBe(false);
    expect(result.failures).toContain("Nationality is missing.");
  });

  it("fails when phone is missing, even with an email on file", () => {
    const result = evaluateScreeningGate({ ...baseCandidate(), phone: null });
    expect(result.passed).toBe(false);
    expect(result.failures).toContain("Phone number is missing.");
  });

  it("fails when email is missing, even with a phone on file — phone alone was enough to register but not to be guided to apply", () => {
    const result = evaluateScreeningGate({ ...baseCandidate(), email: null });
    expect(result.passed).toBe(false);
    expect(result.failures).toContain("Email address is missing.");
  });

  it("fails when desired_role is missing", () => {
    const result = evaluateScreeningGate({ ...baseCandidate(), desired_role: null });
    expect(result.passed).toBe(false);
    expect(result.failures).toContain("Desired role is missing.");
  });

  it("fails a candidate under the minimum age", () => {
    const tenYearsAgo = new Date();
    tenYearsAgo.setFullYear(tenYearsAgo.getFullYear() - 10);
    const result = evaluateScreeningGate({ ...baseCandidate(), date_of_birth: tenYearsAgo });
    expect(result.passed).toBe(false);
    expect(result.failures.some((f) => f.includes("minimum eligible age"))).toBe(true);
  });

  it("fails when CV is missing", () => {
    const result = evaluateScreeningGate({
      ...baseCandidate(),
      documents: [{ type: "passport", verification_status: "pending" }],
    });
    expect(result.passed).toBe(false);
    expect(result.failures).toContain("CV has not been uploaded.");
  });

  it("fails when a document was rejected, even if present", () => {
    const result = evaluateScreeningGate({
      ...baseCandidate(),
      documents: [
        { type: "cv", verification_status: "rejected" },
        { type: "passport", verification_status: "pending" },
      ],
    });
    expect(result.passed).toBe(false);
    expect(result.failures).toContain("Uploaded CV was rejected.");
  });

  it("fails when consent has not been given", () => {
    const result = evaluateScreeningGate({ ...baseCandidate(), consent_given: false });
    expect(result.passed).toBe(false);
    expect(result.failures).toContain("Candidate consent has not been recorded.");
  });

  it("accumulates multiple failures at once, not just the first", () => {
    const result = evaluateScreeningGate({
      ...baseCandidate(),
      nationality: null,
      consent_given: false,
      documents: [],
    });
    expect(result.failures.length).toBeGreaterThanOrEqual(4);
  });
});
