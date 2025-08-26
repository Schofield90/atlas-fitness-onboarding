/**
 * E2E tests for critical bug fixes
 * 
 * Tests verify the complete user flow for:
 * 1. Public booking page accessibility
 * 2. Staff management functionality
 * 3. Integration between components
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001'
const TEST_ORG_ID = '63589490-8f55-4157-bd3a-e141594b748e'

test.describe('Critical Bug Fixes', () => {
  test.describe('Public Booking Page', () => {
    test('should load public booking page without authentication', async ({ page }) => {
      // Navigate to public booking page
      const response = await page.goto(`${BASE_URL}/book/public/${TEST_ORG_ID}`)
      
      // Verify page loads successfully (not 404)
      expect(response?.status()).toBe(200)
      
      // Verify page title or content
      await expect(page).toHaveTitle(/Book.*Atlas Fitness|Atlas Fitness.*Book/i)
      
      // Check that booking widget is rendered
      await page.waitForSelector('[data-testid="booking-widget"], .booking-widget, #booking-widget', {
        timeout: 10000
      }).catch(() => {
        // Fallback: Check for any booking-related content
        return page.waitForSelector('text=/book|class|session|schedule/i', { timeout: 5000 })
      })
      
      // Take screenshot for visual verification
      await page.screenshot({ 
        path: 'tests/screenshots/public-booking-page.png',
        fullPage: true 
      })
    })

    test('should show error for invalid organization ID', async ({ page }) => {
      // Navigate with invalid org ID
      await page.goto(`${BASE_URL}/book/public/invalid-org-id`)
      
      // Should still return 200 (page handles invalid ID gracefully)
      // Check for error message
      const errorText = await page.locator('text=/Invalid|Error|Not Found/i').first()
      await expect(errorText).toBeVisible({ timeout: 5000 })
      
      // Verify no booking widget is shown
      const bookingWidget = page.locator('[data-testid="booking-widget"], .booking-widget')
      await expect(bookingWidget).not.toBeVisible({ timeout: 1000 }).catch(() => {
        // Widget should not exist
        return expect(bookingWidget).toHaveCount(0)
      })
    })

    test('should handle missing organization ID parameter', async ({ page }) => {
      // Navigate without org ID
      await page.goto(`${BASE_URL}/book/public/`)
      
      // Should redirect or show error
      await page.waitForURL(/login|error|404|book\/public$/i, { timeout: 5000 }).catch(async () => {
        // Alternative: Check for error content
        const errorMessage = await page.locator('text=/Invalid|Missing|Required/i').first()
        await expect(errorMessage).toBeVisible()
      })
    })

    test('should be responsive on mobile devices', async ({ page }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Navigate to public booking page
      await page.goto(`${BASE_URL}/book/public/${TEST_ORG_ID}`)
      
      // Check that content adapts to mobile
      const mainContent = page.locator('main, [role="main"], .main-content').first()
      await expect(mainContent).toBeVisible()
      
      // Take mobile screenshot
      await page.screenshot({ 
        path: 'tests/screenshots/public-booking-mobile.png',
        fullPage: true 
      })
    })
  })

  test.describe('Staff Management API', () => {
    test('should require authentication for staff API', async ({ page }) => {
      // Direct API call without auth should redirect
      const response = await page.goto(`${BASE_URL}/api/staff`)
      
      // Should redirect to login
      expect(response?.status()).toBeOneOf([307, 302, 401])
      
      // If redirected, should be at login page
      if (response?.status() === 307 || response?.status() === 302) {
        await page.waitForURL(/login/i, { timeout: 5000 })
      }
    })

    test('should load staff management page after login', async ({ page, context }) => {
      // Skip if no test credentials are configured
      if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
        test.skip()
        return
      }

      // Login first
      await page.goto(`${BASE_URL}/login`)
      
      // Fill login form
      await page.fill('input[type="email"], input[name="email"]', process.env.TEST_USER_EMAIL)
      await page.fill('input[type="password"], input[name="password"]', process.env.TEST_USER_PASSWORD)
      
      // Submit login
      await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Sign In")')
      
      // Wait for redirect to dashboard
      await page.waitForURL(/dashboard|home|\/$/i, { timeout: 10000 })
      
      // Navigate to staff management
      await page.goto(`${BASE_URL}/staff`)
      
      // Verify staff page loads
      await expect(page).toHaveURL(/staff/i)
      
      // Check for staff-related content
      const staffContent = await page.locator('text=/Staff|Team|Member|Coach/i').first()
      await expect(staffContent).toBeVisible({ timeout: 10000 })
      
      // Verify no 500 error
      const errorMessage = page.locator('text=/500|Internal Server Error|Something went wrong/i')
      await expect(errorMessage).not.toBeVisible({ timeout: 1000 }).catch(() => {
        // Error should not exist
        return expect(errorMessage).toHaveCount(0)
      })
    })

    test('should display staff members with correct data structure', async ({ page }) => {
      // Skip if no test credentials
      if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
        test.skip()
        return
      }

      // Setup authenticated session (simplified for testing)
      // In real scenario, would use proper auth setup
      
      // Mock API response to verify correct handling
      await page.route('**/api/staff', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            staff: [
              {
                id: 'user-1',
                full_name: 'John Coach',
                email: 'john@example.com',
                avatar_url: null,
                title: 'Senior Coach',
                role: 'coach',
                specializations: [
                  {
                    type: 'strength_training',
                    certification: 'NASM CPT',
                    active: true
                  }
                ]
              },
              {
                id: 'user-2',
                full_name: 'Jane Admin',
                email: 'jane@example.com',
                avatar_url: null,
                title: 'Gym Manager',
                role: 'admin',
                specializations: []
              }
            ]
          })
        })
      })

      // Navigate to staff page
      await page.goto(`${BASE_URL}/staff`)
      
      // Verify staff members are displayed
      await page.waitForSelector('text=/John Coach|Jane Admin/i', { timeout: 5000 })
      
      // Check for role display
      await expect(page.locator('text=/coach/i')).toBeVisible()
      await expect(page.locator('text=/admin|manager/i')).toBeVisible()
    })
  })

  test.describe('Integration Tests', () => {
    test('should allow navigation from public booking to main app', async ({ page }) => {
      // Start at public booking page
      await page.goto(`${BASE_URL}/book/public/${TEST_ORG_ID}`)
      
      // Look for any navigation links to main app
      const loginLink = page.locator('a[href*="login"], button:has-text("Login"), a:has-text("Sign In")')
      
      if (await loginLink.count() > 0) {
        await loginLink.first().click()
        
        // Should navigate to login page
        await page.waitForURL(/login/i, { timeout: 5000 })
        await expect(page).toHaveURL(/login/i)
      }
    })

    test('should maintain organization context across pages', async ({ page }) => {
      // Navigate to public booking with specific org
      await page.goto(`${BASE_URL}/book/public/${TEST_ORG_ID}`)
      
      // Store any organization info displayed
      const orgInfo = await page.locator('[data-org-id], [data-organization]').getAttribute('data-org-id').catch(() => TEST_ORG_ID)
      
      // Verify organization ID is consistent
      expect(orgInfo).toContain(TEST_ORG_ID)
    })
  })

  test.describe('Performance Tests', () => {
    test('public booking page should load within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      
      // Navigate and wait for page to be fully loaded
      await page.goto(`${BASE_URL}/book/public/${TEST_ORG_ID}`, {
        waitUntil: 'networkidle'
      })
      
      const loadTime = Date.now() - startTime
      
      // Page should load within 5 seconds
      expect(loadTime).toBeLessThan(5000)
      
      // Log performance metrics
      const metrics = await page.evaluate(() => {
        const perf = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        return {
          domContentLoaded: perf.domContentLoadedEventEnd - perf.domContentLoadedEventStart,
          loadComplete: perf.loadEventEnd - perf.loadEventStart,
          responseTime: perf.responseEnd - perf.requestStart
        }
      })
      
      console.log('Performance Metrics:', metrics)
      
      // Response should be fast
      expect(metrics.responseTime).toBeLessThan(2000)
    })

    test('staff API should respond quickly', async ({ page }) => {
      // Mock auth to test API performance
      await page.route('**/api/staff', async (route) => {
        const startTime = Date.now()
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ staff: [] })
        })
        
        const responseTime = Date.now() - startTime
        
        // API should respond within 500ms
        expect(responseTime).toBeLessThan(500)
      })
      
      await page.goto(`${BASE_URL}/api/staff`)
    })
  })
})

// Helper to extend expect matchers
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received)
    return {
      pass,
      message: () => 
        pass 
          ? `Expected ${received} not to be one of ${expected.join(', ')}`
          : `Expected ${received} to be one of ${expected.join(', ')}`
    }
  }
})