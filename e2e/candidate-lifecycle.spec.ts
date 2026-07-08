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
  await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), { timeout: 10_000 });
}

async function logout(page: Page) {
  await page.getByText("Log out").click();
  await page.waitForURL((url) => url.pathname.startsWith("/auth/login") || url.pathname === "/", { timeout: 10_000 });
}

const PASSWORD = "E2ETestPassword123!";
const PDF_BUFFER = Buffer.from("%PDF-1.4\n%%EOF");

// Full agent-network pre-application lifecycle (SRS FR-2.1 through FR-2.7):
// a recruiter registers a lead, the screening gate blocks guided_to_apply
// until the record is genuinely complete, and a country supervisor
// verifies or returns the reported candidate. This is Phase 2's core flow.
test.describe("Candidate pre-application lifecycle (Phase 2)", () => {
  test("recruiter registration through screening gate to supervisor verification", async ({ page }) => {
    const candidateName = `E2E Lead ${Date.now()}`;

    await test.step("recruiter registers a new candidate lead", async () => {
      await login(page, "e2e-recruiter@test.local", PASSWORD);
      await expect(page).toHaveURL(/\/recruiter$/);

      await page.getByRole("button", { name: "Register Candidate" }).click();
      await page.getByPlaceholder("Full name").fill(candidateName);
      await page.getByPlaceholder("Nationality").fill("Kenyan");
      await page.getByPlaceholder("Phone").fill("+254700111222");
      await page.locator("form").getByRole("button", { name: "Register Candidate" }).click();

      await expect(page.getByText(candidateName)).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText("identified", { exact: true })).toBeVisible();
    });

    await test.step("advances to screened, then the screening gate blocks guided_to_apply on an incomplete record", async () => {
      await page.getByRole("button", { name: /Advance to Screened/ }).click();
      await expect(page.getByText("screened", { exact: true })).toBeVisible();

      await page.getByRole("button", { name: /Advance to Guided to Apply/ }).click();
      await expect(page.getByText(/Date of birth is missing/)).toBeVisible();
      await expect(page.getByText(/CV has not been uploaded/)).toBeVisible();
      await expect(page.getByText(/Passport scan has not been uploaded/)).toBeVisible();
      await expect(page.getByText(/Candidate consent has not been recorded/)).toBeVisible();
      await expect(page.getByText(/Desired role is missing/)).toBeVisible();
      // Status must not have silently advanced despite the rejection.
      await expect(page.getByText("screened", { exact: true })).toBeVisible();
    });

    await test.step("recruiter completes the profile: DOB, documents, and consent", async () => {
      await page.getByText("Edit details").click();
      await page.locator('input[type="date"]').fill("1995-06-15");
      await page.getByPlaceholder("Passport number").fill("P" + Date.now());
      await page.getByPlaceholder("Email").fill(`${candidateName.replace(/\s/g, "").toLowerCase()}@example.com`);
      await page.getByPlaceholder("Desired role").fill("Warehouse Operative");
      await page.getByRole("button", { name: "Save" }).click();
      await expect(page.getByText("Edit details")).toBeVisible();

      await page.getByTestId("upload-cv-input").setInputFiles({ name: "cv.pdf", mimeType: "application/pdf", buffer: PDF_BUFFER });
      await expect(page.getByText("cv", { exact: true })).toBeVisible({ timeout: 10_000 });

      await page.getByTestId("upload-passport-input").setInputFiles({ name: "passport.pdf", mimeType: "application/pdf", buffer: PDF_BUFFER });
      await expect(page.getByText("passport", { exact: true })).toBeVisible({ timeout: 10_000 });

      await page.getByText("No consent on file").click();
      await expect(page.getByText("No consent on file")).not.toBeVisible();
    });

    await test.step("screening gate now passes; recruiter submits a real application on the candidate's behalf, which is what actually advances them to submitted", async () => {
      await page.getByRole("button", { name: /Advance to Guided to Apply/ }).click();
      await expect(page.getByText("guided to apply", { exact: true })).toBeVisible({ timeout: 10_000 });

      // There is no manual "Advance to Submitted" anymore — only a real
      // Application record can set that status (this is the fix for the
      // exact gap this test guards against: a fake "submitted" flag with
      // no application behind it).
      await expect(page.getByRole("button", { name: /Advance to Submitted/ })).toHaveCount(0);

      await page.getByText("Submit application on their behalf").click();
      // Only one active job exists (created by global-setup), already selected by default.
      await page.getByRole("button", { name: "Submit" }).click();
      await expect(page.getByText("submitted", { exact: true })).toBeVisible({ timeout: 10_000 });

      await page.getByRole("button", { name: /Advance to Reported/ }).click();
      await expect(page.getByText("reported", { exact: true })).toBeVisible();
      await expect(page.getByText("Awaiting supervisor action")).toBeVisible();
    });

    await test.step("supervisor returns the candidate with a reason (without undoing the real application already on file)", async () => {
      await logout(page);
      await login(page, "e2e-supervisor@test.local", PASSWORD);
      await expect(page).toHaveURL(/\/supervisor$/);

      await expect(page.getByText(candidateName)).toBeVisible({ timeout: 10_000 });
      await page.getByRole("button", { name: "Return" }).click();
      await page.getByRole("combobox").selectOption({ label: "Return to Submitted" });
      await page.getByPlaceholder("Reason for return (required)…").fill("Please double-check the passport number.");
      await page.getByRole("button", { name: "Confirm Return" }).click();

      await expect(page.getByText("submitted", { exact: true })).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText(/Please double-check the passport number/)).toBeVisible();
    });

    await test.step("recruiter re-reports; supervisor verifies and approves", async () => {
      await logout(page);
      await login(page, "e2e-recruiter@test.local", PASSWORD);

      await page.getByRole("button", { name: /Advance to Reported/ }).click();
      await expect(page.getByText("reported", { exact: true })).toBeVisible();

      await logout(page);
      await login(page, "e2e-supervisor@test.local", PASSWORD);

      await page.getByRole("button", { name: /Verify → Verified/ }).click();
      await expect(page.getByText("verified", { exact: true })).toBeVisible({ timeout: 10_000 });

      await page.getByRole("button", { name: /Verify → Approved/ }).click();
      await expect(page.getByText("approved", { exact: true })).toBeVisible({ timeout: 10_000 });
    });
  });
});
