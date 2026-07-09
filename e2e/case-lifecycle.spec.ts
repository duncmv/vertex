import { test, expect, type Page } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem("vertex_welcome_accepted", "true");
  });
});

async function login(page: Page, email: string, password: string) {
  await page.goto("/auth/login");
  await page.fill("#login-email", email);
  await page.fill("#login-password", password);
  await page.click("#login-submit-btn");
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), { timeout: 25_000 });
}

async function logout(page: Page) {
  await page.getByText("Log out").click();
  await page.waitForURL((url) => url.pathname.startsWith("/auth/login") || url.pathname === "/", { timeout: 25_000 });
}

const PASSWORD = "E2ETestPassword123!";

// Phase 4's mobility lifecycle (SRS FR-4.1–4.3): a candidate being
// "Approved by In-House" (the real, framework-defined trigger — Regional
// Supervisory Operational Workflow p.5 — not the legacy Application
// status field) auto-opens a Case, staff can advance its stage and issue
// a contract, and the candidate signs it themselves — the riskiest, most
// novel piece (a real in-house e-signature, not a stub) gets the
// end-to-end check.
test.describe("Mobility case lifecycle (Phase 4)", () => {
  test("approval opens a case, staff advance it and issue a contract, candidate signs it", async ({ page }) => {
    await test.step("In-House approves the already-verified candidate, which auto-creates a case", async () => {
      await login(page, "e2e-inhouse@test.local", PASSWORD);
      await expect(page).toHaveURL(/\/management$/);

      const row = page.locator("tr", { hasText: "E2E Case Candidate" });
      await expect(row).toBeVisible({ timeout: 25_000 });
      await row.getByRole("button", { name: /Verify → Approved/ }).click();
      await expect(row.getByText("approved", { exact: true })).toBeVisible({ timeout: 25_000 });
    });

    await test.step("the case appears in the management case list at its opening stage", async () => {
      await page.goto("/management/cases");
      const caseCard = page.locator("a", { hasText: "E2E Case Candidate" });
      await expect(caseCard).toBeVisible({ timeout: 25_000 });
      await expect(caseCard.getByText(/Stage 1 of 11: Application/)).toBeVisible();
      await caseCard.click();
      await page.waitForURL(/\/management\/cases\/.+/);
    });

    await test.step("In-House advances the case to Verification with a deadline", async () => {
      await page.getByRole("combobox").first().selectOption("verification");
      await page.getByPlaceholder("Notes (optional)").fill("Docs look complete, moving to verification.");
      await page.getByRole("button", { name: "Update Stage" }).click();

      await expect(page.getByText(/Stage 2 of 11: Verification/)).toBeVisible({ timeout: 25_000 });
      await expect(page.getByText("Docs look complete, moving to verification.")).toBeVisible();
    });

    await test.step("In-House issues a contract", async () => {
      await page.getByPlaceholder(/Offer of employment/).fill("Offer of employment for E2E Test Job. Salary and terms as discussed. Start date to be confirmed.");
      await page.getByRole("button", { name: "Issue Contract" }).click();

      await expect(page.getByText("sent", { exact: true })).toBeVisible({ timeout: 25_000 });
    });

    await test.step("the candidate signs their own contract from their dashboard", async () => {
      await logout(page);
      await login(page, "e2e-case-candidate@test.local", PASSWORD);
      await page.goto("/dashboard");

      await expect(page.getByText("My Placement Case")).toBeVisible({ timeout: 25_000 });
      await expect(page.getByText(/Offer of employment for E2E Test Job/)).toBeVisible();

      await page.getByPlaceholder("Type your full legal name to sign").fill("E2E Case Candidate");
      await page.getByRole("button", { name: "Sign Contract" }).click();

      await expect(page.getByText(/Signed by E2E Case Candidate on/)).toBeVisible({ timeout: 25_000 });
    });
  });
});
