import { test, expect } from '@playwright/test'

test.describe('Recurring Classes Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication and organization setup
    await page.route('**/auth/getUser', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            user: {
              id: 'test-user-id',
              email: 'test@example.com',
              user_metadata: { name: 'Test User' }
            }
          },
          error: null
        })
      })
    })

    // Mock organization lookup
    await page.route('**/rest/v1/user_organizations*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{
          organization_id: 'test-org-id',
          user_id: 'test-user-id'
        }])
      })
    })

    // Mock empty recurring classes response
    await page.route('**/rest/v1/class_sessions*', async (route) => {
      const url = route.request().url()
      if (url.includes('is_recurring=eq.true')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        })
      } else {
        await route.continue()
      }
    })
  })

  test('should navigate from Dashboard to Recurring Classes without errors', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard')

    // Wait for dashboard to load
    await expect(page.locator('h1')).toContainText('Welcome to Atlas Fitness CRM')

    // Find and click the Recurring Classes card
    const recurringClassesCard = page.locator('button:has-text("Recurring Classes")')
    await expect(recurringClassesCard).toBeVisible()
    await recurringClassesCard.click()

    // Should navigate to /classes/recurring
    await expect(page).toHaveURL('/classes/recurring')

    // Should show the recurring classes page title
    await expect(page.locator('h1')).toContainText('Recurring Classes')

    // Should show the subtitle
    await expect(page.getByText('Manage your recurring class schedules and patterns')).toBeVisible()

    // Should show empty state since no recurring classes exist
    await expect(page.getByText('No Recurring Classes')).toBeVisible()
    await expect(page.getByText('Set up recurring class schedules to automate your class management.')).toBeVisible()

    // Should show action buttons
    await expect(page.getByText('Manage Class Types')).toBeVisible()
    await expect(page.getByText('Create Classes')).toBeVisible()

    // Should NOT show any blocking alerts or error modals
    await expect(page.locator('[role="alert"]')).toHaveCount(0)
    await expect(page.locator('.swal-modal, .alert-modal')).toHaveCount(0)
  })

  test('should show stats correctly in empty state', async ({ page }) => {
    await page.goto('/classes/recurring')

    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Recurring Classes')

    // Check stats show zeros for empty state
    await expect(page.getByText('Total Recurring Series')).toBeVisible()
    await expect(page.locator('text=0').first()).toBeVisible() // Total count should be 0

    await expect(page.getByText('Weekly Classes')).toBeVisible()
    await expect(page.getByText('Total Capacity')).toBeVisible()
    await expect(page.getByText('Average Occupancy')).toBeVisible()
  })

  test('should navigate to class types when Manage Class Types is clicked', async ({ page }) => {
    await page.goto('/classes/recurring')

    // Wait for page to load
    await expect(page.getByText('No Recurring Classes')).toBeVisible()

    // Click Manage Class Types button
    const manageButton = page.getByText('Manage Class Types').first()
    await manageButton.click()

    // Should navigate to class-types page
    await expect(page).toHaveURL('/class-types')
  })

  test('should navigate to classes page when Create Classes is clicked', async ({ page }) => {
    await page.goto('/classes/recurring')

    // Wait for page to load
    await expect(page.getByText('No Recurring Classes')).toBeVisible()

    // Click Create Classes button
    const createButton = page.getByText('Create Classes').first()
    await createButton.click()

    // Should navigate to classes page
    await expect(page).toHaveURL('/classes')
  })

  test('should display recurring classes when data exists', async ({ page }) => {
    // Mock API response with recurring classes data
    await page.route('**/rest/v1/class_sessions*', async (route) => {
      const url = route.request().url()
      if (url.includes('is_recurring=eq.true')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: '1',
              name: 'Morning Yoga',
              description: 'Relaxing yoga session',
              program_id: 'prog-1',
              start_time: '2024-01-15T09:00:00Z',
              end_time: '2024-01-15T10:00:00Z',
              max_capacity: 20,
              current_bookings: 15,
              location: 'Studio A',
              is_recurring: true,
              recurrence_pattern: 'FREQ=WEEKLY;BYDAY=MO,WE,FR',
              programs: { name: 'Yoga Class', is_active: true }
            },
            {
              id: '2',
              name: 'HIIT Training',
              description: 'High intensity workout',
              program_id: 'prog-2',
              start_time: '2024-01-15T18:00:00Z',
              end_time: '2024-01-15T19:00:00Z',
              max_capacity: 15,
              current_bookings: 10,
              location: 'Main Gym',
              is_recurring: true,
              recurrence_pattern: 'FREQ=WEEKLY;BYDAY=TU,TH',
              programs: { name: 'HIIT Program', is_active: true }
            }
          ])
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/classes/recurring')

    // Wait for data to load
    await expect(page.getByText('Morning Yoga')).toBeVisible()
    await expect(page.getByText('HIIT Training')).toBeVisible()

    // Check that stats are calculated correctly
    await expect(page.getByText('2').first()).toBeVisible() // Total Recurring Series

    // Should show table with class data
    await expect(page.getByText('Studio A')).toBeVisible()
    await expect(page.getByText('Main Gym')).toBeVisible()
    await expect(page.getByText('Weekly')).toBeVisible()

    // Should show capacity information
    await expect(page.getByText('15/20')).toBeVisible() // Morning Yoga capacity
    await expect(page.getByText('10/15')).toBeVisible() // HIIT Training capacity
  })

  test('should handle API errors gracefully without blocking alerts', async ({ page }) => {
    // Mock API error response
    await page.route('**/rest/v1/class_sessions*', async (route) => {
      const url = route.request().url()
      if (url.includes('is_recurring=eq.true')) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: { message: 'Database connection failed' }
          })
        })
      } else {
        await route.continue()
      }
    })

    await page.goto('/classes/recurring')

    // Should show inline error message, not blocking alert
    await expect(page.getByText('Failed to load recurring classes. Please try again.')).toBeVisible()

    // Should NOT show blocking alert or modal
    await expect(page.locator('[role="alert"]')).toHaveCount(0)
    await expect(page.locator('.swal-modal, .alert-modal')).toHaveCount(0)

    // Page should still be functional
    await expect(page.locator('h1')).toContainText('Recurring Classes')
    await expect(page.getByText('Manage Class Types')).toBeVisible()
  })

  test('should show loading state initially', async ({ page }) => {
    // Delay the API response to test loading state
    await page.route('**/rest/v1/class_sessions*', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000))
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      })
    })

    await page.goto('/classes/recurring')

    // Should show loading spinner initially
    await expect(page.getByText('Loading recurring classes...')).toBeVisible()

    // After loading completes, should show empty state
    await expect(page.getByText('No Recurring Classes')).toBeVisible({ timeout: 5000 })
  })

  test('should not attempt to load data without organization ID', async ({ page }) => {
    // Mock no organization response
    await page.route('**/rest/v1/user_organizations*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      })
    })

    let classSessionsRequestMade = false
    await page.route('**/rest/v1/class_sessions*', async (route) => {
      classSessionsRequestMade = true
      await route.continue()
    })

    await page.goto('/classes/recurring')

    // Wait a moment to ensure no requests are made
    await page.waitForTimeout(1000)

    // Should not have made a request to class_sessions without organization ID
    expect(classSessionsRequestMade).toBe(false)
  })
})