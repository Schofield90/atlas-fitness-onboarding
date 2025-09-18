import { test, expect, Page } from '@playwright/test'

// Test configuration
const TEST_CONFIG = {
  baseURL: 'http://localhost:3001',
  credentials: {
    email: 'sam@atlantis.com',
    password: 'password'
  },
  timeouts: {
    navigation: 60000,
    element: 15000
  }
}

test.describe('Detailed Class Calendar Analysis', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()

    // Set up logging for network requests and console messages
    page.on('request', (request) => {
      console.log(`REQUEST: ${request.method()} ${request.url()}`)
    })

    page.on('response', (response) => {
      console.log(`RESPONSE: ${response.status()} ${response.url()}`)
    })

    page.on('console', (msg) => {
      console.log(`CONSOLE ${msg.type()}: ${msg.text()}`)
    })
  })

  test.afterEach(async () => {
    await page.close()
  })

  test('detailed calendar analysis with authentication debug', async () => {
    // Step 1: Navigate to signin
    await test.step('Navigate to signin page', async () => {
      console.log('Navigating to signin page...')
      await page.goto(`${TEST_CONFIG.baseURL}/signin`, {
        waitUntil: 'networkidle',
        timeout: TEST_CONFIG.timeouts.navigation
      })

      await page.screenshot({
        path: 'test-results/step1-signin-page.png',
        fullPage: true
      })

      console.log('Current URL after signin navigation:', page.url())
    })

    // Step 2: Fill login form
    await test.step('Fill login credentials', async () => {
      console.log('Filling login form...')

      // Wait for email field and fill it
      const emailField = page.locator('input[type="email"], input[name="email"]')
      await expect(emailField).toBeVisible({ timeout: TEST_CONFIG.timeouts.element })
      await emailField.fill(TEST_CONFIG.credentials.email)

      // Wait for password field and fill it
      const passwordField = page.locator('input[type="password"], input[name="password"]')
      await expect(passwordField).toBeVisible({ timeout: TEST_CONFIG.timeouts.element })
      await passwordField.fill(TEST_CONFIG.credentials.password)

      await page.screenshot({
        path: 'test-results/step2-credentials-filled.png',
        fullPage: true
      })

      console.log('Credentials filled')
    })

    // Step 3: Submit login
    await test.step('Submit login form', async () => {
      console.log('Submitting login form...')

      const submitButton = page.locator('button[type="submit"], button:has-text("Log In"), button:has-text("Sign In")')
      await expect(submitButton).toBeVisible()
      await submitButton.click()

      // Wait for navigation
      await page.waitForTimeout(3000) // Give time for login processing

      await page.screenshot({
        path: 'test-results/step3-after-login.png',
        fullPage: true
      })

      console.log('Current URL after login:', page.url())
    })

    // Step 4: Navigate directly to calendar
    await test.step('Navigate to class calendar', async () => {
      console.log('Navigating to class calendar...')

      await page.goto(`${TEST_CONFIG.baseURL}/class-calendar`, {
        waitUntil: 'networkidle',
        timeout: TEST_CONFIG.timeouts.navigation
      })

      // Wait a bit for page to fully load
      await page.waitForTimeout(5000)

      console.log('Current URL after calendar navigation:', page.url())

      await page.screenshot({
        path: 'test-results/step4-calendar-page.png',
        fullPage: true
      })
    })

    // Step 5: Analyze page content
    await test.step('Analyze page content', async () => {
      console.log('Analyzing page content...')

      // Check if we're still on login page
      const isLoginPage = await page.locator('text=Login to Atlas Fitness, text=Sign In, text=Email, text=Password').count() > 0
      console.log('Is this a login page?', isLoginPage)

      // Check for calendar-related elements
      const calendarElements = await page.locator('[class*="calendar"], [class*="Calendar"], .fc-view, [data-testid="calendar"]').count()
      console.log('Calendar elements found:', calendarElements)

      // Check for class/event elements
      const classElements = await page.locator('[class*="class"], [class*="event"], .fc-event').count()
      console.log('Class/event elements found:', classElements)

      // Check for "No Classes" messages
      const noClassesMessages = await page.locator('text=No Classes Scheduled, text=No classes found, text=No events').count()
      console.log('No classes messages found:', noClassesMessages)

      // Get page title
      const pageTitle = await page.title()
      console.log('Page title:', pageTitle)

      // Get all text content for analysis
      const pageText = await page.locator('body').innerText()
      console.log('Page contains "calendar":', pageText.toLowerCase().includes('calendar'))
      console.log('Page contains "class":', pageText.toLowerCase().includes('class'))
      console.log('Page contains "schedule":', pageText.toLowerCase().includes('schedule'))
      console.log('Page contains "event":', pageText.toLowerCase().includes('event'))

      // Take a detailed screenshot
      await page.screenshot({
        path: 'test-results/step5-content-analysis.png',
        fullPage: true
      })
    })

    // Step 6: Try alternative navigation if on login page
    await test.step('Alternative navigation if needed', async () => {
      const currentUrl = page.url()

      if (currentUrl.includes('login') || currentUrl.includes('signin')) {
        console.log('Still on login page, trying alternative navigation...')

        // Try navigating to home first
        await page.goto(`${TEST_CONFIG.baseURL}/`, {
          waitUntil: 'networkidle',
          timeout: TEST_CONFIG.timeouts.navigation
        })

        await page.waitForTimeout(2000)

        await page.screenshot({
        path: 'test-results/step6-home-page.png',
        fullPage: true
      })

        // Then try calendar again
        await page.goto(`${TEST_CONFIG.baseURL}/class-calendar`, {
          waitUntil: 'networkidle',
          timeout: TEST_CONFIG.timeouts.navigation
        })

        await page.waitForTimeout(3000)

        await page.screenshot({
          path: 'test-results/step6-calendar-retry.png',
          fullPage: true
        })

        console.log('Final URL after retry:', page.url())
      } else {
        console.log('Not on login page, continuing with current page')
      }
    })

    // Step 7: Final verification
    await test.step('Final verification', async () => {
      const finalUrl = page.url()
      console.log('Final URL:', finalUrl)

      // Check if calendar is now visible
      const hasCalendar = await page.locator('[class*="calendar"], [class*="Calendar"], .fc-view, [data-testid="calendar"]').count() > 0
      const hasClasses = await page.locator('[class*="class"], [class*="event"], .fc-event').count() > 0
      const hasNoClassesMsg = await page.locator('text=No Classes Scheduled, text=No classes found, text=No events').count() > 0

      console.log('Final verification:')
      console.log('- Has calendar elements:', hasCalendar)
      console.log('- Has class/event elements:', hasClasses)
      console.log('- Has "no classes" message:', hasNoClassesMsg)

      // Log success or failure
      if (hasClasses && !hasNoClassesMsg) {
        console.log('✅ SUCCESS: Classes are visible on the calendar')
      } else if (hasCalendar && !hasNoClassesMsg) {
        console.log('⚠️ PARTIAL: Calendar visible but no classes detected')
      } else if (hasNoClassesMsg) {
        console.log('❌ ISSUE: "No Classes" message is showing')
      } else if (finalUrl.includes('login') || finalUrl.includes('signin')) {
        console.log('❌ FAILURE: Still stuck on login page')
      } else {
        console.log('❓ UNKNOWN: Unable to determine calendar state')
      }

      await page.screenshot({
        path: 'test-results/step7-final-verification.png',
        fullPage: true
      })
    })
  })
})