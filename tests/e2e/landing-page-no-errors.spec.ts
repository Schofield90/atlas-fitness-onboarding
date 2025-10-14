import { test, expect } from '@playwright/test';

/**
 * E2E Test: Landing Page Error Handling
 *
 * Purpose: Verify that the landing page loads without any error alerts,
 * specifically testing for Supabase authentication errors that were
 * previously showing as browser alerts.
 *
 * Bug Report: Supabase authentication error alert appearing on landing page load
 * Error Message: "Failed to send message: Could not resolve authentication method"
 *
 * Root Cause: Supabase Realtime WebSocket trying to authenticate before
 * client initialization was complete, causing alert() calls from the library.
 *
 * Fix: Implemented alert suppression for Supabase errors in /app/lib/supabase/client.ts
 */

test.describe('Landing Page - No Error Alerts', () => {
  test.beforeEach(async ({ page }) => {
    // Track all dialog events (alerts, confirms, prompts)
    const dialogs: { type: string; message: string }[] = [];
    page.on('dialog', async (dialog) => {
      dialogs.push({
        type: dialog.type(),
        message: dialog.message(),
      });
      // Auto-dismiss the dialog
      await dialog.dismiss();
    });

    // Store dialogs array on the page for later assertions
    (page as any).capturedDialogs = dialogs;
  });

  test('should load landing page without any alert dialogs', async ({ page }) => {
    // Navigate to landing page
    const response = await page.goto('http://localhost:3001/landing', {
      waitUntil: 'domcontentloaded',
    });

    // Verify page loaded successfully
    expect(response?.status()).toBe(200);

    // Wait for page to be fully loaded and any async operations to complete
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000); // Give Supabase client time to initialize

    // Verify no alert dialogs appeared
    const dialogs = (page as any).capturedDialogs || [];
    expect(dialogs).toHaveLength(0);
  });

  test('should display key landing page content', async ({ page }) => {
    await page.goto('http://localhost:3001/landing', {
      waitUntil: 'domcontentloaded',
    });

    // Verify main heading is visible
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
    await expect(heading).toContainText(/Turn Every Lead|Loyal Member|Atlas/i);

    // Verify CTA buttons are present
    const ctaButtons = page.locator('a:has-text("Start Free Trial"), a:has-text("Book a Demo")');
    await expect(ctaButtons.first()).toBeVisible();

    // Verify no dialogs appeared during content check
    const dialogs = (page as any).capturedDialogs || [];
    expect(dialogs).toHaveLength(0);
  });

  test('should not show Supabase authentication errors', async ({ page, context }) => {
    // Listen for console errors
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('http://localhost:3001/landing', {
      waitUntil: 'networkidle',
    });

    await page.waitForTimeout(3000); // Wait for Supabase client initialization

    // Verify no dialogs appeared
    const dialogs = (page as any).capturedDialogs || [];
    expect(dialogs).toHaveLength(0);

    // Check that any Supabase errors are logged to console, not shown as alerts
    const supabaseErrors = consoleErrors.filter(
      (err) =>
        err.includes('Supabase') ||
        err.includes('authentication') ||
        err.includes('authToken')
    );

    // If there are Supabase errors, they should be in console, not alerts
    // This is acceptable - errors logged to console are non-blocking
    console.log('Console errors (expected behavior):', supabaseErrors);
  });

  test('should handle magic link tokens without alert errors', async ({ page }) => {
    // Simulate a magic link callback with tokens in URL hash
    await page.goto(
      'http://localhost:3001/landing#access_token=fake_token&refresh_token=fake_refresh',
      {
        waitUntil: 'domcontentloaded',
      }
    );

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Verify no alert dialogs appeared (even with invalid tokens)
    const dialogs = (page as any).capturedDialogs || [];
    expect(dialogs).toHaveLength(0);

    // Verify page still loaded (even if token validation failed)
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();
  });

  test('should suppress only Supabase alerts, not all alerts', async ({ page }) => {
    await page.goto('http://localhost:3001/landing', {
      waitUntil: 'domcontentloaded',
    });

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1500); // Wait for alert suppression timeout

    // After 1 second, the alert override should be restored
    // Test that non-Supabase alerts still work
    const dialogPromise = page.waitForEvent('dialog');

    await page.evaluate(() => {
      window.alert('This is a test alert');
    });

    const dialog = await dialogPromise;
    expect(dialog.type()).toBe('alert');
    expect(dialog.message()).toBe('This is a test alert');

    await dialog.dismiss();
  });
});

test.describe('Landing Page - Load Performance', () => {
  test('should load within acceptable time limits', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('http://localhost:3001/landing', {
      waitUntil: 'networkidle',
    });

    const loadTime = Date.now() - startTime;

    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);

    // Verify no alerts during load
    const dialogs = (page as any).capturedDialogs || [];
    expect(dialogs).toHaveLength(0);
  });
});
