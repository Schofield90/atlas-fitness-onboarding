import { test, expect } from "@playwright/test";

test.describe("Landing Page Preview Functionality", () => {
  test.beforeEach(async ({ page }) => {
    // Login as test user - use owner-login for gym staff/owner accounts
    await page.goto("https://login.gymleadhub.co.uk/owner-login");

    // Fill in credentials
    await page.fill('input[type="email"]', "sam@atlas-gyms.co.uk");
    await page.fill('input[type="password"]', "@Aa80236661");

    // Click sign in and wait for successful navigation away from login page
    await Promise.all([
      page.waitForURL(/dashboard|landing-pages|reports/, { timeout: 15000 }),
      page.click('button:has-text("Sign in")'),
    ]);

    // Wait a moment for auth to settle
    await page.waitForTimeout(2000);
  });

  test("should open preview modal with correct styling", async ({ page }) => {
    // Navigate to landing pages list
    await page.goto("https://login.gymleadhub.co.uk/landing-pages");
    await page.waitForTimeout(2000);

    // Click "Create New Page" or "Create Landing Page" button
    const createButton = page.locator('button:has-text("Create New Page"), button:has-text("Create Landing Page")').first();
    await createButton.click();
    await page.waitForTimeout(1000);

    // Fill in page name
    const nameInput = page.locator('input[name="name"], input[placeholder*="name"]').first();
    await nameInput.fill("Test Preview Page");

    // Submit form
    const submitButton = page.locator('button:has-text("Create"), button[type="submit"]').first();
    await submitButton.click();

    // Wait for navigation to builder
    await page.waitForURL(/\/landing-pages\/builder\//, { timeout: 10000 });
    await page.waitForTimeout(3000);

    // Take screenshot of builder
    await page.screenshot({
      path: "test-results/builder-loaded.png",
      fullPage: false,
    });

    // Click preview button (Eye icon) - look for buttons in toolbar
    // The toolbar should have Save, Publish, Eye (preview), Library, Properties buttons
    const toolbarButtons = page.locator('button:has(svg)');
    const buttonCount = await toolbarButtons.count();
    console.log(`Found ${buttonCount} toolbar buttons`);

    // Look for the preview button (Eye icon)
    // Try clicking buttons until we find one that opens the preview modal
    let previewOpened = false;
    for (let i = 0; i < Math.min(buttonCount, 8); i++) {
      const btn = toolbarButtons.nth(i);

      // Click button
      await btn.click();
      await page.waitForTimeout(500);

      // Check if "Close Preview" button appeared
      const closeButton = page.locator('button:has-text("Close Preview")');
      const isVisible = await closeButton.isVisible().catch(() => false);

      if (isVisible) {
        console.log(`Preview button found at index ${i}`);
        previewOpened = true;

        // Verify preview modal
        await expect(closeButton).toBeVisible();

        // Verify preview content has components
        const previewContent = page.locator('section, header').first();
        await expect(previewContent).toBeVisible();

        // Take screenshot
        await page.screenshot({
          path: "test-results/preview-modal-opened.png",
          fullPage: false,
        });

        // Close preview
        await closeButton.click();
        await page.waitForTimeout(1000);
        await expect(closeButton).not.toBeVisible();

        break;
      }
    }

    if (!previewOpened) {
      throw new Error('Could not find preview button in toolbar');
    }
  });

});
