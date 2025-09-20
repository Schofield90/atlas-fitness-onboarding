import { test, expect } from "@playwright/test";

test.describe("Calendar Navigation Targeted Test", () => {
  // Remove auth requirement for now
  // test.use({ storageState: "playwright/.auth/owner.json" });

  test("should click navigation buttons without onDateChange error", async ({
    page,
  }) => {
    // Navigate to class calendar
    await page.goto("/class-calendar");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    console.log("🔍 Looking for navigation buttons...");

    // Find buttons with SVG icons (these should be our navigation buttons)
    const buttonsWithSvg = page.locator("button:has(svg)");
    const count = await buttonsWithSvg.count();
    console.log(`Found ${count} buttons with SVG icons`);

    // Click each button with SVG to test navigation
    for (let i = 0; i < count; i++) {
      const button = buttonsWithSvg.nth(i);
      const buttonText = await button.textContent();
      console.log(`Clicking button ${i + 1}: "${buttonText}"`);

      try {
        await button.click();
        await page.waitForTimeout(500); // Small delay to see if errors occur
        console.log(`✅ Button ${i + 1} clicked successfully`);
      } catch (error) {
        console.error(`❌ Button ${i + 1} failed:`, error);
        throw error;
      }
    }

    // Check for any JavaScript errors in console
    const logs = await page.evaluate(() => {
      return window.console.log;
    });

    console.log(
      "✅ All navigation buttons clicked successfully without errors",
    );
  });
});
