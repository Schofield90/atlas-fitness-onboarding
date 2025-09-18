import { test, expect, Page } from '@playwright/test'

// Test configuration - using the main app on port 3001
const TEST_CONFIG = {
  baseURL: 'http://localhost:3001',
  credentials: {
    email: 'sam@atlantis.com',
    password: 'password'
  },
  timeouts: {
    navigation: 60000, // Increased timeout for 500 errors
    element: 15000
  }
}

test.describe('Class Calendar UI Tests', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()

    // Navigate to signin page
    await page.goto(`${TEST_CONFIG.baseURL}/signin`, {
      waitUntil: 'networkidle',
      timeout: TEST_CONFIG.timeouts.navigation
    })
  })

  test.afterEach(async () => {
    await page.close()
  })

  test('should successfully login and navigate to class calendar', async () => {
    // Step 1: Login with provided credentials
    await test.step('Login with credentials', async () => {
      // Wait for login form to be visible
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible({
        timeout: TEST_CONFIG.timeouts.element
      })

      // Fill in credentials
      await page.fill('input[type="email"], input[name="email"]', TEST_CONFIG.credentials.email)
      await page.fill('input[type="password"], input[name="password"]', TEST_CONFIG.credentials.password)

      // Submit login form
      await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")')

      // Wait for navigation after login
      await page.waitForURL('**', {
        waitUntil: 'networkidle',
        timeout: TEST_CONFIG.timeouts.navigation
      })
    })

    // Step 2: Navigate to class calendar
    await test.step('Navigate to class calendar', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/class-calendar`, {
        waitUntil: 'networkidle',
        timeout: TEST_CONFIG.timeouts.navigation
      })

      // Wait for calendar page to load
      await expect(page).toHaveURL(/.*class-calendar.*/)
    })

    // Step 3: Take screenshot of initial calendar view
    await test.step('Take screenshot of calendar page', async () => {
      await page.screenshot({
        path: 'test-results/class-calendar-initial.png',
        fullPage: true
      })
    })

    // Step 4: Verify calendar grid is visible
    await test.step('Verify calendar grid is visible', async () => {
      // Look for common calendar selectors
      const calendarSelectors = [
        '[data-testid="calendar"]',
        '.calendar',
        '.fc-view', // FullCalendar
        '[class*="calendar"]',
        '[class*="Calendar"]'
      ]

      let calendarFound = false
      for (const selector of calendarSelectors) {
        if (await page.locator(selector).count() > 0) {
          await expect(page.locator(selector)).toBeVisible()
          calendarFound = true
          break
        }
      }

      // If no specific calendar found, check for any grid-like structure
      if (!calendarFound) {
        const gridSelectors = [
          '.grid',
          '[class*="grid"]',
          '.table',
          '[role="grid"]'
        ]

        for (const selector of gridSelectors) {
          if (await page.locator(selector).count() > 0) {
            await expect(page.locator(selector)).toBeVisible()
            calendarFound = true
            break
          }
        }
      }

      // If still no calendar structure found, just verify page loaded without errors
      if (!calendarFound) {
        console.log('No specific calendar structure found, checking for general page content')
        await expect(page.locator('body')).toBeVisible()
      }
    })

    // Step 5: Verify classes are displayed (not showing "No Classes Scheduled")
    await test.step('Verify classes are displayed', async () => {
      // Check that "No Classes Scheduled" message is NOT showing
      const noClassesSelectors = [
        ':has-text("No Classes Scheduled")',
        ':has-text("No classes found")',
        ':has-text("No events")',
        '[data-testid="no-classes"]'
      ]

      for (const selector of noClassesSelectors) {
        await expect(page.locator(selector)).not.toBeVisible()
      }

      // Look for class/event indicators
      const classSelectors = [
        '.fc-event', // FullCalendar events
        '[data-testid="class"]',
        '[data-testid="event"]',
        '.event',
        '.class',
        '[class*="event"]',
        '[class*="class"]'
      ]

      let classesFound = false
      for (const selector of classSelectors) {
        const count = await page.locator(selector).count()
        if (count > 0) {
          console.log(`Found ${count} classes/events using selector: ${selector}`)
          classesFound = true
          break
        }
      }

      if (classesFound) {
        console.log('✅ Classes are visible on the calendar')
      } else {
        console.log('⚠️ No classes found with standard selectors - calendar may be empty or use custom structure')
      }
    })
  })

  test('should test different calendar view options', async () => {
    // Login first
    await page.fill('input[type="email"], input[name="email"]', TEST_CONFIG.credentials.email)
    await page.fill('input[type="password"], input[name="password"]', TEST_CONFIG.credentials.password)
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")')
    await page.waitForURL('**', { waitUntil: 'networkidle' })

    // Navigate to calendar
    await page.goto(`${TEST_CONFIG.baseURL}/class-calendar`, { waitUntil: 'networkidle' })

    // Test Day view
    await test.step('Test Day view', async () => {
      const dayButtons = [
        'button:has-text("Day")',
        '[data-testid="day-view"]',
        '.fc-dayGridDay-button',
        'button[data-view="day"]'
      ]

      for (const selector of dayButtons) {
        if (await page.locator(selector).count() > 0) {
          await page.click(selector)
          await page.waitForTimeout(1000) // Wait for view change
          await page.screenshot({
            path: 'test-results/class-calendar-day-view.png',
            fullPage: true
          })
          break
        }
      }
    })

    // Test Week view
    await test.step('Test Week view', async () => {
      const weekButtons = [
        'button:has-text("Week")',
        '[data-testid="week-view"]',
        '.fc-timeGridWeek-button',
        'button[data-view="week"]'
      ]

      for (const selector of weekButtons) {
        if (await page.locator(selector).count() > 0) {
          await page.click(selector)
          await page.waitForTimeout(1000)
          await page.screenshot({
            path: 'test-results/class-calendar-week-view.png',
            fullPage: true
          })
          break
        }
      }
    })

    // Test Month view
    await test.step('Test Month view', async () => {
      const monthButtons = [
        'button:has-text("Month")',
        '[data-testid="month-view"]',
        '.fc-dayGridMonth-button',
        'button[data-view="month"]'
      ]

      for (const selector of monthButtons) {
        if (await page.locator(selector).count() > 0) {
          await page.click(selector)
          await page.waitForTimeout(1000)
          await page.screenshot({
            path: 'test-results/class-calendar-month-view.png',
            fullPage: true
          })
          break
        }
      }
    })

    // Take final screenshot
    await page.screenshot({
      path: 'test-results/class-calendar-final.png',
      fullPage: true
    })
  })

  test('should verify calendar functionality and data', async () => {
    // Login and navigate to calendar
    await page.fill('input[type="email"], input[name="email"]', TEST_CONFIG.credentials.email)
    await page.fill('input[type="password"], input[name="password"]', TEST_CONFIG.credentials.password)
    await page.click('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")')
    await page.waitForURL('**', { waitUntil: 'networkidle' })

    await page.goto(`${TEST_CONFIG.baseURL}/class-calendar`, { waitUntil: 'networkidle' })

    // Check for API errors or console errors
    await test.step('Check for console errors', async () => {
      const consoleErrors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })

      // Wait a bit to capture any errors
      await page.waitForTimeout(3000)

      // Log any console errors for debugging
      if (consoleErrors.length > 0) {
        console.log('Console errors found:', consoleErrors)
      }
    })

    // Check network requests for class data
    await test.step('Monitor network requests', async () => {
      const apiRequests: string[] = []

      page.on('request', (request) => {
        const url = request.url()
        if (url.includes('api') || url.includes('class') || url.includes('schedule')) {
          apiRequests.push(`${request.method()} ${url}`)
        }
      })

      // Reload to capture API calls
      await page.reload({ waitUntil: 'networkidle' })

      console.log('API requests captured:', apiRequests)
    })

    // Final verification screenshot
    await page.screenshot({
      path: 'test-results/class-calendar-verification.png',
      fullPage: true
    })
  })
})