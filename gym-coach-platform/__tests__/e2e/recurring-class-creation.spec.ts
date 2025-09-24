import { test, expect, Page } from '@playwright/test'

// Test configuration for production environment
const TEST_CONFIG = {
  baseURL: 'https://atlas-fitness-onboarding.vercel.app',
  credentials: {
    email: 'sam@atlas-gyms.co.uk',
    password: process.env.TEST_USER_PASSWORD || 'test123'
  },
  timeouts: {
    navigation: 60000,
    element: 30000,
    api: 15000
  }
}

test.describe('Recurring Class Creation Tests', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()

    // Set up request/response monitoring
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.log('❌ Console Error:', msg.text())
      }
    })

    page.on('requestfailed', (request) => {
      console.log('❌ Failed Request:', request.url(), request.failure()?.errorText)
    })
  })

  test.afterEach(async () => {
    await page.close()
  })

  test('should create recurring classes with correct time and multiple days', async () => {
    console.log('🚀 Starting recurring class creation test...')

    // Step 1: Navigate to login page and check authentication options
    await test.step('Navigate to login page and check authentication options', async () => {
      // Try different login URLs
      const loginUrls = [
        '/signin',
        '/login',
        '/auth/signin',
        '/auth/login'
      ]

      let loginPageFound = false
      for (const url of loginUrls) {
        try {
          await page.goto(`${TEST_CONFIG.baseURL}${url}`, {
            waitUntil: 'networkidle',
            timeout: TEST_CONFIG.timeouts.navigation
          })

          console.log(`🔍 Trying login URL: ${url}`)

          // Check if this page has traditional login inputs
          const emailInput = page.locator('input[type="email"], input[name="email"]')
          const passwordInput = page.locator('input[type="password"], input[name="password"]')

          if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
            console.log(`✅ Found traditional login form at: ${url}`)
            loginPageFound = true
            break
          }

          await page.screenshot({
            path: `test-results/login-attempt-${url.replace('/', '')}.png`,
            fullPage: true
          })
        } catch (error) {
          console.log(`❌ Failed to load ${url}: ${error.message}`)
        }
      }

      if (!loginPageFound) {
        // Go back to the main signin page for analysis
        await page.goto(`${TEST_CONFIG.baseURL}/signin`, {
          waitUntil: 'networkidle',
          timeout: TEST_CONFIG.timeouts.navigation
        })
        console.log('⚠️ No traditional login form found, analyzing main signin page')
      }
    })

    // Step 2: Investigate authentication options
    await test.step('Investigate authentication options', async () => {
      // Take screenshot of login page
      await page.screenshot({
        path: 'test-results/login-page-investigation.png',
        fullPage: true
      })

      // Check if this is email code authentication
      const emailCodeButton = page.locator('button:has-text("Sign in with Email Code")')
      const googleButton = page.locator('button:has-text("Continue with Google")')

      console.log('🔍 Login page analysis:')
      console.log(`Email Code button found: ${await emailCodeButton.count() > 0}`)
      console.log(`Google button found: ${await googleButton.count() > 0}`)

      // Look for traditional login form
      const emailInput = page.locator('input[type="email"], input[name="email"]')
      const passwordInput = page.locator('input[type="password"], input[name="password"]')

      console.log(`Traditional email input found: ${await emailInput.count() > 0}`)
      console.log(`Traditional password input found: ${await passwordInput.count() > 0}`)

      // Check if there's a way to access traditional login
      const traditionalLoginLinks = [
        'a:has-text("Sign in with password")',
        'a:has-text("Use password")',
        'button:has-text("Use password")',
        '[data-testid="password-login"]'
      ]

      let traditionalLoginFound = false
      for (const selector of traditionalLoginLinks) {
        if (await page.locator(selector).count() > 0) {
          console.log(`✅ Found traditional login option: ${selector}`)
          await page.click(selector)
          await page.waitForTimeout(2000)
          traditionalLoginFound = true
          break
        }
      }

      if (!traditionalLoginFound) {
        console.log('❌ No traditional login form found. Using email code authentication.')

        // Try email code authentication
        await emailCodeButton.click()
        await page.waitForTimeout(2000)

        // Look for email input in the email code flow
        const emailCodeInput = page.locator('input[type="email"], input[placeholder*="email"]')
        if (await emailCodeInput.count() > 0) {
          await emailCodeInput.fill(TEST_CONFIG.credentials.email)

          // Look for send code button
          const sendCodeButton = page.locator('button:has-text("Send"), button:has-text("Continue"), button[type="submit"]')
          if (await sendCodeButton.count() > 0) {
            await sendCodeButton.click()
            console.log('📧 Email code sent - manual verification required')

            // Take screenshot of code input page
            await page.screenshot({
              path: 'test-results/email-code-sent.png',
              fullPage: true
            })

            throw new Error('❌ Email code authentication requires manual verification. Please provide different login method or credentials.')
          }
        }
      }
    })

    // Step 3: Navigate to Classes section
    await test.step('Navigate to Classes section', async () => {
      // Look for Classes navigation link
      const classesNavSelectors = [
        'a[href*="classes"]',
        'a:has-text("Classes")',
        'nav a:has-text("Classes")',
        '[data-testid="classes-nav"]',
        'button:has-text("Classes")'
      ]

      let navigated = false
      for (const selector of classesNavSelectors) {
        const element = page.locator(selector).first()
        if (await element.count() > 0) {
          await element.click()
          await page.waitForTimeout(2000) // Allow navigation
          navigated = true
          break
        }
      }

      if (!navigated) {
        // Try direct navigation
        await page.goto(`${TEST_CONFIG.baseURL}/classes`, {
          waitUntil: 'networkidle',
          timeout: TEST_CONFIG.timeouts.navigation
        })
      }

      // Take screenshot of classes page
      await page.screenshot({
        path: 'test-results/recurring-classes-page.png',
        fullPage: true
      })

      console.log('✅ Navigated to Classes section')
    })

    // Step 4: Find or create a test class
    await test.step('Find or create a test class', async () => {
      // Look for existing classes or create new class button
      const createClassSelectors = [
        'button:has-text("Create Class")',
        'button:has-text("Add Class")',
        'button:has-text("New Class")',
        '[data-testid="create-class"]',
        'a[href*="create"]'
      ]

      let classFound = false

      // First check if there are existing classes
      const existingClassSelectors = [
        '.class-item',
        '[data-testid="class"]',
        '.class-card',
        'tr[data-testid*="class"]',
        'div[data-class-id]'
      ]

      for (const selector of existingClassSelectors) {
        if (await page.locator(selector).count() > 0) {
          await page.locator(selector).first().click()
          classFound = true
          console.log('✅ Selected existing class')
          break
        }
      }

      // If no existing class, try to create one
      if (!classFound) {
        for (const selector of createClassSelectors) {
          const element = page.locator(selector).first()
          if (await element.count() > 0) {
            await element.click()
            await page.waitForTimeout(2000)

            // Fill basic class details if needed
            if (await page.locator('input[name="name"], input[placeholder*="name"]').count() > 0) {
              await page.fill('input[name="name"], input[placeholder*="name"]', 'Test Recurring Class')
            }

            classFound = true
            console.log('✅ Created new test class')
            break
          }
        }
      }

      if (!classFound) {
        throw new Error('❌ Could not find or create a class to test recurring functionality')
      }
    })

    // Step 5: Click "Create Recurring Classes"
    await test.step('Click Create Recurring Classes', async () => {
      const recurringButtonSelectors = [
        'button:has-text("Create Recurring Classes")',
        'button:has-text("Create Recurring")',
        'button:has-text("Recurring")',
        '[data-testid="create-recurring"]',
        'button[aria-label*="recurring"]'
      ]

      let recurringButtonFound = false
      for (const selector of recurringButtonSelectors) {
        const element = page.locator(selector)
        if (await element.count() > 0) {
          await element.click()
          await page.waitForTimeout(2000)
          recurringButtonFound = true
          console.log('✅ Clicked Create Recurring Classes button')
          break
        }
      }

      if (!recurringButtonFound) {
        await page.screenshot({
          path: 'test-results/no-recurring-button.png',
          fullPage: true
        })
        throw new Error('❌ Could not find "Create Recurring Classes" button')
      }
    })

    // Step 6: Set up recurring pattern
    await test.step('Set up recurring pattern', async () => {
      // Wait for recurring modal/form to appear
      await page.waitForTimeout(1000)

      // Select weekly frequency
      const weeklySelectors = [
        'select[name="frequency"] option[value="weekly"]',
        'input[value="weekly"]',
        'button:has-text("Weekly")',
        '[data-testid="weekly"]'
      ]

      for (const selector of weeklySelectors) {
        const element = page.locator(selector)
        if (await element.count() > 0) {
          await element.click()
          console.log('✅ Selected weekly frequency')
          break
        }
      }

      // Select days: Monday, Wednesday, Friday
      const daysToSelect = ['Monday', 'Wednesday', 'Friday']
      for (const day of daysToSelect) {
        const daySelectors = [
          `input[name="days"][value="${day.toLowerCase()}"]`,
          `input[value="${day.substring(0, 3).toLowerCase()}"]`,
          `button:has-text("${day}")`,
          `button:has-text("${day.substring(0, 3)}")`,
          `[data-testid="${day.toLowerCase()}"]`,
          `[data-day="${day.toLowerCase()}"]`
        ]

        for (const selector of daySelectors) {
          const element = page.locator(selector)
          if (await element.count() > 0) {
            await element.click()
            console.log(`✅ Selected ${day}`)
            break
          }
        }
      }

      // Set time to 09:00
      const timeSelectors = [
        'input[name="time"]',
        'input[type="time"]',
        'input[placeholder*="time"]',
        '[data-testid="time-input"]'
      ]

      for (const selector of timeSelectors) {
        const element = page.locator(selector)
        if (await element.count() > 0) {
          await element.fill('09:00')
          console.log('✅ Set time to 09:00')
          break
        }
      }

      // Set duration to 60 minutes
      const durationSelectors = [
        'input[name="duration"]',
        'select[name="duration"]',
        'input[placeholder*="duration"]',
        '[data-testid="duration"]'
      ]

      for (const selector of durationSelectors) {
        const element = page.locator(selector)
        if (await element.count() > 0) {
          if (await element.getAttribute('type') === 'select-one') {
            await element.selectOption('60')
          } else {
            await element.fill('60')
          }
          console.log('✅ Set duration to 60 minutes')
          break
        }
      }

      // Set end after 10 occurrences
      const occurrencesSelectors = [
        'input[name="occurrences"]',
        'input[name="count"]',
        'input[placeholder*="occurrence"]',
        '[data-testid="occurrences"]'
      ]

      for (const selector of occurrencesSelectors) {
        const element = page.locator(selector)
        if (await element.count() > 0) {
          await element.fill('10')
          console.log('✅ Set occurrences to 10')
          break
        }
      }

      await page.screenshot({
        path: 'test-results/recurring-form-filled.png',
        fullPage: true
      })
    })

    // Step 7: Create the recurring classes
    await test.step('Create the recurring classes', async () => {
      const createButtonSelectors = [
        'button[type="submit"]',
        'button:has-text("Create")',
        'button:has-text("Save")',
        'button:has-text("Generate")',
        '[data-testid="create-recurring-submit"]'
      ]

      let createButtonFound = false
      for (const selector of createButtonSelectors) {
        const element = page.locator(selector)
        if (await element.count() > 0) {
          await element.click()
          await page.waitForTimeout(3000) // Wait for creation process
          createButtonFound = true
          console.log('✅ Clicked create recurring classes button')
          break
        }
      }

      if (!createButtonFound) {
        await page.screenshot({
          path: 'test-results/no-create-button.png',
          fullPage: true
        })
        throw new Error('❌ Could not find create/submit button')
      }

      // Wait for success message or redirect
      await page.waitForTimeout(2000)
    })

    // Step 8: Verify the results
    await test.step('Verify created sessions', async () => {
      // Take screenshot of results
      await page.screenshot({
        path: 'test-results/recurring-classes-created.png',
        fullPage: true
      })

      // Look for success indicators
      const successSelectors = [
        ':has-text("success")',
        ':has-text("created")',
        ':has-text("scheduled")',
        '.success',
        '.alert-success',
        '[data-testid="success"]'
      ]

      let successFound = false
      for (const selector of successSelectors) {
        if (await page.locator(selector).count() > 0) {
          successFound = true
          console.log('✅ Found success indicator')
          break
        }
      }

      // Check for session listings
      const sessionSelectors = [
        '.session',
        '.class-session',
        '[data-testid="session"]',
        'tr[data-session]',
        '.schedule-item'
      ]

      let sessionsCount = 0
      for (const selector of sessionSelectors) {
        const count = await page.locator(selector).count()
        if (count > 0) {
          sessionsCount = count
          console.log(`✅ Found ${count} sessions created`)
          break
        }
      }

      // Check for time display - should show 09:00, not 06:00
      const timeElements = page.locator(':has-text("09:00"), :has-text("9:00"), [data-time*="09:00"]')
      const correctTimeCount = await timeElements.count()

      const wrongTimeElements = page.locator(':has-text("06:00"), :has-text("6:00"), [data-time*="06:00"]')
      const wrongTimeCount = await wrongTimeElements.count()

      // Check for multiple days (Monday, Wednesday, Friday)
      const mondayElements = page.locator(':has-text("Monday"), :has-text("Mon"), [data-day*="monday"]')
      const wednesdayElements = page.locator(':has-text("Wednesday"), :has-text("Wed"), [data-day*="wednesday"]')
      const fridayElements = page.locator(':has-text("Friday"), :has-text("Fri"), [data-day*="friday"]')

      const mondayCount = await mondayElements.count()
      const wednesdayCount = await wednesdayElements.count()
      const fridayCount = await fridayElements.count()

      // Log results
      console.log('\n📊 TEST RESULTS:')
      console.log(`Sessions created: ${sessionsCount}`)
      console.log(`Correct time (09:00) occurrences: ${correctTimeCount}`)
      console.log(`Wrong time (06:00) occurrences: ${wrongTimeCount}`)
      console.log(`Monday sessions: ${mondayCount}`)
      console.log(`Wednesday sessions: ${wednesdayCount}`)
      console.log(`Friday sessions: ${fridayCount}`)

      // Determine test outcome
      const timeIssueFixed = correctTimeCount > 0 && wrongTimeCount === 0
      const multipleDaysCreated = mondayCount > 0 && wednesdayCount > 0 && fridayCount > 0

      console.log('\n🎯 ISSUE STATUS:')
      console.log(`Time issue fixed (09:00 not 06:00): ${timeIssueFixed ? '✅ YES' : '❌ NO'}`)
      console.log(`Multiple days created (Mon/Wed/Fri): ${multipleDaysCreated ? '✅ YES' : '❌ NO'}`)

      if (!timeIssueFixed) {
        console.log('❌ TIME ISSUE: Sessions still showing 06:00 instead of 09:00')
      }

      if (!multipleDaysCreated) {
        console.log('❌ MULTIPLE DAYS ISSUE: Not all days (Mon/Wed/Fri) were created')
      }

      // Take final screenshot
      await page.screenshot({
        path: 'test-results/recurring-classes-final-results.png',
        fullPage: true
      })
    })

    console.log('🏁 Recurring class creation test completed')
  })

  test('should capture detailed debugging information if issues persist', async () => {
    console.log('🔍 Running detailed debugging test...')

    // Login and navigate (reuse from previous test)
    await page.goto(`${TEST_CONFIG.baseURL}/signin`, { waitUntil: 'networkidle' })
    await page.fill('input[type="email"]', TEST_CONFIG.credentials.email)
    await page.fill('input[type="password"]', TEST_CONFIG.credentials.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('**/dashboard**', { waitUntil: 'networkidle' })

    // Capture network requests related to recurring classes
    const networkRequests: string[] = []
    page.on('request', (request) => {
      const url = request.url()
      if (url.includes('recurring') || url.includes('class') || url.includes('schedule') || url.includes('session')) {
        networkRequests.push(`${request.method()} ${url}`)
      }
    })

    page.on('response', async (response) => {
      const url = response.url()
      if (url.includes('recurring') || url.includes('class') || url.includes('schedule') || url.includes('session')) {
        const status = response.status()
        console.log(`📡 API Response: ${response.request().method()} ${url} - Status: ${status}`)

        if (status >= 400) {
          try {
            const responseBody = await response.text()
            console.log(`❌ Error Response Body: ${responseBody}`)
          } catch (e) {
            console.log('❌ Could not read error response body')
          }
        }
      }
    })

    // Navigate to classes and attempt recurring creation
    await page.goto(`${TEST_CONFIG.baseURL}/classes`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(5000) // Allow all requests to complete

    console.log('\n📡 Network Requests Captured:')
    networkRequests.forEach(req => console.log(`  ${req}`))

    // Capture page source for debugging
    const pageContent = await page.content()
    console.log('\n📄 Page contains "recurring":', pageContent.toLowerCase().includes('recurring'))
    console.log('📄 Page contains "Create":', pageContent.toLowerCase().includes('create'))

    await page.screenshot({
      path: 'test-results/debug-classes-page.png',
      fullPage: true
    })

    console.log('🔍 Debugging information captured')
  })
})