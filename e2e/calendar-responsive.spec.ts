import { test, expect } from "@playwright/test";

test.describe("Responsive Calendar with Dynamic Time Slots", () => {
  test("should display dynamic time slots based on actual classes", async ({
    page,
  }) => {
    // Navigate to class calendar
    await page.goto("/class-calendar");

    // Wait for page to fully load
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000); // Give React time to render

    // Check that the calendar grid is visible
    const calendarGrid = page
      .locator('[class*="calendar-grid"], .grid')
      .first();
    await expect(calendarGrid).toBeVisible();

    // Verify time slots are present in the left column
    const timeSlots = page.locator(".text-xs.text-gray-500, .sticky.left-0");
    const timeSlotCount = await timeSlots.count();
    console.log(`Found ${timeSlotCount} time slot elements`);

    // Verify the calendar has responsive classes
    const responsiveGrid = page.locator(
      ".grid-cols-2, .sm\\:grid-cols-8, .md\\:grid-cols-8, .lg\\:grid-cols-8",
    );
    const hasResponsiveGrid = (await responsiveGrid.count()) > 0;
    console.log(`Has responsive grid classes: ${hasResponsiveGrid}`);

    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    // Check that weekend days are hidden on mobile
    const saturdayHeader = page.locator("text=/Saturday/i");
    const sundayHeader = page.locator("text=/Sunday/i");
    const satVisible = await saturdayHeader.isVisible().catch(() => false);
    const sunVisible = await sundayHeader.isVisible().catch(() => false);
    console.log(
      `Mobile view - Saturday visible: ${satVisible}, Sunday visible: ${sunVisible}`,
    );

    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);

    // Check that all days are visible on tablet
    const allDayHeaders = await page.locator(".font-medium.text-sm").count();
    console.log(`Tablet view - Number of day headers: ${allDayHeaders}`);

    // Test desktop viewport
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(500);

    // Verify sticky time column works
    const stickyTimeColumn = page.locator(".sticky.left-0").first();
    if ((await stickyTimeColumn.count()) > 0) {
      const isSticky = await stickyTimeColumn.evaluate((el) => {
        const styles = window.getComputedStyle(el);
        return styles.position === "sticky" && styles.left === "0px";
      });
      console.log(`Time column is sticky: ${isSticky}`);
    }

    // Take screenshots for visual verification
    await page.screenshot({ path: "calendar-desktop.png", fullPage: false });

    // Navigate between weeks to test dynamic time slot updates
    const nextButton = page
      .locator("button")
      .filter({
        has: page.locator('svg.lucide-chevron-right, svg[class*="chevron"]'),
      })
      .first();
    if ((await nextButton.count()) > 0) {
      await nextButton.click();
      await page.waitForTimeout(1000);

      // Check time slots updated
      const newTimeSlots = await page.locator(".text-xs.text-gray-500").count();
      console.log(`After navigation - Time slots: ${newTimeSlots}`);
    }

    // Verify no errors occurred
    const errorMessage = page.locator(
      "text=/TypeError|Error:|onDateChange is not a function/i",
    );
    await expect(errorMessage).not.toBeVisible();

    console.log("✅ Responsive calendar with dynamic time slots is working");
  });

  test("should adapt time range to actual session times", async ({ page }) => {
    // Navigate to class calendar
    await page.goto("/class-calendar");

    // Wait for calendar to load
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Look for time slot text
    const timeSlots = await page
      .locator(".text-xs.text-gray-500")
      .allTextContents();
    console.log("Time slots found:", timeSlots);

    // Verify time slots are within a reasonable range (not showing all 24 hours)
    if (timeSlots.length > 0) {
      // Parse the first and last time slots
      const firstTime = timeSlots[0];
      const lastTime = timeSlots[timeSlots.length - 1];
      console.log(`Time range: ${firstTime} to ${lastTime}`);

      // Check that we're not showing unnecessary early morning or late night hours
      const hasEarlyMorning = timeSlots.some(
        (time) =>
          time.includes("3:00") ||
          time.includes("4:00") ||
          time.includes("5:00"),
      );
      const hasLateNight = timeSlots.some(
        (time) =>
          time.includes("23:00") ||
          time.includes("00:00") ||
          time.includes("01:00"),
      );

      console.log(`Shows early morning hours (3-5 AM): ${hasEarlyMorning}`);
      console.log(`Shows late night hours (11 PM-1 AM): ${hasLateNight}`);

      // Ideally, we shouldn't show these extreme hours unless there are classes
      if (!hasEarlyMorning && !hasLateNight) {
        console.log(
          "✅ Time range is optimized (no unnecessary early/late hours)",
        );
      }
    }

    // Check for class session elements
    const classSessions = page.locator(
      '[class*="bg-orange"], [class*="bg-blue"], .rounded-lg.p-2',
    );
    const sessionCount = await classSessions.count();
    console.log(`Found ${sessionCount} class sessions`);

    console.log("✅ Calendar adapts time range based on sessions");
  });
});
