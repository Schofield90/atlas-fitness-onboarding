import { test, expect } from '@playwright/test'
import { createHmac } from 'crypto'

test.describe('GoCardless Payment Flow', () => {
  test('should complete mandate setup', async ({ page }) => {
    // Navigate to payment methods
    await page.goto('/settings/payment-methods')
    
    // Click add direct debit
    const addButton = page.locator('button:has-text("Add Direct Debit")')
    await expect(addButton).toBeVisible()
    await addButton.click()
    
    // Fill bank details
    await page.fill('[name="account_holder_name"]', 'Test User')
    await page.fill('[name="account_number"]', '12345678')
    await page.fill('[name="sort_code"]', '123456')
    
    // Mock mandate creation
    await page.route('**/api/gocardless/create-mandate', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          mandate_id: 'MD0001TEST',
          status: 'pending_submission',
          redirect_url: 'https://pay.gocardless.com/flow/test_123'
        })
      })
    })
    
    // Submit form
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()
    
    // Should show mandate confirmation
    await expect(page.locator('text=/mandate|authoriz/i')).toBeVisible()
  })
  
  test('should process payment with existing mandate', async ({ page }) => {
    // Navigate to payments
    await page.goto('/payments/new')
    
    // Select GoCardless
    const gcOption = page.locator('[data-payment-method="gocardless"]')
    await gcOption.click()
    
    // Enter amount
    await page.fill('[name="amount"]', '50.00')
    await page.fill('[name="description"]', 'Monthly membership')
    
    // Mock payment creation
    await page.route('**/api/gocardless/create-payment', async route => {
      const body = route.request().postDataJSON()
      
      expect(body.amount).toBe(5000) // Amount in pence
      expect(body.mandate_id).toBeDefined()
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          payment_id: 'PM0001TEST',
          status: 'pending_submission',
          charge_date: new Date().toISOString()
        })
      })
    })
    
    // Submit payment
    const payButton = page.locator('button:has-text("Collect Payment")')
    await payButton.click()
    
    // Verify success
    await expect(page.locator('text=/submitted|scheduled/i')).toBeVisible()
  })
  
  test('should validate webhook signature', async ({ request }) => {
    // Prepare webhook payload
    const payload = {
      events: [{
        id: 'EV0001TEST',
        action: 'confirmed',
        resource_type: 'payments',
        links: {
          payment: 'PM0001TEST'
        }
      }]
    }
    
    const body = JSON.stringify(payload)
    const secret = process.env.GOCARDLESS_WEBHOOK_SECRET || 'test_webhook_secret'
    
    // Generate valid signature
    const signature = createHmac('sha256', secret)
      .update(body)
      .digest('hex')
    
    // Send webhook
    const response = await request.post('/api/gocardless/webhook', {
      data: payload,
      headers: {
        'Webhook-Signature': signature,
        'Content-Type': 'application/json'
      }
    })
    
    expect(response.ok()).toBeTruthy()
    
    // Verify webhook was processed
    const result = await response.json()
    expect(result.processed).toBe(true)
  })
  
  test('should handle OAuth flow', async ({ page }) => {
    // Navigate to GoCardless settings
    await page.goto('/settings/integrations/gocardless')
    
    // Click connect
    const connectButton = page.locator('button:has-text("Connect GoCardless")')
    await expect(connectButton).toBeVisible()
    
    // Mock OAuth URL generation
    await page.route('**/api/gocardless/oauth/authorize', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          authorization_url: 'https://connect.gocardless.com/oauth/authorize?client_id=test'
        })
      })
    })
    
    await connectButton.click()
    
    // Should redirect to GoCardless OAuth
    const oauthUrl = await page.evaluate(() => 
      (window as any).lastGoCardlessOAuthUrl
    )
    expect(oauthUrl).toContain('connect.gocardless.com')
  })
})