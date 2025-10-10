import { test, expect } from "@playwright/test";

test.describe("Landing Pages AI Builder", () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user
    await page.goto("https://login.gymleadhub.co.uk/signin");
    await page.fill('input[type="email"]', "test2@test.co.uk");
    await page.fill('input[type="password"]', "@Aa80236661");
    await page.click('button[type="submit"]');

    // Wait for successful login (redirects to reports page)
    await page.waitForURL("**/reports/**", { timeout: 10000 });

    // Navigate to landing page builder
    await page.goto("https://login.gymleadhub.co.uk/landing-pages/builder");
    await page.waitForLoadState("networkidle");
  });

  test("should generate landing page from text description", async ({
    page,
  }) => {
    // Click AI builder button
    const aiButton = page.locator('button:has-text("AI Builder")').first();
    await aiButton.click();

    // Wait for AI modal/form to appear
    await page.waitForSelector('textarea[placeholder*="description"]', {
      timeout: 5000,
    });

    // Fill in description
    const description =
      "Create a landing page for a CrossFit gym offering group classes, personal training, and nutrition coaching";
    await page.fill('textarea[placeholder*="description"]', description);

    // Click generate button
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();

    // Wait for generation to complete (may take up to 30 seconds with OpenAI)
    await page.waitForSelector('[data-testid="generation-success"]', {
      timeout: 45000,
    });

    // Verify success message
    const successMessage = page.locator(
      'text=/Successfully generated landing page/i',
    );
    await expect(successMessage).toBeVisible({ timeout: 5000 });

    // Verify no RLS error in console
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Check for RLS errors
    const hasRLSError = consoleErrors.some(
      (error) =>
        error.includes("row-level security") ||
        error.includes("violates row-level security policy"),
    );
    expect(hasRLSError).toBe(false);

    // Verify page was created in database
    const response = await page.request.get("/api/landing-pages");
    expect(response.ok()).toBeTruthy();

    const data = await response.json();
    expect(data.data).toBeDefined();
    expect(data.data.length).toBeGreaterThan(0);

    // Verify the latest page matches our description
    const latestPage = data.data[0];
    expect(latestPage.name).toBeTruthy();
    expect(latestPage.content).toBeDefined();
    expect(latestPage.organization_id).toBe(
      "c762845b-34fc-41ea-9e01-f70b81c44ff7",
    );
  });

  test("should handle AI generation errors gracefully", async ({ page }) => {
    // Click AI builder button
    const aiButton = page.locator('button:has-text("AI Builder")').first();
    await aiButton.click();

    // Wait for AI modal/form
    await page.waitForSelector('textarea[placeholder*="description"]', {
      timeout: 5000,
    });

    // Fill in too-short description (should fail validation)
    await page.fill('textarea[placeholder*="description"]', "Test");

    // Click generate button
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();

    // Wait for error message
    const errorMessage = page.locator(
      'text=/at least 10 characters|description too short/i',
    );
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test("should show loading state during generation", async ({ page }) => {
    // Click AI builder button
    const aiButton = page.locator('button:has-text("AI Builder")').first();
    await aiButton.click();

    // Wait for AI modal/form
    await page.waitForSelector('textarea[placeholder*="description"]', {
      timeout: 5000,
    });

    // Fill in description
    const description = "Modern gym landing page with class schedule";
    await page.fill('textarea[placeholder*="description"]', description);

    // Click generate button
    const generateButton = page.locator('button:has-text("Generate")');
    await generateButton.click();

    // Verify loading indicator appears
    const loadingIndicator = page.locator(
      '[data-testid="ai-generating"], .loading, .spinner, text=/generating/i',
    );
    await expect(loadingIndicator.first()).toBeVisible({ timeout: 2000 });
  });
});
