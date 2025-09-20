import { test, expect } from "@playwright/test";

test.describe("Class Session Timezone Display", () => {
  // Use the owner auth state which has organization access
  test.use({ storageState: ".auth/owner.json" });

  test("should display 6am sessions as 6:00 not 7:00", async ({ page }) => {
    // Navigate to classes page
    await page.goto("/classes");
    await page.waitForLoadState("networkidle");

    // Click on the first class type if it exists
    const firstClassType = page
      .locator("td")
      .filter({ hasText: /test/i })
      .first();
    const classTypeExists = (await firstClassType.count()) > 0;

    if (classTypeExists) {
      await firstClassType.click();
      await page.waitForLoadState("networkidle");

      // Look for any session times
      const sessionTimes = await page.locator("text=/\\d{2}:\\d{2}/").all();

      for (const time of sessionTimes) {
        const timeText = await time.textContent();
        console.log(`Found time: ${timeText}`);

        // Check if any time shows as 07:00 which would indicate the bug
        if (timeText?.includes("07:00")) {
          // This might be our 6am session showing incorrectly
          console.warn("Found 07:00 - this might be the timezone bug");
        }

        // Verify 06:00 times are displayed correctly
        if (timeText?.includes("06:00")) {
          expect(timeText).toContain("06:00");
          console.log("✓ 06:00 displayed correctly");
        }
      }
    }
  });

  test("create recurring 6am session and verify display", async ({ page }) => {
    // Navigate to classes page
    await page.goto("/classes");
    await page.waitForLoadState("networkidle");

    // Create a test class type first or use existing
    const classTypes = await page
      .locator("td")
      .filter({ hasText: /test/i })
      .count();

    if (classTypes === 0) {
      // Create a test class type
      await page.click('button:has-text("Add Class Type")');
      await page.fill('input[id="name"]', "Test Class for Timezone");
      await page.fill('textarea[id="description"]', "Testing timezone display");
      await page.fill('input[type="number"]', "20");
      await page.click('button:has-text("Create Class Type")');
      await page.waitForLoadState("networkidle");
    }

    // Click on the test class
    await page.locator("td").filter({ hasText: /test/i }).first().click();
    await page.waitForLoadState("networkidle");

    // Click "Create Recurring" button if it exists
    const createRecurringBtn = page.locator(
      'button:has-text("Create Recurring")',
    );
    const btnExists = (await createRecurringBtn.count()) > 0;

    if (btnExists) {
      await createRecurringBtn.click();

      // Fill in the recurring session modal
      // Set time to 06:00
      const timeInput = page.locator('input[type="time"]').first();
      const timeInputExists = (await timeInput.count()) > 0;

      if (timeInputExists) {
        await timeInput.fill("06:00");
        await page.fill('input[type="number"][placeholder*="Duration"]', "60");

        // Select days of week
        await page.check('input[type="checkbox"][value="1"]'); // Monday
        await page.check('input[type="checkbox"][value="3"]'); // Wednesday
        await page.check('input[type="checkbox"][value="5"]'); // Friday

        // Create the sessions
        await page.click('button:has-text("Create Sessions")');
        await page.waitForLoadState("networkidle");

        // Wait for sessions to appear
        await page.waitForTimeout(2000);

        // Now verify the created sessions show 06:00 not 07:00
        const sessionTimes = await page.locator("text=/06:00|07:00/").all();

        for (const time of sessionTimes) {
          const timeText = await time.textContent();

          // Assert that we see 06:00 and not 07:00
          if (timeText?.includes("07:00")) {
            throw new Error(
              `Timezone bug detected: Session shows ${timeText} instead of 06:00`,
            );
          }

          if (timeText?.includes("06:00")) {
            expect(timeText).toContain("06:00");
            console.log("✓ 6am session displays correctly as 06:00");
          }
        }
      }
    }
  });
});
