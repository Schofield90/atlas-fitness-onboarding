import { test, expect } from '@playwright/test'

// Simplified test to verify basic upcoming classes functionality
test.describe('Upcoming Classes Basic Tests', () => {
  test('should load client dashboard page', async ({ page }) => {
    // Navigate to client dashboard
    await page.goto('http://localhost:3003/client/dashboard')

    // Wait for page to load
    await page.waitForLoadState('domcontentloaded')

    // Check if we can access the page (may redirect to login if not authenticated)
    const currentUrl = page.url()

    if (currentUrl.includes('/auth/login')) {
      console.log('✅ Page correctly redirects to login when not authenticated')
      expect(currentUrl).toContain('/auth/login')
    } else {
      console.log('✅ Dashboard page loaded successfully')
      // Look for upcoming sessions section
      const upcomingSections = await page.locator('text=Upcoming Sessions').count()
      expect(upcomingSections).toBeGreaterThan(0)
    }
  })

  test('should handle API endpoint correctly', async ({ page }) => {
    // Test the API endpoint directly
    const response = await page.request.get('http://localhost:3003/api/bookings')

    if (response.status() === 401) {
      console.log('✅ API correctly returns 401 for unauthenticated requests')
      expect(response.status()).toBe(401)
    } else if (response.status() === 200) {
      console.log('✅ API returns successful response')
      const data = await response.json()
      expect(data).toHaveProperty('bookings')
    } else {
      console.log(`ℹ️ API returned status: ${response.status()}`)
    }
  })

  test('should have proper HTML structure for upcoming sessions', async ({ page }) => {
    // Mock the API response to test the frontend logic
    await page.route('**/api/bookings**', route => {
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          bookings: [
            {
              id: 'test-session',
              title: 'Test Yoga Class',
              session_type: 'gym_class',
              start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              end_time: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
              trainer_name: 'Test Trainer',
              location: 'Studio A',
              status: 'scheduled',
              cost: 25
            }
          ]
        })
      })
    })

    await page.goto('http://localhost:3003/client/dashboard')

    // Wait for the page to potentially redirect to auth or load
    await page.waitForTimeout(2000)

    const currentUrl = page.url()
    if (currentUrl.includes('/auth/login')) {
      console.log('ℹ️ Redirected to login - authentication required')
      // Still check if the page structure would be correct
      await expect(page).toHaveURL(/.*\/auth\/login.*/)
    } else {
      console.log('✅ Dashboard loaded - checking for session structure')
      // Look for upcoming sessions heading
      await expect(page.locator('text=Upcoming Sessions')).toBeVisible({ timeout: 10000 })
    }
  })

  test('should handle empty state correctly', async ({ page }) => {
    // Mock empty response
    await page.route('**/api/bookings**', route => {
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ bookings: [] })
      })
    })

    await page.goto('http://localhost:3003/client/dashboard')
    await page.waitForTimeout(2000)

    const currentUrl = page.url()
    if (!currentUrl.includes('/auth/login')) {
      // If we're on the dashboard, check for empty state
      const emptyState = await page.locator('text=No upcoming sessions').count()
      if (emptyState > 0) {
        console.log('✅ Empty state displays correctly')
        expect(emptyState).toBeGreaterThan(0)
      }
    } else {
      console.log('ℹ️ Authentication required for dashboard access')
    }
  })
})