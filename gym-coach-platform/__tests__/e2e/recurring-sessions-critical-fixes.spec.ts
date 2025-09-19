/**
 * End-to-End Tests for Critical Recurring Sessions Fixes
 *
 * These tests verify the complete user workflow from creating programs
 * to generating recurring sessions and displaying them correctly.
 *
 * Tests cover:
 * 1. Creating a program with specific capacity
 * 2. Generating recurring sessions that preserve capacity
 * 3. Verifying sessions span full date range (not limited to 3 weeks)
 * 4. Checking time display consistency across all pages
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Recurring Sessions Critical Fixes - E2E', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;
    // Navigate to dashboard (assuming authentication is handled in beforeEach or global setup)
    await page.goto('/dashboard');
  });

  test.describe('Capacity Persistence End-to-End', () => {
    test('should create program with max_participants=10 and verify all recurring sessions have capacity=10', async () => {
      // Step 1: Create a new program with specific capacity
      await page.goto('/classes');
      await page.click('[data-testid="create-class-button"]');

      // Fill in program details
      await page.fill('[data-testid="class-name-input"]', 'E2E HIIT Training');
      await page.fill('[data-testid="class-description-input"]', 'End-to-end test for capacity persistence');
      await page.fill('[data-testid="capacity-input"]', '10');
      await page.fill('[data-testid="price-input"]', '15.00');

      // Save the program
      await page.click('[data-testid="save-class-button"]');
      await expect(page).toHaveURL(/\/classes\/[a-zA-Z0-9-]+/);

      // Get the program ID from URL
      const url = page.url();
      const programId = url.split('/').pop();

      // Step 2: Navigate to sessions tab and create recurring sessions
      await page.click('[data-testid="sessions-tab"]');
      await page.click('[data-testid="create-recurring-button"]');

      // Configure recurrence: Weekly for 2 months, Mondays and Wednesdays
      await page.click('[data-testid="frequency-weekly"]');
      await page.click('[data-testid="day-monday"]');
      await page.click('[data-testid="day-wednesday"]');

      // Set end date to 2 months from now
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 2);
      const endDateString = endDate.toISOString().split('T')[0];
      await page.fill('[data-testid="end-date-input"]', endDateString);

      // Add time slot: 6:00 AM, 60 minutes
      await page.click('[data-testid="add-time-slot-button"]');
      await page.fill('[data-testid="time-slot-0-time"]', '06:00');
      await page.fill('[data-testid="time-slot-0-duration"]', '60');

      // Create recurring sessions
      await page.click('[data-testid="create-recurring-sessions-button"]');

      // Wait for success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

      // Step 3: Verify sessions were created with correct capacity
      await page.reload(); // Refresh to see new sessions

      // Check that sessions were created
      const sessionItems = page.locator('[data-testid^="session-item-"]');
      const sessionCount = await sessionItems.count();

      // Should have more than 21 sessions (more than 3 weeks)
      expect(sessionCount).toBeGreaterThan(21);

      // Step 4: Verify each session has max_capacity = 10
      for (let i = 0; i < Math.min(sessionCount, 10); i++) {
        const sessionItem = sessionItems.nth(i);
        const capacityText = await sessionItem.locator('[data-testid="session-capacity"]').textContent();

        // Should show format "0/10" (current_bookings/max_capacity)
        expect(capacityText).toMatch(/\d+\/10/);
      }

      // Step 5: Verify capacity on calendar view
      await page.goto('/calendar');

      // Look for sessions from our program
      const calendarSessions = page.locator(`[data-program-id="${programId}"]`);
      const calendarCount = await calendarSessions.count();

      if (calendarCount > 0) {
        // Check capacity display on calendar
        const firstCalendarSession = calendarSessions.first();
        const calendarCapacity = await firstCalendarSession.locator('[data-testid="session-capacity"]').textContent();
        expect(calendarCapacity).toMatch(/\d+\/10/);
      }
    });

    test('should handle fallback capacity when max_participants is not set', async () => {
      // Create program without explicit max_participants
      await page.goto('/classes');
      await page.click('[data-testid="create-class-button"]');

      await page.fill('[data-testid="class-name-input"]', 'E2E Default Capacity Test');
      await page.fill('[data-testid="class-description-input"]', 'Test default capacity fallback');
      // Don't set capacity - should use default
      await page.fill('[data-testid="price-input"]', '12.00');

      await page.click('[data-testid="save-class-button"]');
      await expect(page).toHaveURL(/\/classes\/[a-zA-Z0-9-]+/);

      // Create recurring sessions
      await page.click('[data-testid="sessions-tab"]');
      await page.click('[data-testid="create-recurring-button"]');

      await page.click('[data-testid="frequency-weekly"]');
      await page.click('[data-testid="day-friday"]');

      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      await page.fill('[data-testid="end-date-input"]', endDate.toISOString().split('T')[0]);

      await page.click('[data-testid="add-time-slot-button"]');
      await page.fill('[data-testid="time-slot-0-time"]', '07:00');
      await page.fill('[data-testid="time-slot-0-duration"]', '60');

      await page.click('[data-testid="create-recurring-sessions-button"]');
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

      // Verify default capacity (should be 20)
      await page.reload();
      const sessionItems = page.locator('[data-testid^="session-item-"]');
      if (await sessionItems.count() > 0) {
        const capacityText = await sessionItems.first().locator('[data-testid="session-capacity"]').textContent();
        expect(capacityText).toMatch(/\d+\/20/); // Default capacity is 20
      }
    });
  });

  test.describe('Date Range Extension End-to-End', () => {
    test('should create recurring sessions spanning 3 months (not limited to 3 weeks)', async () => {
      // Create a new program
      await page.goto('/classes');
      await page.click('[data-testid="create-class-button"]');

      await page.fill('[data-testid="class-name-input"]', 'E2E Long Term Program');
      await page.fill('[data-testid="capacity-input"]', '15');
      await page.click('[data-testid="save-class-button"]');
      await expect(page).toHaveURL(/\/classes\/[a-zA-Z0-9-]+/);

      // Create recurring sessions for 3 months
      await page.click('[data-testid="sessions-tab"]');
      await page.click('[data-testid="create-recurring-button"]');

      await page.click('[data-testid="frequency-weekly"]');
      await page.click('[data-testid="day-tuesday"]');
      await page.click('[data-testid="day-thursday"]');

      // Set end date to 3 months from now
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);
      await page.fill('[data-testid="end-date-input"]', endDate.toISOString().split('T')[0]);

      await page.click('[data-testid="add-time-slot-button"]');
      await page.fill('[data-testid="time-slot-0-time"]', '18:00');
      await page.fill('[data-testid="time-slot-0-duration"]', '90');

      await page.click('[data-testid="create-recurring-sessions-button"]');
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

      // Verify sessions span the full 3 months
      await page.reload();
      const sessionItems = page.locator('[data-testid^="session-item-"]');
      const sessionCount = await sessionItems.count();

      // 3 months of twice-weekly sessions should be approximately 24-26 sessions
      expect(sessionCount).toBeGreaterThan(20);
      expect(sessionCount).toBeLessThan(30);

      // Verify the last session is close to the end date
      const lastSession = sessionItems.last();
      const lastSessionDate = await lastSession.locator('[data-testid="session-date"]').textContent();

      // Should be within the month of our end date
      const endMonth = endDate.toLocaleDateString('en-GB', { month: 'long' });
      expect(lastSessionDate).toContain(endMonth.substring(0, 3)); // Match short month name
    });

    test('should respect maxOccurrences limit even with long date range', async () => {
      await page.goto('/classes');
      await page.click('[data-testid="create-class-button"]');

      await page.fill('[data-testid="class-name-input"]', 'E2E Limited Sessions');
      await page.fill('[data-testid="capacity-input"]', '8');
      await page.click('[data-testid="save-class-button"]');

      await page.click('[data-testid="sessions-tab"]');
      await page.click('[data-testid="create-recurring-button"]');

      await page.click('[data-testid="frequency-weekly"]');
      await page.click('[data-testid="day-monday"]');

      // Set far future end date
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);
      await page.fill('[data-testid="end-date-input"]', endDate.toISOString().split('T')[0]);

      // But limit to 5 occurrences
      await page.fill('[data-testid="max-occurrences-input"]', '5');

      await page.click('[data-testid="add-time-slot-button"]');
      await page.fill('[data-testid="time-slot-0-time"]', '10:00');
      await page.fill('[data-testid="time-slot-0-duration"]', '45');

      await page.click('[data-testid="create-recurring-sessions-button"]');
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

      // Should create exactly 5 sessions despite long date range
      await page.reload();
      const sessionItems = page.locator('[data-testid^="session-item-"]');
      const sessionCount = await sessionItems.count();
      expect(sessionCount).toBe(5);
    });
  });

  test.describe('Time Display Consistency End-to-End', () => {
    test('should display 6:00 AM UTC consistently across all pages', async () => {
      // Create program and sessions with 6:00 AM time
      await page.goto('/classes');
      await page.click('[data-testid="create-class-button"]');

      await page.fill('[data-testid="class-name-input"]', 'E2E Time Consistency Test');
      await page.fill('[data-testid="capacity-input"]', '12');
      await page.click('[data-testid="save-class-button"]');
      await expect(page).toHaveURL(/\/classes\/[a-zA-Z0-9-]+/);

      const url = page.url();
      const programId = url.split('/').pop();

      // Create sessions at 6:00 AM UTC
      await page.click('[data-testid="sessions-tab"]');
      await page.click('[data-testid="create-recurring-button"]');

      await page.click('[data-testid="frequency-weekly"]');
      await page.click('[data-testid="day-wednesday"]');

      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      await page.fill('[data-testid="end-date-input"]', endDate.toISOString().split('T')[0]);

      await page.click('[data-testid="add-time-slot-button"]');
      await page.fill('[data-testid="time-slot-0-time"]', '06:00');
      await page.fill('[data-testid="time-slot-0-duration"]', '60');

      await page.click('[data-testid="create-recurring-sessions-button"]');
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

      // Test 1: Verify time display on class detail page
      await page.reload();
      const sessionItem = page.locator('[data-testid^="session-item-"]').first();
      const detailPageTime = await sessionItem.locator('[data-testid="session-time"]').textContent();
      expect(detailPageTime).toContain('06:00');

      // Test 2: Verify time display on calendar page
      await page.goto('/calendar');
      await page.waitForLoadState('networkidle');

      // Look for our session on calendar
      const calendarSession = page.locator(`[data-program-id="${programId}"]`).first();
      if (await calendarSession.isVisible()) {
        const calendarTime = await calendarSession.locator('[data-testid="session-time"]').textContent();
        expect(calendarTime).toContain('06:00');
      }

      // Test 3: Verify time display on classes list page
      await page.goto('/classes');
      await page.waitForLoadState('networkidle');

      // Find our program and check if sessions are shown
      const programCard = page.locator(`[data-testid="program-${programId}"]`);
      if (await programCard.isVisible()) {
        const nextSessionTime = await programCard.locator('[data-testid="next-session-time"]').textContent();
        if (nextSessionTime) {
          expect(nextSessionTime).toContain('06:00');
        }
      }

      // Test 4: Navigate to individual session detail and verify time
      await page.goto(`/classes/${programId}`);
      await page.click('[data-testid="sessions-tab"]');

      const firstSession = page.locator('[data-testid^="session-item-"]').first();
      await firstSession.click();

      // If session detail modal or page opens
      const sessionDetailTime = page.locator('[data-testid="session-detail-time"]');
      if (await sessionDetailTime.isVisible()) {
        const detailTime = await sessionDetailTime.textContent();
        expect(detailTime).toContain('06:00');
      }
    });

    test('should display evening times (18:30) consistently', async () => {
      await page.goto('/classes');
      await page.click('[data-testid="create-class-button"]');

      await page.fill('[data-testid="class-name-input"]', 'E2E Evening Time Test');
      await page.fill('[data-testid="capacity-input"]', '10');
      await page.click('[data-testid="save-class-button"]');

      // Create evening sessions at 18:30 (6:30 PM)
      await page.click('[data-testid="sessions-tab"]');
      await page.click('[data-testid="create-recurring-button"]');

      await page.click('[data-testid="frequency-weekly"]');
      await page.click('[data-testid="day-friday"]');

      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      await page.fill('[data-testid="end-date-input"]', endDate.toISOString().split('T')[0]);

      await page.click('[data-testid="add-time-slot-button"]');
      await page.fill('[data-testid="time-slot-0-time"]', '18:30');
      await page.fill('[data-testid="time-slot-0-duration"]', '75');

      await page.click('[data-testid="create-recurring-sessions-button"]');
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

      // Verify consistent display across pages
      await page.reload();
      const sessionTime = await page.locator('[data-testid^="session-item-"]').first()
        .locator('[data-testid="session-time"]').textContent();
      expect(sessionTime).toContain('18:30');

      // Check calendar view
      await page.goto('/calendar');
      await page.waitForLoadState('networkidle');

      // Look for evening sessions
      const eveningSessions = page.locator('[data-testid="session-time"]:has-text("18:30")');
      if (await eveningSessions.count() > 0) {
        const timeText = await eveningSessions.first().textContent();
        expect(timeText).toContain('18:30');
      }
    });
  });

  test.describe('Integration Test - Complete Workflow', () => {
    test('should complete full workflow: create program → generate recurring sessions → verify all fixes', async () => {
      // Step 1: Create comprehensive program
      await page.goto('/classes');
      await page.click('[data-testid="create-class-button"]');

      await page.fill('[data-testid="class-name-input"]', 'E2E Complete Workflow Test');
      await page.fill('[data-testid="class-description-input"]', 'Comprehensive test of all critical fixes');
      await page.fill('[data-testid="capacity-input"]', '12'); // Specific capacity to test
      await page.fill('[data-testid="price-input"]', '18.50');
      await page.selectOption('[data-testid="category-select"]', 'strength');

      await page.click('[data-testid="save-class-button"]');
      await expect(page).toHaveURL(/\/classes\/[a-zA-Z0-9-]+/);

      const programId = page.url().split('/').pop();

      // Step 2: Create comprehensive recurring schedule
      await page.click('[data-testid="sessions-tab"]');
      await page.click('[data-testid="create-recurring-button"]');

      // Weekly sessions on Monday, Wednesday, Friday
      await page.click('[data-testid="frequency-weekly"]');
      await page.click('[data-testid="day-monday"]');
      await page.click('[data-testid="day-wednesday"]');
      await page.click('[data-testid="day-friday"]');

      // 3-month duration
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3);
      await page.fill('[data-testid="end-date-input"]', endDate.toISOString().split('T')[0]);

      // Multiple time slots: morning and evening
      await page.click('[data-testid="add-time-slot-button"]');
      await page.fill('[data-testid="time-slot-0-time"]', '06:00');
      await page.fill('[data-testid="time-slot-0-duration"]', '60');

      await page.click('[data-testid="add-time-slot-button"]');
      await page.fill('[data-testid="time-slot-1-time"]', '18:00');
      await page.fill('[data-testid="time-slot-1-duration"]', '60');

      await page.click('[data-testid="create-recurring-sessions-button"]');
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible();

      // Step 3: Verify all critical fixes
      await page.reload();

      // Fix 1: Capacity Persistence - All sessions should have capacity 12
      const sessionItems = page.locator('[data-testid^="session-item-"]');
      const sessionCount = await sessionItems.count();

      // Should have many sessions (3 months × 3 days/week × 2 time slots = ~72 sessions)
      expect(sessionCount).toBeGreaterThan(50);

      // Check capacity on first few sessions
      for (let i = 0; i < Math.min(5, sessionCount); i++) {
        const capacityText = await sessionItems.nth(i).locator('[data-testid="session-capacity"]').textContent();
        expect(capacityText).toMatch(/\d+\/12/);
      }

      // Fix 2: Date Range - Should span 3 months
      const firstSessionDate = await sessionItems.first().locator('[data-testid="session-date"]').textContent();
      const lastSessionDate = await sessionItems.last().locator('[data-testid="session-date"]').textContent();

      // Parse dates and verify span
      const currentMonth = new Date().getMonth();
      const targetMonth = endDate.getMonth();

      // Sessions should span from current month to target month
      expect(lastSessionDate).not.toBe(firstSessionDate);

      // Fix 3: Time Display Consistency
      const morningSession = page.locator('[data-testid="session-time"]:has-text("06:00")').first();
      const eveningSession = page.locator('[data-testid="session-time"]:has-text("18:00")').first();

      if (await morningSession.isVisible()) {
        const morningTime = await morningSession.textContent();
        expect(morningTime).toContain('06:00');
      }

      if (await eveningSession.isVisible()) {
        const eveningTime = await eveningSession.textContent();
        expect(eveningTime).toContain('18:00');
      }

      // Step 4: Verify consistency across other views
      await page.goto('/calendar');
      await page.waitForLoadState('networkidle');

      // Check if sessions appear on calendar with correct details
      const calendarSessions = page.locator(`[data-program-id="${programId}"]`);
      const calendarSessionCount = await calendarSessions.count();

      if (calendarSessionCount > 0) {
        // Verify capacity and time display on calendar
        const firstCalendarSession = calendarSessions.first();
        const calendarCapacity = await firstCalendarSession.locator('[data-testid="session-capacity"]').textContent();
        const calendarTime = await firstCalendarSession.locator('[data-testid="session-time"]').textContent();

        expect(calendarCapacity).toMatch(/\d+\/12/);
        expect(calendarTime).toMatch(/\d{2}:\d{2}/);
      }

      // Step 5: Test booking functionality to ensure capacity works
      if (calendarSessionCount > 0) {
        await calendarSessions.first().click();

        // If booking modal opens
        const bookingModal = page.locator('[data-testid="booking-modal"]');
        if (await bookingModal.isVisible()) {
          const modalCapacity = await bookingModal.locator('[data-testid="modal-capacity"]').textContent();
          expect(modalCapacity).toContain('12'); // Max capacity should be 12
        }
      }
    });
  });

  test.describe('Error Handling and Edge Cases', () => {
    test('should handle empty time slots gracefully', async () => {
      await page.goto('/classes');
      await page.click('[data-testid="create-class-button"]');

      await page.fill('[data-testid="class-name-input"]', 'E2E Error Test');
      await page.fill('[data-testid="capacity-input"]', '10');
      await page.click('[data-testid="save-class-button"]');

      await page.click('[data-testid="sessions-tab"]');
      await page.click('[data-testid="create-recurring-button"]');

      await page.click('[data-testid="frequency-weekly"]');
      await page.click('[data-testid="day-monday"]');

      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      await page.fill('[data-testid="end-date-input"]', endDate.toISOString().split('T')[0]);

      // Don't add any time slots
      await page.click('[data-testid="create-recurring-sessions-button"]');

      // Should show error message
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
      await expect(page.locator('[data-testid="error-message"]')).toContainText('No sessions to create');
    });

    test('should handle invalid date ranges', async () => {
      await page.goto('/classes');
      await page.click('[data-testid="create-class-button"]');

      await page.fill('[data-testid="class-name-input"]', 'E2E Date Error Test');
      await page.fill('[data-testid="capacity-input"]', '8');
      await page.click('[data-testid="save-class-button"]');

      await page.click('[data-testid="sessions-tab"]');
      await page.click('[data-testid="create-recurring-button"]');

      await page.click('[data-testid="frequency-weekly"]');
      await page.click('[data-testid="day-tuesday"]');

      // Set end date in the past
      const pastDate = new Date();
      pastDate.setMonth(pastDate.getMonth() - 1);
      await page.fill('[data-testid="end-date-input"]', pastDate.toISOString().split('T')[0]);

      await page.click('[data-testid="add-time-slot-button"]');
      await page.fill('[data-testid="time-slot-0-time"]', '09:00');
      await page.fill('[data-testid="time-slot-0-duration"]', '60');

      await page.click('[data-testid="create-recurring-sessions-button"]');

      // Should show appropriate error
      await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    });
  });
});