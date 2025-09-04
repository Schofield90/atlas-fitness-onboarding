import { test, expect } from '@playwright/test'

test.describe('Billing Page Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    // Mock failed API responses
    await page.route('/api/saas/billing', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })

    await page.route('/api/billing/stripe-connect/status', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Stripe not configured' })
      })
    })
  })

  test('shows graceful error state when billing API fails', async ({ page }) => {
    await page.goto('/billing')

    // Should show loading first
    await expect(page.getByText('Loading billing information')).toBeVisible()

    // Should eventually show fallback state instead of crashing
    await expect(page.getByText('Demo Data')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Billing & Subscription')).toBeVisible()
    
    // Should not show "Something went wrong!" error page
    await expect(page.getByText('Something went wrong!')).not.toBeVisible()
  })

  test('shows retry button and allows retry', async ({ page }) => {
    // First, mock API to fail
    let apiCallCount = 0
    await page.route('/api/saas/billing', async (route) => {
      apiCallCount++
      if (apiCallCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        })
      } else {
        // Second call succeeds with mock data
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            organization: {
              id: 'test-org',
              name: 'Test Gym',
              saas_subscriptions: []
            },
            usageSummary: {
              sms_sent: 0,
              emails_sent: 0,
              whatsapp_sent: 0,
              bookings_created: 0,
              active_customers: 0,
              active_staff: 1
            },
            availablePlans: [],
            canManageBilling: true,
            stripeConfigured: false
          })
        })
      }
    })

    await page.goto('/billing')

    // Wait for demo data to appear
    await expect(page.getByText('Demo Data')).toBeVisible()

    // Click "Try Live Connection" button
    await page.getByText('Try Live Connection').click()

    // Should now show successful load without demo data badge
    await expect(page.getByText('Demo Data')).not.toBeVisible()
    await expect(page.getByText('Billing & Subscription')).toBeVisible()
  })

  test('shows Stripe configuration warning when not configured', async ({ page }) => {
    // Mock successful API response but with Stripe not configured
    await page.route('/api/saas/billing', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          organization: {
            id: 'test-org',
            name: 'Test Gym',
            saas_subscriptions: []
          },
          usageSummary: {
            sms_sent: 0,
            emails_sent: 0,
            whatsapp_sent: 0,
            bookings_created: 0,
            active_customers: 0,
            active_staff: 1
          },
          availablePlans: [],
          canManageBilling: true,
          stripeConfigured: false
        })
      })
    })

    await page.route('/api/billing/stripe-connect/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          account: null,
          settings: {
            platform_commission_rate: 0.03,
            payment_methods_enabled: { card: true, direct_debit: false }
          },
          stripeConfigured: false
        })
      })
    })

    await page.goto('/billing')

    // Should show the page without crashing
    await expect(page.getByText('Billing & Subscription')).toBeVisible()

    // Click on Payment Settings tab
    await page.getByText('Payment Settings').click()

    // Should show Stripe configuration warning
    await expect(page.getByText('Payment Processing Not Configured')).toBeVisible()
    await expect(page.getByText('Contact your administrator')).toBeVisible()
  })

  test('handles network errors gracefully', async ({ page }) => {
    // Mock network failure
    await page.route('/api/saas/billing', async (route) => {
      await route.abort('failed')
    })

    await page.goto('/billing')

    // Should show demo data fallback instead of crashing
    await expect(page.getByText('Demo Data')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Something went wrong!')).not.toBeVisible()
  })

  test('provides helpful error information', async ({ page }) => {
    // Disable demo data for this test by mocking feature flags
    await page.addInitScript(() => {
      window.localStorage.setItem('feature-flags', JSON.stringify({
        billingMswStub: false,
        billingRetryButton: true
      }))
    })

    await page.goto('/billing')

    // Should show detailed error state
    await expect(page.getByText('Billing System Temporarily Unavailable')).toBeVisible({ timeout: 10000 })
    await expect(page.getByText('Scheduled maintenance on payment systems')).toBeVisible()
    await expect(page.getByText('Contact Support')).toBeVisible()
    
    // Check support link
    const supportLink = page.getByText('Contact Support')
    await expect(supportLink).toHaveAttribute('href', /mailto:support@atlasfitness\.com/)
  })

  test('subscription tab shows empty state gracefully', async ({ page }) => {
    // Mock API with empty subscription data
    await page.route('/api/saas/billing', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          organization: {
            id: 'test-org',
            name: 'Test Gym',
            saas_subscriptions: []
          },
          usageSummary: {
            sms_sent: 0,
            emails_sent: 0,
            whatsapp_sent: 0,
            bookings_created: 0,
            active_customers: 0,
            active_staff: 1
          },
          availablePlans: [],
          canManageBilling: true,
          stripeConfigured: true
        })
      })
    })

    await page.goto('/billing')

    // Should show billing page
    await expect(page.getByText('Billing & Subscription')).toBeVisible()
    
    // Subscription tab should show empty state
    await expect(page.getByText('No active subscription')).toBeVisible()
    
    // Revenue tab should show zero state
    await page.getByText('Revenue').click()
    await expect(page.getByText('No data yet')).toBeVisible()
    await expect(page.getByText('No Transactions Yet')).toBeVisible()
  })
})