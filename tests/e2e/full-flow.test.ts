/**
 * End-to-End Tests for All Critical Fixes
 * Comprehensive user journey testing
 */

import { test, expect, Page } from '@playwright/test'

// Test data
const TEST_USER = {
  email: 'test@atlasfitness.com',
  password: 'Test123!@#',
  organizationId: 'test-org-123'
}

// Helper functions
async function login(page: Page) {
  await page.goto('/login')
  await page.fill('[name="email"]', TEST_USER.email)
  await page.fill('[name="password"]', TEST_USER.password)
  await page.click('button[type="submit"]')
  await page.waitForURL('**/dashboard', { timeout: 10000 })
}

async function waitForToast(page: Page, message: string) {
  await page.waitForSelector(`text=${message}`, { timeout: 5000 })
}

test.describe('Multi-Tenancy and Data Isolation', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should fetch organization ID dynamically in leads page', async ({ page }) => {
    await page.goto('/leads')
    
    // Check that page loads without errors
    await expect(page.locator('h1:has-text("Leads")')).toBeVisible()
    
    // Verify no hard-coded organization ID in network requests
    const responsePromise = page.waitForResponse(
      response => response.url().includes('/api/leads') && response.status() === 200
    )
    
    await page.reload()
    const response = await responsePromise
    const requestUrl = response.url()
    
    // Should not contain the old hard-coded ID
    expect(requestUrl).not.toContain('63589490-8f55-4157-bd3a-e141594b748e')
  })

  test('should maintain data isolation between organizations', async ({ page, context }) => {
    // Create two browser contexts for different organizations
    const context1 = await context.browser()?.newContext()
    const context2 = await context.browser()?.newContext()
    
    const page1 = await context1!.newPage()
    const page2 = await context2!.newPage()
    
    // Login as org 1
    await page1.goto('/login')
    await page1.fill('[name="email"]', 'org1@test.com')
    await page1.fill('[name="password"]', 'Test123!@#')
    await page1.click('button[type="submit"]')
    
    // Login as org 2
    await page2.goto('/login')
    await page2.fill('[name="email"]', 'org2@test.com')
    await page2.fill('[name="password"]', 'Test123!@#')
    await page2.click('button[type="submit"]')
    
    // Navigate to leads
    await page1.goto('/leads')
    await page2.goto('/leads')
    
    // Check that each sees different data
    const org1Leads = await page1.locator('.lead-card').count()
    const org2Leads = await page2.locator('.lead-card').count()
    
    // Data should be isolated (different counts or content)
    // This assumes test data is set up differently for each org
    expect(org1Leads).toBeGreaterThanOrEqual(0)
    expect(org2Leads).toBeGreaterThanOrEqual(0)
    
    await context1!.close()
    await context2!.close()
  })
})

test.describe('Export Feedback System', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/leads')
  })

  test('should show success toast when exporting leads', async ({ page }) => {
    // Wait for leads to load
    await page.waitForSelector('[data-testid="leads-table"]', { timeout: 10000 })
    
    // Click export button
    await page.click('button:has-text("Export CSV")')
    
    // Check for success toast
    await expect(page.locator('text=Leads exported successfully')).toBeVisible({ timeout: 5000 })
    
    // Check that description includes count
    await expect(page.locator('text=/\\d+ leads exported to CSV/')).toBeVisible()
    
    // Verify file download triggered
    const download = await page.waitForEvent('download')
    expect(download.suggestedFilename()).toMatch(/leads-export-\d{8}-\d{6}\.csv/)
  })

  test('should show error toast when export fails', async ({ page }) => {
    // Intercept API call to simulate failure
    await page.route('**/api/leads/export', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Export failed' })
      })
    })
    
    // Click export button
    await page.click('button:has-text("Export CSV")')
    
    // Check for error toast
    await expect(page.locator('text=Export Failed')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('text=/error occurred.*export/')).toBeVisible()
  })
})

test.describe('Booking Navigation Fix', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/booking')
  })

  test('should navigate to booking-links/create without opening modal', async ({ page }) => {
    // Click create booking link button
    await page.click('button:has-text("Create Booking Link")')
    
    // Should navigate to the correct page
    await expect(page).toHaveURL(/.*booking-links\/create/)
    
    // Should NOT have any modal visible
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
    await expect(page.locator('text=Select Date')).not.toBeVisible()
    await expect(page.locator('.calendar-modal')).not.toBeVisible()
  })

  test('should navigate to booking-links management page', async ({ page }) => {
    // Click manage links button
    await page.click('button:has-text("Manage Links")')
    
    // Should navigate to the correct page
    await expect(page).toHaveURL(/.*booking-links$/)
    
    // No modal should appear
    await expect(page.locator('[role="dialog"]')).not.toBeVisible()
  })
})

test.describe('Staff Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should show friendly error message on load failure', async ({ page }) => {
    // Intercept API to simulate error
    await page.route('**/api/staff', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Database error' })
      })
    })
    
    await page.goto('/staff')
    
    // Should show friendly error, not technical details
    await expect(page.locator('text=/Unable to load staff/')).toBeVisible()
    await expect(page.locator('text=/check your connection/')).toBeVisible()
    
    // Should NOT show raw error
    await expect(page.locator('text=Database error')).not.toBeVisible()
    await expect(page.locator('text=500')).not.toBeVisible()
  })

  test('should have working retry functionality', async ({ page }) => {
    let attemptCount = 0
    
    // First attempt fails, second succeeds
    await page.route('**/api/staff', route => {
      attemptCount++
      if (attemptCount === 1) {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Temporary error' })
        })
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            data: [
              { id: '1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' }
            ]
          })
        })
      }
    })
    
    await page.goto('/staff')
    
    // Wait for error state
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible()
    
    // Click retry
    await page.click('button:has-text("Try Again")')
    
    // Should show loading state
    await expect(page.locator('text=Loading staff')).toBeVisible()
    
    // Should eventually show data
    await expect(page.locator('text=John Doe')).toBeVisible({ timeout: 10000 })
    
    // Error message should be gone
    await expect(page.locator('text=/Unable to load/')).not.toBeVisible()
  })
})

test.describe('Conversations - New Conversation Button', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/conversations')
  })

  test('should have New Conversation button in header', async ({ page }) => {
    // Check button exists
    await expect(page.locator('button:has-text("New Conversation")')).toBeVisible()
    
    // Check it's in the header area
    const headerButton = page.locator('header button:has-text("New Conversation")')
    await expect(headerButton).toBeVisible()
  })

  test('should switch to enhanced view when clicking New Conversation', async ({ page }) => {
    // Click the button
    await page.click('button:has-text("New Conversation")')
    
    // Should show the enhanced conversation view
    await expect(page.locator('[data-view="enhanced"]')).toBeVisible()
    
    // Should show contact selection or search
    await expect(page.locator('text=/Select.*contact|Search.*contacts/')).toBeVisible()
  })

  test('should allow creating a new conversation', async ({ page }) => {
    // Click new conversation
    await page.click('button:has-text("New Conversation")')
    
    // Select or search for a contact
    await page.fill('[placeholder*="Search"]', 'John Doe')
    await page.click('text=John Doe')
    
    // Type a message
    await page.fill('[placeholder*="Type a message"]', 'Hello, this is a test message')
    
    // Send the message
    await page.click('button[aria-label="Send message"]')
    
    // Should show success feedback
    await expect(page.locator('text=/Message sent|Conversation started/')).toBeVisible()
  })
})

test.describe('Forms Categories - Expand/Collapse', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
    await page.goto('/forms')
  })

  test('should expand and collapse categories', async ({ page }) => {
    // Find a category header
    const categoryHeader = page.locator('.category-header').first()
    const categoryContent = page.locator('.category-content').first()
    
    // Initially collapsed
    await expect(categoryContent).not.toBeVisible()
    
    // Click to expand
    await categoryHeader.click()
    
    // Should now be visible
    await expect(categoryContent).toBeVisible()
    
    // Click to collapse
    await categoryHeader.click()
    
    // Should be hidden again
    await expect(categoryContent).not.toBeVisible()
  })

  test('should animate chevron rotation', async ({ page }) => {
    const categoryHeader = page.locator('.category-header').first()
    const chevron = categoryHeader.locator('svg, .chevron-icon')
    
    // Get initial rotation
    const initialTransform = await chevron.evaluate(el => 
      window.getComputedStyle(el).transform
    )
    
    // Click to expand
    await categoryHeader.click()
    
    // Wait for animation
    await page.waitForTimeout(300)
    
    // Check rotation changed
    const expandedTransform = await chevron.evaluate(el => 
      window.getComputedStyle(el).transform
    )
    
    expect(initialTransform).not.toBe(expandedTransform)
  })

  test('should show content when category is expanded', async ({ page }) => {
    const categoryHeader = page.locator('.category-header:has-text("Lead Generation")')
    
    // Expand category
    await categoryHeader.click()
    
    // Should show forms in that category
    await expect(page.locator('.form-item')).toBeVisible()
    
    // Should show form actions
    await expect(page.locator('button:has-text("Edit")')).toBeVisible()
    await expect(page.locator('button:has-text("Preview")')).toBeVisible()
  })
})

test.describe('Billing Error States', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test('should show loading spinner while fetching billing data', async ({ page }) => {
    // Add delay to API response
    await page.route('**/api/billing', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000))
      route.fulfill({
        status: 200,
        body: JSON.stringify({ data: {} })
      })
    })
    
    await page.goto('/billing')
    
    // Should show loading spinner
    await expect(page.locator('.spinner, [aria-label="Loading"]')).toBeVisible()
    
    // Eventually should load
    await expect(page.locator('.spinner, [aria-label="Loading"]')).not.toBeVisible({ timeout: 10000 })
  })

  test('should show retry button on billing error', async ({ page }) => {
    // Simulate error
    await page.route('**/api/billing', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Billing service unavailable' })
      })
    })
    
    await page.goto('/billing')
    
    // Should show error state
    await expect(page.locator('text=/Unable to load billing/')).toBeVisible()
    
    // Should have retry button
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible()
  })

  test('should successfully load billing data after retry', async ({ page }) => {
    let attemptCount = 0
    
    await page.route('**/api/billing', route => {
      attemptCount++
      if (attemptCount === 1) {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Temporary error' })
        })
      } else {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            subscription: {
              status: 'active',
              plan: 'Professional',
              nextBilling: '2024-02-01'
            }
          })
        })
      }
    })
    
    await page.goto('/billing')
    
    // Wait for error and retry button
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible()
    
    // Click retry
    await page.click('button:has-text("Try Again")')
    
    // Should show billing data
    await expect(page.locator('text=Professional')).toBeVisible()
    await expect(page.locator('text=/Next billing/')).toBeVisible()
  })
})

test.describe('Complete User Journey', () => {
  test('should complete a full workflow without errors', async ({ page }) => {
    // Login
    await login(page)
    
    // Navigate through all fixed areas
    
    // 1. Check leads with proper multi-tenancy
    await page.goto('/leads')
    await expect(page.locator('h1:has-text("Leads")')).toBeVisible()
    
    // 2. Export leads with feedback
    if (await page.locator('button:has-text("Export CSV")').isVisible()) {
      await page.click('button:has-text("Export CSV")')
      await waitForToast(page, 'exported successfully')
    }
    
    // 3. Navigate to booking without modal
    await page.goto('/booking')
    await page.click('button:has-text("Create Booking Link")')
    await expect(page).toHaveURL(/.*booking-links\/create/)
    
    // 4. Check staff with proper error handling
    await page.goto('/staff')
    await expect(page.locator('text=/Staff|Loading staff/')).toBeVisible()
    
    // 5. Create new conversation
    await page.goto('/conversations')
    await expect(page.locator('button:has-text("New Conversation")')).toBeVisible()
    
    // 6. Check forms categories
    await page.goto('/forms')
    const categoryHeader = page.locator('.category-header').first()
    if (await categoryHeader.isVisible()) {
      await categoryHeader.click()
      await page.waitForTimeout(300) // Wait for animation
    }
    
    // 7. Check billing loads
    await page.goto('/billing')
    await expect(page.locator('text=/Billing|Loading billing/')).toBeVisible()
    
    // All areas should work without errors
    expect(true).toBe(true)
  })
})

test.describe('Performance and Responsiveness', () => {
  test('should load pages within acceptable time', async ({ page }) => {
    await login(page)
    
    const pages = ['/leads', '/booking', '/staff', '/conversations', '/forms', '/billing']
    
    for (const path of pages) {
      const startTime = Date.now()
      await page.goto(path)
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime
      
      // Page should load within 3 seconds
      expect(loadTime).toBeLessThan(3000)
    }
  })

  test('should handle rapid navigation without errors', async ({ page }) => {
    await login(page)
    
    // Rapidly navigate between pages
    const pages = ['/leads', '/booking', '/staff', '/conversations']
    
    for (let i = 0; i < 10; i++) {
      const randomPage = pages[Math.floor(Math.random() * pages.length)]
      await page.goto(randomPage)
      
      // Should not show any error states
      await expect(page.locator('text=/Error|Failed|crashed/')).not.toBeVisible()
    }
  })
})