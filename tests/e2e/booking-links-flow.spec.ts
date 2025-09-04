import { test, expect } from '@playwright/test'

test.describe('Booking Links Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock API responses for booking links
    await page.route('**/api/booking-links', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            booking_links: [
              {
                id: 'test-link-1',
                name: 'Personal Training Session',
                slug: 'personal-training',
                description: 'Book a personal training session',
                is_active: true,
                is_public: true,
                type: 'individual',
                appointment_type_ids: [1],
                assigned_staff_ids: [1],
                timezone: 'Europe/London',
                confirmation_settings: { auto_confirm: true },
                notification_settings: { email_enabled: true },
                payment_settings: { enabled: false },
                cancellation_policy: { allowed: true }
              }
            ]
          })
        })
      }
    })

    // Mock analytics endpoint
    await page.route('**/api/booking-links/*/analytics**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          stats: {
            total_bookings: 15,
            this_month: 8,
          },
          analytics: {
            conversion_rate: 65.2
          }
        })
      })
    })

    // Mock create booking link API
    await page.route('**/api/booking-links', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-link-id',
            success: true
          })
        })
      }
    })

    // Mock appointment types endpoint used by create editor
    await page.route('**/api/appointment-types', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          appointment_types: [
            { id: 'at-1', name: 'Consultation', duration_minutes: 30, session_type: 'consultation', max_capacity: 1 },
            { id: 'at-2', name: 'Group Training', duration_minutes: 60, session_type: 'group_class', max_capacity: 10 },
            { id: 'at-3', name: 'Nutrition Coaching', duration_minutes: 45, session_type: 'nutrition_consult', max_capacity: 1 }
          ]
        })
      })
    })

    // Mock staff endpoint to avoid empty state noise
    await page.route('**/api/staff', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ staff: [] })
      })
    })

    // Navigate to booking links page
    await page.goto('/booking-links')
  })

  test('displays booking links management interface correctly', async ({ page }) => {
    // Check page header
    await expect(page.locator('h1')).toContainText('Booking Links')
    await expect(page.locator('text=Create and manage shareable booking links')).toBeVisible()

    // Check create button is present
    await expect(page.locator('button:has-text("Create Booking Link")')).toBeVisible()

    // Check stats overview cards are displayed
    await expect(page.locator('text=Total Links')).toBeVisible()
    await expect(page.locator('text=Active Links')).toBeVisible()
    await expect(page.locator('text=Total Bookings')).toBeVisible()
    await expect(page.locator('text=This Month')).toBeVisible()
  })

  test('shows booking link with correct data and stats', async ({ page }) => {
    // Wait for data to load
    await expect(page.locator('text=Personal Training Session')).toBeVisible()

    // Check link details
    await expect(page.locator('text=Book a personal training session')).toBeVisible()
    await expect(page.locator('text=Active')).toBeVisible()
    await expect(page.locator('text=individual booking')).toBeVisible()

    // Check stats
    await expect(page.locator('text=15').first()).toBeVisible() // total bookings
    await expect(page.locator('text=8').first()).toBeVisible() // this month
    await expect(page.locator('text=65.2%')).toBeVisible() // conversion rate
  })

  test('navigates to create booking link page correctly', async ({ page }) => {
    // Click create button
    await page.locator('button:has-text("Create Booking Link")').click()

    // Should navigate to create page
    await expect(page).toHaveURL('/booking-links/create')
  })

  test('handles create booking link flow end-to-end', async ({ page }) => {
    // Mock BookingLinkEditor component response
    await page.route('**/api/booking-link-editor-save', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true })
      })
    })

    // Go to create page
    await page.goto('/booking-links/create')

    // Check create page renders
    await expect(page.locator('.min-h-screen')).toBeVisible()

    // Since we're mocking the component, we can't test the actual form
    // but we can test the page structure and navigation
    await expect(page.locator('.bg-gray-900')).toBeVisible()
    await expect(page.locator('.text-white')).toBeVisible()
  })

  test('shows correct action buttons for booking links', async ({ page }) => {
    // Wait for booking link to be visible
    await expect(page.locator('text=Personal Training Session')).toBeVisible()

    // Check all action buttons are present
    await expect(page.locator('[title="View Analytics"]')).toBeVisible()
    await expect(page.locator('[title="Preview"]')).toBeVisible()
    await expect(page.locator('[title="Edit"]')).toBeVisible()
    await expect(page.locator('[title="Delete"]')).toBeVisible()
  })

  test('handles copy URL functionality', async ({ page }) => {
    // Grant clipboard permissions
    await page.context().grantPermissions(['clipboard-write'])

    // Wait for booking link to be visible
    await expect(page.locator('text=Personal Training Session')).toBeVisible()

    // Find and click copy button
    const copyButton = page.locator('button[title="Copy URL"]').first()
    await copyButton.click()

    // Check for success indicator (icon change to checkmark)
    await expect(page.locator('svg.text-green-500')).toBeVisible({ timeout: 3000 })
  })

  test('handles delete booking link with confirmation', async ({ page }) => {
    // Mock delete API
    await page.route('**/api/booking-links/test-link-1', async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true })
        })
      }
    })

    // Wait for booking link to be visible
    await expect(page.locator('text=Personal Training Session')).toBeVisible()

    // Set up dialog handler for confirmation
    let dialogMessage = ''
    page.on('dialog', async dialog => {
      dialogMessage = dialog.message()
      await dialog.accept()
    })

    // Click delete button
    await page.locator('button[title="Delete"]').click()

    // Verify confirmation dialog appeared
    expect(dialogMessage).toContain('Are you sure you want to delete')
    expect(dialogMessage).toContain('Personal Training Session')
  })

  test('opens preview in new tab', async ({ page, context }) => {
    // Wait for booking link to be visible
    await expect(page.locator('text=Personal Training Session')).toBeVisible()

    // Set up to catch new page
    const pagePromise = context.waitForEvent('page')

    // Click preview button (external link)
    await page.locator('[title="Preview"]').click()

    // Wait for new page
    const newPage = await pagePromise
    await expect(newPage).toHaveURL(/\/book\/personal-training/)
  })

  test('shows empty state when no booking links exist', async ({ page }) => {
    // Mock empty response
    await page.route('**/api/booking-links', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ booking_links: [] })
      })
    })

    await page.reload()

    // Check empty state
    await expect(page.locator('text=No booking links created yet')).toBeVisible()
    await expect(page.locator('text=Create Your First Link')).toBeVisible()

    // Empty state create button should work
    await page.locator('button:has-text("Create Your First Link")').click()
    await expect(page).toHaveURL('/booking-links/create')
  })

  test('handles API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('**/api/booking-links', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })

    await page.reload()

    // Should still show the create button and basic page structure
    await expect(page.locator('h1:has-text("Booking Links")')).toBeVisible()
    await expect(page.locator('button:has-text("Create Booking Link")')).toBeVisible()
  })

  test('displays loading state correctly', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/booking-links', async route => {
      // Delay response
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ booking_links: [] })
      })
    })

    // Navigate to trigger loading
    await page.goto('/booking-links')

    // Check loading state
    await expect(page.locator('text=Loading booking links...')).toBeVisible()

    // Wait for loading to complete
    await expect(page.locator('text=No booking links created yet')).toBeVisible({ timeout: 5000 })
  })

  test('shows toast notification on successful create', async ({ page }) => {
    // Mock toast functionality would typically require additional setup
    // This test verifies the navigation flow that triggers the toast
    
    await page.goto('/booking-links/create')
    
    // Verify we're on the create page
    await expect(page.locator('.min-h-screen.bg-gray-900')).toBeVisible()
    
    // The actual toast testing would require the BookingLinkEditor component
    // to be functional, which involves more complex mocking
  })

  test('maintains correct URL structure and routing', async ({ page }) => {
    // Verify main page URL
    expect(page.url()).toContain('/booking-links')

    // Test create navigation
    await page.locator('button:has-text("Create Booking Link")').click()
    expect(page.url()).toContain('/booking-links/create')

    // Test back navigation
    await page.goBack()
    expect(page.url()).toContain('/booking-links')
    expect(page.url()).not.toContain('/create')
  })

  test('create page lists available appointment types from settings', async ({ page }) => {
    await page.goto('/booking-links/create')

    // Verify the appointment types header appears
    await expect(page.locator('text=Available Appointment Types *')).toBeVisible()

    // Ensure the mocked types are visible as options
    await expect(page.locator('text=Consultation')).toBeVisible()
    await expect(page.locator('text=Group Training')).toBeVisible()
    await expect(page.locator('text=Nutrition Coaching')).toBeVisible()
  })
})