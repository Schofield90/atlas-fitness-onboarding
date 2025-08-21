import { test, expect } from '@playwright/test'

test.describe('Stripe Connect Platform Flow', () => {
  test('should handle platform fee on purchase', async ({ page }) => {
    // Navigate to a coach's booking page
    await page.goto('/book/public/test-org-id')
    
    // Select a service
    const service = page.locator('[data-service-id]').first()
    await expect(service).toBeVisible()
    await service.click()
    
    // Click book now
    const bookButton = page.locator('button:has-text("Book Now")')
    await bookButton.click()
    
    // Fill payment details
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="name"]', 'Test User')
    
    // Mock Stripe payment intent with application fee
    await page.route('**/api/stripe/create-payment-intent', async route => {
      const request = route.request()
      const body = request.postDataJSON()
      
      // Verify application fee is included
      expect(body.application_fee_amount).toBeDefined()
      expect(body.application_fee_amount).toBeGreaterThan(0)
      
      // Platform fee should be reasonable (e.g., 2-10%)
      const feePercentage = (body.application_fee_amount / body.amount) * 100
      expect(feePercentage).toBeGreaterThanOrEqual(2)
      expect(feePercentage).toBeLessThanOrEqual(10)
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          client_secret: 'pi_test_secret_123',
          id: 'pi_test_123'
        })
      })
    })
    
    // Submit payment
    const payButton = page.locator('button:has-text("Pay")')
    await payButton.click()
    
    // Verify success
    await expect(page.locator('text=/success|confirmed/i')).toBeVisible({ timeout: 10000 })
  })
  
  test('should onboard connected account', async ({ page }) => {
    // Navigate to coach settings
    await page.goto('/settings/payments')
    
    // Click connect Stripe
    const connectButton = page.locator('button:has-text("Connect Stripe")')
    await expect(connectButton).toBeVisible()
    
    // Mock account link creation
    await page.route('**/api/stripe/create-account-link', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          url: 'https://connect.stripe.com/setup/test_123'
        })
      })
    })
    
    await connectButton.click()
    
    // Should redirect to Stripe Connect onboarding
    const onboardingUrl = await page.evaluate(() => 
      (window as any).lastStripeConnectUrl
    )
    expect(onboardingUrl).toContain('connect.stripe.com')
  })
  
  test('should validate platform fee calculation', async ({ request }) => {
    // Test API endpoint directly
    const response = await request.post('/api/stripe/calculate-fees', {
      data: {
        amount: 10000, // £100
        connected_account_id: 'acct_test_123'
      }
    })
    
    expect(response.ok()).toBeTruthy()
    
    const data = await response.json()
    expect(data.amount).toBe(10000)
    expect(data.application_fee_amount).toBeDefined()
    expect(data.platform_fee_percentage).toBeDefined()
    
    // Platform should take reasonable fee
    expect(data.platform_fee_percentage).toBeGreaterThanOrEqual(2)
    expect(data.platform_fee_percentage).toBeLessThanOrEqual(10)
  })
})