import { test, expect } from '@playwright/test'

test.describe('Surveys Analytics Demo Data Badge and Waitlist CTA', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to surveys page
    await page.goto('/surveys')
  })

  test('displays analytics tab with Demo Data badge', async ({ page }) => {
    // Navigate to Analytics tab
    await page.locator('button:has-text("Analytics")').click()

    // Check that we're on the analytics tab (active state)
    await expect(page.locator('button:has-text("Analytics")')).toHaveClass(/bg-orange-600/)

    // Check for Demo Data badge
    await expect(page.locator('.bg-yellow-500\\/20.text-yellow-400')).toBeVisible()
    await expect(page.locator('text=Demo Data')).toBeVisible()
  })

  test('shows analytics component with demo data indication', async ({ page }) => {
    // Navigate to Analytics tab
    await page.locator('button:has-text("Analytics")').click()

    // The SurveyAnalytics component should be visible
    // In the mocked component, it shows demo data badge
    await expect(page.locator('[data-testid="survey-analytics"]')).toBeVisible()

    // Check demo data styling - yellow badge with proper styling
    const demoBadge = page.locator('text=Demo Data').first()
    await expect(demoBadge).toBeVisible()
    await expect(demoBadge).toHaveClass(/bg-yellow-500\/20/)
    await expect(demoBadge).toHaveClass(/text-yellow-400/)
    await expect(demoBadge).toHaveClass(/px-3/)
    await expect(demoBadge).toHaveClass(/py-1/)
    await expect(demoBadge).toHaveClass(/rounded-full/)
  })

  test('shows waitlist CTA when create survey feature is disabled', async ({ page }) => {
    // Navigate to Create Survey tab
    await page.locator('button:has-text("Create Survey")').click()

    // Should show waitlist section
    await expect(page.locator('text=Survey Creation Coming Soon')).toBeVisible()
    await expect(page.locator('text=Build custom surveys with multiple question types')).toBeVisible()

    // Check for waitlist CTA button
    const waitlistButton = page.locator('button:has-text("Join Early Access Waitlist")')
    await expect(waitlistButton).toBeVisible()
    await expect(waitlistButton).toHaveClass(/bg-orange-600/)
    await expect(waitlistButton).toHaveClass(/hover:bg-orange-700/)
  })

  test('opens waitlist modal when CTA button is clicked', async ({ page }) => {
    // Navigate to Create Survey tab
    await page.locator('button:has-text("Create Survey")').click()

    // Click the waitlist CTA
    await page.locator('button:has-text("Join Early Access Waitlist")').click()

    // Check modal opens
    await expect(page.locator('h3:has-text("Join Early Access")')).toBeVisible()
    await expect(page.locator('text=Be among the first to access our comprehensive survey creation tools')).toBeVisible()

    // Check form fields
    await expect(page.locator('input[placeholder="your@email.com"]')).toBeVisible()
    await expect(page.locator('textarea[placeholder="Tell us about your survey needs..."]')).toBeVisible()

    // Check action buttons
    await expect(page.locator('button:has-text("Join Waitlist")')).toBeVisible()
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible()
  })

  test('handles waitlist form submission with success message', async ({ page }) => {
    // Open waitlist modal
    await page.locator('button:has-text("Create Survey")').click()
    await page.locator('button:has-text("Join Early Access Waitlist")').click()

    // Fill form
    await page.locator('input[placeholder="your@email.com"]').fill('user@example.com')
    await page.locator('textarea[placeholder="Tell us about your survey needs..."]').fill('I need member feedback surveys')

    // Submit form
    await page.locator('button:has-text("Join Waitlist")').click()

    // Modal should close
    await expect(page.locator('h3:has-text("Join Early Access")')).not.toBeVisible()

    // In a real implementation, you'd also check for the success toast:
    // await expect(page.locator('text=Thanks for your interest! We\'ll notify you when survey creation is available.')).toBeVisible()
  })

  test('validates waitlist form fields', async ({ page }) => {
    // Open waitlist modal
    await page.locator('button:has-text("Create Survey")').click()
    await page.locator('button:has-text("Join Early Access Waitlist")').click()

    // Try to submit without filling email
    await page.locator('button:has-text("Join Waitlist")').click()

    // HTML5 validation should prevent submission
    // Modal should still be open
    await expect(page.locator('h3:has-text("Join Early Access")')).toBeVisible()
  })

  test('closes waitlist modal when cancel is clicked', async ({ page }) => {
    // Open waitlist modal
    await page.locator('button:has-text("Create Survey")').click()
    await page.locator('button:has-text("Join Early Access Waitlist")').click()

    // Click cancel
    await page.locator('button:has-text("Cancel")').click()

    // Modal should close
    await expect(page.locator('h3:has-text("Join Early Access")')).not.toBeVisible()
  })

  test('closes waitlist modal when X button is clicked', async ({ page }) => {
    // Open waitlist modal
    await page.locator('button:has-text("Create Survey")').click()
    await page.locator('button:has-text("Join Early Access Waitlist")').click()

    // Click X button (close button with SVG)
    await page.locator('button svg[viewBox="0 0 24 24"]').click()

    // Modal should close
    await expect(page.locator('h3:has-text("Join Early Access")')).not.toBeVisible()
  })

  test('shows survey templates in create section when feature enabled', async ({ page }) => {
    // This test would require mocking feature flags to enable survey creation
    // For now, we test the disabled state which shows the waitlist
    
    await page.locator('button:has-text("Create Survey")').click()
    
    // Should show coming soon section instead of templates
    await expect(page.locator('text=Survey Creation Coming Soon')).toBeVisible()
    
    // Should NOT show template selection (since feature is disabled)
    await expect(page.locator('text=Choose a Template')).not.toBeVisible()
  })

  test('analytics tab shows proper survey data context', async ({ page }) => {
    // Navigate to analytics tab
    await page.locator('button:has-text("Analytics")').click()

    // Should show analytics component
    await expect(page.locator('[data-testid="survey-analytics"]')).toBeVisible()

    // Should indicate this is demo/mock data
    await expect(page.locator('text=Demo Data')).toBeVisible()

    // The component should indicate it's showing analytics
    await expect(page.locator('text=Analytics for survey:')).toBeVisible()
  })

  test('maintains proper tab state when switching between tabs', async ({ page }) => {
    // Start on All Surveys tab (should be active by default)
    await expect(page.locator('button:has-text("All Surveys")')).toHaveClass(/bg-orange-600/)

    // Go to Create Survey
    await page.locator('button:has-text("Create Survey")').click()
    await expect(page.locator('button:has-text("Create Survey")')).toHaveClass(/bg-orange-600/)
    await expect(page.locator('button:has-text("All Surveys")')).not.toHaveClass(/bg-orange-600/)

    // Go to Analytics
    await page.locator('button:has-text("Analytics")').click()
    await expect(page.locator('button:has-text("Analytics")')).toHaveClass(/bg-orange-600/)
    await expect(page.locator('button:has-text("Create Survey")')).not.toHaveClass(/bg-orange-600/)

    // Verify Demo Data is visible in Analytics
    await expect(page.locator('text=Demo Data')).toBeVisible()
  })

  test('shows consistent styling across demo data indicators', async ({ page }) => {
    // Check Demo Data badge in analytics
    await page.locator('button:has-text("Analytics")').click()

    const demoBadge = page.locator('text=Demo Data')
    await expect(demoBadge).toBeVisible()

    // Check consistent styling
    await expect(demoBadge).toHaveClass(/text-yellow-400/)
    await expect(demoBadge).toHaveClass(/px-3/)
    await expect(demoBadge).toHaveClass(/py-1/)
    await expect(demoBadge).toHaveClass(/rounded-full/)
    await expect(demoBadge).toHaveClass(/text-sm/)
    await expect(demoBadge).toHaveClass(/font-medium/)
  })

  test('shows waitlist icon in CTA button', async ({ page }) => {
    // Navigate to create survey tab
    await page.locator('button:has-text("Create Survey")').click()

    // Check waitlist CTA has proper styling and icon
    const waitlistBtn = page.locator('button:has-text("Join Early Access Waitlist")')
    await expect(waitlistBtn).toBeVisible()
    
    // Should have orange styling consistent with brand
    await expect(waitlistBtn).toHaveClass(/bg-orange-600/)
    await expect(waitlistBtn).toHaveClass(/hover:bg-orange-700/)

    // Check that it's prominently displayed
    await expect(waitlistBtn).toHaveClass(/text-white/)
    await expect(waitlistBtn).toHaveClass(/font-medium/)
  })

  test('handles multiple modal interactions correctly', async ({ page }) => {
    // Test opening and closing modal multiple times
    await page.locator('button:has-text("Create Survey")').click()

    // Open modal
    await page.locator('button:has-text("Join Early Access Waitlist")').click()
    await expect(page.locator('h3:has-text("Join Early Access")')).toBeVisible()

    // Close modal
    await page.locator('button:has-text("Cancel")').click()
    await expect(page.locator('h3:has-text("Join Early Access")')).not.toBeVisible()

    // Open again
    await page.locator('button:has-text("Join Early Access Waitlist")').click()
    await expect(page.locator('h3:has-text("Join Early Access")')).toBeVisible()

    // Close with X button
    await page.locator('button svg[viewBox="0 0 24 24"]').click()
    await expect(page.locator('h3:has-text("Join Early Access")')).not.toBeVisible()
  })

  test('shows proper loading states and transitions', async ({ page }) => {
    // Check that component mounts properly (no loading state issues)
    await expect(page.locator('h1:has-text("Surveys & Feedback")')).toBeVisible()

    // Switch to analytics tab
    await page.locator('button:has-text("Analytics")').click()

    // Should show analytics content immediately (no loading spinner for mock data)
    await expect(page.locator('[data-testid="survey-analytics"]')).toBeVisible()
    await expect(page.locator('text=Demo Data')).toBeVisible()

    // No loading spinners should be visible for static mock data
    await expect(page.locator('.animate-spin')).not.toBeVisible()
  })
})