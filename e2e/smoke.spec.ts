import { test, expect } from "@playwright/test";

test.describe("Application Smoke Tests", () => {
  test("should load the homepage", async ({ page }) => {
    // Navigate to the application
    await page.goto("/");

    // Check that the page loads without errors
    await expect(page).toHaveTitle(/Atlas/i);

    // Verify key elements are present
    const mainContent = page.locator("main");
    await expect(mainContent).toBeVisible();
  });

  test("should navigate to login page", async ({ page }) => {
    await page.goto("/signin");

    // Check for login form elements
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    await expect(emailInput).toBeVisible();

    const passwordInput = page.locator('input[type="password"]');
    await expect(passwordInput).toBeVisible();
  });

  test("should handle 404 pages gracefully", async ({ page }) => {
    // Navigate to non-existent page
    const response = await page.goto("/non-existent-page-404");

    // Should not crash
    expect(response?.status()).toBeLessThan(500);
  });
});
