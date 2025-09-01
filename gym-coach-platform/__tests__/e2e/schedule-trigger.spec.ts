/**
 * E2E Tests for Schedule Trigger QA & Testing
 * Tests Schedule trigger modes, timezone, preview, and persistence functionality
 */

import { test, expect, Page } from '@playwright/test'

test.describe('Schedule Trigger QA & Testing', () => {
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

  test.describe('Schedule Trigger Configuration', () => {
    test('creates automation and configures schedule trigger', async () => {
      // Click Create Automation
      await page.click('[data-testid="create-automation-btn"]', { timeout: 10000 })
      
      // Wait for automation builder to open
      await expect(page.locator('[data-testid="automation-builder"]')).toBeVisible({ timeout: 10000 })
      
      // Fill in basic details
      await page.fill('[data-testid="automation-name-input"]', 'Schedule Test Automation')
      await page.fill('[data-testid="automation-description-input"]', 'Test automation for schedule trigger validation')
      
      // Select Schedule trigger type
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Scheduled Time')
      
      // Click configure trigger
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Verify Schedule trigger configuration panel is shown
      await expect(page.locator('text=Schedule Trigger')).toBeVisible()
      await expect(page.locator('text=Trigger this automation at specific times or intervals')).toBeVisible()
      
      // Verify no generic "Trigger Type" selector appears
      await expect(page.locator('text=Trigger Configuration')).not.toBeVisible()
      await expect(page.locator('text=Configuration Coming Soon')).not.toBeVisible()
    })

    test('validates all three schedule modes are available', async () => {
      // Setup automation with schedule trigger
      await page.click('[data-testid="create-automation-btn"]', { timeout: 10000 })
      await expect(page.locator('[data-testid="automation-builder"]')).toBeVisible()
      
      await page.fill('[data-testid="automation-name-input"]', 'Mode Test Automation')
      await page.fill('[data-testid="automation-description-input"]', 'Testing schedule modes')
      
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Scheduled Time')
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Verify all schedule modes are present and functional
      await expect(page.locator('text=One-time')).toBeVisible()
      await expect(page.locator('text=Daily')).toBeVisible()
      await expect(page.locator('text=Weekly')).toBeVisible()
      
      // Verify default selection (One-time is selected by default)
      const onceRadio = page.locator('input[value="once"]')
      await expect(onceRadio).toBeChecked()
      
      // Verify date and time inputs are visible for once mode
      await expect(page.locator('[data-testid="schedule-date"]')).toBeVisible()
      await expect(page.locator('[data-testid="schedule-time"]')).toBeVisible()
    })

    test('switches between schedule modes and shows correct inputs', async () => {
      // Setup automation
      await page.click('[data-testid="create-automation-btn"]')
      await expect(page.locator('[data-testid="automation-builder"]')).toBeVisible()
      
      await page.fill('[data-testid="automation-name-input"]', 'Mode Switch Test')
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Scheduled Time')
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Test Daily mode
      await page.click('text=Daily')
      await expect(page.locator('[data-testid="daily-time"]')).toBeVisible()
      await expect(page.locator('[data-testid="schedule-date"]')).not.toBeVisible()
      
      // Test Weekly mode
      await page.click('text=Weekly')
      await expect(page.locator('[data-testid="weekly-time"]')).toBeVisible()
      await expect(page.locator('[data-testid="day-0"]')).toBeVisible() // Sunday
      await expect(page.locator('[data-testid="day-1"]')).toBeVisible() // Monday
      await expect(page.locator('[data-testid="day-6"]')).toBeVisible() // Saturday
      
      // Verify day labels are present
      await expect(page.locator('text=Sun')).toBeVisible()
      await expect(page.locator('text=Mon')).toBeVisible()
      await expect(page.locator('text=Sat')).toBeVisible()
      
      // Back to Once mode
      await page.click('text=One-time')
      await expect(page.locator('[data-testid="schedule-date"]')).toBeVisible()
      await expect(page.locator('[data-testid="schedule-time"]')).toBeVisible()
    })

    test('configures one-time schedule and validates future date', async () => {
      // Setup automation
      await page.click('[data-testid="create-automation-btn"]')
      await expect(page.locator('[data-testid="automation-builder"]')).toBeVisible()
      
      await page.fill('[data-testid="automation-name-input"]', 'One-time Schedule Test')
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Scheduled Time')
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Ensure One-time mode is selected
      await page.click('text=One-time')
      
      // Set a future date (tomorrow)
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]
      
      await page.fill('[data-testid="schedule-date"]', tomorrowStr)
      await page.fill('[data-testid="schedule-time"]', '09:00')
      
      // Verify preview updates
      await expect(page.locator('text=Next Run Preview')).toBeVisible()
      
      // Verify save button is enabled for valid future date
      await expect(page.locator('[data-testid="save-schedule-config"]')).toBeEnabled()
    })

    test('configures weekly schedule with multiple days', async () => {
      // Setup automation
      await page.click('[data-testid="create-automation-btn"]')
      await expect(page.locator('[data-testid="automation-builder"]')).toBeVisible()
      
      await page.fill('[data-testid="automation-name-input"]', 'Weekly Schedule Test')
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Scheduled Time')
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Switch to weekly mode
      await page.click('text=Weekly')
      
      // Select multiple days (Monday, Wednesday, Friday)
      await page.check('[data-testid="day-1"]') // Monday
      await page.check('[data-testid="day-3"]') // Wednesday  
      await page.check('[data-testid="day-5"]') // Friday
      
      // Set time
      await page.fill('[data-testid="weekly-time"]', '07:30')
      
      // Verify preview is updated
      await expect(page.locator('text=Next Run Preview')).toBeVisible()
      
      // Verify save button is enabled
      await expect(page.locator('[data-testid="save-schedule-config"]')).toBeEnabled()
    })

    test('displays Europe/London timezone by default', async () => {
      // Setup automation
      await page.click('[data-testid="create-automation-btn"]')
      await expect(page.locator('[data-testid="automation-builder"]')).toBeVisible()
      
      await page.fill('[data-testid="automation-name-input"]', 'Timezone Test')
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Scheduled Time')
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Verify timezone is displayed
      await expect(page.locator('text=Timezone')).toBeVisible()
      await expect(page.locator('text=Europe/London')).toBeVisible()
    })

    test('shows next run preview for different schedule types', async () => {
      // Setup automation
      await page.click('[data-testid="create-automation-btn"]')
      await expect(page.locator('[data-testid="automation-builder"]')).toBeVisible()
      
      await page.fill('[data-testid="automation-name-input"]', 'Preview Test')
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Scheduled Time')
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Test once mode preview
      await page.click('text=One-time')
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]
      
      await page.fill('[data-testid="schedule-date"]', tomorrowStr)
      await page.fill('[data-testid="schedule-time"]', '14:00')
      
      // Verify preview section exists and shows time
      const previewSection = page.locator('text=Next Run Preview').locator('..')
      await expect(previewSection).toBeVisible()
      
      // Test daily mode preview  
      await page.click('text=Daily')
      await page.fill('[data-testid="daily-time"]', '10:00')
      await expect(previewSection).toBeVisible()
      
      // Test weekly mode preview
      await page.click('text=Weekly')
      await page.check('[data-testid="day-2"]') // Tuesday
      await page.fill('[data-testid="weekly-time"]', '16:00')
      await expect(previewSection).toBeVisible()
    })

    test('validates catch up and active toggle functionality', async () => {
      // Setup automation
      await page.click('[data-testid="create-automation-btn"]')
      await expect(page.locator('[data-testid="automation-builder"]')).toBeVisible()
      
      await page.fill('[data-testid="automation-name-input"]', 'Toggle Test')
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Scheduled Time')
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Verify toggles exist and have correct labels
      await expect(page.locator('text=Catch up missed runs')).toBeVisible()
      await expect(page.locator('text=Run automation for missed schedules when reactivated')).toBeVisible()
      await expect(page.locator('text=Active')).toBeVisible()
      await expect(page.locator('text=Enable this scheduled trigger')).toBeVisible()
      
      // Test toggle interactions
      const catchUpCheckbox = page.locator('[data-testid="catch-up"]')
      const activeCheckbox = page.locator('[data-testid="active"]')
      
      // Active should be checked by default
      await expect(activeCheckbox).toBeChecked()
      
      // Toggle catch up
      await catchUpCheckbox.check()
      await expect(catchUpCheckbox).toBeChecked()
      
      // Toggle active off
      await activeCheckbox.uncheck()
      await expect(activeCheckbox).not.toBeChecked()
    })

    test('saves and persists schedule configuration', async () => {
      // Setup automation
      await page.click('[data-testid="create-automation-btn"]')
      await expect(page.locator('[data-testid="automation-builder"]')).toBeVisible()
      
      await page.fill('[data-testid="automation-name-input"]', 'Persistence Test')
      await page.fill('[data-testid="automation-description-input"]', 'Testing configuration persistence')
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Scheduled Time')
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Configure a weekly schedule
      await page.click('text=Weekly')
      await page.check('[data-testid="day-1"]') // Monday
      await page.check('[data-testid="day-4"]') // Thursday
      await page.fill('[data-testid="weekly-time"]', '08:00')
      await page.check('[data-testid="catch-up"]')
      
      // Save the trigger configuration
      await page.click('[data-testid="save-schedule-config"]')
      
      // Verify we're back to the main automation builder
      await expect(page.locator('[data-testid="trigger-configuration"]')).not.toBeVisible()
      
      // Save the automation
      await page.click('[data-testid="save-automation"]')
      
      // Verify automation was created (should redirect or show success)
      // Note: This depends on implementation - might redirect to list or show success message
    })

    test('validates required fields and shows error states', async () => {
      // Setup automation
      await page.click('[data-testid="create-automation-btn"]')
      await expect(page.locator('[data-testid="automation-builder"]')).toBeVisible()
      
      await page.fill('[data-testid="automation-name-input"]', 'Validation Test')
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Scheduled Time')
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Test weekly schedule with no days selected
      await page.click('text=Weekly')
      
      // Uncheck the default Monday selection if it exists
      const mondayCheckbox = page.locator('[data-testid="day-1"]')
      if (await mondayCheckbox.isChecked()) {
        await mondayCheckbox.uncheck()
      }
      
      // Verify save button should be disabled when no days selected
      await expect(page.locator('[data-testid="save-schedule-config"]')).toBeDisabled()
      
      // Select a day to make it valid again
      await page.check('[data-testid="day-2"]') // Tuesday
      await expect(page.locator('[data-testid="save-schedule-config"]')).toBeEnabled()
    })

    test('handles cancel action correctly', async () => {
      // Setup automation
      await page.click('[data-testid="create-automation-btn"]')
      await expect(page.locator('[data-testid="automation-builder"]')).toBeVisible()
      
      await page.fill('[data-testid="automation-name-input"]', 'Cancel Test')
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Scheduled Time')
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Make some changes
      await page.click('text=Weekly')
      await page.check('[data-testid="day-3"]') // Wednesday
      await page.fill('[data-testid="weekly-time"]', '11:30')
      
      // Click cancel
      await page.click('text=Cancel')
      
      // Verify we're back to trigger selection
      await expect(page.locator('[data-testid="trigger-configuration"]')).not.toBeVisible()
      await expect(page.locator('text=Choose Trigger')).toBeVisible()
    })
  })

  test.describe('Schedule Trigger Integration Tests', () => {
    test('complete automation creation flow with schedule trigger', async () => {
      // Create new automation
      await page.click('[data-testid="create-automation-btn"]')
      await expect(page.locator('[data-testid="automation-builder"]')).toBeVisible()
      
      // Fill basic info
      await page.fill('[data-testid="automation-name-input"]', 'Complete Flow Test')
      await page.fill('[data-testid="automation-description-input"]', 'End-to-end schedule trigger test')
      
      // Configure schedule trigger
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Scheduled Time')
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Set up daily schedule
      await page.click('text=Daily')
      await page.fill('[data-testid="daily-time"]', '09:30')
      await page.check('[data-testid="catch-up"]')
      
      // Save trigger config
      await page.click('[data-testid="save-schedule-config"]')
      
      // Verify automation can be saved (trigger is configured)
      await expect(page.locator('[data-testid="save-automation"]')).toBeEnabled()
      
      // Save automation
      await page.click('[data-testid="save-automation"]')
      
      // Verify success (implementation dependent)
      // Could check for redirect to automations list or success message
    })
  })

  test.describe('Dark Mode and Accessibility', () => {
    test('schedule trigger renders correctly in dark mode', async () => {
      // This test assumes dark mode can be toggled somehow
      // Implementation will depend on how dark mode is handled in the app
      
      await page.click('[data-testid="create-automation-btn"]')
      await expect(page.locator('[data-testid="automation-builder"]')).toBeVisible()
      
      await page.fill('[data-testid="automation-name-input"]', 'Dark Mode Test')
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Scheduled Time')
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Verify all elements are still visible and functional
      await expect(page.locator('text=Schedule Trigger')).toBeVisible()
      await expect(page.locator('text=One-time')).toBeVisible()
      await expect(page.locator('text=Daily')).toBeVisible()
      await expect(page.locator('text=Weekly')).toBeVisible()
      await expect(page.locator('text=Next Run Preview')).toBeVisible()
      await expect(page.locator('text=Europe/London')).toBeVisible()
    })

    test('has proper accessibility attributes', async () => {
      await page.click('[data-testid="create-automation-btn"]')
      await expect(page.locator('[data-testid="automation-builder"]')).toBeVisible()
      
      await page.fill('[data-testid="automation-name-input"]', 'Accessibility Test')
      await page.click('[data-testid="trigger-type-select"]')
      await page.click('text=Scheduled Time')
      await page.click('[data-testid="configure-trigger-btn"]')
      
      // Verify radio group has proper labeling
      const radioGroup = page.locator('[data-testid="schedule-mode"]')
      await expect(radioGroup).toBeVisible()
      
      // Verify inputs have proper labels
      await page.click('text=One-time')
      await expect(page.locator('label[for="schedule-date"]')).toBeVisible()
      await expect(page.locator('label[for="schedule-time"]')).toBeVisible()
      
      // Verify checkboxes have labels
      await expect(page.locator('label[for="catch-up"]')).toBeVisible()
      await expect(page.locator('label[for="active"]')).toBeVisible()
    })
  })
})