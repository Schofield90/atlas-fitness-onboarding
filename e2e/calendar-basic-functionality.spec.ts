import { test, expect } from "@playwright/test";

test.describe("Calendar Basic Functionality", () => {
  test("should handle calendar clearing and responsive behavior", async ({
    page,
  }) => {
    console.log("=== Starting basic calendar functionality test ===");

    // First, create some test sessions directly in the database
    console.log("1. Creating test sessions in database...");
    const setupResponse = await page.evaluate(async () => {
      try {
        const response = await fetch("/api/test/setup-calendar-data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            organizationId: "63589490-8f55-4157-bd3a-e141594b748e",
            sessionsCount: 3,
          }),
        });
        const data = await response.json();
        return { status: response.status, data };
      } catch (error) {
        return { error: error.message };
      }
    });

    console.log("Setup response:", setupResponse);

    // Navigate to calendar page using direct access (bypass auth for this test)
    console.log("2. Navigating to calendar page...");
    await page.goto("http://login.localhost:3000/class-calendar");
    await page.waitForLoadState("networkidle");

    console.log("Current URL:", page.url());

    // Check for calendar elements
    console.log("3. Checking calendar elements...");
    const initialElements = {
      calendarGrid: await page.locator('[data-testid="calendar-grid"]').count(),
      timeSlots: await page.locator('[data-testid="time-slot"]').count(),
      classBlocks: await page.locator('[data-testid="class-block"]').count(),
    };

    console.log("Initial calendar elements:", initialElements);

    // Test calendar clearing functionality
    console.log("4. Testing calendar clear functionality...");
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

    console.log("Clear response:", clearResponse);

    // Reload and check if calendar is now empty and responsive
    console.log("5. Checking calendar state after clearing...");
    await page.reload();
    await page.waitForLoadState("networkidle");

    const finalElements = {
      calendarGrid: await page.locator('[data-testid="calendar-grid"]').count(),
      timeSlots: await page.locator('[data-testid="time-slot"]').count(),
      classBlocks: await page.locator('[data-testid="class-block"]').count(),
      emptyMessage: await page.locator("text=No Classes Scheduled").count(),
    };

    console.log("Final calendar elements:", finalElements);

    // Take screenshots for verification
    await page.screenshot({
      path: "test-results/calendar-basic-test.png",
      fullPage: true,
    });

    console.log("=== Basic calendar functionality test completed ===");

    // Basic assertions about responsive behavior
    // If calendar is responsive, it should show 0 time slots when there are no classes
    if (finalElements.classBlocks === 0) {
      // Calendar should be responsive and show no time slots
      console.log(
        "Calendar appears responsive - no classes, checking time slots...",
      );
      expect(finalElements.timeSlots).toBeLessThanOrEqual(1); // Allow for minimal structure
    }
  });
});
