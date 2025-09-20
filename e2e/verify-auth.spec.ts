import { test, expect } from "@playwright/test";

test.describe("Verify Authentication", () => {
  test("owner can access dashboard", async ({ page }) => {
    // Auth state is already loaded from setup project
    await page.goto("/dashboard");

    // Should be on dashboard, not redirected to login
    await expect(page).toHaveURL(/.*dashboard/);

    // Dashboard should have some expected content
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });
});
