/**
 * E2E Test Suite: Booking Data Consistency
 *
 * These end-to-end tests verify the complete user workflow from calendar overview
 * to detailed class view, specifically testing for booking count mismatches and
 * unknown customer display issues.
 *
 * BUG REPRODUCTION: Tests the exact user journey that demonstrates:
 * 1. Calendar shows X bookings for a class
 * 2. Clicking the class shows Y attendees (where X ≠ Y)
 * 3. Customer names appear as "Unknown" in detail view
 */

import { test, expect, Page } from "@playwright/test";

// Test configuration
const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const TEST_EMAIL = `e2e-booking-${Date.now()}@testgym.com`;
const TEST_PASSWORD = "TestPass123!";

test.describe("Booking Data Consistency E2E Tests", () => {
  let page: Page;
  let testOrganizationId: string;
  let testClassSessionId: string;

  test.beforeAll(async ({ browser }) => {
    // Set up test data and authenticate
    const context = await browser.newContext();
    page = await context.newPage();

    // Navigate to the application
    await page.goto(`${BASE_URL}/class-calendar`);

    // Check if we need to authenticate or if test mode is available
    const currentUrl = page.url();
    if (currentUrl.includes("/login") || currentUrl.includes("/auth")) {
      // Try test mode first
      await page.goto(`${BASE_URL}/class-calendar?test=1`);

      // If still redirected, handle authentication
      if (page.url().includes("/login") || page.url().includes("/auth")) {
        await page.fill('input[type="email"]', TEST_EMAIL);
        await page.fill('input[type="password"]', TEST_PASSWORD);
        await page.click('button[type="submit"]');
        await page.waitForURL("**/class-calendar", { timeout: 10000 });
      }
    }
  });

  test.describe("Calendar Overview vs Detail View Mismatch", () => {
    test("should reproduce booking count mismatch bug", async () => {
      // Navigate to class calendar
      await page.goto(`${BASE_URL}/class-calendar`);

      // Wait for calendar to load
      await page.waitForSelector('[data-testid="premium-calendar-grid"]', {
        timeout: 10000,
      });

      // Look for classes with booking counts in the calendar overview
      const classElements = await page
        .locator(".class-card, .calendar-class-item")
        .all();

      if (classElements.length === 0) {
        console.log("No classes found in calendar. Creating test scenario...");

        // Create a test class first
        await page.click('button:has-text("Add Class")');
        await page.waitForSelector('[data-testid="add-class-modal"]');

        await page.fill('[data-testid="class-title"]', "Test Yoga Class");
        await page.fill('[data-testid="instructor-name"]', "Test Instructor");
        await page.fill('[data-testid="class-duration"]', "60");
        await page.fill('[data-testid="class-capacity"]', "10");
        await page.fill('[data-testid="class-date"]', "2025-09-09");
        await page.fill('[data-testid="class-time"]', "09:00");

        await page.click('[data-testid="save-class"]');
        await page.waitForSelector('[data-testid="add-class-modal"]', {
          state: "hidden",
        });

        // Refresh to see the new class
        await page.reload();
        await page.waitForSelector('[data-testid="premium-calendar-grid"]');
      }

      // Find a class with bookings displayed
      const classWithBookings = page.locator(".calendar-class-item").first();

      // Extract the booking count from the calendar overview
      const overviewBookingText = (await classWithBookings.textContent()) || "";
      const overviewMatch = overviewBookingText.match(
        /(\d+)\s*(?:people|attendees|bookings)/i,
      );
      const overviewBookingCount = overviewMatch
        ? parseInt(overviewMatch[1])
        : 0;

      console.log(`Calendar overview shows: ${overviewBookingCount} bookings`);

      // Click on the class to open detail view
      await classWithBookings.click();

      // Wait for session detail modal to open
      await page.waitForSelector('[data-testid="session-detail-modal"]', {
        timeout: 10000,
      });

      // Count attendees in the detail view
      const attendeeElements = await page
        .locator('[data-testid="attendee-item"]')
        .count();

      console.log(`Detail view shows: ${attendeeElements} attendees`);

      // BUG REPRODUCTION: These counts should be equal but often aren't
      if (overviewBookingCount !== attendeeElements) {
        console.error("BUG DETECTED: Booking count mismatch!");
        console.error(
          `Overview: ${overviewBookingCount}, Detail: ${attendeeElements}`,
        );
      }

      // Document the bug for QA report
      await expect.soft(overviewBookingCount).toBe(attendeeElements);

      // Take screenshot for bug report
      await page.screenshot({
        path: "test-results/booking-count-mismatch.png",
        fullPage: true,
      });
    });

    test("should detect unknown customer display issue", async () => {
      // Navigate to class calendar
      await page.goto(`${BASE_URL}/class-calendar`);
      await page.waitForSelector('[data-testid="premium-calendar-grid"]');

      // Click on any class to view details
      const anyClass = page.locator(".calendar-class-item").first();
      await anyClass.click();

      // Wait for detail modal
      await page.waitForSelector('[data-testid="session-detail-modal"]');

      // Check for attendees with "Unknown" names
      const unknownAttendees = await page
        .locator('[data-testid="attendee-name"]:has-text("Unknown")')
        .count();

      if (unknownAttendees > 0) {
        console.error(
          `BUG DETECTED: ${unknownAttendees} attendees showing as "Unknown"`,
        );

        // Get details of unknown attendees for debugging
        const unknownAttendeeElements = await page
          .locator(
            '[data-testid="attendee-item"]:has([data-testid="attendee-name"]:has-text("Unknown"))',
          )
          .all();

        for (let i = 0; i < unknownAttendeeElements.length; i++) {
          const attendeeElement = unknownAttendeeElements[i];
          const membershipType = await attendeeElement
            .locator('[data-testid="membership-type"]')
            .textContent();
          const status = await attendeeElement
            .locator('[data-testid="attendee-status"]')
            .textContent();

          console.error(
            `Unknown attendee ${i + 1}: Membership: ${membershipType}, Status: ${status}`,
          );
        }

        // Take screenshot for bug report
        await page.screenshot({
          path: "test-results/unknown-customers.png",
          fullPage: true,
        });
      }

      // Document the issue
      await expect.soft(unknownAttendees).toBe(0);
    });

    test("should verify correct attendee information when customer data exists", async () => {
      // Navigate to class calendar
      await page.goto(`${BASE_URL}/class-calendar`);
      await page.waitForSelector('[data-testid="premium-calendar-grid"]');

      // Click on a class
      const classItem = page.locator(".calendar-class-item").first();
      await classItem.click();

      // Wait for detail modal
      await page.waitForSelector('[data-testid="session-detail-modal"]');

      // Check attendee details
      const attendeeItems = await page
        .locator('[data-testid="attendee-item"]')
        .all();

      for (const attendeeItem of attendeeItems) {
        const name =
          (await attendeeItem
            .locator('[data-testid="attendee-name"]')
            .textContent()) || "";
        const membershipType =
          (await attendeeItem
            .locator('[data-testid="membership-type"]')
            .textContent()) || "";

        // Valid attendees should have proper names and membership info
        if (name !== "Unknown") {
          expect(name.trim()).not.toBe("");
          expect(membershipType.trim()).not.toBe("");
          expect(membershipType).not.toBe("No Membership");
        }
      }
    });
  });

  test.describe("Complete User Workflow Tests", () => {
    test("should maintain data consistency throughout booking workflow", async () => {
      // 1. Start at calendar overview
      await page.goto(`${BASE_URL}/class-calendar`);
      await page.waitForSelector('[data-testid="premium-calendar-grid"]');

      // 2. Note initial booking counts
      const initialCounts = new Map();
      const classElements = await page.locator(".calendar-class-item").all();

      for (let i = 0; i < Math.min(classElements.length, 3); i++) {
        const classElement = classElements[i];
        const classText = (await classElement.textContent()) || "";
        const bookingMatch = classText.match(
          /(\d+)\s*(?:people|attendees|bookings)/i,
        );
        const bookingCount = bookingMatch ? parseInt(bookingMatch[1]) : 0;
        initialCounts.set(i, bookingCount);
      }

      // 3. Check each class detail view
      for (let i = 0; i < Math.min(classElements.length, 3); i++) {
        const classElement = classElements[i];
        await classElement.click();

        // Wait for modal
        await page.waitForSelector('[data-testid="session-detail-modal"]');

        // Count attendees
        const detailCount = await page
          .locator('[data-testid="attendee-item"]')
          .count();
        const overviewCount = initialCounts.get(i) || 0;

        console.log(
          `Class ${i + 1}: Overview=${overviewCount}, Detail=${detailCount}`,
        );

        // Data consistency check
        await expect.soft(detailCount).toBe(overviewCount);

        // Close modal and continue
        await page.click('[data-testid="close-modal"]');
        await page.waitForSelector('[data-testid="session-detail-modal"]', {
          state: "hidden",
        });
      }
    });

    test("should handle edge cases gracefully", async () => {
      // Test empty classes (no bookings)
      await page.goto(`${BASE_URL}/class-calendar`);
      await page.waitForSelector('[data-testid="premium-calendar-grid"]');

      // Look for classes with 0 bookings
      const emptyClasses = await page
        .locator(
          '.calendar-class-item:has-text("0 people"), .calendar-class-item:not(:has-text("people"))',
        )
        .all();

      if (emptyClasses.length > 0) {
        const emptyClass = emptyClasses[0];
        await emptyClass.click();

        await page.waitForSelector('[data-testid="session-detail-modal"]');

        // Should show no attendees
        const attendeeCount = await page
          .locator('[data-testid="attendee-item"]')
          .count();
        expect(attendeeCount).toBe(0);

        // Should display appropriate message
        await expect(
          page.locator("text=No attendees registered"),
        ).toBeVisible();
      }
    });

    test("should provide clear feedback for data inconsistencies", async () => {
      // This test verifies that any data inconsistencies are properly logged
      // and can be detected by the application

      await page.goto(`${BASE_URL}/class-calendar`);
      await page.waitForSelector('[data-testid="premium-calendar-grid"]');

      // Monitor console for error messages
      const consoleMessages: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleMessages.push(msg.text());
        }
      });

      // Click through several classes
      const classElements = await page.locator(".calendar-class-item").all();
      for (let i = 0; i < Math.min(classElements.length, 2); i++) {
        await classElements[i].click();
        await page.waitForSelector('[data-testid="session-detail-modal"]');
        await page.click('[data-testid="close-modal"]');
        await page.waitForSelector('[data-testid="session-detail-modal"]', {
          state: "hidden",
        });
      }

      // Check for data consistency errors
      const dataErrors = consoleMessages.filter(
        (msg) =>
          msg.includes("booking") ||
          msg.includes("attendee") ||
          msg.includes("Unknown customer") ||
          msg.includes("mismatch"),
      );

      if (dataErrors.length > 0) {
        console.log("Data consistency errors detected:", dataErrors);
      }
    });
  });

  test.describe("Regression Tests", () => {
    test("should not break when adding new bookings", async () => {
      // This test ensures the booking system remains functional
      // even when data inconsistencies exist

      await page.goto(`${BASE_URL}/class-calendar`);
      await page.waitForSelector('[data-testid="premium-calendar-grid"]');

      // Click on a class
      const classItem = page.locator(".calendar-class-item").first();
      await classItem.click();

      await page.waitForSelector('[data-testid="session-detail-modal"]');

      // Try to add a customer
      await page.click('[data-testid="add-customer-button"]');

      // Search for existing customer
      await page.fill('[data-testid="customer-search"]', "test");
      await page.waitForSelector('[data-testid="search-results"]');

      // Should not crash or show errors
      const errorElements = await page
        .locator('.error, [data-testid="error-message"]')
        .count();
      expect(errorElements).toBe(0);
    });

    test("should maintain UI responsiveness despite data issues", async () => {
      // Test that UI remains responsive even with backend data problems

      await page.goto(`${BASE_URL}/class-calendar`);

      // Measure page load time
      const startTime = Date.now();
      await page.waitForSelector('[data-testid="premium-calendar-grid"]');
      const loadTime = Date.now() - startTime;

      // Should load within reasonable time despite data issues
      expect(loadTime).toBeLessThan(5000); // 5 seconds max

      // UI should be interactive
      const addButton = page.locator('button:has-text("Add Class")');
      await expect(addButton).toBeVisible();
      await expect(addButton).toBeEnabled();
    });
  });
});
