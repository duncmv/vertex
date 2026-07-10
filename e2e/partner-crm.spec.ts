import { test, expect, type Page, type Locator } from "@playwright/test";

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

// SearchableSelect renders as a button+listbox combobox, not a native
// <select> — open it, then click the matching option.
async function pickOption(page: Page, trigger: Locator, name: string | RegExp) {
  await trigger.click();
  await page.getByRole("option", { name }).click();
}

async function pickOptionByIndex(page: Page, trigger: Locator, index: number) {
  await trigger.click();
  await page.getByRole("listbox").getByRole("option").nth(index).click();
}

const PASSWORD = "E2ETestPassword123!";
const PARTNER_CONTACT_EMAIL = "e2e-partner-contact@test.local";

// Phase 5 Partner CRM (SRS FR-5.1), corrected: partners get their own
// admin-provisioned login and submit candidates themselves — these never
// enter Vertex's internal recruiter/screening/verification funnel (the
// partner has already done that). Staff-side job assignment is out of
// scope for now, so this test stops at "the partner sees its own
// submission" rather than any bridging/assignment step.
test.describe("Partner CRM (Phase 5, self-service intake)", () => {
  test("management adds a partner, provisions its login, and the partner submits a candidate", async ({ page }) => {
    const candidateName = `E2E Partner Candidate ${Date.now()}`;
    const candidateEmail = `e2e-partner-candidate-${Date.now()}@test.local`;
    let temporaryPassword = "";

    await test.step("In-House Supervisor adds a partner", async () => {
      await login(page, "e2e-inhouse@test.local", PASSWORD);
      await expect(page).toHaveURL(/\/management$/);

      await page.goto("/management/partners");
      await page.getByRole("button", { name: "Add Partner" }).click();
      await page.getByLabel("Agency Name").fill("E2E Test Partner");
      await page.getByLabel("Country of Operation").fill("Kenya");
      await page.getByLabel("Contact Name").fill("E2E Partner Contact");
      await page.getByLabel("Contact Phone").fill("+254700000000");
      await page.getByLabel("Contact Email").fill(PARTNER_CONTACT_EMAIL);
      await page.locator("form").getByRole("button", { name: "Add Partner" }).click();

      await expect(page.getByText("E2E Test Partner")).toBeVisible({ timeout: 25_000 });
    });

    await test.step("provision the partner's own login", async () => {
      await page.getByRole("link", { name: "E2E Test Partner" }).first().click();
      await expect(page).toHaveURL(/\/management\/partners\/.+/);

      await page.getByRole("button", { name: "Create Partner Login" }).click();
      await expect(page.getByText("Partner login created")).toBeVisible({ timeout: 25_000 });
      temporaryPassword = (await page.locator("code").textContent())!.trim();
      expect(temporaryPassword.length).toBeGreaterThan(0);
    });

    await test.step("the partner logs in and submits a candidate", async () => {
      await logout(page);
      await login(page, PARTNER_CONTACT_EMAIL, temporaryPassword);
      await expect(page).toHaveURL(/\/partner$/);

      await page.getByRole("button", { name: "Submit Candidate" }).click();

      await page.getByLabel("Full Name (as per passport)").fill(candidateName);
      await page.getByLabel("Date of Birth").fill("1995-06-15");
      await page.locator("#nationality").fill("Kenyan");
      await page.getByLabel("Passport Number").fill("P" + Date.now());
      await page.getByLabel(/Passport Expiry Date/).fill("2030-01-01");
      await page.getByLabel(/Phone Number/).fill("+254700111222");
      await page.getByLabel("Email Address").fill(candidateEmail);

      await pickOption(page, page.getByLabel(/Preferred Programme — Option 1/), "United Kingdom");
      await pickOptionByIndex(page, page.getByLabel("Preferred Type of Work"), 0);
      await page.getByLabel(/Earliest Possible Travel Date/).fill("2026-12-01");

      await page.getByLabel("We understand the payment plan above.").check();

      await pickOption(page, page.getByLabel(/Current Location \(country\)/), "E2E Country");
      await page.locator("form").getByRole("button", { name: "Submit Candidate" }).click();

      // The modal closes as soon as the submission succeeds (onSubmitted
      // fires synchronously), so the form's own "Submitted!" success state
      // never stays visible long enough to assert on — the real signal is
      // the new row appearing in the underlying list below.
      await expect(page.getByText(candidateName)).toBeVisible({ timeout: 25_000 });
    });

    await test.step("the candidate shows up on the partner's own list", async () => {
      const row = page.locator("tr", { hasText: candidateName });
      await expect(row).toBeVisible({ timeout: 25_000 });
      await expect(row.getByText("submitted", { exact: true })).toBeVisible();
    });
  });
});
