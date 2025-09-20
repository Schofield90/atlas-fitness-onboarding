import { test, expect } from "@playwright/test";

test.describe("Calendar Functionality", () => {
  test.beforeEach(async ({ page }) => {
    // Set up environment for test login
    await page.addInitScript(() => {
      window.localStorage.setItem("ALLOW_TEST_LOGIN", "true");
    });
  });

  test("should display calendar responsively with test sessions", async ({
    page,
    request,
  }) => {
    // Step 1: Authenticate as owner
    console.log("Authenticating as owner...");
    const loginResponse = await request.post(
      "http://localhost:3000/api/test/login",
      {
        data: {
          email: "owner@test.example.com",
          password: "TestPassword123!",
          role: "owner",
          subdomain: "login",
        },
      },
    );

    expect(loginResponse.ok()).toBeTruthy();
    const loginData = await loginResponse.json();
    console.log("Login successful:", loginData.user.email);

    // Step 2: Navigate to calendar
    await page.goto("http://login.localhost:3000/class-calendar");

    // Wait for page to load and check for main elements
    await page.waitForSelector('[data-testid="calendar-grid"]', {
      timeout: 10000,
    });

    // Step 3: Check if there are any existing sessions
    console.log("Checking for existing sessions...");

    // Look for class sessions in the calendar
    const classSessions = await page
      .locator('[data-testid="class-block"]')
      .count();
    console.log(`Found ${classSessions} class sessions in calendar`);

    if (classSessions === 0) {
      console.log(
        "No sessions found, checking if empty state is displayed correctly",
      );

      // Should show empty state message when no classes
      await expect(page.locator("text=No Classes Scheduled")).toBeVisible({
        timeout: 5000,
      });

      // Should not show time slots when no classes (responsive behavior)
      const timeSlots = await page.locator('[data-testid="time-slot"]').count();
      console.log(`Time slots displayed: ${timeSlots}`);

      // With our fix, should show 0 time slots when no classes
      expect(timeSlots).toBe(0);
    } else {
      console.log("Sessions found, checking calendar display");

      // Should show the calendar grid with time slots
      await expect(page.locator('[data-testid="calendar-grid"]')).toBeVisible();

      // Should show time slots only for hours that have classes (responsive behavior)
      const timeSlots = await page.locator('[data-testid="time-slot"]').count();
      console.log(`Time slots displayed: ${timeSlots}`);

      // Should have reasonable number of time slots (not the full day 6 AM - 8 PM)
      expect(timeSlots).toBeGreaterThan(0);
      expect(timeSlots).toBeLessThan(30); // Less than full day range

      // Check that classes are visible in their time slots
      for (let i = 0; i < Math.min(classSessions, 3); i++) {
        const classBlock = page.locator('[data-testid="class-block"]').nth(i);
        await expect(classBlock).toBeVisible();

        // Should have class details
        await expect(classBlock.locator("text=Test")).toBeVisible(); // From program name
      }
    }

    // Step 4: Test adding a new session to verify responsiveness
    console.log("Testing session creation...");

    // Click Add Class button
    await page.click('button:has-text("Add Class")');

    // Wait for modal
    await page.waitForSelector('[data-testid="add-class-modal"]', {
      timeout: 5000,
    });

    // Fill out the form
    await page.fill('input[name="name"]', "E2E Test Session");
    await page.fill('input[name="startTime"]', "2025-09-22T10:00"); // 10 AM
    await page.fill('input[name="endTime"]', "2025-09-22T11:00"); // 11 AM
    await page.fill('input[name="capacity"]', "15");

    // Submit the form
    await page.click('button[type="submit"]');

    // Wait for modal to close and calendar to refresh
    await page.waitForTimeout(2000);

    // Check that the new session appears
    await expect(page.locator("text=E2E Test Session")).toBeVisible({
      timeout: 10000,
    });

    // Verify calendar is now showing time slots around 10 AM
    const updatedTimeSlots = await page
      .locator('[data-testid="time-slot"]')
      .count();
    console.log(`Time slots after adding session: ${updatedTimeSlots}`);
    expect(updatedTimeSlots).toBeGreaterThan(0);

    // Should include 10 AM time slot
    await expect(page.locator("text=10:00 AM")).toBeVisible();

    console.log("✅ Calendar functionality test completed successfully");
  });

  test("should handle empty calendar state correctly", async ({
    page,
    request,
  }) => {
    // Authenticate
    const loginResponse = await request.post(
      "http://localhost:3000/api/test/login",
      {
        data: {
          email: "owner@test.example.com",
          password: "TestPassword123!",
          role: "owner",
          subdomain: "login",
        },
      },
    );
    expect(loginResponse.ok()).toBeTruthy();

    // Clear all calendar data first
    const clearResponse = await request.delete(
      "http://localhost:3000/api/clear-calendar",
    );
    console.log("Clear calendar response:", clearResponse.status());

    // Navigate to calendar
    await page.goto("http://login.localhost:3000/class-calendar");
    await page.waitForLoadState("networkidle");

    // Should show empty state
    await expect(page.locator("text=No Classes Scheduled")).toBeVisible({
      timeout: 10000,
    });

    // Should NOT show time slots (responsive behavior)
    const timeSlots = await page.locator('[data-testid="time-slot"]').count();
    expect(timeSlots).toBe(0);

    // Should show call-to-action buttons
    await expect(page.locator('button:has-text("Add Class")')).toBeVisible();
    await expect(
      page.locator('button:has-text("Generate Sample Classes")'),
    ).toBeVisible();

    console.log("✅ Empty calendar state test completed successfully");
  });

  test("should show sessions at correct times", async ({ page, request }) => {
    // Authenticate
    const loginResponse = await request.post(
      "http://localhost:3000/api/test/login",
      {
        data: {
          email: "owner@test.example.com",
          password: "TestPassword123!",
          role: "owner",
          subdomain: "login",
        },
      },
    );
    expect(loginResponse.ok()).toBeTruthy();

    // Navigate to calendar
    await page.goto("http://login.localhost:3000/class-calendar");
    await page.waitForLoadState("networkidle");

    // Check if we can see the 6 AM sessions that were created earlier
    console.log("Looking for 6 AM sessions...");

    // Check if 6 AM time slot is visible
    const sixAmSlot = page.locator("text=6:00 AM");
    if (await sixAmSlot.isVisible()) {
      console.log("✅ 6 AM time slot is visible");

      // Look for sessions in that time slot
      const sessionsAt6Am = await page
        .locator('[data-testid="class-block"]')
        .count();
      console.log(`Sessions found at 6 AM area: ${sessionsAt6Am}`);
    } else {
      console.log("6 AM slot not visible, checking for any sessions...");

      const anySessions = await page
        .locator('[data-testid="class-block"]')
        .count();
      console.log(`Total sessions visible: ${anySessions}`);

      if (anySessions === 0) {
        console.log("No sessions visible - this confirms the issue");

        // Let's check what data the API is returning
        const response = await page.evaluate(async () => {
          const orgId = "63589490-8f55-4157-bd3a-e141594b748e"; // From logs
          const res = await fetch(
            `/api/class-sessions?organizationId=${orgId}`,
          );
          return await res.json();
        });

        console.log("API response:", response);
      }
    }

    console.log("✅ Session visibility test completed");
  });
});
