import { test, expect } from '@playwright/test';

/**
 * Test: Verify Demo Account Login
 *
 * Credentials:
 * - Email: test@test.co.uk
 * - Password: Test123
 * - URL: https://login.gymleadhub.co.uk
 */

test.describe('Demo Account Login Verification', () => {
  test('should successfully login with demo credentials', async ({ page }) => {
    console.log('🧪 Starting demo login test...');

    // Navigate to login page (use load instead of networkidle)
    await page.goto('https://login.gymleadhub.co.uk', {
      waitUntil: 'load',
      timeout: 60000
    });
    console.log('✅ Navigated to login page');

    // Take screenshot of login page
    await page.screenshot({ path: 'demo-login-page.png' });
    console.log('📸 Login page screenshot saved');

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded');

    // Fill in login credentials
    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();

    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill('test@test.co.uk');
    console.log('✅ Email filled: test@test.co.uk');

    await passwordInput.fill('Test123');
    console.log('✅ Password filled');

    // Find and click login button
    const loginButton = page.locator('button:has-text("Sign in"), button:has-text("Login"), button:has-text("Log in"), button[type="submit"]').first();
    await loginButton.click();
    console.log('✅ Login button clicked');

    // Wait for navigation after login (could be redirect to dashboard or other page)
    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Check we're not still on login page (successful login redirects away)
    const currentUrl = page.url();
    console.log(`📍 Current URL after login: ${currentUrl}`);

    // Verify we're not on the login page anymore
    expect(currentUrl).not.toContain('/signin');
    expect(currentUrl).not.toContain('/login');

    // Check for common dashboard indicators
    const isDashboard = currentUrl.includes('/dashboard') ||
                       currentUrl.includes('/ai-agents') ||
                       currentUrl.includes('/members') ||
                       currentUrl.includes('/classes');

    if (isDashboard) {
      console.log('✅ Successfully redirected to dashboard area');
    }

    // Take a screenshot for verification
    await page.screenshot({ path: 'demo-login-success.png', fullPage: true });
    console.log('📸 Screenshot saved: demo-login-success.png');

    // Check for error messages (should not exist)
    const errorMessages = await page.locator('text=/error|invalid|incorrect|failed/i').count();
    expect(errorMessages).toBe(0);

    console.log('✅ Demo login test PASSED');
  });

  test('should display user email or name after login', async ({ page }) => {
    // Login first
    await page.goto('https://login.gymleadhub.co.uk');

    await page.locator('input[type="email"]').first().fill('test@test.co.uk');
    await page.locator('input[type="password"]').first().fill('Test123');
    await page.locator('button[type="submit"]').first().click();

    await page.waitForLoadState('networkidle', { timeout: 15000 });

    // Check for user identification in the UI
    const hasUserEmail = await page.locator('text=/test@test.co.uk/i').count() > 0;
    const hasUserName = await page.locator('text=/test|demo/i').count() > 0;

    console.log(`User email visible: ${hasUserEmail}`);
    console.log(`User name visible: ${hasUserName}`);

    // At least one should be visible
    expect(hasUserEmail || hasUserName).toBeTruthy();
  });
});
