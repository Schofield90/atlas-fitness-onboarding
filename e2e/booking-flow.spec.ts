import { test, expect } from '@playwright/test';
import { format, addDays } from 'date-fns';

test.describe('Booking Flow', () => {
  const testCalendarSlug = 'fitterbodyladies-coa';
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
  
  test.beforeEach(async ({ page }) => {
    // Navigate to the booking page
    await page.goto(`${baseUrl}/book/${testCalendarSlug}`);
  });
  
  test('should display calendar information', async ({ page }) => {
    // Wait for calendar to load
    await page.waitForSelector('h1');
    
    // Check calendar name is displayed
    const calendarName = await page.textContent('h1');
    expect(calendarName).toBeTruthy();
    
    // Check for date selector
    await expect(page.locator('input[type="date"]')).toBeVisible();
  });
  
  test('should show available time slots', async ({ page }) => {
    // Select tomorrow's date
    const tomorrow = addDays(new Date(), 1);
    const dateStr = format(tomorrow, 'yyyy-MM-dd');
    
    await page.fill('input[type="date"]', dateStr);
    
    // Wait for slots to load
    await page.waitForTimeout(1000);
    
    // Check if slots are displayed or "no slots" message
    const slotsSection = page.locator('text=Available Times').locator('..');
    await expect(slotsSection).toBeVisible();
  });
  
  test('should complete a booking successfully', async ({ page }) => {
    // Select tomorrow's date
    const tomorrow = addDays(new Date(), 1);
    const dateStr = format(tomorrow, 'yyyy-MM-dd');
    
    await page.fill('input[type="date"]', dateStr);
    
    // Wait for slots to load
    await page.waitForTimeout(1000);
    
    // Try to click first available slot
    const firstSlot = page.locator('button:has(svg)').first();
    const slotCount = await firstSlot.count();
    
    if (slotCount > 0) {
      // Click the first available slot
      await firstSlot.click();
      
      // Fill in booking form
      await page.fill('input[placeholder*="Name"]', 'Test User');
      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="tel"]', '+447777777777');
      await page.fill('textarea', 'This is a test booking');
      
      // Check consent checkbox
      await page.check('input[type="checkbox"]');
      
      // Submit booking
      await page.click('button:has-text("Confirm Booking")');
      
      // Wait for success message
      await expect(page.locator('text=/Booking (Confirmed|Request Received)/')).toBeVisible({
        timeout: 10000
      });
    } else {
      // No slots available - this is okay for the test
      await expect(page.locator('text=No available times')).toBeVisible();
    }
  });
  
  test('should validate required fields', async ({ page }) => {
    // Select tomorrow's date
    const tomorrow = addDays(new Date(), 1);
    const dateStr = format(tomorrow, 'yyyy-MM-dd');
    
    await page.fill('input[type="date"]', dateStr);
    
    // Wait for slots to load
    await page.waitForTimeout(1000);
    
    const firstSlot = page.locator('button:has(svg)').first();
    const slotCount = await firstSlot.count();
    
    if (slotCount > 0) {
      // Click the first available slot
      await firstSlot.click();
      
      // Try to submit without filling required fields
      const confirmButton = page.locator('button:has-text("Confirm Booking")');
      
      // Button should be disabled initially
      await expect(confirmButton).toBeDisabled();
      
      // Fill name only
      await page.fill('input[placeholder*="Name"]', 'Test User');
      await expect(confirmButton).toBeDisabled();
      
      // Fill email
      await page.fill('input[type="email"]', 'test@example.com');
      await expect(confirmButton).toBeDisabled();
      
      // Check consent
      await page.check('input[type="checkbox"]');
      
      // Now button should be enabled
      await expect(confirmButton).toBeEnabled();
    }
  });
  
  test('should handle booking errors gracefully', async ({ page }) => {
    // Select tomorrow's date
    const tomorrow = addDays(new Date(), 1);
    const dateStr = format(tomorrow, 'yyyy-MM-dd');
    
    await page.fill('input[type="date"]', dateStr);
    
    // Wait for slots to load
    await page.waitForTimeout(1000);
    
    const firstSlot = page.locator('button:has(svg)').first();
    const slotCount = await firstSlot.count();
    
    if (slotCount > 0) {
      // Click the first available slot
      await firstSlot.click();
      
      // Fill in booking form with invalid email
      await page.fill('input[placeholder*="Name"]', 'Test User');
      await page.fill('input[type="email"]', 'invalid-email'); // Invalid email
      await page.check('input[type="checkbox"]');
      
      // Browser validation should prevent submission
      await page.click('button:has-text("Confirm Booking")');
      
      // Check that we're still on the form (not submitted)
      await expect(page.locator('text=Enter Your Details')).toBeVisible();
    }
  });
  
  test('should allow cancelling booking form', async ({ page }) => {
    // Select tomorrow's date
    const tomorrow = addDays(new Date(), 1);
    const dateStr = format(tomorrow, 'yyyy-MM-dd');
    
    await page.fill('input[type="date"]', dateStr);
    
    // Wait for slots to load
    await page.waitForTimeout(1000);
    
    const firstSlot = page.locator('button:has(svg)').first();
    const slotCount = await firstSlot.count();
    
    if (slotCount > 0) {
      // Click the first available slot
      await firstSlot.click();
      
      // Booking form should be visible
      await expect(page.locator('text=Enter Your Details')).toBeVisible();
      
      // Click cancel
      await page.click('button:has-text("Cancel")');
      
      // Form should be hidden
      await expect(page.locator('text=Enter Your Details')).not.toBeVisible();
    }
  });
  
  test('should navigate dates correctly', async ({ page }) => {
    // Get current date input value
    const dateInput = page.locator('input[type="date"]');
    const initialDate = await dateInput.inputValue();
    
    // Change to next week
    const nextWeek = addDays(new Date(), 7);
    const nextWeekStr = format(nextWeek, 'yyyy-MM-dd');
    
    await dateInput.fill(nextWeekStr);
    
    // Verify date changed
    const newDate = await dateInput.inputValue();
    expect(newDate).toBe(nextWeekStr);
    
    // Should trigger new availability fetch
    await page.waitForTimeout(1000);
    
    // Check that Available Times section is still present
    await expect(page.locator('text=Available Times')).toBeVisible();
  });
});

test.describe('Booking Page Accessibility', () => {
  const testCalendarSlug = 'fitterbodyladies-coa';
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
  
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto(`${baseUrl}/book/${testCalendarSlug}`);
    
    // Tab through elements
    await page.keyboard.press('Tab'); // Should focus date input
    await page.keyboard.press('Tab'); // Should move to next element
    
    // Date input should be focusable
    const dateInput = page.locator('input[type="date"]');
    await dateInput.focus();
    await expect(dateInput).toBeFocused();
  });
  
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto(`${baseUrl}/book/${testCalendarSlug}`);
    
    // Check for form labels
    await expect(page.locator('label:has-text("Name")')).toBeVisible();
    await expect(page.locator('label:has-text("Email")')).toBeVisible();
  });
});

test.describe('Booking Page Mobile View', () => {
  const testCalendarSlug = 'fitterbodyladies-coa';
  const baseUrl = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';
  
  test.use({
    viewport: { width: 375, height: 667 } // iPhone SE size
  });
  
  test('should be responsive on mobile', async ({ page }) => {
    await page.goto(`${baseUrl}/book/${testCalendarSlug}`);
    
    // Check that content is visible
    await expect(page.locator('h1')).toBeVisible();
    
    // Date input should be full width on mobile
    const dateInput = page.locator('input[type="date"]');
    await expect(dateInput).toBeVisible();
    
    // Time slots should be in a responsive grid
    const tomorrow = addDays(new Date(), 1);
    const dateStr = format(tomorrow, 'yyyy-MM-dd');
    await page.fill('input[type="date"]', dateStr);
    
    await page.waitForTimeout(1000);
    
    // Check that slots container exists
    const slotsContainer = page.locator('text=Available Times').locator('..');
    await expect(slotsContainer).toBeVisible();
  });
});