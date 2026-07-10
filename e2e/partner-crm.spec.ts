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

const PASSWORD = "E2ETestPassword123!";

// Phase 5 Partner CRM (SRS FR-5.1): management adds a partner, marks its
// MOU signed, then registers a candidate against it from the partner's own
// detail page — the same Candidate Information Form every other intake
// path uses, just pre-attributed. Registering from here (rather than the
// recruiter's own quick-register) exercises the actual round-robin
// recruiter assignment, since the submitter (In-House) isn't itself a
// recruiter.
test.describe("Partner CRM (Phase 5)", () => {
  test("management adds a partner, signs its MOU, and registers a partner-sourced candidate", async ({ page }) => {
    const candidateName = `E2E Partner Lead ${Date.now()}`;
    const candidateEmail = `e2e-partner-lead-${Date.now()}@test.local`;

    await test.step("In-House Supervisor adds a partner", async () => {
      await login(page, "e2e-inhouse@test.local", PASSWORD);
      await expect(page).toHaveURL(/\/management$/);

      await page.goto("/management/partners");
      await page.getByRole("button", { name: "Add Partner" }).click();
      await page.getByLabel("Agency Name").fill("E2E Test Partner");
      await page.getByLabel("Country of Operation").fill("Kenya");
      await page.getByLabel("Contact Name").fill("E2E Partner Contact");
      await page.getByLabel("Contact Phone").fill("+254700000000");
      await page.getByLabel("Contact Email").fill("e2e-partner-contact@test.local");
      await page.locator("form").getByRole("button", { name: "Add Partner" }).click();

      await expect(page.getByText("E2E Test Partner")).toBeVisible({ timeout: 25_000 });
    });

    await test.step("open the partner and mark its MOU signed", async () => {
      await page.getByRole("link", { name: "E2E Test Partner" }).first().click();
      await expect(page).toHaveURL(/\/management\/partners\/.+/);

      await page.getByLabel("MOU / Agreement").selectOption("signed");
      await expect(page.getByText(/^Signed /)).toBeVisible({ timeout: 25_000 });
    });

    await test.step("register a candidate against this partner via the Candidate Information Form", async () => {
      await page.getByRole("button", { name: "Register Candidate" }).click();

      await page.getByLabel("Preferred Country — Option 1").selectOption({ label: "United Kingdom" });
      await page.getByLabel("Preferred Type of Work").selectOption({ index: 1 });
      await page.getByLabel("Earliest Possible Travel Date").fill("2026-12-01");

      await page.getByLabel("Full Name (as per passport)").fill(candidateName);
      await page.getByLabel("Date of Birth").fill("1994-03-10");
      await page.locator("#nationality").fill("Kenyan");
      await page.getByLabel("Passport Number").fill("P" + Date.now());
      await page.getByLabel(/Passport Expiry Date/).fill("2030-01-01");
      await page.getByLabel(/Phone Number/).fill("+254700111333");
      await page.getByLabel("Email Address").fill(candidateEmail);

      await page.getByLabel("Current Location (country)").selectOption({ label: "E2E Country" });
      await page.getByLabel("I understand the payment plan above.").check();
      await page.getByLabel("I confirm the above.").check();
      await page.getByRole("button", { name: "Submit Application" }).click();

      await expect(page.getByText(candidateName)).toBeVisible({ timeout: 25_000 });
    });

    await test.step("the candidate is round-robin assigned to the country's recruiter", async () => {
      const candidateRow = page.locator("tr", { hasText: candidateName });
      await expect(candidateRow.getByText("E2E Recruiter")).toBeVisible({ timeout: 25_000 });
      await expect(candidateRow.getByText("identified", { exact: true })).toBeVisible();
    });

    await test.step("the candidate list shows the partner attribution", async () => {
      await page.goto("/management");
      const candidateRow = page.locator("tr", { hasText: candidateName });
      await expect(candidateRow).toBeVisible({ timeout: 25_000 });
      await expect(candidateRow.getByText("via E2E Test Partner")).toBeVisible();
    });
  });
});
