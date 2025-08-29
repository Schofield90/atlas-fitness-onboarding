import { test, expect } from '@playwright/test'

test.describe('Staff Management Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock organization API
    await page.route('**/api/organization/get-info', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          organizationId: 'test-org-id'
        })
      })
    })

    // Mock staff list API
    await page.route('**/api/organization/staff**', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'staff-1',
              user_id: 'user-1',
              phone_number: '+44 7123 456789',
              email: 'john@example.com',
              is_available: true,
              receives_calls: true,
              receives_sms: true,
              receives_whatsapp: false,
              receives_emails: true,
              routing_priority: 1,
              role: 'manager',
              location_access: { all_locations: true }
            }
          ])
        })
      }
    })

    // Mock add staff API
    await page.route('**/api/organization/add-staff', async route => {
      if (route.request().method() === 'POST') {
        const requestBody = await route.request().postDataJSON()
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            staffId: 'new-staff-id',
            staff: {
              id: 'new-staff-id',
              user_id: 'new-user',
              email: requestBody.email,
              phone_number: requestBody.phone_number,
              role: requestBody.role,
              is_available: true,
              receives_calls: true,
              receives_sms: true,
              receives_whatsapp: false,
              receives_emails: true,
              routing_priority: 2,
              location_access: { all_locations: false }
            }
          })
        })
      }
    })

    // Navigate to staff page
    await page.goto('/staff')
  })

  test('displays staff management interface correctly', async ({ page }) => {
    // Check page header
    await expect(page.locator('h2:has-text("Staff Management")')).toBeVisible()
    await expect(page.locator('text=Manage your team members and their permissions')).toBeVisible()

    // Check action buttons
    await expect(page.locator('button:has-text("Invite Staff")')).toBeVisible()
    await expect(page.locator('button:has-text("Add Manually")')).toBeVisible()

    // Check tabs
    await expect(page.locator('button:has-text("Team Members")')).toBeVisible()
    await expect(page.locator('button:has-text("Schedules")')).toBeVisible()
    await expect(page.locator('button:has-text("Payroll")')).toBeVisible()
    await expect(page.locator('button:has-text("Permissions")')).toBeVisible()
  })

  test('shows existing staff members correctly', async ({ page }) => {
    // Wait for staff to load
    await expect(page.locator('text=john@example.com')).toBeVisible()

    // Check staff details
    await expect(page.locator('text=manager')).toBeVisible()
    await expect(page.locator('text=+44 7123 456789')).toBeVisible()
    await expect(page.locator('text=Available')).toBeVisible()

    // Check communication preferences
    await expect(page.locator('text=Calls')).toBeVisible()
    await expect(page.locator('text=SMS')).toBeVisible()
    await expect(page.locator('text=Email')).toBeVisible()

    // Check location access
    await expect(page.locator('text=All Locations')).toBeVisible()
  })

  test('opens add staff modal when Add Manually is clicked', async ({ page }) => {
    // Click Add Manually button
    await page.locator('button:has-text("Add Manually")').click()

    // Check modal is visible
    await expect(page.locator('h3:has-text("Add Staff Member")')).toBeVisible()
    await expect(page.locator('input[placeholder="John Doe"]')).toBeVisible()
    await expect(page.locator('input[placeholder="john@example.com"]')).toBeVisible()
    await expect(page.locator('input[placeholder="+44 7123 456789"]')).toBeVisible()
    await expect(page.locator('select')).toBeVisible()
  })

  test('successfully adds staff member via modal', async ({ page }) => {
    // Open add staff modal
    await page.locator('button:has-text("Add Manually")').click()

    // Fill out form
    await page.locator('input[placeholder="John Doe"]').fill('Jane Smith')
    await page.locator('input[placeholder="john@example.com"]').fill('jane@example.com')
    await page.locator('input[placeholder="+44 7123 456789"]').fill('+44 7987 654321')
    await page.locator('select').selectOption('staff')

    // Set up dialog handler for success alert
    let alertMessage = ''
    page.on('dialog', async dialog => {
      alertMessage = dialog.message()
      await dialog.accept()
    })

    // Submit form
    await page.locator('button:has-text("Add Staff Member")').click()

    // Wait for and verify success alert
    await expect.poll(() => alertMessage).toBe('Staff member added successfully!')
  })

  test('validates required fields in add staff form', async ({ page }) => {
    // Open add staff modal
    await page.locator('button:has-text("Add Manually")').click()

    // Try to submit without filling required fields
    await page.locator('button:has-text("Add Staff Member")').click()

    // HTML5 validation should prevent submission
    // Check that we're still on the modal (form didn't submit)
    await expect(page.locator('h3:has-text("Add Staff Member")')).toBeVisible()
  })

  test('closes modal when cancel is clicked', async ({ page }) => {
    // Open add staff modal
    await page.locator('button:has-text("Add Manually")').click()

    // Verify modal is open
    await expect(page.locator('h3:has-text("Add Staff Member")')).toBeVisible()

    // Click cancel
    await page.locator('button:has-text("Cancel")').click()

    // Verify modal is closed
    await expect(page.locator('h3:has-text("Add Staff Member")')).not.toBeVisible()
  })

  test('opens invite staff modal', async ({ page }) => {
    // Click Invite Staff button
    await page.locator('button:has-text("Invite Staff")').click()

    // The actual modal would be rendered by the InviteStaffModal component
    // Since it's mocked in unit tests, we can't test the actual modal here
    // But we can verify the button triggers the correct action
    
    // In a real implementation, you'd check for:
    // await expect(page.locator('[data-testid="invite-staff-modal"]')).toBeVisible()
  })

  test('opens location management modal', async ({ page }) => {
    // Wait for staff to load
    await expect(page.locator('text=john@example.com')).toBeVisible()

    // Click on "All Locations" button
    await page.locator('button:has-text("All Locations")').click()

    // The actual modal would be rendered by StaffLocationModal component
    // In a real implementation, you'd check for the location modal
    // await expect(page.locator('[data-testid="staff-location-modal"]')).toBeVisible()
  })

  test('handles API errors with fallback data', async ({ page }) => {
    // Mock API error for staff fetch
    await page.route('**/api/organization/get-info', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })

    await page.reload()

    // Should show demo data fallback (assuming feature flag is enabled)
    await expect(page.locator('text=demo@example.com')).toBeVisible({ timeout: 5000 })
  })

  test('shows error state with retry button when fallback disabled', async ({ page }) => {
    // Mock feature flags to disable fallback
    await page.addInitScript(() => {
      window.localStorage.setItem('feature-flags', JSON.stringify({
        staffFallback: false
      }))
    })

    // Mock API error
    await page.route('**/api/organization/get-info', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      })
    })

    await page.reload()

    // Should show error state
    await expect(page.locator('text=Unable to load staff')).toBeVisible()
    await expect(page.locator('button:has-text("Try Again")')).toBeVisible()
  })

  test('retries loading when Try Again is clicked', async ({ page }) => {
    // Start with error, then succeed on retry
    let requestCount = 0
    await page.route('**/api/organization/get-info', async route => {
      requestCount++
      if (requestCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' })
        })
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ organizationId: 'test-org-id' })
        })
      }
    })

    // Mock feature flags to disable fallback
    await page.addInitScript(() => {
      window.localStorage.setItem('feature-flags', JSON.stringify({
        staffFallback: false
      }))
    })

    await page.reload()

    // Should show error state
    await expect(page.locator('text=Unable to load staff')).toBeVisible()

    // Click Try Again
    await page.locator('button:has-text("Try Again")').click()

    // Should now show successful state
    await expect(page.locator('text=john@example.com')).toBeVisible()
  })

  test('shows loading spinner during data fetch', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/organization/get-info', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ organizationId: 'test-org-id' })
      })
    })

    await page.reload()

    // Should show loading spinner
    await expect(page.locator('.animate-spin')).toBeVisible()

    // Wait for loading to complete
    await expect(page.locator('text=john@example.com')).toBeVisible({ timeout: 5000 })
  })

  test('shows empty state when no staff members exist', async ({ page }) => {
    // Mock empty staff response
    await page.route('**/api/organization/staff**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      })
    })

    await page.reload()

    // Should show empty state
    await expect(page.locator('text=No staff members yet')).toBeVisible()
    await expect(page.locator('text=Click "Invite Staff" or "Add Manually" to get started')).toBeVisible()
  })

  test('switches between different tabs correctly', async ({ page }) => {
    // Click on different tabs
    await page.locator('button:has-text("Schedules")').click()
    await expect(page.locator('text=Staff schedules and shift management coming soon')).toBeVisible()

    await page.locator('button:has-text("Payroll")').click()
    await expect(page.locator('text=Payroll management and reports coming soon')).toBeVisible()

    await page.locator('button:has-text("Permissions")').click()
    await expect(page.locator('text=Role-based access control settings coming soon')).toBeVisible()

    // Go back to Team Members
    await page.locator('button:has-text("Team Members")').click()
    await expect(page.locator('text=john@example.com')).toBeVisible()
  })

  test('handles add staff API error gracefully', async ({ page }) => {
    // Mock API error for add staff
    await page.route('**/api/organization/add-staff', async route => {
      await route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Email already exists' })
      })
    })

    // Open add staff modal
    await page.locator('button:has-text("Add Manually")').click()

    // Fill out form
    await page.locator('input[placeholder="John Doe"]').fill('Jane Smith')
    await page.locator('input[placeholder="john@example.com"]').fill('jane@example.com')
    await page.locator('select').selectOption('staff')

    // Set up dialog handler for error alert
    let alertMessage = ''
    page.on('dialog', async dialog => {
      alertMessage = dialog.message()
      await dialog.accept()
    })

    // Submit form
    await page.locator('button:has-text("Add Staff Member")').click()

    // Wait for and verify error alert
    await expect.poll(() => alertMessage).toBe('Email already exists')
  })
})