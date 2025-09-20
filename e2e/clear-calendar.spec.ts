import { test, expect } from "@playwright/test";

test.describe("Clear Calendar Functionality", () => {
  test.beforeEach(async ({ page }) => {
    // Set environment variables for test mode
    process.env.ALLOW_TEST_LOGIN = "true";

    // Navigate to login and authenticate
    await page.goto("/owner-login");

    // Use test login
    await page.fill('input[type="email"]', "sam@atlas-gyms.co.uk");
    await page.fill('input[type="password"]', "password123");
    await page.click('button[type="submit"]');

    // Wait for navigation to dashboard
    await page.waitForURL("**/dashboard");

    // Navigate to class calendar
    await page.goto("/class-calendar");
    await page.waitForLoadState("networkidle");
  });

  test("should clear all calendar data when Clear All Data button is clicked", async ({
    page,
  }) => {
    // First, check if there are any existing classes
    const initialStats = await page
      .locator('[data-testid="total-classes"]')
      .textContent();
    console.log("Initial classes count:", initialStats);

    // Create some test data first if calendar is empty
    const addClassButton = page.locator("button", { hasText: "Add Class" });
    if (await addClassButton.isVisible()) {
      // Check if we need to generate sample data
      const generateButton = page.locator("button", {
        hasText: "Generate Sample Classes",
      });
      if (await generateButton.isVisible()) {
        await generateButton.click();
        await page.waitForTimeout(2000); // Wait for data creation

        // Refresh to see the new data
        await page.reload();
        await page.waitForLoadState("networkidle");
      }
    }

    // Verify there are classes before clearing
    const classCount = await page
      .locator('[data-testid="total-classes"]')
      .textContent();
    console.log("Classes before clearing:", classCount);

    // Find and click the Clear All Data button
    const clearButton = page.locator("button", { hasText: "Clear All Data" });
    await expect(clearButton).toBeVisible();

    // Handle the confirmation dialog
    page.on("dialog", async (dialog) => {
      expect(dialog.type()).toBe("confirm");
      expect(dialog.message()).toContain(
        "permanently delete ALL class types and sessions",
      );
      await dialog.accept();
    });

    // Click the clear button
    await clearButton.click();

    // Wait for the operation to complete
    await page.waitForTimeout(3000);

    // Check for success alert
    page.on("dialog", async (dialog) => {
      expect(dialog.type()).toBe("alert");
      expect(dialog.message()).toContain("Calendar cleared successfully");
      await dialog.accept();
    });

    // Wait for page to refresh/update
    await page.waitForLoadState("networkidle");

    // Verify the calendar is now empty
    await expect(page.locator("text=No Classes Scheduled")).toBeVisible();

    // Verify stats show zero classes
    await expect(page.locator('[data-testid="total-classes"]')).toHaveText("0");

    // Verify the empty state message is shown
    await expect(
      page.locator("text=Get started by adding classes to your calendar"),
    ).toBeVisible();

    // Verify the calendar grid is empty (no class cards visible)
    const classCards = page.locator('[data-testid="class-card"]');
    await expect(classCards).toHaveCount(0);
  });

  test("should show confirmation dialog before clearing data", async ({
    page,
  }) => {
    let dialogShown = false;
    let dialogMessage = "";

    page.on("dialog", async (dialog) => {
      dialogShown = true;
      dialogMessage = dialog.message();
      await dialog.dismiss(); // Cancel the operation
    });

    // Click the Clear All Data button
    const clearButton = page.locator("button", { hasText: "Clear All Data" });
    await clearButton.click();

    // Verify dialog was shown with correct message
    expect(dialogShown).toBe(true);
    expect(dialogMessage).toContain(
      "permanently delete ALL class types and sessions",
    );
    expect(dialogMessage).toContain("cannot be undone");
  });

  test("should handle API errors gracefully", async ({ page }) => {
    // Mock API to return an error
    await page.route("**/api/clear-calendar", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          success: false,
          error: "Test error: Database connection failed",
        }),
      });
    });

    // Handle the confirmation dialog
    page.on("dialog", async (dialog) => {
      if (dialog.type() === "confirm") {
        await dialog.accept();
      } else if (dialog.type() === "alert") {
        expect(dialog.message()).toContain("Failed to clear calendar");
        await dialog.accept();
      }
    });

    // Click the clear button
    const clearButton = page.locator("button", { hasText: "Clear All Data" });
    await clearButton.click();

    // Wait for error handling
    await page.waitForTimeout(2000);
  });

  test("should update stats after clearing calendar", async ({ page }) => {
    // Generate some sample data first
    const generateButton = page.locator("button", {
      hasText: "Generate Sample Classes",
    });
    if (await generateButton.isVisible()) {
      await generateButton.click();
      await page.waitForTimeout(2000);
      await page.reload();
      await page.waitForLoadState("networkidle");
    }

    // Get initial stats
    const initialTotal = await page
      .locator('[data-testid="total-classes"]')
      .textContent();
    const initialToday = await page
      .locator('[data-testid="today-classes"]')
      .textContent();
    const initialWeek = await page
      .locator('[data-testid="week-classes"]')
      .textContent();

    console.log(
      "Before clearing - Total:",
      initialTotal,
      "Today:",
      initialToday,
      "Week:",
      initialWeek,
    );

    // Clear all data
    page.on("dialog", async (dialog) => {
      await dialog.accept();
    });

    const clearButton = page.locator("button", { hasText: "Clear All Data" });
    await clearButton.click();

    await page.waitForTimeout(3000);
    await page.waitForLoadState("networkidle");

    // Verify all stats are zero
    await expect(page.locator('[data-testid="total-classes"]')).toHaveText("0");
    await expect(page.locator('[data-testid="today-classes"]')).toHaveText("0");
    await expect(page.locator('[data-testid="week-classes"]')).toHaveText("0");
  });
});
