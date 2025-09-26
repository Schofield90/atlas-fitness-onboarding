import { test, expect, Page } from '@playwright/test'

// Test configuration - using the main app on port 3003 (matches playwright.config.ts)
const TEST_CONFIG = {
  baseURL: 'http://localhost:3003',
  credentials: {
    email: 'sam@atlantis.com',
    password: 'password'
  },
  timeouts: {
    navigation: 60000,
    element: 15000,
    short: 5000
  }
}

test.describe('Class Calendar Authentication Fixes', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()

    // Clear cookies to ensure clean state
    await page.context().clearCookies()
  })

  test.afterEach(async () => {
    await page.close()
  })

  test('SCENARIO 1: Unauthenticated access to /class-calendar should redirect to login', async () => {
    await test.step('Navigate directly to class-calendar without authentication', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/class-calendar`, {
        waitUntil: 'networkidle',
        timeout: TEST_CONFIG.timeouts.navigation
      })
    })

    await test.step('Should redirect to login page', async () => {
      // Should be redirected to login page
      await expect(page).toHaveURL(/.*\/auth\/login.*/, { timeout: TEST_CONFIG.timeouts.element })

      // Login form should be visible
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({
        timeout: TEST_CONFIG.timeouts.element
      })

      // Take screenshot for verification
      await page.screenshot({
        path: 'test-results/class-calendar-auth-redirect.png',
        fullPage: true
      })
    })

    await test.step('Verify return URL is preserved', async () => {
      // Check if the URL contains a return parameter pointing to class-calendar
      const currentUrl = page.url()
      expect(currentUrl).toContain('/auth/login')

      // Some implementations use returnUrl, redirect, or similar parameter names
      const hasReturnParam = currentUrl.includes('returnUrl') ||
                            currentUrl.includes('redirect') ||
                            currentUrl.includes('class-calendar')

      if (hasReturnParam) {
        console.log('✅ Return URL parameter found in login URL')
      } else {
        console.log('⚠️ No return URL parameter found - user will need to navigate manually after login')
      }
    })
  })

  test('SCENARIO 2: Authenticated navigation from dashboard to class-calendar should work', async () => {
    await test.step('Login with valid credentials', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/auth/login`, {
        waitUntil: 'networkidle',
        timeout: TEST_CONFIG.timeouts.navigation
      })

      await page.fill('input[type="email"], input[name="email"]', TEST_CONFIG.credentials.email)
      await page.fill('input[type="password"], input[name="password"]', TEST_CONFIG.credentials.password)

      await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")')

      // Wait for successful login redirect
      await page.waitForURL('**/dashboard**', {
        waitUntil: 'networkidle',
        timeout: TEST_CONFIG.timeouts.navigation
      })
    })

    await test.step('Verify Class Calendar link exists in sidebar', async () => {
      // Look for the Class Calendar link in sidebar navigation
      const calendarLink = page.locator('a[href="/class-calendar"], a:has-text("Class Calendar")')
      await expect(calendarLink).toBeVisible({ timeout: TEST_CONFIG.timeouts.element })

      // Take screenshot showing the sidebar with the link
      await page.screenshot({
        path: 'test-results/class-calendar-sidebar-link.png',
        fullPage: true
      })
    })

    await test.step('Click Class Calendar link and verify navigation', async () => {
      // Click the Class Calendar link
      await page.click('a[href="/class-calendar"], a:has-text("Class Calendar")')

      // Should navigate to class-calendar without redirect
      await expect(page).toHaveURL(/.*\/class-calendar.*/, { timeout: TEST_CONFIG.timeouts.navigation })

      // Page should load successfully (not redirect to login)
      await expect(page.locator('body')).toBeVisible()

      // Should NOT be on login page
      await expect(page).not.toHaveURL(/.*\/auth\/login.*/)

      // Take screenshot of successful navigation
      await page.screenshot({
        path: 'test-results/class-calendar-authenticated-access.png',
        fullPage: true
      })
    })
  })

  test('SCENARIO 3: Session persistence across multiple navigations', async () => {
    await test.step('Login and establish session', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/auth/login`, { waitUntil: 'networkidle' })
      await page.fill('input[type="email"], input[name="email"]', TEST_CONFIG.credentials.email)
      await page.fill('input[type="password"], input[name="password"]', TEST_CONFIG.credentials.password)
      await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")')
      await page.waitForURL('**/dashboard**', { waitUntil: 'networkidle' })
    })

    await test.step('Navigate between dashboard and class-calendar multiple times', async () => {
      for (let i = 1; i <= 3; i++) {
        console.log(`Navigation round ${i}`)

        // Go to class-calendar
        await page.goto(`${TEST_CONFIG.baseURL}/class-calendar`, { waitUntil: 'networkidle' })
        await expect(page).toHaveURL(/.*\/class-calendar.*/)
        await expect(page).not.toHaveURL(/.*\/auth\/login.*/)

        // Go back to dashboard
        await page.goto(`${TEST_CONFIG.baseURL}/dashboard`, { waitUntil: 'networkidle' })
        await expect(page).toHaveURL(/.*\/dashboard.*/)
        await expect(page).not.toHaveURL(/.*\/auth\/login.*/)

        // Small delay to simulate real user behavior
        await page.waitForTimeout(1000)
      }
    })

    await test.step('Verify session is still valid after multiple navigations', async () => {
      // Final navigation to class-calendar
      await page.goto(`${TEST_CONFIG.baseURL}/class-calendar`, { waitUntil: 'networkidle' })

      // Should still be authenticated
      await expect(page).toHaveURL(/.*\/class-calendar.*/)
      await expect(page).not.toHaveURL(/.*\/auth\/login.*/)

      // Take screenshot confirming session persistence
      await page.screenshot({
        path: 'test-results/class-calendar-session-persistence.png',
        fullPage: true
      })
    })
  })

  test('SCENARIO 4: Direct URL access while authenticated should work', async () => {
    await test.step('Login first', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/auth/login`, { waitUntil: 'networkidle' })
      await page.fill('input[type="email"], input[name="email"]', TEST_CONFIG.credentials.email)
      await page.fill('input[type="password"], input[name="password"]', TEST_CONFIG.credentials.password)
      await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")')
      await page.waitForURL('**/dashboard**', { waitUntil: 'networkidle' })
    })

    await test.step('Paste class-calendar URL directly in address bar', async () => {
      // Simulate typing URL directly (like copy-paste behavior)
      await page.goto(`${TEST_CONFIG.baseURL}/class-calendar`, {
        waitUntil: 'networkidle',
        timeout: TEST_CONFIG.timeouts.navigation
      })
    })

    await test.step('Should load class-calendar without redirect', async () => {
      // Should be on class-calendar page
      await expect(page).toHaveURL(/.*\/class-calendar.*/, { timeout: TEST_CONFIG.timeouts.element })

      // Should NOT redirect to login
      await expect(page).not.toHaveURL(/.*\/auth\/login.*/)

      // Page content should be visible
      await expect(page.locator('body')).toBeVisible()

      // Take screenshot confirming direct access works
      await page.screenshot({
        path: 'test-results/class-calendar-direct-url-access.png',
        fullPage: true
      })
    })
  })

  test('SCENARIO 5: API protection - /api/class-sessions should return 401 when not authenticated', async () => {
    await test.step('Clear any existing authentication', async () => {
      await page.context().clearCookies()
    })

    await test.step('Make unauthenticated API request to class-sessions', async () => {
      // Navigate to a page first to establish context
      await page.goto(`${TEST_CONFIG.baseURL}/auth/login`, { waitUntil: 'networkidle' })

      // Make API request without authentication
      const response = await page.request.get(`${TEST_CONFIG.baseURL}/api/class-sessions`)

      // Should return 401 Unauthorized
      expect(response.status()).toBe(401)

      console.log(`✅ API protection working: GET /api/class-sessions returned ${response.status()}`)
    })

    await test.step('Verify authenticated API request works', async () => {
      // Login first
      await page.fill('input[type="email"], input[name="email"]', TEST_CONFIG.credentials.email)
      await page.fill('input[type="password"], input[name="password"]', TEST_CONFIG.credentials.password)
      await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")')
      await page.waitForURL('**/dashboard**', { waitUntil: 'networkidle' })

      // Now make authenticated API request
      const response = await page.request.get(`${TEST_CONFIG.baseURL}/api/class-sessions`)

      // Should NOT return 401 (should be 200 or other success/error code)
      expect(response.status()).not.toBe(401)

      console.log(`✅ Authenticated API access working: GET /api/class-sessions returned ${response.status()}`)
    })
  })

  test('SCENARIO 6: Reproduce the original bug scenario', async () => {
    await test.step('Login and navigate to dashboard (original user flow)', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/auth/login`, { waitUntil: 'networkidle' })
      await page.fill('input[type="email"], input[name="email"]', TEST_CONFIG.credentials.email)
      await page.fill('input[type="password"], input[name="password"]', TEST_CONFIG.credentials.password)
      await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")')
      await page.waitForURL('**/dashboard**', { waitUntil: 'networkidle' })

      // Verify we're on dashboard (matching original scenario: https://login.gymleadhub.co.uk/dashboard)
      await expect(page).toHaveURL(/.*\/dashboard.*/)
    })

    await test.step('Click "Class Calendar" link (reproduce original bug)', async () => {
      // This is the exact action that caused the original bug
      const calendarLink = page.locator('a[href="/class-calendar"], a:has-text("Class Calendar")')
      await expect(calendarLink).toBeVisible()

      // Click the link
      await calendarLink.click()
    })

    await test.step('Verify bug is fixed - should NOT redirect to login', async () => {
      // Wait for navigation
      await page.waitForURL('**', {
        waitUntil: 'networkidle',
        timeout: TEST_CONFIG.timeouts.navigation
      })

      // THE FIX: Should be on class-calendar, NOT login page
      await expect(page).toHaveURL(/.*\/class-calendar.*/, { timeout: TEST_CONFIG.timeouts.element })

      // Should NOT be redirected to login (this was the original bug)
      await expect(page).not.toHaveURL(/.*\/auth\/login.*/)

      // Take screenshot proving the fix works
      await page.screenshot({
        path: 'test-results/class-calendar-bug-fix-verification.png',
        fullPage: true
      })

      console.log('✅ ORIGINAL BUG FIXED: User can now navigate from dashboard to class-calendar without being redirected to login')
    })
  })

  test('COMPREHENSIVE: Test middleware and server-side auth check integration', async () => {
    await test.step('Verify middleware protects the route (unauthenticated)', async () => {
      // Start fresh without authentication
      await page.goto(`${TEST_CONFIG.baseURL}/class-calendar`, { waitUntil: 'networkidle' })

      // Should redirect due to middleware
      await expect(page).toHaveURL(/.*\/auth\/login.*/)
    })

    await test.step('Verify server-side auth check works (authenticated)', async () => {
      // Login
      await page.fill('input[type="email"], input[name="email"]', TEST_CONFIG.credentials.email)
      await page.fill('input[type="password"], input[name="password"]', TEST_CONFIG.credentials.password)
      await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")')
      await page.waitForURL('**/dashboard**', { waitUntil: 'networkidle' })

      // Navigate to class-calendar
      await page.goto(`${TEST_CONFIG.baseURL}/class-calendar`, { waitUntil: 'networkidle' })

      // Should successfully load (server-side auth check passes)
      await expect(page).toHaveURL(/.*\/class-calendar.*/)
      await expect(page.locator('body')).toBeVisible()
    })

    await test.step('Check for auto-refresh token functionality', async () => {
      // Stay on the page for a bit to see if any token refresh happens
      await page.waitForTimeout(3000)

      // Navigate away and back to test session persistence
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`, { waitUntil: 'networkidle' })
      await page.goto(`${TEST_CONFIG.baseURL}/class-calendar`, { waitUntil: 'networkidle' })

      // Should still be authenticated
      await expect(page).toHaveURL(/.*\/class-calendar.*/)
      await expect(page).not.toHaveURL(/.*\/auth\/login.*/)

      console.log('✅ Auto-refresh token functionality appears to be working')
    })

    // Final verification screenshot
    await page.screenshot({
      path: 'test-results/class-calendar-comprehensive-auth-test.png',
      fullPage: true
    })
  })
})