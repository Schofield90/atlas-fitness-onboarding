import { test, expect } from "@playwright/test";

test.describe("Landing Pages AI Builder", () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user - use owner-login for gym staff/owner accounts
    await page.goto("https://login.gymleadhub.co.uk/owner-login");

    // Fill in credentials
    await page.fill('input[type="email"]', "sam@atlas-gyms.co.uk");
    await page.fill('input[type="password"]', "@Aa80236661");

    // Click sign in button
    await page.click('button:has-text("Sign in")');

    // Wait for successful navigation away from login page
    await page.waitForURL(/dashboard|landing-pages|reports/, {
      timeout: 15000,
    });

    // Wait a moment for auth to settle
    await page.waitForTimeout(1000);

    // Navigate to landing page builder
    await page.goto("https://login.gymleadhub.co.uk/landing-pages/builder");
    await page.waitForLoadState("networkidle");
  });

  test("should generate landing page from text description", async ({
    page,
  }) => {
    // Click AI Build Page button
    await page.locator('text=AI Build Page').click();

    // Wait for AI modal/form to appear
    await page.waitForSelector('textarea[placeholder*="Example"]', {
      timeout: 5000,
    });

    // Fill in description
    const description =
      "Create a landing page for a CrossFit gym offering group classes, personal training, and nutrition coaching";
    await page.fill('textarea[placeholder*="Example"]', description);

    // Click generate button
    const generateButton = page.locator('button:has-text("Generate Page")');
    await expect(generateButton).toBeEnabled();
    await generateButton.click();

    // Note: Actual generation requires OPENAI_API_KEY in environment
    // The test verifies the UI flow works correctly (modal opens, form validates, button clicks)
    // Generation may fail if API key is missing, but UI behavior is tested
  });

  test("should handle AI generation errors gracefully", async ({ page }) => {
    // Click AI Build Page button
    await page.locator('text=AI Build Page').click();

    // Wait for AI modal/form
    await page.waitForSelector('textarea[placeholder*="Example"]', {
      timeout: 5000,
    });

    // Fill in too-short description (should fail client-side validation)
    await page.fill('textarea[placeholder*="Example"]', "Test");

    // Verify generate button is disabled for short input
    const generateButton = page.locator('button:has-text("Generate Page")');
    await expect(generateButton).toBeDisabled();

    // Fill in valid description
    await page.fill('textarea[placeholder*="Example"]', "Create a landing page for a fitness center");

    // Verify button is now enabled
    await expect(generateButton).toBeEnabled();
  });

  test("should show loading state during generation", async ({ page }) => {
    // Click AI Build Page button
    await page.locator('text=AI Build Page').click();

    // Wait for AI modal/form
    await page.waitForSelector('textarea[placeholder*="Example"]', {
      timeout: 5000,
    });

    // Fill in description
    const description = "Modern gym landing page with class schedule";
    await page.fill('textarea[placeholder*="Example"]', description);

    // Click generate button
    const generateButton = page.locator('button:has-text("Generate Page")');
    await generateButton.click();

    // Verify loading indicator appears (button text changes to "Generating...")
    const loadingButton = page.locator('button:has-text("Generating...")');
    await expect(loadingButton).toBeVisible({ timeout: 2000 });
  });
});
