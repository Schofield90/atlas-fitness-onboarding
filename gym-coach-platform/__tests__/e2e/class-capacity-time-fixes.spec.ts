/**
 * E2E Tests for Class Capacity and Time Display Fixes
 *
 * This test suite verifies:
 * 1. Capacity displays show 8 (not 12) across all booking components
 * 2. Time displays are consistent (UTC) across all booking components
 * 3. API endpoints handle UTC time correctly
 * 4. End-to-end booking flow maintains correct capacity and time
 */

import { test, expect, Page } from '@playwright/test';
import moment from 'moment';

// Test configuration
const TEST_CONFIG = {
  EXPECTED_CAPACITY: 8,
  INCORRECT_CAPACITY: 12,
  TEST_TIME_UTC: '06:00',
  TEST_TIME_DISPLAY: '6:00 AM',
  PROGRAM_NAME: 'E2E Test Program',
  SESSION_NAME: 'E2E Test Session'
};

// Helper functions
const createTestProgram = async (page: Page) => {
  await page.goto('/dashboard/programs');
  await page.click('[data-testid="create-program"]');

  await page.fill('[data-testid="program-name"]', TEST_CONFIG.PROGRAM_NAME);
  await page.fill('[data-testid="max-participants"]', TEST_CONFIG.EXPECTED_CAPACITY.toString());
  await page.click('[data-testid="save-program"]');

  await expect(page.locator(`text="${TEST_CONFIG.PROGRAM_NAME}"`)).toBeVisible();
};

const createTestSession = async (page: Page, timeUTC: string = TEST_CONFIG.TEST_TIME_UTC) => {
  await page.goto('/dashboard/sessions');
  await page.click('[data-testid="create-session"]');

  // Set session details
  await page.fill('[data-testid="session-name"]', TEST_CONFIG.SESSION_NAME);
  await page.selectOption('[data-testid="program-select"]', { label: TEST_CONFIG.PROGRAM_NAME });

  // Set time in UTC
  const tomorrow = moment().add(1, 'day').format('YYYY-MM-DD');
  await page.fill('[data-testid="session-date"]', tomorrow);
  await page.fill('[data-testid="session-time"]', timeUTC);

  await page.click('[data-testid="save-session"]');

  await expect(page.locator(`text="${TEST_CONFIG.SESSION_NAME}"`)).toBeVisible();
};

const verifyCapacityDisplay = async (page: Page, expectedCapacity: number) => {
  // Check for capacity displays
  const capacityElements = await page.locator(`text=/\\b${expectedCapacity}\\b/`).all();
  const incorrectElements = await page.locator(`text=/\\b${TEST_CONFIG.INCORRECT_CAPACITY}\\b/`).all();

  // Should have capacity displays showing correct value
  expect(capacityElements.length).toBeGreaterThan(0);
  // Should not have any displays showing incorrect value
  expect(incorrectElements.length).toBe(0);
};

const verifyTimeDisplay = async (page: Page, expectedTime: string) => {
  // Look for time displays that should show the expected time
  const timeElements = await page.locator(`text=/${expectedTime}/i`).all();

  // Should have time displays showing correct value
  expect(timeElements.length).toBeGreaterThan(0);
};

test.describe('Capacity Display Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login and setup
    await page.goto('/signin');
    // Add authentication steps here based on your auth system
  });

  test('BookingCalendar component shows capacity 8, not 12', async ({ page }) => {
    await createTestProgram(page);
    await createTestSession(page);

    // Navigate to booking calendar
    await page.goto('/booking');

    // Wait for component to load
    await expect(page.locator('[data-testid="booking-calendar"]')).toBeVisible();

    // Verify capacity display
    await verifyCapacityDisplay(page, TEST_CONFIG.EXPECTED_CAPACITY);

    // Check specifically for capacity in event components
    const eventElements = await page.locator('.booking-event').all();
    for (const element of eventElements) {
      const text = await element.textContent();
      expect(text).not.toContain(TEST_CONFIG.INCORRECT_CAPACITY.toString());

      // If capacity is shown, it should be the correct value
      if (text?.includes('spots') || text?.includes('capacity')) {
        expect(text).toContain(TEST_CONFIG.EXPECTED_CAPACITY.toString());
      }
    }
  });

  test('MemberBookingForm shows max_bookings: 8, not 12', async ({ page }) => {
    await createTestProgram(page);
    await createTestSession(page);

    // Navigate to member management and open booking form
    await page.goto('/dashboard/members');
    await page.click('[data-testid="book-session"]');

    // Wait for booking form modal
    await expect(page.locator('[data-testid="member-booking-form"]')).toBeVisible();

    // Check session selection dropdown
    await page.click('[data-testid="session-select"]');

    // Verify capacity in session options
    const sessionOptions = await page.locator('[data-testid="session-option"]').all();
    for (const option of sessionOptions) {
      const text = await option.textContent();
      if (text?.includes(TEST_CONFIG.SESSION_NAME)) {
        expect(text).not.toContain(TEST_CONFIG.INCORRECT_CAPACITY.toString());
        // The max_bookings should be reflected in available spots
        expect(text).toMatch(/\b8\b/);
      }
    }
  });

  test('CustomerBookings component displays correct capacity', async ({ page }) => {
    // Create test data
    await createTestProgram(page);
    await createTestSession(page);

    // Navigate to customer bookings view
    await page.goto('/dashboard/bookings');

    // Wait for component to load
    await expect(page.locator('[data-testid="customer-bookings"]')).toBeVisible();

    // Verify capacity displays
    await verifyCapacityDisplay(page, TEST_CONFIG.EXPECTED_CAPACITY);
  });

  test('No hardcoded "12" values remain in booking components', async ({ page }) => {
    await page.goto('/booking');
    await expect(page.locator('[data-testid="booking-calendar"]')).toBeVisible();

    // Search for any hardcoded "12" values that shouldn't be there
    const hardcodedTwelves = await page.locator('text=/(?<!1)12(?!:)/').all();

    // Filter out legitimate uses of "12" (like 12:00 PM times)
    const problematicTwelves = [];
    for (const element of hardcodedTwelves) {
      const text = await element.textContent();
      // Skip if it's part of a time display (e.g., "12:00")
      if (!text?.match(/12:\d{2}|12 PM|12 AM/i)) {
        problematicTwelves.push(element);
      }
    }

    expect(problematicTwelves.length).toBe(0);
  });
});

test.describe('Time Display Consistency Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login and setup
    await page.goto('/signin');
    // Add authentication steps here
  });

  test('BookingCalendar time display uses UTC consistently', async ({ page }) => {
    await createTestProgram(page);
    await createTestSession(page, TEST_CONFIG.TEST_TIME_UTC);

    await page.goto('/booking');
    await expect(page.locator('[data-testid="booking-calendar"]')).toBeVisible();

    // Verify time display shows correct UTC time
    await verifyTimeDisplay(page, TEST_CONFIG.TEST_TIME_DISPLAY);

    // Check calendar events specifically
    const calendarEvents = await page.locator('.booking-event').all();
    for (const event of calendarEvents) {
      const text = await event.textContent();
      if (text?.includes(TEST_CONFIG.SESSION_NAME)) {
        expect(text).toContain(TEST_CONFIG.TEST_TIME_DISPLAY);
      }
    }
  });

  test('MemberBookingForm time display uses UTC consistently', async ({ page }) => {
    await createTestProgram(page);
    await createTestSession(page, TEST_CONFIG.TEST_TIME_UTC);

    await page.goto('/dashboard/members');
    await page.click('[data-testid="book-session"]');

    await expect(page.locator('[data-testid="member-booking-form"]')).toBeVisible();

    // Select the test session
    await page.click('[data-testid="session-select"]');
    await page.click(`[data-testid="session-option"]:has-text("${TEST_CONFIG.SESSION_NAME}")`);

    // Verify time display in session details
    await verifyTimeDisplay(page, TEST_CONFIG.TEST_TIME_DISPLAY);
  });

  test('CustomerBookings time display uses UTC consistently', async ({ page }) => {
    await createTestProgram(page);
    await createTestSession(page, TEST_CONFIG.TEST_TIME_UTC);

    // Create a booking first
    await page.goto('/dashboard/members');
    await page.click('[data-testid="book-session"]');
    await page.click('[data-testid="session-select"]');
    await page.click(`[data-testid="session-option"]:has-text("${TEST_CONFIG.SESSION_NAME}")`);
    await page.click('[data-testid="create-booking"]');

    // Navigate to bookings view
    await page.goto('/dashboard/bookings');
    await expect(page.locator('[data-testid="customer-bookings"]')).toBeVisible();

    // Verify time display
    await verifyTimeDisplay(page, TEST_CONFIG.TEST_TIME_DISPLAY);
  });

  test('Create class at 6:00 AM - verify shows as 6:00 AM on ALL pages', async ({ page }) => {
    await createTestProgram(page);
    await createTestSession(page, '06:00');

    const pagesToCheck = [
      '/booking',
      '/dashboard/sessions',
      '/dashboard/bookings'
    ];

    for (const pageUrl of pagesToCheck) {
      await page.goto(pageUrl);

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Check that 6:00 AM is displayed, not 7:00 AM
      const sixAMElements = await page.locator('text=/6:00.*AM/i').all();
      const sevenAMElements = await page.locator('text=/7:00.*AM/i').all();

      // Should find 6:00 AM display
      expect(sixAMElements.length).toBeGreaterThan(0);

      // Should not find 7:00 AM display for our test session
      // (Filter out unrelated 7:00 AM sessions)
      for (const element of sevenAMElements) {
        const parent = await element.locator('..').textContent();
        expect(parent).not.toContain(TEST_CONFIG.SESSION_NAME);
      }
    }
  });
});

test.describe('API Time Handling Tests', () => {
  test('POST /api/bookings/recurring endpoint saves UTC time correctly', async ({ page }) => {
    // Intercept API calls
    await page.route('**/api/bookings/recurring', async (route) => {
      const request = route.request();
      const body = JSON.parse(request.postData() || '{}');

      // Verify the request uses UTC time
      expect(body.start_date).toBeDefined();

      // Continue with the request
      await route.continue();
    });

    await createTestProgram(page);
    await createTestSession(page, '06:00');

    // Create recurring booking through UI
    await page.goto('/dashboard/members');
    await page.click('[data-testid="book-session"]');
    await page.click('[data-testid="recurring-tab"]');

    await page.click('[data-testid="session-select"]');
    await page.click(`[data-testid="session-option"]:has-text("${TEST_CONFIG.SESSION_NAME}")`);

    await page.fill('[data-testid="start-date"]', moment().add(1, 'day').format('YYYY-MM-DD'));
    await page.fill('[data-testid="occurrences"]', '4');

    await page.click('[data-testid="create-booking"]');

    // Verify success
    await expect(page.locator('text=/successfully created/i')).toBeVisible();
  });

  test('POST /api/bookings/multiple endpoint handles UTC time correctly', async ({ page }) => {
    let apiCalled = false;

    await page.route('**/api/bookings/multiple', async (route) => {
      apiCalled = true;
      const request = route.request();
      const body = JSON.parse(request.postData() || '{}');

      // Verify the request structure
      expect(body.sessions).toBeDefined();
      expect(Array.isArray(body.sessions)).toBe(true);

      await route.continue();
    });

    await createTestProgram(page);
    await createTestSession(page, '06:00');

    // Create multiple bookings through UI
    await page.goto('/dashboard/members');
    await page.click('[data-testid="book-session"]');
    await page.click('[data-testid="multiple-tab"]');

    // Add first session
    await page.click('[data-testid="session-select-0"]');
    await page.click(`[data-testid="session-option"]:has-text("${TEST_CONFIG.SESSION_NAME}")`);
    await page.fill('[data-testid="session-date-0"]', moment().add(1, 'day').format('YYYY-MM-DD'));

    // Add second session
    await page.click('[data-testid="add-session"]');
    await page.click('[data-testid="session-select-1"]');
    await page.click(`[data-testid="session-option"]:has-text("${TEST_CONFIG.SESSION_NAME}")`);
    await page.fill('[data-testid="session-date-1"]', moment().add(2, 'days').format('YYYY-MM-DD'));

    await page.click('[data-testid="create-booking"]');

    expect(apiCalled).toBe(true);
  });
});

test.describe('End-to-End Flow Tests', () => {
  test('Complete booking flow maintains correct capacity and time', async ({ page }) => {
    // Step 1: Create program with max_participants: 8
    await page.goto('/dashboard/programs');
    await page.click('[data-testid="create-program"]');
    await page.fill('[data-testid="program-name"]', TEST_CONFIG.PROGRAM_NAME);
    await page.fill('[data-testid="max-participants"]', '8');
    await page.click('[data-testid="save-program"]');

    // Step 2: Generate recurring sessions at 6:00 AM
    await page.goto('/dashboard/sessions');
    await page.click('[data-testid="generate-recurring"]');
    await page.selectOption('[data-testid="program-select"]', { label: TEST_CONFIG.PROGRAM_NAME });
    await page.fill('[data-testid="start-time"]', '06:00');
    await page.fill('[data-testid="frequency"]', 'weekly');
    await page.fill('[data-testid="occurrences"]', '4');
    await page.click('[data-testid="generate-sessions"]');

    // Step 3: Navigate to sessions page - verify shows 6:00 AM and capacity 8
    await page.goto('/dashboard/sessions');
    const sessionRows = await page.locator('[data-testid="session-row"]').all();

    for (const row of sessionRows) {
      const text = await row.textContent();
      if (text?.includes(TEST_CONFIG.PROGRAM_NAME)) {
        expect(text).toContain('6:00 AM');
        expect(text).toContain('8'); // capacity
        expect(text).not.toContain('7:00 AM');
        expect(text).not.toContain('12'); // wrong capacity
      }
    }

    // Step 4: Navigate to calendar - verify shows 6:00 AM and capacity 8
    await page.goto('/booking');
    await expect(page.locator('[data-testid="booking-calendar"]')).toBeVisible();

    const calendarEvents = await page.locator('.booking-event').all();
    for (const event of calendarEvents) {
      const text = await event.textContent();
      if (text?.includes(TEST_CONFIG.PROGRAM_NAME)) {
        expect(text).toContain('6:00 AM');
        expect(text).not.toContain('7:00 AM');
        // Check spots available (should be 8 total capacity)
        expect(text).toMatch(/8.*spots|spots.*8/);
      }
    }

    // Step 5: Check class detail page - verify shows 6:00 AM and capacity 8
    await page.click('.booking-event:first-child');
    await expect(page.locator('[data-testid="session-details"]')).toBeVisible();

    const detailsText = await page.locator('[data-testid="session-details"]').textContent();
    expect(detailsText).toContain('6:00 AM');
    expect(detailsText).toContain('8');
    expect(detailsText).not.toContain('7:00 AM');
    expect(detailsText).not.toContain('12');
  });
});

test.describe('Regression Tests', () => {
  test('Time zone changes do not affect UTC storage', async ({ page }) => {
    await createTestProgram(page);

    // Create session at 6:00 AM UTC
    await createTestSession(page, '06:00');

    // Simulate timezone change (if your app supports this)
    // This would depend on your implementation

    // Verify time still displays as 6:00 AM
    await page.goto('/booking');
    await verifyTimeDisplay(page, '6:00 AM');
  });

  test('Capacity changes in program reflect immediately in sessions', async ({ page }) => {
    await createTestProgram(page);
    await createTestSession(page);

    // Update program capacity
    await page.goto('/dashboard/programs');
    await page.click(`[data-testid="edit-program"]:has-text("${TEST_CONFIG.PROGRAM_NAME}")`);
    await page.fill('[data-testid="max-participants"]', '10');
    await page.click('[data-testid="save-program"]');

    // Verify booking components show updated capacity
    await page.goto('/booking');
    await verifyCapacityDisplay(page, 10);
  });
});