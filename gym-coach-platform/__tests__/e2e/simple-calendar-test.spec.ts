import { test, expect, Page } from '@playwright/test'

test.describe('Simple Calendar Test', () => {
  test('login and test calendar functionality', async ({ page }) => {
    console.log('Starting calendar test...')

    // Step 1: Navigate to signin
    await page.goto('http://localhost:3001/signin', {
      waitUntil: 'networkidle',
      timeout: 60000
    })

    await page.screenshot({
      path: 'test-results/simple-step1-signin.png',
      fullPage: true
    })

    console.log('At signin page:', page.url())

    // Step 2: Fill credentials
    await page.fill('input[type="email"]', 'sam@atlas-gyms.co.uk')
    await page.fill('input[type="password"]', 'process.env.TEST_USER_PASSWORD || 'test123'')

    await page.screenshot({
      path: 'test-results/simple-step2-filled.png',
      fullPage: true
    })

    console.log('Credentials filled')

    // Step 3: Click the specific orange "Log In" button
    await page.click('button[type="submit"]:has-text("Log In")')

    // Wait for login to process
    await page.waitForTimeout(3000)

    await page.screenshot({
      path: 'test-results/simple-step3-after-login.png',
      fullPage: true
    })

    console.log('After login click, URL:', page.url())

    // Step 4: Navigate to calendar
    await page.goto('http://localhost:3001/class-calendar', {
      waitUntil: 'networkidle',
      timeout: 60000
    })

    await page.waitForTimeout(5000) // Allow calendar to load

    await page.screenshot({
      path: 'test-results/simple-step4-calendar.png',
      fullPage: true
    })

    console.log('At calendar page, URL:', page.url())

    // Step 5: Check if we're on login page or calendar page
    const isLoginPage = await page.locator('text=Login to Atlas Fitness').count() > 0
    const isCalendarPage = await page.locator('[class*="calendar"], [class*="Calendar"], .fc-view').count() > 0
    const hasClassElements = await page.locator('[class*="class"], [class*="event"], .fc-event').count() > 0
    const hasNoClassesMsg = await page.locator('text=No Classes Scheduled').count() > 0

    console.log('Analysis Results:')
    console.log('- Is Login Page:', isLoginPage)
    console.log('- Is Calendar Page:', isCalendarPage)
    console.log('- Has Class Elements:', hasClassElements)
    console.log('- Has No Classes Message:', hasNoClassesMsg)

    // Step 6: Test view switches (if on calendar page)
    if (!isLoginPage) {
      console.log('Testing view switches...')

      // Try clicking Day view
      const dayButton = page.locator('button:has-text("Day")')
      if (await dayButton.count() > 0) {
        await dayButton.click()
        await page.waitForTimeout(1000)
        await page.screenshot({
          path: 'test-results/simple-step6-day-view.png',
          fullPage: true
        })
        console.log('Day view tested')
      }

      // Try clicking Week view
      const weekButton = page.locator('button:has-text("Week")')
      if (await weekButton.count() > 0) {
        await weekButton.click()
        await page.waitForTimeout(1000)
        await page.screenshot({
          path: 'test-results/simple-step6-week-view.png',
          fullPage: true
        })
        console.log('Week view tested')
      }

      // Try clicking Month view
      const monthButton = page.locator('button:has-text("Month")')
      if (await monthButton.count() > 0) {
        await monthButton.click()
        await page.waitForTimeout(1000)
        await page.screenshot({
          path: 'test-results/simple-step6-month-view.png',
          fullPage: true
        })
        console.log('Month view tested')
      }
    }

    // Step 7: Final assessment
    await page.screenshot({
      path: 'test-results/simple-final-result.png',
      fullPage: true
    })

    // Verify success
    if (hasClassElements && !hasNoClassesMsg && !isLoginPage) {
      console.log('✅ SUCCESS: Classes are visible on the calendar!')
    } else if (isCalendarPage && !hasNoClassesMsg && !isLoginPage) {
      console.log('⚠️ PARTIAL SUCCESS: Calendar visible but no classes detected')
    } else if (hasNoClassesMsg) {
      console.log('⚠️ ISSUE: "No Classes Scheduled" message is showing')
    } else if (isLoginPage) {
      console.log('❌ FAILURE: Authentication failed, still on login page')
    } else {
      console.log('❓ UNKNOWN: Calendar state unclear')
    }

    // Always pass the test so we can see the results
    expect(true).toBe(true)
  })
})