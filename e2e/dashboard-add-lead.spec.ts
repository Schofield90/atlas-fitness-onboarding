import { test, expect } from '@playwright/test'

/**
 * End-to-End Tests for Dashboard Add New Lead Fix
 * Tests the complete user flow: Dashboard → Click "Add New Lead" → Create lead form appears
 */

test.describe('Dashboard Add New Lead Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Set up any necessary authentication or state
    // For now, we'll go directly to dashboard pages that work without auth
  })

  test('Dashboard Direct - Add New Lead opens modal with form fields', async ({ page }) => {
    // Navigate to dashboard-direct
    await page.goto('/dashboard-direct')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Find and click the "Add New Lead" quick action button
    const addLeadButton = page.locator('button:has-text("Add New Lead")')
    await expect(addLeadButton).toBeVisible()
    await addLeadButton.click()

    // Expect the modal to appear (not a navigation to /leads/new)
    const modal = page.locator('[data-testid="add-lead-modal"], .modal, [role="dialog"]').first()
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Verify the create lead form fields are visible
    await expect(page.locator('input[type="text"][placeholder*="name"], input[placeholder*="Name"], label:has-text("Name") + input')).toBeVisible()
    await expect(page.locator('input[type="email"], input[placeholder*="email"], label:has-text("Email") + input')).toBeVisible()
    await expect(page.locator('input[type="tel"], input[placeholder*="phone"], label:has-text("Phone") + input')).toBeVisible()

    // Verify modal has the expected title
    await expect(page.locator('h2:has-text("Add New Lead"), h1:has-text("Add New Lead"), .modal-title:has-text("Add New Lead")')).toBeVisible()

    // Verify there's a submit button
    await expect(page.locator('button:has-text("Add Lead"), button:has-text("Save"), button:has-text("Submit"), button[type="submit"]')).toBeVisible()

    // Verify there's a close/cancel button
    await expect(page.locator('button:has-text("Cancel"), button:has-text("Close"), button[aria-label="Close"], .modal-close')).toBeVisible()
  })

  test('Quick Dashboard - Add New Lead opens modal with form fields', async ({ page }) => {
    // Navigate to quick-dashboard
    await page.goto('/quick-dashboard')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Find and click the "+ Add New Lead" quick action button
    const addLeadButton = page.locator('button:has-text("+ Add New Lead")')
    await expect(addLeadButton).toBeVisible()
    await addLeadButton.click()

    // Expect the modal to appear (not a navigation to /leads/new)
    const modal = page.locator('[data-testid="add-lead-modal"], .modal, [role="dialog"]').first()
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Verify the create lead form fields are visible
    await expect(page.locator('input[type="text"][placeholder*="name"], input[placeholder*="Name"], label:has-text("Name") + input')).toBeVisible()
    await expect(page.locator('input[type="email"], input[placeholder*="email"], label:has-text("Email") + input')).toBeVisible()
    await expect(page.locator('input[type="tel"], input[placeholder*="phone"], label:has-text("Phone") + input')).toBeVisible()

    // Verify modal has the expected title
    await expect(page.locator('h2:has-text("Add New Lead"), h1:has-text("Add New Lead"), .modal-title:has-text("Add New Lead")')).toBeVisible()
  })

  test('Real Dashboard - Add New Lead opens modal with form fields', async ({ page }) => {
    // Navigate to real-dashboard
    await page.goto('/real-dashboard')

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Find and click the "+" quick action button (with title="Add new lead")
    const addLeadButton = page.locator('button[title="Add new lead"]')
    await expect(addLeadButton).toBeVisible()
    await addLeadButton.click()

    // Expect the modal to appear (not a navigation to /leads/new)
    const modal = page.locator('[data-testid="add-lead-modal"], .modal, [role="dialog"]').first()
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Verify the create lead form fields are visible
    await expect(page.locator('input[type="text"][placeholder*="name"], input[placeholder*="Name"], label:has-text("Name") + input')).toBeVisible()
    await expect(page.locator('input[type="email"], input[placeholder*="email"], label:has-text("Email") + input')).toBeVisible()
    await expect(page.locator('input[type="tel"], input[placeholder*="phone"], label:has-text("Phone") + input')).toBeVisible()
  })

  test('Dashboard Overview - Add New Lead opens modal with form fields', async ({ page }) => {
    // Navigate to dashboard overview
    await page.goto('/dashboard/overview')

    // Wait for page to load and potentially for auth/data loading
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2000) // Give extra time for any dynamic loading

    // Find and click the "+" quick action button (with title="Add new lead")
    const addLeadButton = page.locator('button[title="Add new lead"]')
    await expect(addLeadButton).toBeVisible()
    await addLeadButton.click()

    // Expect the modal to appear (not a navigation to /leads/new)
    const modal = page.locator('[data-testid="add-lead-modal"], .modal, [role="dialog"]').first()
    await expect(modal).toBeVisible({ timeout: 5000 })

    // Verify the create lead form fields are visible
    await expect(page.locator('input[type="text"][placeholder*="name"], input[placeholder*="Name"], label:has-text("Name") + input')).toBeVisible()
    await expect(page.locator('input[type="email"], input[placeholder*="email"], label:has-text("Email") + input')).toBeVisible()
    await expect(page.locator('input[type="tel"], input[placeholder*="phone"], label:has-text("Phone") + input')).toBeVisible()
  })

  test('Modal can be closed without submitting', async ({ page }) => {
    // Test on quick-dashboard for simplicity
    await page.goto('/quick-dashboard')
    await page.waitForLoadState('networkidle')

    // Open modal
    const addLeadButton = page.locator('button:has-text("+ Add New Lead")')
    await addLeadButton.click()

    // Verify modal is open
    const modal = page.locator('[data-testid="add-lead-modal"], .modal, [role="dialog"]').first()
    await expect(modal).toBeVisible()

    // Close modal using close button
    const closeButton = page.locator('button:has-text("Cancel"), button:has-text("Close"), button[aria-label="Close"], .modal-close').first()
    await closeButton.click()

    // Verify modal is closed
    await expect(modal).not.toBeVisible()
  })

  test('Form can be filled out and submitted', async ({ page }) => {
    // Test the complete form submission flow
    await page.goto('/quick-dashboard')
    await page.waitForLoadState('networkidle')

    // Open modal
    const addLeadButton = page.locator('button:has-text("+ Add New Lead")')
    await addLeadButton.click()

    // Wait for modal
    const modal = page.locator('[data-testid="add-lead-modal"], .modal, [role="dialog"]').first()
    await expect(modal).toBeVisible()

    // Fill out form fields
    await page.fill('input[type="text"][placeholder*="name"], input[placeholder*="Name"], label:has-text("Name") + input', 'Test User')
    await page.fill('input[type="email"], input[placeholder*="email"], label:has-text("Email") + input', 'test@example.com')
    await page.fill('input[type="tel"], input[placeholder*="phone"], label:has-text("Phone") + input', '+1234567890')

    // Submit form
    const submitButton = page.locator('button:has-text("Add Lead"), button:has-text("Save"), button:has-text("Submit"), button[type="submit"]').first()
    await submitButton.click()

    // Modal should close after successful submission (or show success message)
    // Note: This might need adjustment based on actual API behavior
    await expect(modal).not.toBeVisible({ timeout: 10000 })
  })

  test('Regression test - should never navigate to /leads/new', async ({ page }) => {
    // Monitor navigation to ensure we never go to /leads/new
    let navigatedToLeadsNew = false
    
    page.on('framenavigated', (frame) => {
      if (frame.url().includes('/leads/new')) {
        navigatedToLeadsNew = true
      }
    })

    // Test all dashboard pages
    const dashboardUrls = [
      '/dashboard-direct',
      '/quick-dashboard',
      '/real-dashboard',
      '/dashboard/overview'
    ]

    for (const url of dashboardUrls) {
      await page.goto(url)
      await page.waitForLoadState('networkidle')

      // Find and click add lead button (different selectors for different pages)
      let addLeadButton
      if (url.includes('dashboard-direct')) {
        addLeadButton = page.locator('button:has-text("Add New Lead")')
      } else if (url.includes('quick-dashboard')) {
        addLeadButton = page.locator('button:has-text("+ Add New Lead")')
      } else {
        addLeadButton = page.locator('button[title="Add new lead"]')
      }

      if (await addLeadButton.isVisible()) {
        await addLeadButton.click()
        
        // Wait a moment for any potential navigation
        await page.waitForTimeout(1000)
        
        // Verify we didn't navigate to /leads/new
        expect(navigatedToLeadsNew).toBe(false)
        expect(page.url()).not.toContain('/leads/new')
        
        // Verify modal opened instead
        const modal = page.locator('[data-testid="add-lead-modal"], .modal, [role="dialog"]').first()
        await expect(modal).toBeVisible({ timeout: 3000 })
      }
    }
  })
})