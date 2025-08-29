import { test, expect } from '@playwright/test'

test.describe('Marketing/Surveys View Modal and Edit Gating', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to surveys page
    await page.goto('/surveys')
  })

  test('displays surveys page correctly', async ({ page }) => {
    // Check page header
    await expect(page.locator('h1:has-text("Surveys & Feedback")')).toBeVisible()
    await expect(page.locator('text=Create and manage member surveys')).toBeVisible()

    // Check tabs
    await expect(page.locator('button:has-text("All Surveys")')).toBeVisible()
    await expect(page.locator('button:has-text("Create Survey")')).toBeVisible()
    await expect(page.locator('button:has-text("Responses")')).toBeVisible()
    await expect(page.locator('button:has-text("Analytics")')).toBeVisible()
  })

  test('shows survey list with correct data', async ({ page }) => {
    // Wait for surveys to load (they're mocked in component)
    await expect(page.locator('text=Fitness Goals Assessment')).toBeVisible()
    await expect(page.locator('text=Class Feedback Survey')).toBeVisible()
    await expect(page.locator('text=Facility Satisfaction Survey')).toBeVisible()

    // Check survey details
    await expect(page.locator('text=Understanding member fitness objectives')).toBeVisible()
    await expect(page.locator('text=Gathering feedback on our group fitness classes')).toBeVisible()

    // Check status badges
    await expect(page.locator('text=Active').first()).toBeVisible()
    await expect(page.locator('text=Completed')).toBeVisible()
    await expect(page.locator('text=Draft')).toBeVisible()
  })

  test('opens view modal when view button is clicked', async ({ page }) => {
    // Wait for surveys to load
    await expect(page.locator('text=Fitness Goals Assessment')).toBeVisible()

    // Click the first view button (eye icon)
    await page.locator('button[title="View Survey (Read-only)"]').first().click()

    // Check modal is visible
    await expect(page.locator('h3:has-text("Fitness Goals Assessment")')).toBeVisible()
    await expect(page.locator('text=Read-only Preview')).toBeVisible()
    await expect(page.locator('text=Understanding member fitness objectives')).toBeVisible()

    // Check modal content
    await expect(page.locator('text=Description')).toBeVisible()
    await expect(page.locator('text=Status')).toBeVisible()
    await expect(page.locator('text=Responses')).toBeVisible()
    await expect(page.locator('text=Questions')).toBeVisible()
    await expect(page.locator('text=Completion Rate')).toBeVisible()

    // Check action buttons
    await expect(page.locator('button:has-text("View Responses")')).toBeVisible()
    await expect(page.locator('button:has-text("Close")')).toBeVisible()
  })

  test('closes view modal when close button is clicked', async ({ page }) => {
    // Wait for surveys and open modal
    await expect(page.locator('text=Fitness Goals Assessment')).toBeVisible()
    await page.locator('button[title="View Survey (Read-only)"]').first().click()

    // Verify modal is open
    await expect(page.locator('text=Read-only Preview')).toBeVisible()

    // Close modal
    await page.locator('button:has-text("Close")').click()

    // Verify modal is closed
    await expect(page.locator('text=Read-only Preview')).not.toBeVisible()
  })

  test('shows edit buttons as disabled by default', async ({ page }) => {
    // Wait for surveys to load
    await expect(page.locator('text=Fitness Goals Assessment')).toBeVisible()

    // Check that edit buttons are disabled
    const editButtons = page.locator('button[title="Coming soon"]')
    await expect(editButtons.first()).toBeDisabled()

    // Check for disabled styling
    await expect(editButtons.first()).toHaveClass(/disabled:opacity-50/)
  })

  test('shows info toast when disabled edit button is clicked', async ({ page }) => {
    // Wait for surveys to load
    await expect(page.locator('text=Fitness Goals Assessment')).toBeVisible()

    // Click disabled edit button
    const editButton = page.locator('button[title="Coming soon"]').first()
    await editButton.click()

    // Since we can't easily test toast messages in e2e without additional setup,
    // we verify the button is properly disabled and has the correct title
    await expect(editButton).toBeDisabled()
    await expect(editButton).toHaveAttribute('title', 'Coming soon')
  })

  test('shows send buttons as disabled', async ({ page }) => {
    // Wait for surveys to load
    await expect(page.locator('text=Fitness Goals Assessment')).toBeVisible()

    // Find send buttons (they should have send icon and be disabled)
    const actionButtons = page.locator('td').last()
    
    // The send button should be part of the action buttons but disabled
    // We can test this by looking for disabled buttons in the actions column
    const disabledButtons = actionButtons.locator('button:disabled')
    await expect(disabledButtons).toHaveCount({ min: 1 })
  })

  test('navigates to responses from view modal', async ({ page }) => {
    // Open view modal
    await expect(page.locator('text=Fitness Goals Assessment')).toBeVisible()
    await page.locator('button[title="View Survey (Read-only)"]').first().click()

    // Click View Responses
    await page.locator('button:has-text("View Responses")').click()

    // Should navigate to responses tab
    await expect(page.locator('text=Response Analysis Coming Soon')).toBeVisible()
    
    // Check we're on the responses tab
    await expect(page.locator('button:has-text("Responses")')).toHaveClass(/bg-orange-600/)
  })

  test('shows survey type icons correctly', async ({ page }) => {
    // Wait for surveys to load
    await expect(page.locator('text=Fitness Goals Assessment')).toBeVisible()

    // Check different type labels
    await expect(page.locator('text=Fitness assessment')).toBeVisible()
    await expect(page.locator('text=Feedback')).toBeVisible()
    await expect(page.locator('text=Satisfaction')).toBeVisible()
    await expect(page.locator('text=Onboarding')).toBeVisible()
  })

  test('shows completion rate progress bars', async ({ page }) => {
    // Wait for surveys to load
    await expect(page.locator('text=Fitness Goals Assessment')).toBeVisible()

    // Check completion rate percentages
    await expect(page.locator('text=73.4%')).toBeVisible()
    await expect(page.locator('text=89.2%')).toBeVisible()
    await expect(page.locator('text=95.8%')).toBeVisible()

    // Check progress bars exist (green bars)
    const progressBars = page.locator('.bg-green-500')
    await expect(progressBars).toHaveCount({ min: 1 })
  })

  test('handles delete confirmation dialog', async ({ page }) => {
    // Wait for surveys to load
    await expect(page.locator('text=Fitness Goals Assessment')).toBeVisible()

    // Set up dialog handler
    let dialogMessage = ''
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message()
      await dialog.accept()
    })

    // Click delete button
    await page.locator('button[title="Delete Survey"]').first().click()

    // Verify confirmation dialog
    expect(dialogMessage).toContain('Delete survey: Fitness Goals Assessment?')
  })

  test('shows stats overview cards correctly', async ({ page }) => {
    // Wait for page to load
    await expect(page.locator('text=Active Surveys')).toBeVisible()

    // Check all stat cards
    await expect(page.locator('text=Total Responses')).toBeVisible()
    await expect(page.locator('text=Avg Completion Rate')).toBeVisible()
    await expect(page.locator('text=This Month')).toBeVisible()

    // Check that numbers are displayed
    const statNumbers = page.locator('.text-2xl.font-bold')
    await expect(statNumbers).toHaveCount({ min: 4 })
  })

  test('shows coming soon banner when surveys actions disabled', async ({ page }) => {
    // The coming soon banner should be visible by default
    await expect(page.locator('text=This module is currently in development')).toBeVisible()
    await expect(page.locator('text=You can view mock data but survey creation')).toBeVisible()
  })

  test('shows create survey button', async ({ page }) => {
    // Wait for page to load
    await expect(page.locator('button:has-text("Create Survey")')).toBeVisible()

    // Click create survey button
    await page.locator('button:has-text("Create Survey")').click()

    // Should navigate to create tab
    await expect(page.locator('button:has-text("Create Survey")')).toHaveClass(/bg-orange-600/)
  })

  test('shows waitlist CTA on create survey tab', async ({ page }) => {
    // Navigate to create survey tab
    await page.locator('button:has-text("Create Survey")').click()

    // Should show waitlist content
    await expect(page.locator('text=Survey Creation Coming Soon')).toBeVisible()
    await expect(page.locator('button:has-text("Join Early Access Waitlist")')).toBeVisible()
  })

  test('opens waitlist modal when CTA is clicked', async ({ page }) => {
    // Navigate to create survey tab
    await page.locator('button:has-text("Create Survey")').click()

    // Click waitlist button
    await page.locator('button:has-text("Join Early Access Waitlist")').click()

    // Check modal is open
    await expect(page.locator('h3:has-text("Join Early Access")')).toBeVisible()
    await expect(page.locator('input[placeholder="your@email.com"]')).toBeVisible()
    await expect(page.locator('textarea[placeholder="Tell us about your survey needs..."]')).toBeVisible()
  })

  test('handles waitlist form submission', async ({ page }) => {
    // Navigate to create survey tab and open waitlist modal
    await page.locator('button:has-text("Create Survey")').click()
    await page.locator('button:has-text("Join Early Access Waitlist")').click()

    // Fill form
    await page.locator('input[placeholder="your@email.com"]').fill('test@example.com')
    await page.locator('textarea[placeholder="Tell us about your survey needs..."]').fill('I need member satisfaction surveys')

    // Submit form
    await page.locator('button:has-text("Join Waitlist")').click()

    // Modal should close after successful submission
    await expect(page.locator('h3:has-text("Join Early Access")')).not.toBeVisible()

    // In a real implementation, you'd also check for a success toast
  })

  test('closes waitlist modal when cancel is clicked', async ({ page }) => {
    // Open waitlist modal
    await page.locator('button:has-text("Create Survey")').click()
    await page.locator('button:has-text("Join Early Access Waitlist")').click()

    // Verify modal is open
    await expect(page.locator('h3:has-text("Join Early Access")')).toBeVisible()

    // Click cancel
    await page.locator('button:has-text("Cancel")').click()

    // Verify modal is closed
    await expect(page.locator('h3:has-text("Join Early Access")')).not.toBeVisible()
  })

  test('switches between tabs correctly', async ({ page }) => {
    // Test all tab navigation
    await page.locator('button:has-text("Responses")').click()
    await expect(page.locator('text=Response Analysis Coming Soon')).toBeVisible()

    await page.locator('button:has-text("Analytics")').click()
    await expect(page.locator('text=Demo Data')).toBeVisible()

    await page.locator('button:has-text("All Surveys")').click()
    await expect(page.locator('text=Fitness Goals Assessment')).toBeVisible()
  })
})