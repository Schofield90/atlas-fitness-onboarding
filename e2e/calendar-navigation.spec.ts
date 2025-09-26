import { test, expect } from "@playwright/test";

test.describe("Calendar Navigation", () => {
  test("should navigate between weeks without errors", async ({ page }) => {
    // Navigate to class calendar
    await page.goto("/dashboard/class-calendar");

    // Wait for page to load - look for the calendar header or grid
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000); // Give React time to render

    // Find and click the next week button using more flexible selector
    const nextButton = page
      .locator("button")
      .filter({ has: page.locator("svg.lucide-chevron-right") })
      .first();
    await expect(nextButton).toBeVisible({ timeout: 10000 });

    // Click next to go to next week
    await nextButton.click();
    await page.waitForTimeout(500);

    // Verify no error occurred - check for error message
    const errorMessage = page.locator("text=/TypeError|Error:/i");
    await expect(errorMessage).not.toBeVisible();

    // Click previous to go back
    const prevButton = page
      .locator("button")
      .filter({ has: page.locator("svg.lucide-chevron-left") })
      .first();
    await expect(prevButton).toBeVisible();
    await prevButton.click();
    await page.waitForTimeout(500);

    // Verify no errors
    await expect(errorMessage).not.toBeVisible();

    // Click Today button
    const todayButton = page.locator('button:has-text("Today")');
    if ((await todayButton.count()) > 0) {
      await todayButton.click();
      await page.waitForTimeout(500);
      await expect(errorMessage).not.toBeVisible();
    }
  });

  test("should switch between calendar views", async ({ page }) => {
    // Navigate to class calendar
    await page.goto("/dashboard/class-calendar");

    // Wait for page to load
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Check for error messages
    const errorMessage = page.locator("text=/TypeError|Error:/i");

    // Test switching to day view
    const dayButton = page.locator('button:has-text("Day")');
    if ((await dayButton.count()) > 0) {
      await dayButton.click();
      await page.waitForTimeout(500); // Wait for view change
      await expect(errorMessage).not.toBeVisible();
    }

    // Test switching to week view
    const weekButton = page.locator('button:has-text("Week")');
    if ((await weekButton.count()) > 0) {
      await weekButton.click();
      await page.waitForTimeout(500); // Wait for view change
      await expect(errorMessage).not.toBeVisible();
    }

    // Test switching to month view
    const monthButton = page.locator('button:has-text("Month")');
    if ((await monthButton.count()) > 0) {
      await monthButton.click();
      await page.waitForTimeout(500); // Wait for view change
      await expect(errorMessage).not.toBeVisible();
    }
  });
});
