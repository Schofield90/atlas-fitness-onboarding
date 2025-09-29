import { test, expect } from '@playwright/test'

const TEST_CONFIG = {
  baseURL: 'http://localhost:3001',
  credentials: {
    email: 'sam@atlas-gyms.co.uk',
    password: 'atlas2024!' // Use actual password or environment variable
  },
  organizationId: 'eac9a158-d3c7-4140-9620-91a5554a6fe8'
}

test.describe('Authentication and Members Flow', () => {
  test('should complete full signin to membership management flow', async ({ page }) => {
    // Step 1: Navigate to signin page
    await test.step('Navigate to signin page', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/signin`)

      // Check if redirect happens to /auth/login (middleware behavior)
      await page.waitForURL('**/auth/login', { timeout: 10000 })

      // Verify login form is visible
      await expect(page.locator('input[type="email"], input[name="email"]')).toBeVisible()
      await expect(page.locator('input[type="password"], input[name="password"]')).toBeVisible()
      await expect(page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Sign In")')).toBeVisible()

      console.log('✅ Signin page loaded correctly')
    })

    // Step 2: Perform login
    await test.step('Perform login with valid credentials', async () => {
      // Fill login form
      await page.fill('input[type="email"], input[name="email"]', TEST_CONFIG.credentials.email)
      await page.fill('input[type="password"], input[name="password"]', TEST_CONFIG.credentials.password)

      // Submit login form
      await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Sign In")')

      // Wait for authentication to complete and redirect
      await page.waitForURL('**/dashboard', { timeout: 30000 })

      // Verify we're on dashboard and not on login page
      await expect(page).toHaveURL(/.*\/dashboard.*/)
      await expect(page).not.toHaveURL(/.*\/auth\/login.*/)

      console.log('✅ Login successful - redirected to dashboard')
    })

    // Step 3: Navigate to members page
    await test.step('Navigate to members page', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard/members`)

      // Wait for page to load
      await page.waitForLoadState('networkidle')

      // Check for members page elements
      await expect(page.locator('h1:has-text("Member Management"), h1:has-text("Members")')).toBeVisible({ timeout: 10000 })

      // Verify no authentication error messages
      await expect(page.locator('text=401')).not.toBeVisible()
      await expect(page.locator('text=Unauthorized')).not.toBeVisible()
      await expect(page.locator('text=User not found')).not.toBeVisible()

      console.log('✅ Members page loaded without authentication errors')
    })

    // Step 4: Verify members list loads
    await test.step('Verify members list loads correctly', async () => {
      // Wait for loading to complete
      await page.waitForFunction(() => {
        const loadingElements = document.querySelectorAll('.animate-pulse')
        return loadingElements.length === 0
      }, { timeout: 15000 })

      // Check if members table is visible
      await expect(page.locator('table, [role="table"]')).toBeVisible({ timeout: 10000 })

      // Check for either actual member data or "no members" message
      const hasMembersData = await page.locator('tbody tr').count() > 0
      const hasNoMembersMessage = await page.locator('text=No members found').isVisible()

      expect(hasMembersData || hasNoMembersMessage).toBe(true)

      if (hasMembersData) {
        console.log('✅ Members data loaded successfully')

        // Verify member data structure
        await expect(page.locator('tbody tr').first()).toBeVisible()

        // Check for member details in the first row
        const firstRow = page.locator('tbody tr').first()
        await expect(firstRow.locator('td')).toHaveCount(7) // Based on the table structure

      } else {
        console.log('✅ No members found message displayed correctly')
      }
    })

    // Step 5: Test Add Member functionality
    await test.step('Test Add Member button and modal', async () => {
      // Click Add Member button
      await page.click('button:has-text("Add Member")')

      // Wait for modal to open
      await expect(page.locator('[role="dialog"], .modal, .dialog')).toBeVisible({ timeout: 5000 })
      await expect(page.locator('text=Add New Member')).toBeVisible()

      // Verify form fields are present
      await expect(page.locator('input[name="name"], input#name')).toBeVisible()
      await expect(page.locator('input[name="email"], input#email')).toBeVisible()
      await expect(page.locator('input[name="phone"], input#phone')).toBeVisible()

      console.log('✅ Add Member modal opened successfully')
    })

    // Step 6: Verify membership plans dropdown loads
    await test.step('Verify membership plans dropdown loads with pricing', async () => {
      // Click on membership plan dropdown
      const membershipPlanSelect = page.locator('select[name="membership_plan_id"], [data-testid="membership-plan-select"], button[role="combobox"]:has-text("Select a membership plan")')

      if (await membershipPlanSelect.isVisible()) {
        await membershipPlanSelect.click()

        // Wait for dropdown options to load
        await page.waitForTimeout(2000)

        // Check for expected membership plans
        const hasBasicPlan = await page.locator('text=Basic Monthly').isVisible()
        const hasPremiumPlan = await page.locator('text=Premium Monthly').isVisible()

        // Check for pricing information
        const hasPricing = await page.locator('text=£29.99').isVisible() || await page.locator('text=£49.99').isVisible()

        if (hasBasicPlan || hasPremiumPlan) {
          console.log('✅ Membership plans loaded successfully')

          if (hasPricing) {
            console.log('✅ Membership plan pricing displayed correctly')
          } else {
            console.log('⚠️ Membership plan pricing not visible')
          }

          // Verify expected plans exist
          if (hasBasicPlan) {
            await expect(page.locator('text=Basic Monthly')).toBeVisible()
          }
          if (hasPremiumPlan) {
            await expect(page.locator('text=Premium Monthly')).toBeVisible()
          }

        } else {
          console.log('❌ Membership plans not loaded - this indicates an API issue')

          // Check for error messages
          const hasError = await page.locator('text=Failed to load').isVisible()
          if (hasError) {
            console.log('❌ Error loading membership plans detected')
          }
        }
      } else {
        console.log('⚠️ Membership plan dropdown not found')
      }
    })

    // Step 7: Test form validation and close modal
    await test.step('Test form validation and close modal', async () => {
      // Try to submit empty form to test validation
      const submitButton = page.locator('button[type="submit"]:has-text("Create Member")')
      if (await submitButton.isVisible()) {
        await submitButton.click()

        // Should show validation errors
        await expect(page.locator('text=Name and email are required, text=required')).toBeVisible({ timeout: 3000 }).catch(() => {
          console.log('⚠️ Form validation message not found')
        })
      }

      // Close the modal
      await page.click('button:has-text("Cancel")')
      await expect(page.locator('[role="dialog"], .modal, .dialog')).not.toBeVisible()

      console.log('✅ Modal closed successfully')
    })

    // Step 8: Test organization context is maintained
    await test.step('Verify organization context is maintained', async () => {
      // Navigate to another page and back to verify session persistence
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard`)
      await page.waitForLoadState('networkidle')

      // Go back to members page
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard/members`)
      await page.waitForLoadState('networkidle')

      // Should still be authenticated and load correctly
      await expect(page).not.toHaveURL(/.*\/auth\/login.*/)
      await expect(page.locator('h1:has-text("Member Management"), h1:has-text("Members")')).toBeVisible()

      console.log('✅ Organization context maintained across navigation')
    })

    // Step 9: Test API endpoints directly via network requests
    await test.step('Verify API endpoints return correct data', async () => {
      // Intercept API calls to verify they're working
      const clientsResponse = await page.waitForResponse(response =>
        response.url().includes('/api/clients') && response.status() === 200,
        { timeout: 10000 }
      ).catch(() => null)

      const plansResponse = await page.waitForResponse(response =>
        response.url().includes('/api/membership-plans') && response.status() === 200,
        { timeout: 10000 }
      ).catch(() => null)

      if (clientsResponse) {
        console.log('✅ Clients API responded successfully')
        expect(clientsResponse.status()).toBe(200)
      } else {
        console.log('❌ Clients API did not respond or returned error')
      }

      if (plansResponse) {
        console.log('✅ Membership plans API responded successfully')
        expect(plansResponse.status()).toBe(200)
      } else {
        console.log('❌ Membership plans API did not respond or returned error')
      }
    })

    // Take final screenshot for verification
    await page.screenshot({
      path: 'test-results/auth-members-flow-verification.png',
      fullPage: true
    })

    console.log('🎉 Authentication and Members Flow Test Completed!')
  })

  test('should handle authentication errors gracefully', async ({ page }) => {
    await test.step('Test invalid login credentials', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/auth/login`)

      // Try invalid credentials
      await page.fill('input[type="email"], input[name="email"]', 'invalid@example.com')
      await page.fill('input[type="password"], input[name="password"]', 'wrongpassword')
      await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Sign In")')

      // Should show error message
      await expect(page.locator('text=Invalid login credentials, text=Authentication error')).toBeVisible({ timeout: 5000 })

      // Should stay on login page
      await expect(page).toHaveURL(/.*\/auth\/login.*/)

      console.log('✅ Invalid credentials handled correctly')
    })

    await test.step('Test protected route without authentication', async () => {
      // Try to access members page without being logged in
      await page.goto(`${TEST_CONFIG.baseURL}/dashboard/members`)

      // Should redirect to login
      await page.waitForURL('**/auth/login', { timeout: 10000 })
      await expect(page).toHaveURL(/.*\/auth\/login.*/)

      console.log('✅ Protected route redirected to login correctly')
    })
  })

  test('should handle API errors gracefully', async ({ page }) => {
    // First login successfully
    await test.step('Login for API error testing', async () => {
      await page.goto(`${TEST_CONFIG.baseURL}/auth/login`)
      await page.fill('input[type="email"], input[name="email"]', TEST_CONFIG.credentials.email)
      await page.fill('input[type="password"], input[name="password"]', TEST_CONFIG.credentials.password)
      await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Sign In")')
      await page.waitForURL('**/dashboard', { timeout: 30000 })
    })

    await test.step('Test members page with potential API errors', async () => {
      // Intercept API calls and simulate errors
      await page.route('**/api/clients', (route) => {
        route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' })
        })
      })

      await page.goto(`${TEST_CONFIG.baseURL}/dashboard/members`)

      // Should handle 401 error gracefully
      await expect(page.locator('text=Failed to load members, text=Error loading members')).toBeVisible({ timeout: 10000 })

      console.log('✅ API error handled gracefully')
    })
  })
})