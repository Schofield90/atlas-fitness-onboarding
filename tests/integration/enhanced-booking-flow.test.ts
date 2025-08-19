import { test, expect } from '@playwright/test'

test.describe('Enhanced Booking Link System', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to booking links management
    await page.goto('/booking-links')
  })

  test('should create a new booking link with GHL-like features', async ({ page }) => {
    // Click create booking link
    await page.click('text=Create Booking Link')
    
    // Fill in basic details
    await page.fill('input[placeholder*="30 Minute Consultation"]', 'Personal Training Consultation')
    await page.fill('input[placeholder="consultation"]', 'pt-consultation')
    await page.fill('textarea[placeholder*="Brief description"]', 'Initial consultation to assess fitness goals and create a personalized training plan')

    // Select appointment types
    const appointmentTypeCheckbox = page.locator('input[type="checkbox"]').first()
    await appointmentTypeCheckbox.check()

    // Configure meeting location
    await page.selectOption('select', 'video_call')
    await page.fill('input[placeholder*="Zoom link"]', 'https://zoom.us/j/123456789')

    // Set buffer times
    await page.fill('input[min="0"][max="120"]', '15') // After buffer

    // Save the booking link
    await page.click('text=Create')

    // Should redirect to booking links list
    await expect(page).toHaveURL('/booking-links')
    
    // Should see the new booking link
    await expect(page.locator('text=Personal Training Consultation')).toBeVisible()
    await expect(page.locator('text=/book/pt-consultation')).toBeVisible()
  })

  test('should allow public booking through the widget', async ({ page }) => {
    // Create a test booking link first (simplified)
    await page.goto('/book/test-consultation') // Assuming this exists

    // Should show the booking widget
    await expect(page.locator('text=Select a Service')).toBeVisible()

    // Select appointment type
    await page.click('button:has-text("Consultation")')

    // Should progress to staff selection or date/time
    await expect(page.locator('text=Select Date & Time')).toBeVisible()

    // Select a date (tomorrow)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]
    
    await page.click(`button[data-date="${tomorrowStr}"]`)

    // Select an available time slot
    await page.click('button:has-text("9:00 AM")')

    // Should show booking form
    await expect(page.locator('text=Enter Your Details')).toBeVisible()

    // Fill in the form
    await page.fill('input[type="text"]', 'John Doe')
    await page.fill('input[type="email"]', 'john.doe@example.com')
    await page.fill('input[type="tel"]', '+44 7700 900123')
    await page.fill('textarea', 'Looking to improve my fitness and lose weight')

    // Accept consent
    await page.check('input[type="checkbox"]')

    // Submit booking
    await page.click('text=Confirm Booking')

    // Should show confirmation
    await expect(page.locator('text=Booking Confirmed!')).toBeVisible()
  })

  test('should show analytics for booking links', async ({ page }) => {
    // Navigate to analytics for a booking link
    await page.goto('/booking-links/test-id/analytics')

    // Should show key metrics
    await expect(page.locator('text=Page Views')).toBeVisible()
    await expect(page.locator('text=Form Starts')).toBeVisible()
    await expect(page.locator('text=Bookings')).toBeVisible()
    await expect(page.locator('text=Conversion Rate')).toBeVisible()

    // Should show booking status breakdown
    await expect(page.locator('text=Booking Status')).toBeVisible()
    await expect(page.locator('text=Confirmed')).toBeVisible()
    await expect(page.locator('text=Cancelled')).toBeVisible()

    // Should show daily activity chart
    await expect(page.locator('text=Daily Activity')).toBeVisible()
  })

  test('should validate booking link configuration', async ({ page }) => {
    await page.click('text=Create Booking Link')
    
    // Try to save without required fields
    await page.click('text=Create')
    
    // Should show validation errors or disable the button
    const createButton = page.locator('button:has-text("Create")')
    await expect(createButton).toBeDisabled()

    // Fill in required fields
    await page.fill('input[placeholder*="30 Minute Consultation"]', 'Test Link')
    
    // Should still be disabled without appointment type
    await expect(createButton).toBeDisabled()

    // Select appointment type
    const appointmentTypeCheckbox = page.locator('input[type="checkbox"]').first()
    await appointmentTypeCheckbox.check()

    // Now should be enabled
    await expect(createButton).toBeEnabled()
  })

  test('should handle gym-specific features', async ({ page }) => {
    await page.click('text=Create Booking Link')
    
    // Fill basic info
    await page.fill('input[placeholder*="30 Minute Consultation"]', 'Group Training Session')
    
    // Select group session appointment type
    await page.check('input[type="checkbox"]:has-text("Group")')

    // Should show capacity settings for group sessions
    await expect(page.locator('text=Max')).toBeVisible()

    // Check equipment requirements section
    await page.click('text=Add Equipment')
    await page.fill('input[placeholder*="Olympic Barbell"]', 'Squat Rack')
    await page.selectOption('select', 'strength')
    await page.click('text=Add Equipment')

    // Should show the equipment requirement
    await expect(page.locator('text=Squat Rack')).toBeVisible()
    await expect(page.locator('text=Strength Training')).toBeVisible()
  })

  test('should support trainer specializations', async ({ page }) => {
    // Navigate to staff management
    await page.goto('/staff')
    
    // Click on a staff member to edit
    await page.click('button:has-text("Edit")')

    // Add specialization
    await page.click('text=Add Specialization')
    await page.selectOption('select', 'personal_training')
    await page.fill('input[placeholder*="Level 3 Personal Trainer"]', 'Level 3 Personal Trainer')
    await page.fill('input[placeholder*="REPS"]', 'REPS')
    
    // Set certification dates
    await page.fill('input[type="date"]', '2023-01-15')
    
    await page.click('text=Add Specialization')

    // Should show the specialization
    await expect(page.locator('text=Personal Training')).toBeVisible()
    await expect(page.locator('text=Level 3 Personal Trainer')).toBeVisible()
  })

  test('should integrate with Google Calendar', async ({ page }) => {
    // This test would require actual Google Calendar setup
    // For now, we'll test that the calendar integration components exist
    
    await page.goto('/settings/calendar')
    
    // Should show Google Calendar connection option
    await expect(page.locator('text=Google Calendar')).toBeVisible()
    
    // Should show sync options
    await expect(page.locator('text=Sync')).toBeVisible()
  })

  test('should handle payment settings', async ({ page }) => {
    await page.click('text=Create Booking Link')
    
    // Navigate to customization tab
    await page.click('text=Customization')
    
    // Enable payment
    await page.check('input[type="checkbox"]:has-text("Require payment")')
    
    // Should show payment configuration
    await expect(page.locator('text=Amount')).toBeVisible()
    await expect(page.locator('text=£')).toBeVisible()
    
    // Set payment amount
    await page.fill('input[type="number"]', '50')
    await page.fill('input[placeholder="Consultation fee"]', 'Initial consultation fee')
    
    // Payment settings should be saved
    await page.fill('input[placeholder*="30 Minute Consultation"]', 'Paid Consultation')
    await page.check('input[type="checkbox"]') // Select appointment type
    await page.click('text=Create')
    
    // Should create successfully with payment enabled
    await expect(page).toHaveURL('/booking-links')
  })

  test('should customize booking widget appearance', async ({ page }) => {
    await page.click('text=Create Booking Link')
    
    // Navigate to customization tab
    await page.click('text=Customization')
    
    // Change colors
    await page.fill('input[type="color"]:first', '#ff6b35') // Primary color
    await page.fill('input[type="color"]:nth(1)', '#f8f9fa') // Background color
    
    // Add custom CSS
    await page.fill('textarea[placeholder*=".booking-widget"]', '.booking-widget { border-radius: 12px; }')
    
    // Add logo URL
    await page.fill('input[placeholder*="logo.png"]', 'https://example.com/logo.png')
    
    // Save and preview
    await page.fill('input[placeholder*="30 Minute Consultation"]', 'Custom Styled Link')
    await page.check('input[type="checkbox"]') // Select appointment type
    await page.click('text=Create')
    
    // Should apply custom styling when viewing the link
    await page.goto('/book/custom-styled-link')
    await expect(page.locator('.booking-widget')).toBeVisible()
  })
})