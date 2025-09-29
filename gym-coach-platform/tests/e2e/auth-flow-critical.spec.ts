import { test, expect, Page } from '@playwright/test';

// Test configuration
const TEST_CONFIG = {
  baseURL: 'https://login.gymleadhub.co.uk',
  testUser: {
    email: 'sam@rebelbasemarketing.co.uk', // Use real test user
    password: 'password123' // Use real test password
  },
  timeout: 30000
};

test.describe('Critical Authentication Flow', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    // Create new context with fresh cookies for each test
    const context = await browser.newContext({
      baseURL: TEST_CONFIG.baseURL,
    });
    page = await context.newPage();

    // Enable console logging to catch client-side errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      }
    });

    // Enable request/response logging for debugging
    page.on('response', response => {
      if (response.status() >= 400) {
        console.error(`Failed request: ${response.status()} ${response.url()}`);
      }
    });
  });

  test('User can login successfully and session persists', async () => {
    console.log('Starting login test...');

    // Step 1: Navigate to login page
    await page.goto('/auth/login');

    // Wait for page to load and check what we actually got
    await page.waitForLoadState('networkidle');

    const title = await page.title();
    console.log('Page title:', title);

    const url = page.url();
    console.log('Current URL:', url);

    // Look for any login form elements
    const emailInput = page.locator('input[name="email"], input[type="email"], input[placeholder*="email" i]');
    const passwordInput = page.locator('input[name="password"], input[type="password"], input[placeholder*="password" i]');

    // Wait for login form to be visible
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });

    // Step 2: Fill login form
    await emailInput.fill(TEST_CONFIG.testUser.email);
    await passwordInput.fill(TEST_CONFIG.testUser.password);

    // Step 3: Submit login
    const submitButton = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Login")');
    await expect(submitButton).toBeVisible();
    await submitButton.click();

    // Step 4: Wait for successful login and redirect
    await page.waitForURL('**/dashboard*', { timeout: TEST_CONFIG.timeout });

    const finalUrl = page.url();
    console.log('Final URL after login:', finalUrl);
    expect(finalUrl).toContain('dashboard');

    // Step 5: Verify dashboard loads
    await page.waitForSelector('h1, h2, [data-testid="dashboard"]', { timeout: 10000 });

    // Step 6: Check that session cookies are set
    const cookies = await page.context().cookies();
    const authCookies = cookies.filter(cookie =>
      cookie.name.includes('supabase') ||
      cookie.name.includes('auth') ||
      cookie.name.includes('session')
    );

    console.log('Auth cookies found:', authCookies.map(c => c.name));
    expect(authCookies.length).toBeGreaterThan(0);
  });

  test('Members page shows data correctly without logout', async () => {
    // First login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', TEST_CONFIG.testUser.email);
    await page.fill('input[name="password"]', TEST_CONFIG.testUser.password);
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('/dashboard', { timeout: TEST_CONFIG.timeout });

    // Navigate to members page
    console.log('Navigating to members page...');
    await page.goto('/members');

    // Check that we don't get redirected back to login
    await page.waitForTimeout(2000); // Wait for any potential redirects
    await expect(page).toHaveURL('/members');

    // Verify members page loads
    await expect(page.locator('h1')).toContainText(/member/i);

    // Check for loading state or data
    const loadingIndicator = page.locator('[data-testid="loading"]').or(page.locator('.animate-pulse'));
    const memberData = page.locator('table').or(page.locator('[data-testid="member-list"]'));

    // Wait for either loading to complete or data to appear
    await expect(loadingIndicator.or(memberData)).toBeVisible();

    // If there's a table, verify it's not empty or has proper empty state
    const table = page.locator('table');
    if (await table.isVisible()) {
      const rows = table.locator('tbody tr');
      const rowCount = await rows.count();
      console.log(`Found ${rowCount} member rows`);

      if (rowCount === 0) {
        // Check for empty state message
        await expect(page.locator('text=/no members/i')).toBeVisible();
      }
    }
  });

  test('Classes page loads without logging out user', async () => {
    // First login
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', TEST_CONFIG.testUser.email);
    await page.fill('input[name="password"]', TEST_CONFIG.testUser.password);
    await page.click('button[type="submit"]');

    // Wait for dashboard
    await page.waitForURL('/dashboard', { timeout: TEST_CONFIG.timeout });

    // Navigate to classes page
    console.log('Navigating to classes page...');
    await page.goto('/class-calendar');

    // Check that we don't get redirected back to login
    await page.waitForTimeout(2000);
    await expect(page).toHaveURL('/class-calendar');

    // Verify classes page loads
    await expect(page.locator('h1, h2, [data-testid="calendar"]')).toBeVisible();

    // Check session is still valid by making an API call
    const response = await page.request.get('/api/auth/me');
    expect(response.status()).toBe(200);
  });

  test('Session persists across multiple page navigations', async () => {
    // Login first
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', TEST_CONFIG.testUser.email);
    await page.fill('input[name="password"]', TEST_CONFIG.testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard', { timeout: TEST_CONFIG.timeout });

    // Navigate through multiple pages
    const pages = ['/dashboard', '/members', '/class-calendar', '/dashboard'];

    for (let i = 0; i < pages.length; i++) {
      const targetPage = pages[i];
      console.log(`Navigation ${i + 1}: Going to ${targetPage}`);

      await page.goto(targetPage);
      await page.waitForTimeout(1000); // Give time for any redirects

      // Verify we're on the correct page and not redirected to login
      await expect(page).toHaveURL(targetPage);

      // Verify session is still valid
      const response = await page.request.get('/api/auth/me');
      expect(response.status()).toBe(200);

      console.log(`✓ Successfully navigated to ${targetPage}`);
    }
  });

  test('User cannot access protected pages without login', async () => {
    // Try to access protected pages directly
    const protectedPages = ['/dashboard', '/members', '/class-calendar'];

    for (const protectedPage of protectedPages) {
      console.log(`Testing unauthorized access to ${protectedPage}`);

      await page.goto(protectedPage);

      // Should be redirected to login
      await page.waitForURL('/auth/login', { timeout: 5000 });
      await expect(page).toHaveURL('/auth/login');
    }
  });

  test('Login with invalid credentials shows error', async () => {
    await page.goto('/auth/login');

    await page.fill('input[name="email"]', 'invalid@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/error/i')).toBeVisible();

    // Should stay on login page
    await expect(page).toHaveURL('/auth/login');
  });

  test('Login fails gracefully when API is down', async () => {
    // Mock API failure
    await page.route('/api/auth/**', (route) => {
      route.fulfill({ status: 500, body: 'Server Error' });
    });

    await page.goto('/auth/login');
    await page.fill('input[name="email"]', TEST_CONFIG.testUser.email);
    await page.fill('input[name="password"]', TEST_CONFIG.testUser.password);
    await page.click('button[type="submit"]');

    // Should show error message
    await expect(page.locator('text=/error/i, text=/failed/i')).toBeVisible();

    // Should stay on login page
    await expect(page).toHaveURL('/auth/login');
  });
});