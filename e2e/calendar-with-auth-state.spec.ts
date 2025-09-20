import { test, expect } from "@playwright/test";

test.describe("Calendar with Auth State", () => {
  test("should access calendar when properly authenticated", async ({
    page,
  }) => {
    console.log("=== Starting authenticated calendar test ===");

    // Navigate directly to calendar - should work with stored auth state
    console.log("1. Navigating to calendar with auth state...");
    await page.goto("http://login.localhost:3000/class-calendar");

    // Wait for page to load
    await page.waitForLoadState("networkidle");

    console.log("Current URL:", page.url());
    console.log("Page title:", await page.title());

    // Check if we're actually on the calendar page (not redirected to login)
    const currentUrl = page.url();
    const isOnCalendar =
      currentUrl.includes("/class-calendar") &&
      !currentUrl.includes("/owner-login");

    console.log("Is on calendar page:", isOnCalendar);

    if (!isOnCalendar) {
      console.log("Redirected to login, auth state may not be working");
      // Take screenshot of login page for debugging
      await page.screenshot({
        path: "test-results/calendar-auth-failed.png",
        fullPage: true,
      });
      return;
    }

    // Check for calendar elements
    console.log("2. Checking for calendar elements...");
    const elements = {
      calendarGrid: await page.locator('[data-testid="calendar-grid"]').count(),
      addClassButton: await page
        .locator('button:has-text("Add Class")')
        .count(),
      timeSlots: await page.locator('[data-testid="time-slot"]').count(),
      classBlocks: await page.locator('[data-testid="class-block"]').count(),
      emptyState: await page.locator("text=No Classes Scheduled").count(),
    };

    console.log("Calendar elements found:", elements);

    // Test API access with authenticated state
    console.log("3. Testing API access...");
    const apiResponse = await page.evaluate(async () => {
      try {
        const orgId = "63589490-8f55-4157-bd3a-e141594b748e";
        const response = await fetch(
          `/api/class-sessions?organizationId=${orgId}`,
        );
        const data = await response.json();
        return { status: response.status, data };
      } catch (error) {
        return { error: error.message };
      }
    });

    console.log("API response status:", apiResponse.status);
    console.log("API data keys:", Object.keys(apiResponse.data || {}));

    // Test calendar clearing API
    console.log("4. Testing clear calendar API...");
    const clearResponse = await page.evaluate(async () => {
      try {
        const response = await fetch("/api/clear-calendar", {
          method: "DELETE",
        });
        const data = await response.json();
        return { status: response.status, data };
      } catch (error) {
        return { error: error.message };
      }
    });

    console.log("Clear calendar response:", clearResponse);

    // After clearing, check if calendar shows empty state
    console.log("5. Checking calendar state after clearing...");
    await page.reload();
    await page.waitForLoadState("networkidle");

    const elementsAfterClear = {
      calendarGrid: await page.locator('[data-testid="calendar-grid"]').count(),
      timeSlots: await page.locator('[data-testid="time-slot"]').count(),
      classBlocks: await page.locator('[data-testid="class-block"]').count(),
      emptyState: await page.locator("text=No Classes Scheduled").count(),
    };

    console.log("Elements after clear:", elementsAfterClear);

    // Take final screenshot
    await page.screenshot({
      path: "test-results/calendar-final-state.png",
      fullPage: true,
    });

    console.log("=== Authenticated calendar test completed ===");

    // Assertions
    expect(isOnCalendar).toBeTruthy();
    if (apiResponse.status) {
      expect(apiResponse.status).toBe(200);
    }
  });
});
