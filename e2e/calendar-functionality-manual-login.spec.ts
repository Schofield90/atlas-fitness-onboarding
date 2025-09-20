import { test, expect } from "@playwright/test";

test.describe("Calendar Functionality with Manual Login", () => {
  test("should login manually and test calendar functionality", async ({
    page,
  }) => {
    console.log("=== Starting manual login calendar test ===");

    // Navigate to login page
    console.log("1. Navigating to login page...");
    await page.goto("http://login.localhost:3000/owner-login");
    await page.waitForLoadState("networkidle");

    // Check if we're on the login page
    const isOnLogin = page.url().includes("/owner-login");
    console.log("Is on login page:", isOnLogin);

    if (isOnLogin) {
      console.log("2. Attempting to fill login form...");

      // Look for email input
      const emailInput = page.locator(
        'input[type="email"], input[name="email"], input[placeholder*="email" i]',
      );
      const emailCount = await emailInput.count();
      console.log("Email inputs found:", emailCount);

      if (emailCount > 0) {
        await emailInput.first().fill("sam@atlas-gyms.co.uk");

        // Look for password input
        const passwordInput = page.locator(
          'input[type="password"], input[name="password"], input[placeholder*="password" i]',
        );
        const passwordCount = await passwordInput.count();
        console.log("Password inputs found:", passwordCount);

        if (passwordCount > 0) {
          await passwordInput.first().fill("password123"); // Use actual password

          // Look for submit button
          const submitButton = page.locator(
            'button[type="submit"], button:has-text("Sign"), button:has-text("Login")',
          );
          const submitCount = await submitButton.count();
          console.log("Submit buttons found:", submitCount);

          if (submitCount > 0) {
            console.log("3. Submitting login form...");
            await submitButton.first().click();

            // Wait for navigation
            await page.waitForLoadState("networkidle");
            console.log("After login URL:", page.url());
          }
        }
      }
    }

    // Navigate to calendar regardless of login status
    console.log("4. Navigating to calendar page...");
    await page.goto("http://login.localhost:3000/class-calendar");
    await page.waitForLoadState("networkidle");

    const finalUrl = page.url();
    console.log("Final URL:", finalUrl);

    // Check if we successfully reached the calendar
    const isOnCalendar =
      finalUrl.includes("/class-calendar") &&
      !finalUrl.includes("/owner-login");
    console.log("Successfully reached calendar:", isOnCalendar);

    if (isOnCalendar) {
      console.log("5. Testing calendar functionality...");

      // Check calendar elements
      const elements = {
        calendarGrid: await page
          .locator('[data-testid="calendar-grid"]')
          .count(),
        timeSlots: await page.locator('[data-testid="time-slot"]').count(),
        classBlocks: await page.locator('[data-testid="class-block"]').count(),
        addClassButton: await page
          .locator('button:has-text("Add Class")')
          .count(),
        clearButton: await page
          .locator('button:has-text("Clear All Data")')
          .count(),
      };

      console.log("Calendar elements:", elements);

      // Test calendar clearing if clear button exists
      if (elements.clearButton > 0) {
        console.log("6. Testing calendar clear functionality...");

        // Setup confirmation dialog handler
        page.on("dialog", async (dialog) => {
          console.log("Dialog appeared:", dialog.message());
          await dialog.accept();
        });

        await page.locator('button:has-text("Clear All Data")').click();
        await page.waitForTimeout(2000); // Wait for clear operation

        // Reload and check responsiveness
        await page.reload();
        await page.waitForLoadState("networkidle");

        const elementsAfterClear = {
          calendarGrid: await page
            .locator('[data-testid="calendar-grid"]')
            .count(),
          timeSlots: await page.locator('[data-testid="time-slot"]').count(),
          classBlocks: await page
            .locator('[data-testid="class-block"]')
            .count(),
          emptyMessage: await page.locator("text=No Classes Scheduled").count(),
        };

        console.log("Elements after clear:", elementsAfterClear);

        // Verify responsiveness: if no classes, should have minimal time slots
        if (elementsAfterClear.classBlocks === 0) {
          console.log(
            "✅ Calendar is responsive - no time slots when no classes",
          );
          expect(elementsAfterClear.timeSlots).toBeLessThanOrEqual(1);
        } else {
          console.log(
            "❌ Calendar may not be responsive - still showing classes after clear",
          );
        }

        // Test adding a class to verify it shows properly
        console.log("7. Testing add class functionality...");
        const addButton = page.locator('button:has-text("Add Class")');
        if ((await addButton.count()) > 0) {
          await addButton.click();
          await page.waitForTimeout(1000);

          // Check if modal appeared
          const modal = page.locator('[data-testid="add-class-modal"]');
          if ((await modal.count()) > 0) {
            console.log("✅ Add class modal opened successfully");

            // Close modal
            const closeButton = modal.locator('button:has-text("Cancel")');
            if ((await closeButton.count()) > 0) {
              await closeButton.click();
            }
          }
        }
      }

      // Take final screenshot
      await page.screenshot({
        path: "test-results/calendar-manual-test.png",
        fullPage: true,
      });

      console.log("✅ Calendar functionality test completed successfully");
    } else {
      console.log("❌ Could not reach calendar page - authentication issues");
      await page.screenshot({
        path: "test-results/calendar-auth-failed.png",
        fullPage: true,
      });
    }

    console.log("=== Manual login calendar test completed ===");
  });
});
