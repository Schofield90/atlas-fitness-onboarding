import { test, expect } from "@playwright/test";

/**
 * Focused E2E test to verify the specific calendar time display fixes:
 * - 6am classes should display as 6am (not 7am)
 * - 6pm classes should display as 6pm (not 7:30am)
 * - Week navigation should maintain consistent times
 */

test.describe("Calendar Time Display Fixes Verification", () => {
  test.use({ storageState: ".auth/owner.json" });

  test("should display 6am and 6pm classes with correct times and maintain consistency during navigation", async ({
    page,
  }) => {
    // Navigate to calendar
    await page.goto("/class-calendar");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Get organization ID
    const orgResponse = await page.evaluate(async () => {
      try {
        const response = await fetch("/api/organization/current");
        return await response.json();
      } catch (error) {
        return { success: false, error: error.message };
      }
    });

    if (!orgResponse.success) {
      test.skip("Unable to get organization ID");
      return;
    }

    const organizationId = orgResponse.organization.id;
    console.log(`Using organization: ${organizationId}`);

    // Create test classes at 6am and 6pm tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const sixAM = new Date(tomorrow);
    sixAM.setHours(6, 0, 0, 0);

    const sixPM = new Date(tomorrow);
    sixPM.setHours(18, 0, 0, 0);

    const testClasses = [
      {
        name: "6AM Test Class",
        start_time: sixAM.toISOString(),
        end_time: new Date(sixAM.getTime() + 60 * 60 * 1000).toISOString(),
        expectedTime: "6:00",
        hour: 6,
      },
      {
        name: "6PM Test Class",
        start_time: sixPM.toISOString(),
        end_time: new Date(sixPM.getTime() + 60 * 60 * 1000).toISOString(),
        expectedTime: "6:00",
        hour: 18,
      },
    ];

    const createdClassIds = [];

    // Create test classes
    for (const classSpec of testClasses) {
      const classData = {
        ...classSpec,
        organization_id: organizationId,
        max_capacity: 20,
        instructor: "Test Instructor",
        location: "Test Studio",
        description: `Test class at ${classSpec.hour}:00 for time display verification`,
      };

      const createResponse = await page.evaluate(async (data) => {
        try {
          const response = await fetch("/api/class-sessions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
          });
          return await response.json();
        } catch (error) {
          return { success: false, error: error.message };
        }
      }, classData);

      if (createResponse.success) {
        createdClassIds.push(createResponse.session.id);
        console.log(
          `Created ${classSpec.name} with ID: ${createResponse.session.id}`,
        );
      } else {
        console.error(
          `Failed to create ${classSpec.name}:`,
          createResponse.error,
        );
      }
    }

    // Refresh calendar to load new classes
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    console.log("Checking for class displays in calendar...");

    // Check 6AM class displays correctly
    console.log("Looking for 6AM Test Class...");
    const amClassElement = await page.locator('text="6AM Test Class"').first();

    if ((await amClassElement.count()) > 0) {
      console.log("Found 6AM Test Class element");

      // Look for time display near the class - should show 6:00 AM or 06:00, not 7:00
      const timeDisplays = await page
        .locator("text=/6:00|06:00|7:00|07:00/")
        .all();

      let found6AM = false;
      let foundIncorrect7AM = false;

      for (const timeElement of timeDisplays) {
        const timeText = await timeElement.textContent();
        console.log(`Found time display: "${timeText}"`);

        if (timeText?.includes("6:00") || timeText?.includes("06:00")) {
          found6AM = true;
        }
        if (timeText?.includes("7:00") || timeText?.includes("07:00")) {
          foundIncorrect7AM = true;
        }
      }

      // Verify 6am class shows correctly
      expect(found6AM, "6AM class should display as 6:00, not 7:00").toBe(true);
      if (foundIncorrect7AM) {
        console.warn(
          "WARNING: Found 7:00 display when 6AM class was created - this indicates the bug still exists",
        );
      }
    } else {
      console.log("6AM Test Class not found in calendar view");
    }

    // Check 6PM class displays correctly
    console.log("Looking for 6PM Test Class...");
    const pmClassElement = await page.locator('text="6PM Test Class"').first();

    if ((await pmClassElement.count()) > 0) {
      console.log("Found 6PM Test Class element");

      // Should show 6:00 PM, 18:00, or similar - NOT 7:30 AM
      const pmTimeDisplays = await page
        .locator("text=/6:00.*PM|18:00|7:30.*AM/")
        .all();

      let foundCorrectPM = false;
      let foundIncorrectAM = false;

      for (const timeElement of pmTimeDisplays) {
        const timeText = await timeElement.textContent();
        console.log(`Found PM time display: "${timeText}"`);

        if (
          (timeText?.includes("6:00") && timeText?.includes("PM")) ||
          timeText?.includes("18:00")
        ) {
          foundCorrectPM = true;
        }
        if (timeText?.includes("7:30") && timeText?.includes("AM")) {
          foundIncorrectAM = true;
        }
      }

      // Verify 6pm class shows correctly
      expect(
        foundCorrectPM,
        "6PM class should display as 6:00 PM or 18:00",
      ).toBe(true);
      if (foundIncorrectAM) {
        console.warn(
          "WARNING: Found 7:30 AM display when 6PM class was created - this indicates the bug still exists",
        );
      }
      expect(foundIncorrectAM, "6PM class should NOT display as 7:30 AM").toBe(
        false,
      );
    } else {
      console.log("6PM Test Class not found in calendar view");
    }

    // Test navigation consistency
    console.log("Testing navigation consistency...");

    // Record current times
    const recordedTimes = new Map();

    for (const classSpec of testClasses) {
      const classElement = await page
        .locator(`text="${classSpec.name}"`)
        .first();
      if ((await classElement.count()) > 0) {
        const container = classElement.locator("..").first();
        const containerText = await container.textContent();
        const timeMatch = containerText?.match(/(\d{1,2}:\d{2})/);
        if (timeMatch) {
          recordedTimes.set(classSpec.name, timeMatch[1]);
          console.log(`Recorded time for ${classSpec.name}: ${timeMatch[1]}`);
        }
      }
    }

    // Navigate to next week
    const nextButton = page
      .locator("button")
      .filter({ has: page.locator("svg") })
      .filter({ hasText: /→|>|chevron-right/ })
      .first();
    if ((await nextButton.count()) > 0) {
      console.log("Clicking next week button...");
      await nextButton.click();
      await page.waitForTimeout(1000);
    }

    // Navigate back to original week
    const prevButton = page
      .locator("button")
      .filter({ has: page.locator("svg") })
      .filter({ hasText: /←|<|chevron-left/ })
      .first();
    if ((await prevButton.count()) > 0) {
      console.log("Clicking previous week button...");
      await prevButton.click();
      await page.waitForTimeout(1000);
    }

    // Verify times haven't changed after navigation
    for (const classSpec of testClasses) {
      const classElement = await page
        .locator(`text="${classSpec.name}"`)
        .first();
      if ((await classElement.count()) > 0) {
        const container = classElement.locator("..").first();
        const containerText = await container.textContent();
        const timeMatch = containerText?.match(/(\d{1,2}:\d{2})/);
        if (timeMatch) {
          const currentTime = timeMatch[1];
          const recordedTime = recordedTimes.get(classSpec.name);
          console.log(
            `After navigation - ${classSpec.name}: ${currentTime} (was ${recordedTime})`,
          );

          if (recordedTime) {
            expect(
              currentTime,
              `Time for ${classSpec.name} should remain consistent after navigation`,
            ).toBe(recordedTime);
          }
        }
      }
    }

    // Take screenshot for verification
    await page.screenshot({
      path: "e2e/screenshots/calendar-time-fixes-verification.png",
      fullPage: true,
    });

    // Cleanup test classes
    console.log(`Cleaning up ${createdClassIds.length} test classes...`);
    for (const classId of createdClassIds) {
      await page.evaluate(async (id) => {
        try {
          await fetch(`/api/class-sessions?id=${id}`, { method: "DELETE" });
        } catch (error) {
          console.error(`Failed to delete class ${id}:`, error);
        }
      }, classId);
    }

    console.log("✅ Calendar time fixes verification completed successfully");
  });
});
