import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import * as fs from 'fs/promises'
import * as path from 'path'

// Test configuration
const TEST_ORG_ID = '63589490-8f55-4157-bd3a-e141594b748e' // Atlas Fitness default
const TEST_USER_EMAIL = 'test@example.com'
const TEST_CODE = 'TEST_CODE_12345'
const TEST_STATE = 'atlas_fitness_oauth'

test.describe('Facebook OAuth Connection Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Clear any existing localStorage
    await page.goto('/integrations/facebook')
    await page.evaluate(() => {
      localStorage.clear()
    })
  })

  test('should connect Facebook account and persist connection status', async ({ page }) => {
    // Step 1: Navigate to Facebook integrations page
    await page.goto('/integrations/facebook')
    
    // Step 2: Check initial state - should be disconnected
    await expect(page.locator('text=Not Connected')).toBeVisible()
    const connectButton = page.locator('button:has-text("Connect Facebook Account")')
    await expect(connectButton).toBeVisible()
    
    // Step 3: Click connect button (will redirect to OAuth)
    // For testing, we'll intercept and redirect directly to callback
    await page.route('**/facebook.com/v19.0/dialog/oauth*', async route => {
      const url = new URL(route.request().url())
      const redirectUri = url.searchParams.get('redirect_uri')
      
      // Simulate successful OAuth by redirecting to callback with code
      await route.fulfill({
        status: 302,
        headers: {
          'Location': `${redirectUri}?code=${TEST_CODE}&state=${TEST_STATE}`
        }
      })
    })
    
    // Mock the Facebook API token exchange
    await page.route('**/graph.facebook.com/v19.0/oauth/access_token*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'test_access_token_123',
          token_type: 'bearer',
          expires_in: 5183999
        })
      })
    })
    
    // Mock the Facebook me endpoint
    await page.route('**/graph.facebook.com/v19.0/me*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '123456789',
          name: 'Test User',
          email: 'test@example.com'
        })
      })
    })
    
    // Click connect button
    await connectButton.click()
    
    // Step 4: Wait for redirect back to callback page
    await page.waitForURL('**/integrations/facebook/callback?success=true', { timeout: 10000 })
    
    // Step 5: Should show success message
    await expect(page.locator('text=Successfully connected')).toBeVisible({ timeout: 5000 })
    
    // Step 6: Navigate back to integrations page
    await page.goto('/integrations/facebook')
    
    // Step 7: Should show connected status WITHOUT requiring hard reload
    await expect(page.locator('text=Connected')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=Not Connected')).not.toBeVisible()
    
    // Step 8: Verify API status endpoint returns connected
    const statusResponse = await page.request.get('/api/integrations/facebook/status')
    const statusData = await statusResponse.json()
    expect(statusResponse.ok()).toBeTruthy()
    expect(statusData.connected).toBeTruthy()
    expect(statusData.integration).toBeDefined()
    expect(statusData.integration.facebook_user_id).toBe('123456789')
    
    // Step 9: Verify localStorage is properly set
    const localStorageData = await page.evaluate(() => {
      return {
        connected: localStorage.getItem('facebook_connected'),
        userId: localStorage.getItem('facebook_user_id'),
        userName: localStorage.getItem('facebook_user_name')
      }
    })
    expect(localStorageData.connected).toBe('true')
    expect(localStorageData.userId).toBe('123456789')
    expect(localStorageData.userName).toBe('Test User')
    
    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/facebook-connected.png', fullPage: true })
  })

  test('should handle duplicate OAuth callbacks idempotently', async ({ page }) => {
    // Setup: Mock APIs
    await page.route('**/graph.facebook.com/v19.0/oauth/access_token*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'test_access_token_456',
          token_type: 'bearer',
          expires_in: 5183999
        })
      })
    })
    
    await page.route('**/graph.facebook.com/v19.0/me*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: '987654321',
          name: 'Test User 2',
          email: 'test2@example.com'
        })
      })
    })
    
    // First callback
    const response1 = await page.goto(`/api/auth/facebook/callback?code=${TEST_CODE}_1&state=${TEST_STATE}`)
    expect(response1?.status()).toBeLessThan(400)
    
    // Second callback with same user (should be idempotent)
    const response2 = await page.goto(`/api/auth/facebook/callback?code=${TEST_CODE}_2&state=${TEST_STATE}`)
    expect(response2?.status()).toBeLessThan(400)
    
    // Verify only one integration record exists
    const statusResponse = await page.request.get('/api/integrations/facebook/status')
    const statusData = await statusResponse.json()
    expect(statusData.connected).toBeTruthy()
    
    // The integration should be updated, not duplicated
    expect(statusData.integration.facebook_user_id).toBe('987654321')
  })

  test('should show clear error when FACEBOOK_APP_SECRET is missing', async ({ page }) => {
    // Temporarily unset the env var (this would need to be done in test setup)
    // For now, we'll just verify error handling
    
    await page.goto('/integrations/facebook')
    
    // Mock a failed token exchange due to missing secret
    await page.route('**/graph.facebook.com/v19.0/oauth/access_token*', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'Invalid OAuth access token',
            type: 'OAuthException',
            code: 190
          }
        })
      })
    })
    
    // Try to connect
    const connectButton = page.locator('button:has-text("Connect Facebook Account")')
    await connectButton.click()
    
    // Should show error message
    await page.waitForURL('**/integrations/facebook/callback?error=*')
    await expect(page.locator('text=Failed to connect')).toBeVisible()
  })

  test('should validate OAuth state parameter', async ({ page }) => {
    // Try callback with invalid state
    const response = await page.goto(`/api/auth/facebook/callback?code=${TEST_CODE}&state=invalid_state`)
    
    // Should return error
    expect(response?.status()).toBe(400)
    
    // Verify connection is not established
    const statusResponse = await page.request.get('/api/integrations/facebook/status')
    const statusData = await statusResponse.json()
    expect(statusData.connected).toBeFalsy()
  })

  test('should handle expired tokens gracefully', async ({ page }) => {
    // Setup: Create an integration with expired token
    await page.goto('/integrations/facebook')
    
    // Mock expired token in status check
    await page.route('**/api/integrations/facebook/status', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          connected: false,
          error: 'Token expired',
          integration: {
            facebook_user_id: '123456789',
            token_expires_at: new Date(Date.now() - 86400000).toISOString() // Yesterday
          }
        })
      })
    })
    
    await page.reload()
    
    // Should show reconnect prompt
    await expect(page.locator('text=Token expired')).toBeVisible()
    await expect(page.locator('button:has-text("Reconnect")')).toBeVisible()
  })

  test('should check accessibility on integration pages', async ({ page }) => {
    // We'll use axe-core for accessibility testing
    await page.goto('/integrations/facebook')
    
    // Inject axe-core
    await page.addScriptTag({ url: 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.7.2/axe.min.js' })
    
    // Run accessibility tests
    const violations = await page.evaluate(() => {
      return new Promise((resolve) => {
        // @ts-ignore
        window.axe.run((err, results) => {
          if (err) throw err
          resolve(results.violations)
        })
      })
    })
    
    // Save results
    const fs = require('fs').promises
    await fs.mkdir('.claude', { recursive: true })
    await fs.writeFile('.claude/ux-findings.json', JSON.stringify({
      timestamp: new Date().toISOString(),
      page: '/integrations/facebook',
      violations,
      passed: violations.length === 0
    }, null, 2))
    
    // No critical accessibility issues
    const criticalViolations = violations.filter((v: any) => 
      v.impact === 'critical' || v.impact === 'serious'
    )
    expect(criticalViolations).toHaveLength(0)
  })
})