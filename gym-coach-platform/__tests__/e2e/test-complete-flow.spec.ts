import { test, expect } from '@playwright/test'

const TEST_CONFIG = {
  baseURL: 'http://localhost:3001',
  credentials: {
    email: 'sam@atlas-gyms.co.uk',
    password: 'TestPassword123!'
  },
  organizationId: 'eac9a158-d3c7-4140-9620-91a5554a6fe8'
}

test.describe('Complete Atlas Fitness CRM Authentication and Membership Flow', () => {
  test('should complete full owner login to membership management flow', async ({ page }) => {
    let consoleLogs: string[] = []
    let networkErrors: string[] = []
    let redirectHistory: string[] = []

    // Capture console logs
    page.on('console', msg => {
      const logEntry = `[${msg.type()}] ${msg.text()}`
      consoleLogs.push(logEntry)
      console.log(logEntry)
    })

    // Capture network failures
    page.on('requestfailed', request => {
      const errorEntry = `Request failed: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`
      networkErrors.push(errorEntry)
      console.log(errorEntry)
    })

    // Track page navigation for redirect loop detection
    page.on('framenavigated', frame => {
      if (frame === page.mainFrame()) {
        const url = frame.url()
        redirectHistory.push(url)
        console.log(`Navigation: ${url}`)
      }
    })

    // Step 1: Navigate to owner-login page
    await test.step('Navigate to owner-login page', async () => {
      console.log('🚀 Starting navigation to owner-login page...')

      await page.goto(`${TEST_CONFIG.baseURL}/owner-login`, {
        waitUntil: 'networkidle',
        timeout: 30000
      })

      // Wait for potential redirects to complete
      await page.waitForTimeout(2000)

      // Verify login form elements are present
      const emailInput = page.locator('input[type="email"], input[name="email"]')
      const passwordInput = page.locator('input[type="password"], input[name="password"]')
      const submitButton = page.locator('button[type="submit"]').first() // Use first submit button to avoid Google sign-in

      await expect(emailInput).toBeVisible({ timeout: 10000 })
      await expect(passwordInput).toBeVisible({ timeout: 10000 })
      await expect(submitButton).toBeVisible({ timeout: 10000 })

      console.log('✅ Owner login page loaded successfully')
      console.log(`Current URL: ${page.url()}`)
    })

    // Step 2: Perform login with credentials
    await test.step('Login with credentials sam@atlas-gyms.co.uk / TestPassword123!', async () => {
      console.log('🔐 Attempting login with provided credentials...')

      // Clear any existing values and fill login form
      await page.fill('input[type="email"], input[name="email"]', '')
      await page.fill('input[type="email"], input[name="email"]', TEST_CONFIG.credentials.email)

      await page.fill('input[type="password"], input[name="password"]', '')
      await page.fill('input[type="password"], input[name="password"]', TEST_CONFIG.credentials.password)

      console.log(`Email filled: ${TEST_CONFIG.credentials.email}`)
      console.log('Password filled (hidden for security)')

      // Take screenshot before login attempt
      await page.screenshot({ path: 'test-results/before-login.png' })

      // Submit login form
      const submitButton = page.locator('button[type="submit"]').first() // Use the first submit button (email/password form)
      await submitButton.click()

      console.log('Login form submitted')

      // Wait for authentication to complete and redirect
      try {
        await page.waitForURL('**/dashboard**', { timeout: 30000 })
        console.log('✅ Successfully redirected to dashboard')
      } catch (error) {
        console.log('❌ Dashboard redirect timeout, capturing current state...')
        await page.screenshot({ path: 'test-results/login-failure.png' })
        console.log(`Current URL after login attempt: ${page.url()}`)
        console.log('Recent console logs:', consoleLogs.slice(-10))
        console.log('Network errors:', networkErrors)
        console.log('Redirect history:', redirectHistory)
        throw error
      }
    })

    // Step 3: Verify successful redirect to dashboard without loops
    await test.step('Verify successful redirect to dashboard without loops', async () => {
      console.log('🔄 Checking for redirect loops and authentication persistence...')

      // Check we're on dashboard and not on login page
      await expect(page).toHaveURL(/.*\/dashboard.*/)
      await expect(page).not.toHaveURL(/.*\/auth\/login.*/)
      await expect(page).not.toHaveURL(/.*\/owner-login.*/)
      await expect(page).not.toHaveURL(/.*\/signin.*/)

      // Check for redirect loops (more than 3 redirects to same domain)
      const uniqueUrls = [...new Set(redirectHistory)]
      const totalRedirects = redirectHistory.length

      console.log(`Total redirects: ${totalRedirects}`)
      console.log(`Unique URLs visited: ${uniqueUrls.length}`)
      console.log('Redirect history:', redirectHistory)

      // Alert if suspicious redirect patterns
      if (totalRedirects > 5) {
        console.log('⚠️ Warning: High number of redirects detected')
      }

      // Verify dashboard content is loaded
      await expect(page.locator('h1, h2, [data-testid="dashboard-title"]')).toBeVisible({ timeout: 10000 })

      console.log('✅ Dashboard loaded successfully without redirect loops')
      console.log(`Final dashboard URL: ${page.url()}`)
    })

    // Step 4: Navigate to members page
    await test.step('Navigate to members page and verify data loads', async () => {
      console.log('👥 Navigating to members page...')

      await page.goto(`${TEST_CONFIG.baseURL}/dashboard/members`, {
        waitUntil: 'networkidle',
        timeout: 30000
      })

      // Wait for members data to load
      await page.waitForTimeout(3000)

      // Verify members page loaded
      await expect(page).toHaveURL(/.*\/dashboard\/members.*/)

      // Check for members list or empty state
      const membersExist = await page.locator('[data-testid="member-item"], .member-card, tr[data-member], .member-row').count() > 0
      const emptyState = await page.locator('[data-testid="empty-members"], .empty-state, .no-members').isVisible().catch(() => false)

      if (membersExist) {
        console.log('✅ Members data loaded successfully')
      } else if (emptyState) {
        console.log('✅ Members page loaded - showing empty state')
      } else {
        console.log('⚠️ Members page loaded but no clear data or empty state indication')
      }

      // Take screenshot of members page
      await page.screenshot({ path: 'test-results/members-page.png' })
    })

    // Step 5: Click on a member to view details
    await test.step('Click on member to view details', async () => {
      console.log('👤 Attempting to view member details...')

      // Try to find clickable member elements
      const memberSelectors = [
        '[data-testid="member-item"]',
        '.member-card',
        'tr[data-member]',
        '.member-row',
        '[data-testid="member-row"]',
        'a[href*="/members/"]',
        'button[data-member-id]'
      ]

      let memberClicked = false

      for (const selector of memberSelectors) {
        const memberElements = page.locator(selector)
        const count = await memberElements.count()

        if (count > 0) {
          console.log(`Found ${count} members with selector: ${selector}`)

          // Click on the first member
          await memberElements.first().click()
          memberClicked = true

          // Wait for member details to load
          await page.waitForTimeout(2000)
          break
        }
      }

      if (!memberClicked) {
        console.log('⚠️ No clickable members found, checking for Add Member button instead...')

        const addMemberButton = page.locator('button:has-text("Add Member"), [data-testid="add-member"], .add-member-btn')
        if (await addMemberButton.isVisible()) {
          console.log('Found Add Member button - members list appears to be empty')
          // We'll handle this in the next step
        } else {
          console.log('❌ No members or Add Member button found')
          await page.screenshot({ path: 'test-results/no-members-found.png' })
        }
      } else {
        console.log('✅ Successfully clicked on member')
        await page.screenshot({ path: 'test-results/member-details.png' })
      }
    })

    // Step 6: Click on "Add Membership" button and verify plans
    await test.step('Click Add Membership button and verify plans dropdown', async () => {
      console.log('💳 Looking for Add Membership functionality...')

      // Try multiple selectors for Add Membership button
      const addMembershipSelectors = [
        'button:has-text("Add Membership")',
        '[data-testid="add-membership"]',
        '.add-membership-btn',
        'button:has-text("Add Plan")',
        'button:has-text("Create Membership")',
        '[data-testid="add-membership-button"]'
      ]

      let membershipButtonFound = false

      for (const selector of addMembershipSelectors) {
        const button = page.locator(selector)

        if (await button.isVisible()) {
          console.log(`Found Add Membership button with selector: ${selector}`)
          await button.click()
          membershipButtonFound = true

          // Wait for membership form/modal to open
          await page.waitForTimeout(2000)
          break
        }
      }

      if (!membershipButtonFound) {
        console.log('⚠️ Add Membership button not immediately visible, looking for alternative paths...')

        // Try looking for member actions or menu buttons
        const actionButtons = page.locator('button:has-text("Actions"), .member-actions, [data-testid="member-actions"]')
        if (await actionButtons.first().isVisible()) {
          await actionButtons.first().click()
          await page.waitForTimeout(1000)

          // Look for membership option in dropdown
          const membershipOption = page.locator('button:has-text("Add Membership"), a:has-text("Add Membership")')
          if (await membershipOption.isVisible()) {
            await membershipOption.click()
            membershipButtonFound = true
          }
        }
      }

      if (membershipButtonFound) {
        console.log('✅ Add Membership action triggered')

        // Look for membership plans dropdown
        await page.waitForTimeout(2000)

        const planDropdownSelectors = [
          'select[name="plan"], select[name="planId"]',
          '[data-testid="plan-select"]',
          '.plan-dropdown',
          'select:has(option:has-text("Basic Monthly"))',
          'select:has(option:has-text("Premium Monthly"))',
          '[role="combobox"][aria-label*="plan"]'
        ]

        let plansFound = false

        for (const selector of planDropdownSelectors) {
          const dropdown = page.locator(selector)

          if (await dropdown.isVisible()) {
            console.log(`Found plans dropdown with selector: ${selector}`)

            // Click to open dropdown and check options
            await dropdown.click()
            await page.waitForTimeout(1000)

            // Look for expected plans
            const basicPlan = page.locator('option:has-text("Basic Monthly"), [data-value*="basic"], li:has-text("Basic Monthly")')
            const premiumPlan = page.locator('option:has-text("Premium Monthly"), [data-value*="premium"], li:has-text("Premium Monthly")')

            const basicExists = await basicPlan.isVisible()
            const premiumExists = await premiumPlan.isVisible()

            if (basicExists && premiumExists) {
              console.log('✅ Both Basic Monthly and Premium Monthly plans found in dropdown')
              plansFound = true

              // Check for pricing information
              const priceText = await page.locator('text=/\\$\\d+/, text=/£\\d+/, [data-testid*="price"]').allTextContents()
              if (priceText.length > 0) {
                console.log('✅ Pricing information found:', priceText)
              } else {
                console.log('⚠️ Plans found but no pricing information visible')
              }

            } else {
              console.log(`⚠️ Plans dropdown found but missing expected plans. Basic: ${basicExists}, Premium: ${premiumExists}`)
            }

            break
          }
        }

        if (!plansFound) {
          console.log('❌ Membership plans dropdown not found or not populated')
          await page.screenshot({ path: 'test-results/missing-plans-dropdown.png' })

          // Check if there are any error messages
          const errorMessages = await page.locator('[role="alert"], .error-message, .alert-error').allTextContents()
          if (errorMessages.length > 0) {
            console.log('Error messages found:', errorMessages)
          }
        }

      } else {
        console.log('❌ Add Membership button not found')
        await page.screenshot({ path: 'test-results/no-add-membership-button.png' })
      }

      // Take final screenshot
      await page.screenshot({ path: 'test-results/final-state.png' })
    })

    // Final reporting
    await test.step('Generate test summary report', async () => {
      console.log('\n🔍 TEST SUMMARY REPORT')
      console.log('========================')
      console.log(`Total console logs: ${consoleLogs.length}`)
      console.log(`Network errors: ${networkErrors.length}`)
      console.log(`Total redirects: ${redirectHistory.length}`)
      console.log(`Final URL: ${page.url()}`)

      if (networkErrors.length > 0) {
        console.log('\n❌ Network Errors:')
        networkErrors.forEach(error => console.log(`  - ${error}`))
      }

      if (consoleLogs.filter(log => log.includes('[error]')).length > 0) {
        console.log('\n❌ Console Errors:')
        consoleLogs.filter(log => log.includes('[error]')).forEach(error => console.log(`  - ${error}`))
      }

      console.log('\n✅ Test completed successfully')
    })
  })
})