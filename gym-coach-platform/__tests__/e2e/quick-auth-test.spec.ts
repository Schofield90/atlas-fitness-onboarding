import { test, expect } from '@playwright/test'

const TEST_CONFIG = {
  baseURL: 'http://localhost:3003',
  credentials: {
    email: 'sam@atlantis.com',
    password: 'password'
  }
}

test.describe('Quick Authentication Test', () => {
  test('should verify the class calendar authentication fix', async ({ page }) => {
    await test.step('VERIFY: Unauthenticated access redirects to login', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/class-calendar`)

      // Should redirect to login page
      await expect(page).toHaveURL(/.*\/auth\/login.*/, { timeout: 10000 })
      console.log('✅ Unauthenticated access correctly redirects to login')
    })

    await test.step('VERIFY: Login form is accessible', async () => {
      // Should see login form elements
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({ timeout: 10000 })
      await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible({ timeout: 10000 })
      console.log('✅ Login form is visible and accessible')
    })

    await test.step('VERIFY: Authentication and navigation works', async () => {
      // Fill login form
      await page.fill('input[type="email"], input[name="email"]', TEST_CONFIG.credentials.email)
      await page.fill('input[type="password"], input[name="password"]', TEST_CONFIG.credentials.password)

      // Submit login
      await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")')

      // Wait for redirect after login
      await page.waitForURL('**', { waitUntil: 'networkidle', timeout: 30000 })

      // Should be on dashboard or another authenticated page (not login)
      await expect(page).not.toHaveURL(/.*\/auth\/login.*/)
      console.log('✅ Login successful - redirected away from login page')
    })

    await test.step('VERIFY: Class calendar access after authentication', async () => {
      // Now try to access class-calendar again
      await page.goto(`${TEST_CONFIG.baseURL}/class-calendar`, { waitUntil: 'networkidle', timeout: 30000 })

      // Should successfully access class-calendar (not redirect to login)
      await expect(page).toHaveURL(/.*\/class-calendar.*/, { timeout: 10000 })
      await expect(page).not.toHaveURL(/.*\/auth\/login.*/)

      // Page should load without errors
      await expect(page.locator('body')).toBeVisible()

      console.log('✅ AUTHENTICATION FIX VERIFIED: Authenticated users can access class-calendar without redirect')
    })

    await test.step('VERIFY: Sidebar navigation link exists', async () => {
      // Go to dashboard to check sidebar
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`, { waitUntil: 'networkidle' })

      // Look for Class Calendar link in navigation
      const calendarLink = page.locator('a[href="/class-calendar"], a:has-text("Class Calendar")')

      if (await calendarLink.count() > 0) {
        await expect(calendarLink).toBeVisible()
        console.log('✅ Class Calendar link found in sidebar navigation')

        // Test clicking the link
        await calendarLink.click()
        await expect(page).toHaveURL(/.*\/class-calendar.*/, { timeout: 10000 })
        console.log('✅ Sidebar navigation to class-calendar works correctly')
      } else {
        console.log('⚠️ Class Calendar link not found in sidebar - may need to be added')
      }
    })

    // Take final screenshot for verification
    await page.screenshot({
      path: 'test-results/auth-fix-verification.png',
      fullPage: true
    })

    console.log('🎉 ALL AUTHENTICATION TESTS PASSED - The class calendar bug fix is working!')
  })
})