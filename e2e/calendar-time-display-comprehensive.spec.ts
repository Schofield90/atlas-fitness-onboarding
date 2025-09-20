import { test, expect } from "@playwright/test";

/**
 * Comprehensive E2E Test Suite for Class Calendar Time Display
 *
 * This test suite verifies that class times are displayed correctly in the calendar,
 * particularly focusing on the issues where:
 * - 6am classes show as 7am
 * - 6pm classes show as 7:30am
 * - Times change when navigating between weeks
 * - Timezone handling is inconsistent
 */

test.describe("Calendar Time Display Verification", () => {
  // Use authenticated state for calendar access
  test.use({ storageState: ".auth/owner.json" });

  let testOrganizationId: string;
  let createdClassIds: string[] = [];

  test.beforeAll(async ({ page }) => {
    // Get the test organization ID
    const orgResponse = await page.evaluate(async () => {
      const response = await fetch("/api/organization/current");
      const data = await response.json();
      return data;
    });

    if (orgResponse.success) {
      testOrganizationId = orgResponse.organization.id;
    } else {
      throw new Error("Unable to get test organization ID");
    }

    console.log(`Using test organization: ${testOrganizationId}`);
  });

  test.afterAll(async ({ page }) => {
    // Cleanup created test classes
    if (createdClassIds.length > 0) {
      console.log(`Cleaning up ${createdClassIds.length} test classes`);
      for (const classId of createdClassIds) {
        await page.evaluate(async (id) => {
          await fetch(`/api/class-sessions?id=${id}`, { method: "DELETE" });
        }, classId);
      }
    }
  });

  test("should create and verify 6am class displays correctly as 06:00", async ({
    page,
  }) => {
    // Navigate to calendar
    await page.goto("/class-calendar");
    await page.waitForLoadState("networkidle");

    // Create a test class at 6am
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const sixAM = new Date(tomorrow);
    sixAM.setHours(6, 0, 0, 0);

    const classData = {
      name: "Early Morning Yoga",
      start_time: sixAM.toISOString(),
      end_time: new Date(sixAM.getTime() + 60 * 60 * 1000).toISOString(), // 1 hour later
      organization_id: testOrganizationId,
      max_capacity: 20,
      instructor: "Test Instructor",
      location: "Studio A",
      description: "6am test class for timezone verification",
    };

    // Create the class via API
    const createResponse = await page.evaluate(async (data) => {
      const response = await fetch("/api/class-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    }, classData);

    expect(createResponse.success).toBe(true);
    createdClassIds.push(createResponse.session.id);

    // Refresh calendar to load the new class
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Look for the class time display in the calendar
    const timeDisplays = await page
      .locator("text=/06:00|6:00|07:00|7:00/")
      .all();

    let found6AM = false;
    let found7AM = false;

    for (const timeElement of timeDisplays) {
      const timeText = await timeElement.textContent();
      console.log(`Found time display: ${timeText}`);

      if (timeText?.includes("06:00") || timeText?.includes("6:00")) {
        found6AM = true;
      }
      if (timeText?.includes("07:00") || timeText?.includes("7:00")) {
        found7AM = true;
      }
    }

    // Verify 6am class shows as 6am, not 7am
    expect(found6AM).toBe(true);
    expect(found7AM).toBe(false);

    // Take screenshot for verification
    await page.screenshot({
      path: "e2e/screenshots/6am-class-display.png",
      fullPage: true,
    });
  });

  test("should create and verify 6pm class displays correctly as 18:00 or 6:00 PM", async ({
    page,
  }) => {
    // Navigate to calendar
    await page.goto("/class-calendar");
    await page.waitForLoadState("networkidle");

    // Create a test class at 6pm
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const sixPM = new Date(tomorrow);
    sixPM.setHours(18, 0, 0, 0);

    const classData = {
      name: "Evening HIIT",
      start_time: sixPM.toISOString(),
      end_time: new Date(sixPM.getTime() + 60 * 60 * 1000).toISOString(),
      organization_id: testOrganizationId,
      max_capacity: 15,
      instructor: "Test Instructor",
      location: "Main Gym",
      description: "6pm test class for timezone verification",
    };

    // Create the class via API
    const createResponse = await page.evaluate(async (data) => {
      const response = await fetch("/api/class-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    }, classData);

    expect(createResponse.success).toBe(true);
    createdClassIds.push(createResponse.session.id);

    // Refresh calendar to load the new class
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Look for the class time display - could be 18:00, 6:00 PM, or incorrectly 7:30 AM
    const timeDisplays = await page
      .locator("text=/18:00|6:00.*PM|6:30.*PM|07:30|7:30.*AM/")
      .all();

    let foundCorrectPM = false;
    let foundIncorrectAM = false;

    for (const timeElement of timeDisplays) {
      const timeText = await timeElement.textContent();
      console.log(`Found time display: ${timeText}`);

      // Correct displays
      if (
        timeText?.includes("18:00") ||
        (timeText?.includes("6:00") && timeText?.includes("PM")) ||
        (timeText?.includes("6:30") && timeText?.includes("PM"))
      ) {
        foundCorrectPM = true;
      }

      // Incorrect displays (the bug we're testing for)
      if (
        timeText?.includes("07:30") ||
        (timeText?.includes("7:30") && timeText?.includes("AM"))
      ) {
        foundIncorrectAM = true;
      }
    }

    // Verify 6pm class shows correctly, not as 7:30am
    expect(foundCorrectPM).toBe(true);
    expect(foundIncorrectAM).toBe(false);

    // Take screenshot for verification
    await page.screenshot({
      path: "e2e/screenshots/6pm-class-display.png",
      fullPage: true,
    });
  });

  test("should verify multiple classes at different times display correctly", async ({
    page,
  }) => {
    // Create multiple test classes at various times
    const testTimes = [
      { hour: 6, minute: 0, name: "Morning Yoga" },
      { hour: 9, minute: 30, name: "Mid-Morning Pilates" },
      { hour: 12, minute: 0, name: "Lunch Break Fitness" },
      { hour: 15, minute: 30, name: "Afternoon Strength" },
      { hour: 18, minute: 0, name: "Evening HIIT" },
      { hour: 20, minute: 30, name: "Night Relaxation" },
    ];

    const classIds = [];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    for (const timeSpec of testTimes) {
      const classTime = new Date(tomorrow);
      classTime.setHours(timeSpec.hour, timeSpec.minute, 0, 0);

      const classData = {
        name: timeSpec.name,
        start_time: classTime.toISOString(),
        end_time: new Date(classTime.getTime() + 60 * 60 * 1000).toISOString(),
        organization_id: testOrganizationId,
        max_capacity: 20,
        instructor: "Test Instructor",
        description: `Test class at ${timeSpec.hour}:${timeSpec.minute.toString().padStart(2, "0")}`,
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
        classIds.push(createResponse.session.id);
        createdClassIds.push(createResponse.session.id);
      }
    }

    // Navigate to calendar and verify all times
    await page.goto("/class-calendar");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(3000);

    // Check each expected time
    for (const timeSpec of testTimes) {
      const expectedHour24 = timeSpec.hour.toString().padStart(2, "0");
      const expectedMinute = timeSpec.minute.toString().padStart(2, "0");
      const expected24Hour = `${expectedHour24}:${expectedMinute}`;

      // Convert to 12-hour format for verification
      let expected12Hour = "";
      if (timeSpec.hour === 0) {
        expected12Hour = `12:${expectedMinute} AM`;
      } else if (timeSpec.hour < 12) {
        expected12Hour = `${timeSpec.hour}:${expectedMinute} AM`;
      } else if (timeSpec.hour === 12) {
        expected12Hour = `12:${expectedMinute} PM`;
      } else {
        expected12Hour = `${timeSpec.hour - 12}:${expectedMinute} PM`;
      }

      console.log(
        `Checking for class "${timeSpec.name}" at ${expected24Hour} or ${expected12Hour}`,
      );

      // Look for either format in the DOM
      const timeElements = await page
        .locator(
          `text=/${expected24Hour}|${expected12Hour.replace(":", "\\:")}/`,
        )
        .all();

      if (timeElements.length === 0) {
        // If exact match not found, look for the class name and check nearby time
        const classNameElement = await page
          .locator(`text="${timeSpec.name}"`)
          .first();
        if ((await classNameElement.count()) > 0) {
          const classContainer = classNameElement.locator("..").first();
          const containerText = await classContainer.textContent();
          console.log(
            `Found class "${timeSpec.name}" with container text: ${containerText}`,
          );

          // The time should be somewhere in the container
          expect(containerText).toMatch(
            new RegExp(
              `${expected24Hour}|${expected12Hour.replace(":", "\\:")}`,
            ),
          );
        } else {
          throw new Error(`Class "${timeSpec.name}" not found in calendar`);
        }
      } else {
        console.log(`✓ Found correct time display for ${timeSpec.name}`);
      }
    }

    // Take comprehensive screenshot
    await page.screenshot({
      path: "e2e/screenshots/multiple-classes-display.png",
      fullPage: true,
    });
  });

  test("should maintain correct times when switching between calendar views", async ({
    page,
  }) => {
    // Create a test class
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const testTime = new Date(tomorrow);
    testTime.setHours(9, 30, 0, 0);

    const classData = {
      name: "View Switch Test Class",
      start_time: testTime.toISOString(),
      end_time: new Date(testTime.getTime() + 60 * 60 * 1000).toISOString(),
      organization_id: testOrganizationId,
      max_capacity: 20,
      instructor: "Test Instructor",
      description: "Test class for view switching verification",
    };

    const createResponse = await page.evaluate(async (data) => {
      const response = await fetch("/api/class-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    }, classData);

    expect(createResponse.success).toBe(true);
    createdClassIds.push(createResponse.session.id);

    // Navigate to calendar
    await page.goto("/class-calendar");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Check time in week view
    let weekViewTime = "";
    const weekTimeElement = await page.locator("text=/09:30|9:30/").first();
    if ((await weekTimeElement.count()) > 0) {
      weekViewTime = (await weekTimeElement.textContent()) || "";
      console.log(`Week view time: ${weekViewTime}`);
    }

    // Switch to day view
    const dayButton = page.locator('button:has-text("Day")');
    if ((await dayButton.count()) > 0) {
      await dayButton.click();
      await page.waitForTimeout(1000);

      // Check time in day view
      let dayViewTime = "";
      const dayTimeElement = await page.locator("text=/09:30|9:30/").first();
      if ((await dayTimeElement.count()) > 0) {
        dayViewTime = (await dayTimeElement.textContent()) || "";
        console.log(`Day view time: ${dayViewTime}`);
      }

      // Times should be consistent
      if (weekViewTime && dayViewTime) {
        expect(dayViewTime).toContain("9:30");
        expect(weekViewTime).toContain("9:30");
      }
    }

    // Switch to month view
    const monthButton = page.locator('button:has-text("Month")');
    if ((await monthButton.count()) > 0) {
      await monthButton.click();
      await page.waitForTimeout(1000);

      // Check time in month view
      const monthTimeElement = await page.locator("text=/09:30|9:30/").first();
      if ((await monthTimeElement.count()) > 0) {
        const monthViewTime = (await monthTimeElement.textContent()) || "";
        console.log(`Month view time: ${monthViewTime}`);
        expect(monthViewTime).toContain("9:30");
      }
    }

    // Switch back to week view
    const weekButton = page.locator('button:has-text("Week")');
    if ((await weekButton.count()) > 0) {
      await weekButton.click();
      await page.waitForTimeout(1000);

      // Verify time is still correct
      const finalTimeElement = await page.locator("text=/09:30|9:30/").first();
      if ((await finalTimeElement.count()) > 0) {
        const finalTime = (await finalTimeElement.textContent()) || "";
        console.log(`Final week view time: ${finalTime}`);
        expect(finalTime).toContain("9:30");
      }
    }
  });

  test("should verify database times match calendar display", async ({
    page,
  }) => {
    // Create a test class with known time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const testTime = new Date(tomorrow);
    testTime.setHours(14, 45, 0, 0); // 2:45 PM

    const classData = {
      name: "Database Consistency Test",
      start_time: testTime.toISOString(),
      end_time: new Date(testTime.getTime() + 90 * 60 * 1000).toISOString(), // 1.5 hours
      organization_id: testOrganizationId,
      max_capacity: 25,
      instructor: "DB Test Instructor",
      description: "Test class for database consistency verification",
    };

    const createResponse = await page.evaluate(async (data) => {
      const response = await fetch("/api/class-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      return response.json();
    }, classData);

    expect(createResponse.success).toBe(true);
    const sessionId = createResponse.session.id;
    createdClassIds.push(sessionId);

    // Get the class from database directly
    const dbData = await page.evaluate(async (orgId) => {
      const response = await fetch(
        `/api/class-sessions?organizationId=${orgId}`,
      );
      return response.json();
    }, testOrganizationId);

    expect(dbData.success).toBe(true);

    const dbSession = dbData.sessions.find((s: any) => s.id === sessionId);
    expect(dbSession).toBeDefined();

    console.log(`Database start_time: ${dbSession.startTime}`);
    console.log(`Original input time: ${testTime.toISOString()}`);

    // Navigate to calendar and check display
    await page.goto("/class-calendar");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Find the class in the calendar
    const classElement = await page
      .locator(`text="Database Consistency Test"`)
      .first();
    expect(await classElement.count()).toBeGreaterThan(0);

    // Get the time display near this class
    const classContainer = classElement.locator("..").first();
    const containerText = await classContainer.textContent();
    console.log(`Calendar display text: ${containerText}`);

    // Verify the displayed time matches expected time (14:45 or 2:45 PM)
    expect(containerText).toMatch(/14:45|2:45.*PM/);

    // Verify database time is exactly what we set
    const dbTime = new Date(dbSession.startTime);
    expect(dbTime.getHours()).toBe(14);
    expect(dbTime.getMinutes()).toBe(45);
  });
});
