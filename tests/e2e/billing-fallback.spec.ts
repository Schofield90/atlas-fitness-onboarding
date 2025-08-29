import { test, expect } from '@playwright/test'

test.describe('Billing Fallback - No White Screen on Error', () => {
  test.beforeEach(async ({ page }) => {
    // Set up environment for development mode (enables fallback)
    await page.addInitScript(() => {
      Object.defineProperty(process, 'env', {
        value: { NODE_ENV: 'development' },
        writable: true
      })
    })
  })

  test('shows fallback UI instead of white screen when API fails', async ({ page }) => {
    // Mock API failure scenarios
    await page.route('**/api/organization/get-info', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })

    // Navigate to billing page
    await page.goto('/billing')

    // Should NOT show white screen
    await expect(page.locator('body')).not.toHaveClass('white')
    await expect(page.locator('.min-h-screen')).toBeVisible()

    // Should show the page header and structure
    await expect(page.locator('h2:has-text("Billing & Subscription")')).toBeVisible()
    await expect(page.locator('text=Manage your subscription, payments, and billing settings')).toBeVisible()

    // Should show demo data badge (fallback indicator)
    await expect(page.locator('text=Demo Data')).toBeVisible()
    
    // Should show demo data styling
    const demoBadge = page.locator('text=Demo Data')
    await expect(demoBadge).toHaveClass(/bg-yellow-500\/20/)
    await expect(demoBadge).toHaveClass(/text-yellow-400/)
  })

  test('shows loading state initially before error occurs', async ({ page }) => {
    // Mock slow failing API
    await page.route('**/api/organization/get-info', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })

    await page.goto('/billing')

    // Should show loading state first
    await expect(page.locator('text=Loading billing information...')).toBeVisible()
    await expect(page.locator('.animate-spin')).toBeVisible()

    // Then should show fallback (not white screen)
    await expect(page.locator('text=Demo Data')).toBeVisible({ timeout: 5000 })
  })

  test('shows retry functionality when fallback is disabled', async ({ page }) => {
    // Mock feature flags to disable fallback
    await page.addInitScript(() => {
      window.localStorage.setItem('feature-flags', JSON.stringify({
        billingMswStub: false,
        billingRetryButton: true
      }))
    })

    // Mock API failure
    await page.route('**/api/organization/get-info', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })

    await page.goto('/billing')

    // Should show error state (not white screen)
    await expect(page.locator('text=Unable to Load Billing Information')).toBeVisible()
    await expect(page.locator('text=Try Again')).toBeVisible()

    // Should show helpful error message
    await expect(page.locator('text=We couldn\'t fetch your billing details right now')).toBeVisible()
    await expect(page.locator('text=This might be a temporary issue')).toBeVisible()

    // Should show support contact
    await expect(page.locator('a[href="mailto:support@atlasfitness.com"]')).toBeVisible()
  })

  test('retry button works correctly', async ({ page }) => {
    // Mock feature flags to disable fallback but enable retry
    await page.addInitScript(() => {
      window.localStorage.setItem('feature-flags', JSON.stringify({
        billingMswStub: false,
        billingRetryButton: true
      }))
    })

    let requestCount = 0
    await page.route('**/api/organization/get-info', async route => {
      requestCount++
      if (requestCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ organizationId: 'test-org-id' })
        })
      }
    })

    await page.goto('/billing')

    // Should show error first
    await expect(page.locator('text=Unable to Load Billing Information')).toBeVisible()

    // Click retry
    await page.locator('button:has-text("Try Again")').click()

    // Should show loading then success (not white screen)
    await expect(page.locator('text=Loading billing information...')).toBeVisible()
    await expect(page.locator('text=Billing & Subscription')).toBeVisible()
  })

  test('handles network errors gracefully', async ({ page }) => {
    // Mock network error
    await page.route('**/api/organization/get-info', async route => {
      await route.abort('failed')
    })

    await page.goto('/billing')

    // Should show fallback content (not white screen)
    await expect(page.locator('text=Demo Data')).toBeVisible()
    await expect(page.locator('h2:has-text("Billing & Subscription")')).toBeVisible()
  })

  test('shows proper error styling and icons', async ({ page }) => {
    // Disable fallback to show error state
    await page.addInitScript(() => {
      window.localStorage.setItem('feature-flags', JSON.stringify({
        billingMswStub: false,
        billingRetryButton: true
      }))
    })

    await page.route('**/api/organization/get-info', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })

    await page.goto('/billing')

    // Should show error icon
    await expect(page.locator('svg[viewBox="0 0 24 24"]')).toBeVisible()
    
    // Should show error styling (red colors)
    await expect(page.locator('.text-red-600')).toBeVisible()
    await expect(page.locator('.bg-red-100')).toBeVisible()

    // Should NOT be a white screen
    await expect(page.locator('body')).not.toHaveCSS('background-color', 'rgb(255, 255, 255)')
  })

  test('maintains page navigation and layout during errors', async ({ page }) => {
    await page.route('**/api/organization/get-info', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })

    await page.goto('/billing')

    // Should still show the dashboard layout
    await expect(page.locator('[data-testid="dashboard-layout"]')).toBeVisible()
    
    // Should show billing tabs even in error state
    await expect(page.locator('button:has-text("Subscription")')).toBeVisible()
    await expect(page.locator('button:has-text("Revenue")')).toBeVisible()
    await expect(page.locator('button:has-text("Payment Settings")')).toBeVisible()
  })

  test('switches between tabs correctly even with errors', async ({ page }) => {
    await page.route('**/api/organization/get-info', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })

    await page.goto('/billing')

    // Wait for fallback to load
    await expect(page.locator('text=Demo Data')).toBeVisible()

    // Switch to Revenue tab
    await page.locator('button:has-text("Revenue")').click()
    await expect(page.locator('text=Monthly Revenue')).toBeVisible()
    await expect(page.locator('text=Recent Transactions')).toBeVisible()

    // Switch to Payment Settings tab  
    await page.locator('button:has-text("Payment Settings")').click()
    // StripeConnect component would be rendered here
  })

  test('handles auth failures with appropriate fallback', async ({ page }) => {
    // Mock auth failure (no user)
    await page.route('**/api/organization/get-info', async route => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' })
      })
    })

    await page.goto('/billing')

    // Should show demo data fallback (not white screen)
    await expect(page.locator('text=Demo Data')).toBeVisible()
    await expect(page.locator('text=Demo Gym')).toBeVisible()
  })

  test('shows proper loading transitions', async ({ page }) => {
    let resolveRequest: Function

    await page.route('**/api/organization/get-info', async route => {
      // Create a promise that can be resolved externally
      await new Promise(resolve => {
        resolveRequest = resolve
      })
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ organizationId: 'test-org-id' })
      })
    })

    const pagePromise = page.goto('/billing')

    // Should show loading state
    await expect(page.locator('text=Loading billing information...')).toBeVisible()
    await expect(page.locator('.animate-spin')).toBeVisible()

    // Resolve the request
    resolveRequest()
    await pagePromise

    // Should transition to content (not white screen)
    await expect(page.locator('text=Billing & Subscription')).toBeVisible()
  })

  test('preserves user experience during error recovery', async ({ page }) => {
    let shouldFail = true

    await page.route('**/api/organization/get-info', async route => {
      if (shouldFail) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ organizationId: 'test-org-id' })
        })
      }
    })

    await page.goto('/billing')

    // Should show fallback initially
    await expect(page.locator('text=Demo Data')).toBeVisible()

    // Change route to succeed
    shouldFail = false

    // Navigate away and back to trigger retry
    await page.goto('/dashboard')
    await page.goto('/billing')

    // Should now show actual content
    await expect(page.locator('text=Billing & Subscription')).toBeVisible()
    // Demo badge should not be present with successful API
    await expect(page.locator('text=Demo Data')).not.toBeVisible()
  })
})