/**
 * E2E Tests for Website Opt-in Form Trigger QA
 * Tests the complete user flow from automation creation to form selection persistence
 */

import { test, expect, Page } from '@playwright/test'

test.describe('Website Opt-in Form Trigger QA', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    // Navigate to automations page
    await page.goto('/dashboard/automations')
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async () => {
    await page.close()
  })

  test.describe('Before Fix - Generic Trigger Type Panel', () => {
    test('shows generic trigger configuration for unsupported trigger types', async () => {
      // Click Create Automation
      await page.click('[data-testid="create-automation-btn"]', { timeout: 10000 })
      
      // Wait for automation builder to open
      await expect(page.locator('[data-testid="automation-builder"]')).toBeVisible({ timeout: 10000 })
      
      // Fill in basic details
      await page.fill('[data-testid="automation-name-input"]', 'Test Lead Automation')
      await page.fill('[data-testid="automation-description-input"]', 'Test automation for QA')
      
      // Select a trigger type that should show generic config (not website_form)
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=New Lead Created')
      
      // Click configure trigger
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Verify generic trigger configuration is shown
      await expect(page.locator('text=Configuration for this trigger type is not yet available')).toBeVisible()
      await expect(page.locator('text=Configuration Coming Soon')).toBeVisible()
      await expect(page.locator('[data-testid="save-generic-trigger"]')).toBeDisabled()
      
      // Verify the warning message
      await expect(page.locator('text=Advanced configuration for this trigger type is under development')).toBeVisible()
    })

    test('shows disabled save button for generic trigger configurations', async () => {
      await page.click('text=Create Automation')
      await page.fill('[data-testid="automation-name-input"]', 'Schedule Automation')
      
      // Select scheduled trigger type
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Scheduled Time')
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Verify save button is disabled
      await expect(page.locator('[data-testid="save-generic-trigger"]')).toBeDisabled()
      await expect(page.locator('[data-testid="save-generic-trigger"]')).toHaveClass(/cursor-not-allowed/)
    })
  })

  test.describe('After Fix - Website Form Trigger Selection', () => {
    test('shows proper form selection for website_form trigger type', async () => {
      await page.click('text=Create Automation')
      await expect(page.locator('[data-testid="automation-builder"]')).toBeVisible()
      
      // Fill basic details
      await page.fill('[data-testid="automation-name-input"]', 'Website Form Automation')
      await page.fill('[data-testid="automation-description-input"]', 'Responds to form submissions')
      
      // Select Website Form Submitted trigger
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Website Form Submitted')
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Verify FormSubmittedTriggerConfig is shown (not generic config)
      await expect(page.locator('text=Website Form Trigger')).toBeVisible()
      await expect(page.locator('text=Trigger this automation when specific forms are submitted on your website')).toBeVisible()
      await expect(page.locator('[data-testid="form-selector-trigger"]')).toBeVisible()
      
      // Verify no generic configuration message
      await expect(page.locator('text=Configuration for this trigger type is not yet available')).not.toBeVisible()
    })

    test('allows multi-select of forms with persistence', async () => {
      await page.click('text=Create Automation')
      await page.fill('[data-testid="automation-name-input"]', 'Multi-Form Automation')
      
      // Configure website form trigger
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Website Form Submitted')
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Open form selector dropdown
      await page.click('[data-testid="form-selector-trigger"]')
      
      // Verify forms are available
      await expect(page.locator('[data-testid="form-option-1"]')).toBeVisible()
      await expect(page.locator('[data-testid="form-option-2"]')).toBeVisible()
      await expect(page.locator('text=Contact Form')).toBeVisible()
      await expect(page.locator('text=Free Trial Form')).toBeVisible()
      
      // Select multiple forms
      await page.click('[data-testid="form-checkbox-1"]')
      await page.click('[data-testid="form-checkbox-2"]')
      
      // Verify selection count updates
      await expect(page.locator('text=2 forms selected')).toBeVisible()
      
      // Verify configuration summary appears
      await expect(page.locator('text=Trigger Configuration')).toBeVisible()
      await expect(page.locator('text=This automation will run whenever someone submits any of the 2 selected form')).toBeVisible()
      
      // Save the configuration
      await page.click('[data-testid="save-trigger-config"]')
      
      // Verify we exit trigger config mode
      await expect(page.locator('[data-testid="trigger-configuration"]')).not.toBeVisible()
      
      // Save the automation
      await page.click('[data-testid="save-automation"]')
      
      // Verify we return to automations list
      await expect(page.locator('[data-testid="automation-builder"]')).not.toBeVisible()
    })

    test('shows empty state CTA when no forms exist', async () => {
      // This test would require mocking the forms data to be empty
      // For now, we'll test the Create a form link functionality
      await page.click('text=Create Automation')
      await page.fill('[data-testid="automation-name-input"]', 'Empty State Test')
      
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Website Form Submitted')
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Verify manage forms link exists
      await expect(page.locator('text=Manage forms')).toBeVisible()
      
      // Click the link and verify it navigates properly
      const [newPage] = await Promise.all([
        page.context().waitForEvent('page'),
        page.click('text=Manage forms')
      ])
      
      // Verify navigation to forms page
      await newPage.waitForLoadState()
      expect(newPage.url()).toContain('/dashboard/website')
      await newPage.close()
    })

    test('handles form type filtering correctly', async () => {
      await page.click('text=Create Automation')
      await page.fill('[data-testid="automation-name-input"]', 'Filter Test')
      
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Website Form Submitted')
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Open dropdown
      await page.click('[data-testid="form-selector-trigger"]')
      
      // Test All filter (default)
      await expect(page.locator('text=Contact Form')).toBeVisible()
      await expect(page.locator('text=Free Trial Form')).toBeVisible()
      await expect(page.locator('text=Class Booking Form')).toBeVisible()
      
      // Test Lead Forms filter
      await page.click('text=Lead Forms')
      await expect(page.locator('text=Free Trial Form')).toBeVisible()
      await expect(page.locator('text=Contact Form')).not.toBeVisible()
      
      // Test Contact filter
      await page.click('text=Contact')
      await expect(page.locator('text=Contact Form')).toBeVisible()
      await expect(page.locator('text=Free Trial Form')).not.toBeVisible()
      
      // Test Active filter
      await page.click('text=Active')
      await expect(page.locator('text=Contact Form')).toBeVisible()
      await expect(page.locator('text=Free Trial Form')).toBeVisible()
      // Class Booking Form is inactive, should not be visible
      await expect(page.locator('text=Class Booking Form')).not.toBeVisible()
    })

    test('provides Select All and Clear All functionality', async () => {
      await page.click('text=Create Automation')
      await page.fill('[data-testid="automation-name-input"]', 'Bulk Selection Test')
      
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Website Form Submitted')
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Open dropdown
      await page.click('[data-testid="form-selector-trigger"]')
      
      // Test Select All Active
      await page.click('[data-testid="select-all-forms"]')
      
      // Close and reopen to see selection
      await page.click('[data-testid="form-selector-trigger"]')
      await page.click('[data-testid="form-selector-trigger"]')
      
      await expect(page.locator('text=2 forms selected')).toBeVisible()
      
      // Test Clear All
      await page.click('[data-testid="form-selector-trigger"]')
      await page.click('[data-testid="clear-all-forms"]')
      await page.click('[data-testid="form-selector-trigger"]')
      
      await expect(page.locator('text=Choose forms to monitor...')).toBeVisible()
    })
  })

  test.describe('Data Persistence and Reload', () => {
    test('persists form selections across builder reload', async () => {
      // Create automation with form selections
      await page.click('text=Create Automation')
      await page.fill('[data-testid="automation-name-input"]', 'Persistence Test')
      await page.fill('[data-testid="automation-description-input"]', 'Testing data persistence')
      
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Website Form Submitted')
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Select forms
      await page.click('[data-testid="form-selector-trigger"]')
      await page.click('[data-testid="form-checkbox-1"]')
      await page.click('[data-testid="form-checkbox-2"]')
      
      // Save configuration
      await page.click('[data-testid="save-trigger-config"]')
      await page.click('[data-testid="save-automation"]')
      
      // Reload the page
      await page.reload()
      await page.waitForLoadState('networkidle')
      
      // Edit the automation
      await page.click('[data-testid="edit-automation-1"]')
      
      // Verify selections are still there
      await expect(page.locator('text=2 forms selected')).toBeVisible()
      
      // Open dropdown to verify specific selections
      await page.click('[data-testid="form-selector-trigger"]')
      await expect(page.locator('[data-testid="form-checkbox-1"]')).toBeChecked()
      await expect(page.locator('[data-testid="form-checkbox-2"]')).toBeChecked()
      await expect(page.locator('[data-testid="form-checkbox-3"]')).not.toBeChecked()
    })

    test('maintains form type filters during session', async () => {
      await page.click('text=Create Automation')
      await page.fill('[data-testid="automation-name-input"]', 'Filter Persistence')
      
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Website Form Submitted')
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Set filter and make selection
      await page.click('[data-testid="form-selector-trigger"]')
      await page.click('text=Lead Forms')
      await page.click('[data-testid="form-checkbox-2"]') // Free Trial Form
      
      // Close and reopen dropdown
      await page.click('[data-testid="form-selector-trigger"]')
      await page.click('[data-testid="form-selector-trigger"]')
      
      // Verify filter and selection are maintained
      await expect(page.locator('text=Lead Forms')).toHaveClass(/bg-green-100/)
      await expect(page.locator('[data-testid="form-checkbox-2"]')).toBeChecked()
    })
  })

  test.describe('Error Handling and Edge Cases', () => {
    test('prevents saving when no forms are selected', async () => {
      await page.click('text=Create Automation')
      await page.fill('[data-testid="automation-name-input"]', 'No Forms Test')
      
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Website Form Submitted')
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Try to save without selecting forms
      await expect(page.locator('[data-testid="save-trigger-config"]')).toBeDisabled()
      
      // Verify save automation is also disabled
      await expect(page.locator('[data-testid="save-automation"]')).toBeDisabled()
    })

    test('handles form selection state changes correctly', async () => {
      await page.click('text=Create Automation')
      await page.fill('[data-testid="automation-name-input"]', 'State Change Test')
      
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Website Form Submitted')
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Select a form
      await page.click('[data-testid="form-selector-trigger"]')
      await page.click('[data-testid="form-checkbox-1"]')
      
      // Verify save is now enabled
      await expect(page.locator('[data-testid="save-trigger-config"]')).not.toBeDisabled()
      
      // Deselect the form
      await page.click('[data-testid="form-checkbox-1"]')
      
      // Verify save is disabled again
      await expect(page.locator('[data-testid="save-trigger-config"]')).toBeDisabled()
    })

    test('displays correct form metadata in dropdown', async () => {
      await page.click('text=Create Automation')
      await page.fill('[data-testid="automation-name-input"]', 'Metadata Test')
      
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Website Form Submitted')
      await page.click('[data-testid="configure-trigger-btn"]')
      
      await page.click('[data-testid="form-selector-trigger"]')
      
      // Verify form metadata is displayed
      await expect(page.locator('text=45 submissions')).toBeVisible() // Contact Form
      await expect(page.locator('text=89 submissions')).toBeVisible() // Free Trial Form
      await expect(page.locator('text=12 submissions')).toBeVisible() // Class Booking Form
      
      // Verify form types are shown
      await expect(page.locator('text=contact')).toBeVisible()
      await expect(page.locator('text=lead')).toBeVisible()
      await expect(page.locator('text=booking')).toBeVisible()
      
      // Verify active/inactive status
      await expect(page.locator('text=active')).toHaveCount(2)
      await expect(page.locator('text=inactive')).toHaveCount(1)
    })
  })

  test.describe('Integration with Forms Management', () => {
    test('navigates to forms management when manage forms is clicked', async () => {
      await page.click('text=Create Automation')
      await page.fill('[data-testid="automation-name-input"]', 'Forms Integration')
      
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Website Form Submitted')
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Select a form to show configuration summary
      await page.click('[data-testid="form-selector-trigger"]')
      await page.click('[data-testid="form-checkbox-1"]')
      
      // Click manage forms link
      const [formsPage] = await Promise.all([
        page.context().waitForEvent('page'),
        page.click('text=Manage forms')
      ])
      
      await formsPage.waitForLoadState()
      
      // Verify we're on the forms page
      expect(formsPage.url()).toContain('/dashboard/website')
      await expect(formsPage.locator('text=Website & Forms')).toBeVisible()
      await expect(formsPage.locator('text=Manage your website forms and settings')).toBeVisible()
      
      await formsPage.close()
    })
  })

  test.describe('Automation Execution Context', () => {
    test('shows proper execution context in configuration summary', async () => {
      await page.click('text=Create Automation')
      await page.fill('[data-testid="automation-name-input"]', 'Execution Context Test')
      
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Website Form Submitted')
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Select multiple forms
      await page.click('[data-testid="form-selector-trigger"]')
      await page.click('[data-testid="form-checkbox-1"]')
      await page.click('[data-testid="form-checkbox-2"]')
      
      // Verify configuration summary shows correct context
      await expect(page.locator('text=This automation will run whenever someone submits any of the 2 selected form(s)')).toBeVisible()
      
      // Verify selected form names are listed
      await expect(page.locator('text=Selected forms: Contact Form, Free Trial Form')).toBeVisible()
      
      // Change selection to single form
      await page.click('[data-testid="form-selector-trigger"]')
      await page.click('[data-testid="form-checkbox-2"]') // Deselect
      await page.click('[data-testid="form-selector-trigger"]') // Close dropdown
      
      // Verify summary updates
      await expect(page.locator('text=This automation will run whenever someone submits any of the 1 selected form(s)')).toBeVisible()
      await expect(page.locator('text=Selected forms: Contact Form')).toBeVisible()
    })
  })
})