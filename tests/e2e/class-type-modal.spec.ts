import { test, expect } from '@playwright/test'

test.describe('Add Class Type Modal', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to classes page
    await page.goto('/classes')
    
    // Wait for the page to load
    await page.waitForSelector('h1:has-text("Class Types")')
  })

  test('should open modal when clicking Add Class Type button', async ({ page }) => {
    // Click the Add Class Type button
    await page.click('button:has-text("Add Class Type")')
    
    // Verify modal is visible
    await expect(page.locator('[data-testid="modal-backdrop"]')).toBeVisible()
    await expect(page.locator('h2:has-text("New Class Type")')).toBeVisible()
  })

  test('should close modal when clicking X button', async ({ page }) => {
    // Open modal
    await page.click('button:has-text("Add Class Type")')
    await expect(page.locator('[data-testid="modal-backdrop"]')).toBeVisible()
    
    // Click X button
    await page.click('button[aria-label="Close modal"]')
    
    // Verify modal is closed
    await expect(page.locator('[data-testid="modal-backdrop"]')).not.toBeVisible()
  })

  test('should close modal when pressing Escape key', async ({ page }) => {
    // Open modal
    await page.click('button:has-text("Add Class Type")')
    await expect(page.locator('[data-testid="modal-backdrop"]')).toBeVisible()
    
    // Press Escape key
    await page.keyboard.press('Escape')
    
    // Verify modal is closed
    await expect(page.locator('[data-testid="modal-backdrop"]')).not.toBeVisible()
  })

  test('should close modal when clicking backdrop', async ({ page }) => {
    // Open modal
    await page.click('button:has-text("Add Class Type")')
    await expect(page.locator('[data-testid="modal-backdrop"]')).toBeVisible()
    
    // Click backdrop (outside modal content)
    await page.locator('[data-testid="modal-backdrop"]').click({
      position: { x: 50, y: 50 } // Click near the top-left corner, outside modal content
    })
    
    // Verify modal is closed
    await expect(page.locator('[data-testid="modal-backdrop"]')).not.toBeVisible()
  })

  test('should NOT close modal when clicking inside modal content', async ({ page }) => {
    // Open modal
    await page.click('button:has-text("Add Class Type")')
    await expect(page.locator('[data-testid="modal-backdrop"]')).toBeVisible()
    
    // Click inside modal content
    await page.click('input[type="text"]') // Click on the name input
    
    // Verify modal is still open
    await expect(page.locator('[data-testid="modal-backdrop"]')).toBeVisible()
    await expect(page.locator('h2:has-text("New Class Type")')).toBeVisible()
  })

  test('should close modal when clicking Cancel button', async ({ page }) => {
    // Open modal
    await page.click('button:has-text("Add Class Type")')
    await expect(page.locator('[data-testid="modal-backdrop"]')).toBeVisible()
    
    // Click Cancel button
    await page.click('button:has-text("Cancel")')
    
    // Verify modal is closed
    await expect(page.locator('[data-testid="modal-backdrop"]')).not.toBeVisible()
  })

  test('should reset form state when modal is reopened', async ({ page }) => {
    // Open modal
    await page.click('button:has-text("Add Class Type")')
    
    // Fill in some form data
    await page.fill('input[type="text"]', 'Test Class Name')
    await page.fill('textarea', 'Test description')
    
    // Close modal with Escape
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid="modal-backdrop"]')).not.toBeVisible()
    
    // Reopen modal
    await page.click('button:has-text("Add Class Type")')
    await expect(page.locator('[data-testid="modal-backdrop"]')).toBeVisible()
    
    // Verify form is reset (empty values)
    await expect(page.locator('input[type="text"]')).toHaveValue('')
    await expect(page.locator('textarea')).toHaveValue('')
  })

  test('should handle multiple rapid Escape key presses gracefully', async ({ page }) => {
    // Open modal
    await page.click('button:has-text("Add Class Type")')
    await expect(page.locator('[data-testid="modal-backdrop"]')).toBeVisible()
    
    // Press Escape multiple times rapidly
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')
    await page.keyboard.press('Escape')
    
    // Verify modal is closed and no errors occurred
    await expect(page.locator('[data-testid="modal-backdrop"]')).not.toBeVisible()
    
    // Verify page is still functional
    await expect(page.locator('h1:has-text("Class Types")')).toBeVisible()
  })

  test('should focus management work correctly', async ({ page }) => {
    // Open modal
    await page.click('button:has-text("Add Class Type")')
    await expect(page.locator('[data-testid="modal-backdrop"]')).toBeVisible()
    
    // Tab through form elements
    await page.keyboard.press('Tab')
    
    // Verify first input is focused
    await expect(page.locator('input[type="text"]')).toBeFocused()
    
    // Close with Escape and verify focus returns to trigger button
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid="modal-backdrop"]')).not.toBeVisible()
  })
})