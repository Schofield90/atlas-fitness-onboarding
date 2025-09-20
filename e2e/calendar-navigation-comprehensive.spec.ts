import { test, expect } from "@playwright/test";

/**
 * Comprehensive E2E Test Suite for Calendar Navigation
 *
 * This test suite verifies that calendar navigation works correctly and that
 * class times remain consistent when navigating between weeks, months, and views.
 *
 * Key test scenarios:
 * - Week navigation maintains consistent class times
 * - Month navigation doesn't affect time display
 * - Today button works correctly
 * - Navigation doesn't cause classes to disappear or change times
 * - Edge cases like month boundaries work correctly
 */

test.describe("Calendar Navigation Time Consistency", () => {
  test.use({ storageState: ".auth/owner.json" });

  let testOrganizationId: string;
  let createdClassIds: string[] = [];
  let referenceClasses: Array<{
    id: string;
    name: string;
    expectedTime: string;
    originalISOTime: string;
    dayOfWeek: number;
  }> = [];

  test.beforeAll(async ({ page }) => {
    // Get test organization
    const orgResponse = await page.evaluate(async () => {
      const response = await fetch("/api/organization/current");
      return response.json();
    });

    if (orgResponse.success) {
      testOrganizationId = orgResponse.organization.id;
    } else {
      throw new Error("Unable to get test organization ID");
    }

    // Create reference classes for navigation testing
    const testClasses = [
      { name: "Monday Morning Yoga", hour: 6, minute: 0, dayOffset: 1 }, // Next Monday
      { name: "Tuesday HIIT", hour: 18, minute: 30, dayOffset: 2 }, // Next Tuesday
      { name: "Wednesday Pilates", hour: 9, minute: 15, dayOffset: 3 }, // Next Wednesday
      { name: "Thursday Strength", hour: 12, minute: 0, dayOffset: 4 }, // Next Thursday
      { name: "Friday Evening Flow", hour: 19, minute: 45, dayOffset: 5 }, // Next Friday
    ];

    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

    for (const classSpec of testClasses) {
      // Calculate next occurrence of the target day
      let daysUntilTarget = classSpec.dayOffset - currentDay;
      if (daysUntilTarget <= 0) {
        daysUntilTarget += 7; // Next week
      }

      const classDate = new Date(today);
      classDate.setDate(today.getDate() + daysUntilTarget);
      classDate.setHours(classSpec.hour, classSpec.minute, 0, 0);

      const classData = {
        name: classSpec.name,
        start_time: classDate.toISOString(),
        end_time: new Date(classDate.getTime() + 60 * 60 * 1000).toISOString(),
        organization_id: testOrganizationId,
        max_capacity: 20,
        instructor: "Navigation Test Instructor",
        description: `Reference class for navigation testing at ${classSpec.hour}:${classSpec.minute.toString().padStart(2, "0")}`,
      };

      const createResponse = await page.evaluate(async (data) => {
        const response = await fetch("/api/class-sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        return response.json();
      }, classData);

      if (createResponse.success) {
        createdClassIds.push(createResponse.session.id);

        // Store reference for comparison
        const expectedTime = `${classSpec.hour.toString().padStart(2, "0")}:${classSpec.minute.toString().padStart(2, "0")}`;
        referenceClasses.push({
          id: createResponse.session.id,
          name: classSpec.name,
          expectedTime,
          originalISOTime: classDate.toISOString(),
          dayOfWeek: classSpec.dayOffset,
        });
      }
    }

    console.log(
      `Created ${referenceClasses.length} reference classes for navigation testing`,
    );
  });

  test.afterAll(async ({ page }) => {
    // Cleanup
    if (createdClassIds.length > 0) {
      console.log(`Cleaning up ${createdClassIds.length} test classes`);
      for (const classId of createdClassIds) {
        await page.evaluate(async (id) => {
          await fetch(`/api/class-sessions?id=${id}`, { method: "DELETE" });
        }, classId);
      }
    }
  });

  test("should maintain consistent times when navigating to next week", async ({
    page,
  }) => {
    await page.goto("/class-calendar");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Record initial state of times
    const initialTimes = new Map<string, string>();

    for (const refClass of referenceClasses) {
      const classElement = await page
        .locator(`text="${refClass.name}"`)
        .first();
      if ((await classElement.count()) > 0) {
        const container = classElement.locator("..").first();
        const containerText = (await container.textContent()) || "";

        // Extract time from container text
        const timeMatch = containerText.match(/(\d{1,2}:\d{2})/);
        if (timeMatch) {
          initialTimes.set(refClass.name, timeMatch[1]);
          console.log(`Initial time for ${refClass.name}: ${timeMatch[1]}`);
        }
      }
    }

    // Navigate to next week
    const nextButton = page
      .locator("button")
      .filter({ has: page.locator("svg.lucide-chevron-right") })
      .first();
    await expect(nextButton).toBeVisible({ timeout: 10000 });
    await nextButton.click();
    await page.waitForTimeout(1000);

    // Navigate back to original week
    const prevButton = page
      .locator("button")
      .filter({ has: page.locator("svg.lucide-chevron-left") })
      .first();
    await expect(prevButton).toBeVisible();
    await prevButton.click();
    await page.waitForTimeout(1000);

    // Verify times are still the same
    for (const refClass of referenceClasses) {
      const classElement = await page
        .locator(`text="${refClass.name}"`)
        .first();
      if ((await classElement.count()) > 0) {
        const container = classElement.locator("..").first();
        const containerText = (await container.textContent()) || "";

        const timeMatch = containerText.match(/(\d{1,2}:\d{2})/);
        if (timeMatch) {
          const currentTime = timeMatch[1];
          const originalTime = initialTimes.get(refClass.name);

          console.log(
            `After navigation - ${refClass.name}: ${currentTime} (was ${originalTime})`,
          );
          expect(currentTime).toBe(originalTime);
        }
      }
    }

    await page.screenshot({
      path: "e2e/screenshots/after-week-navigation.png",
      fullPage: true,
    });
  });

  test("should maintain correct times across multiple week navigations", async ({
    page,
  }) => {
    await page.goto("/class-calendar");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Navigate forward several weeks and back
    const navigationSteps = [
      { direction: "next", steps: 3 },
      { direction: "prev", steps: 2 },
      { direction: "next", steps: 1 },
      { direction: "prev", steps: 2 },
    ];

    for (const nav of navigationSteps) {
      const button =
        nav.direction === "next"
          ? page
              .locator("button")
              .filter({ has: page.locator("svg.lucide-chevron-right") })
              .first()
          : page
              .locator("button")
              .filter({ has: page.locator("svg.lucide-chevron-left") })
              .first();

      for (let i = 0; i < nav.steps; i++) {
        await button.click();
        await page.waitForTimeout(500);

        // Check that no errors occurred
        const errorMessage = page.locator("text=/TypeError|Error:/i");
        await expect(errorMessage).not.toBeVisible();
      }

      console.log(`Navigated ${nav.direction} ${nav.steps} steps`);
    }

    // Return to current week using Today button
    const todayButton = page.locator('button:has-text("Today")');
    if ((await todayButton.count()) > 0) {
      await todayButton.click();
      await page.waitForTimeout(1000);
    }

    // Verify all reference classes still display correct times
    for (const refClass of referenceClasses) {
      const classElement = await page
        .locator(`text="${refClass.name}"`)
        .first();
      if ((await classElement.count()) > 0) {
        const container = classElement.locator("..").first();
        const containerText = (await container.textContent()) || "";

        // Should still contain the expected time
        expect(containerText).toMatch(
          new RegExp(refClass.expectedTime.replace(":", "\\:")),
        );
        console.log(
          `✓ ${refClass.name} still shows correct time: ${refClass.expectedTime}`,
        );
      }
    }
  });

  test("should handle month boundary navigation correctly", async ({
    page,
  }) => {
    await page.goto("/class-calendar");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Switch to month view for this test
    const monthButton = page.locator('button:has-text("Month")');
    if ((await monthButton.count()) > 0) {
      await monthButton.click();
      await page.waitForTimeout(1000);
    }

    // Get current month/year for reference
    const currentDateText = await page
      .locator('[class*="font-medium"]')
      .first()
      .textContent();
    console.log(`Current calendar shows: ${currentDateText}`);

    // Navigate to next month
    const nextButton = page
      .locator("button")
      .filter({ has: page.locator("svg.lucide-chevron-right") })
      .first();
    await nextButton.click();
    await page.waitForTimeout(1000);

    // Navigate back to previous month
    const prevButton = page
      .locator("button")
      .filter({ has: page.locator("svg.lucide-chevron-left") })
      .first();
    await prevButton.click();
    await page.waitForTimeout(1000);

    // Verify no errors occurred during month navigation
    const errorMessage = page.locator("text=/TypeError|Error:/i");
    await expect(errorMessage).not.toBeVisible();

    // Switch back to week view
    const weekButton = page.locator('button:has-text("Week")');
    if ((await weekButton.count()) > 0) {
      await weekButton.click();
      await page.waitForTimeout(1000);
    }

    // Verify classes are still visible and correct
    for (const refClass of referenceClasses) {
      const classElement = await page
        .locator(`text="${refClass.name}"`)
        .first();
      if ((await classElement.count()) > 0) {
        const container = classElement.locator("..").first();
        const containerText = (await container.textContent()) || "";
        expect(containerText).toMatch(
          new RegExp(refClass.expectedTime.replace(":", "\\:")),
        );
      }
    }
  });

  test("should not lose classes when rapidly navigating", async ({ page }) => {
    await page.goto("/class-calendar");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Count classes initially
    let initialClassCount = 0;
    for (const refClass of referenceClasses) {
      const classElement = await page
        .locator(`text="${refClass.name}"`)
        .first();
      if ((await classElement.count()) > 0) {
        initialClassCount++;
      }
    }

    console.log(`Initial class count: ${initialClassCount}`);

    // Rapid navigation test
    const nextButton = page
      .locator("button")
      .filter({ has: page.locator("svg.lucide-chevron-right") })
      .first();
    const prevButton = page
      .locator("button")
      .filter({ has: page.locator("svg.lucide-chevron-left") })
      .first();

    // Rapidly navigate forward and back
    for (let i = 0; i < 5; i++) {
      await nextButton.click();
      await page.waitForTimeout(100); // Minimal wait to simulate rapid clicking
    }

    for (let i = 0; i < 5; i++) {
      await prevButton.click();
      await page.waitForTimeout(100);
    }

    // Allow UI to settle
    await page.waitForTimeout(2000);

    // Count classes after rapid navigation
    let finalClassCount = 0;
    for (const refClass of referenceClasses) {
      const classElement = await page
        .locator(`text="${refClass.name}"`)
        .first();
      if ((await classElement.count()) > 0) {
        finalClassCount++;
      }
    }

    console.log(`Final class count: ${finalClassCount}`);

    // Should not have lost any classes
    expect(finalClassCount).toBe(initialClassCount);

    // No errors should have occurred
    const errorMessage = page.locator("text=/TypeError|Error:/i");
    await expect(errorMessage).not.toBeVisible();
  });

  test("should maintain time consistency when switching views during navigation", async ({
    page,
  }) => {
    await page.goto("/class-calendar");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Pick one reference class to track closely
    const trackingClass = referenceClasses[0];
    const trackingElement = await page
      .locator(`text="${trackingClass.name}"`)
      .first();

    if ((await trackingElement.count()) === 0) {
      console.log(
        `Tracking class ${trackingClass.name} not visible, skipping view switching test`,
      );
      return;
    }

    // Record time in week view
    let weekViewTime = "";
    const weekContainer = trackingElement.locator("..").first();
    const weekText = (await weekContainer.textContent()) || "";
    const weekMatch = weekText.match(/(\d{1,2}:\d{2})/);
    if (weekMatch) {
      weekViewTime = weekMatch[1];
    }

    // Navigate forward one week
    const nextButton = page
      .locator("button")
      .filter({ has: page.locator("svg.lucide-chevron-right") })
      .first();
    await nextButton.click();
    await page.waitForTimeout(1000);

    // Switch to day view
    const dayButton = page.locator('button:has-text("Day")');
    if ((await dayButton.count()) > 0) {
      await dayButton.click();
      await page.waitForTimeout(1000);
    }

    // Navigate back one week in day view
    const prevButton = page
      .locator("button")
      .filter({ has: page.locator("svg.lucide-chevron-left") })
      .first();
    await prevButton.click();
    await page.waitForTimeout(1000);

    // Switch back to week view
    const weekButton = page.locator('button:has-text("Week")');
    if ((await weekButton.count()) > 0) {
      await weekButton.click();
      await page.waitForTimeout(1000);
    }

    // Check time is still consistent
    const finalTrackingElement = await page
      .locator(`text="${trackingClass.name}"`)
      .first();
    if ((await finalTrackingElement.count()) > 0) {
      const finalContainer = finalTrackingElement.locator("..").first();
      const finalText = (await finalContainer.textContent()) || "";
      const finalMatch = finalText.match(/(\d{1,2}:\d{2})/);

      if (finalMatch && weekViewTime) {
        const finalTime = finalMatch[1];
        console.log(`Time consistency check: ${weekViewTime} -> ${finalTime}`);
        expect(finalTime).toBe(weekViewTime);
      }
    }
  });

  test("should handle Today button correctly from different time periods", async ({
    page,
  }) => {
    await page.goto("/class-calendar");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Navigate far into the future
    const nextButton = page
      .locator("button")
      .filter({ has: page.locator("svg.lucide-chevron-right") })
      .first();
    for (let i = 0; i < 10; i++) {
      await nextButton.click();
      await page.waitForTimeout(200);
    }

    // Click Today button
    const todayButton = page.locator('button:has-text("Today")');
    if ((await todayButton.count()) > 0) {
      await todayButton.click();
      await page.waitForTimeout(1000);
    }

    // Should be back to current time period
    // Verify by checking if our reference classes are visible again
    let visibleClasses = 0;
    for (const refClass of referenceClasses) {
      const classElement = await page
        .locator(`text="${refClass.name}"`)
        .first();
      if ((await classElement.count()) > 0) {
        visibleClasses++;
      }
    }

    expect(visibleClasses).toBeGreaterThan(0);
    console.log(
      `After Today button: ${visibleClasses} reference classes visible`,
    );

    // Navigate far into the past
    const prevButton = page
      .locator("button")
      .filter({ has: page.locator("svg.lucide-chevron-left") })
      .first();
    for (let i = 0; i < 10; i++) {
      await prevButton.click();
      await page.waitForTimeout(200);
    }

    // Click Today button again
    if ((await todayButton.count()) > 0) {
      await todayButton.click();
      await page.waitForTimeout(1000);
    }

    // Should be back to current time period again
    visibleClasses = 0;
    for (const refClass of referenceClasses) {
      const classElement = await page
        .locator(`text="${refClass.name}"`)
        .first();
      if ((await classElement.count()) > 0) {
        visibleClasses++;
      }
    }

    expect(visibleClasses).toBeGreaterThan(0);
    console.log(
      `After Today button from past: ${visibleClasses} reference classes visible`,
    );
  });

  test("should verify calendar date display updates correctly during navigation", async ({
    page,
  }) => {
    await page.goto("/class-calendar");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Get initial date display
    const getDateDisplay = async () => {
      const dateElements = await page
        .locator('[class*="font-medium"], [class*="text-white"]')
        .all();
      for (const element of dateElements) {
        const text = await element.textContent();
        if (
          text &&
          (text.includes("Mon") ||
            text.includes("Jan") ||
            text.includes("Feb") ||
            text.includes("Dec"))
        ) {
          return text.trim();
        }
      }
      return "";
    };

    const initialDate = await getDateDisplay();
    console.log(`Initial date display: ${initialDate}`);

    // Navigate forward
    const nextButton = page
      .locator("button")
      .filter({ has: page.locator("svg.lucide-chevron-right") })
      .first();
    await nextButton.click();
    await page.waitForTimeout(1000);

    const nextWeekDate = await getDateDisplay();
    console.log(`Next week date display: ${nextWeekDate}`);

    // Dates should be different
    expect(nextWeekDate).not.toBe(initialDate);

    // Navigate back
    const prevButton = page
      .locator("button")
      .filter({ has: page.locator("svg.lucide-chevron-left") })
      .first();
    await prevButton.click();
    await page.waitForTimeout(1000);

    const backToOriginalDate = await getDateDisplay();
    console.log(`Back to original date display: ${backToOriginalDate}`);

    // Should be back to original date
    expect(backToOriginalDate).toBe(initialDate);
  });
});
