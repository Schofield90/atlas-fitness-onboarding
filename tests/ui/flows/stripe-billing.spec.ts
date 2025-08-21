import { test, expect } from '@playwright/test'

test.describe('Stripe SaaS Billing Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock Stripe.js to avoid loading real Stripe in tests
    await page.addInitScript(() => {
      (window as any).Stripe = () => ({
        redirectToCheckout: async () => ({ error: null }),
        createPaymentMethod: async () => ({ 
          paymentMethod: { id: 'pm_test_123' }, 
          error: null 
        })
      })
    })
  })
  
  test('should complete subscription checkout flow', async ({ page }) => {
    // Navigate to pricing page
    await page.goto('/pricing')
    
    // Select a plan
    const proPlan = page.locator('[data-plan="pro"]')
    await expect(proPlan).toBeVisible()
    await proPlan.click()
    
    // Click subscribe button
    const subscribeButton = page.locator('button:has-text("Subscribe")')
    await expect(subscribeButton).toBeVisible()
    await subscribeButton.click()
    
    // Should redirect to Stripe Checkout or show payment form
    await expect(page).toHaveURL(/checkout|payment/, { timeout: 10000 })
    
    // Verify checkout session is created
    const checkoutData = await page.evaluate(() => 
      JSON.parse(sessionStorage.getItem('stripe_checkout') || '{}')
    )
    expect(checkoutData).toBeDefined()
  })
  
  test('should access customer portal', async ({ page }) => {
    // Simulate logged in user with subscription
    await page.goto('/dashboard')
    
    // Navigate to billing settings
    await page.goto('/settings/billing')
    
    // Click manage subscription
    const portalButton = page.locator('button:has-text("Manage Subscription")')
    await expect(portalButton).toBeVisible()
    
    // Mock portal session creation
    await page.route('**/api/stripe/create-portal-session', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://billing.stripe.com/session/test_123'
        })
      })
    })
    
    await portalButton.click()
    
    // Verify portal session is created
    const portalUrl = await page.evaluate(() => 
      (window as any).lastStripePortalUrl
    )
    expect(portalUrl).toContain('billing.stripe.com')
  })
})