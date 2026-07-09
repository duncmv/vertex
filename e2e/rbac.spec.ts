import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Site-wide welcome/consent modal, gated by localStorage — pre-accept it
  // so it doesn't block interaction with the page under test.
  await page.addInitScript(() => {
    window.localStorage.setItem("vertex_welcome_accepted", "true");
  });
});

test.describe("RBAC portal gating", () => {
  test("unauthenticated visitors are redirected to login with a return path", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fadmin/);
  });

  test("protects every new portal path prefix, not just /admin", async ({ page }) => {
    for (const path of ["/dashboard", "/recruiter", "/supervisor", "/management"]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(`/auth/login\\?redirect=${encodeURIComponent(path)}`));
    }
  });

  test("public pages remain accessible without auth", async ({ page }) => {
    await page.goto("/jobs");
    await expect(page).not.toHaveURL(/auth\/login/);
  });
});

test.describe("Authenticated access (regression coverage for the middleware crypto bug)", () => {
  test("a logged-in admin can actually reach a protected portal, not just get redirected away from one", async ({ page }) => {
    await page.goto("/auth/login");
    await page.fill("#login-email", "e2e-admin@test.local");
    await page.fill("#login-password", "E2ETestPassword123!");
    await page.click("#login-submit-btn");

    // Wait for the login POST + client-side redirect to actually land
    // before navigating away — otherwise the next page.goto can race the
    // in-flight request and abort it before the session cookie is set.
    await page.waitForURL((url) => !url.pathname.startsWith("/auth/login"), { timeout: 25_000 });

    // This must NOT bounce back to /auth/login — that exact regression
    // (valid session, still redirected) is what shipped silently before
    // this test existed: jsonwebtoken's dependency on Node's `crypto`
    // module isn't supported in the Edge runtime middleware defaults to.
    await page.goto("/admin/regions");
    await expect(page).toHaveURL(/\/admin\/regions$/);
    await expect(page.getByRole("heading", { name: /regions/i })).toBeVisible();
  });
});

test.describe("Candidate registration (Phase 1: real DB write, audited)", () => {
  test("registers a new candidate end to end", async ({ page }) => {
    const uniqueEmail = `e2e-${Date.now()}@test.local`;

    await page.goto("/auth/register");
    await page.fill("#reg-fullname", "E2E Test Candidate");
    await page.fill("#reg-email", uniqueEmail);
    await page.fill("#reg-password", "TestPassword123!");
    await page.fill("#reg-confirm-password", "TestPassword123!");

    await page.click("#register-submit-btn");

    await expect(page.getByRole("heading", { name: /check your email/i })).toBeVisible({
      timeout: 10_000,
    });
  });
});
