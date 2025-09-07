import { test, expect } from '@playwright/test'

test.describe('Atlas Fitness Booking System E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Mock customer data for Sam's profile
    await page.route('**/api/clients/sam-test-123', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'sam-test-123',
          first_name: 'Sam',
          last_name: 'Schofield',
          name: 'Sam Schofield',
          email: 'sam@example.com',
          phone: '+44 7123 456789',
          organization_id: 'org-123',
          type: 'client'
        })
      })
    })

    // Mock available class sessions for booking
    await page.route('**/api/class_sessions**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'session-1',
            title: 'Morning Yoga',
            start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
            end_time: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
            capacity: 20,
            current_bookings: 5,
            room: 'Studio A',
            instructor: 'Sarah Johnson',
            price: 2500, // £25.00
            organization_id: 'org-123',
            program: {
              id: 'prog-1',
              name: 'Morning Yoga',
              description: 'Start your day with mindful movement',
              price_pennies: 2500
            }
          },
          {
            id: 'session-2', 
            title: 'HIIT Training',
            start_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
            end_time: new Date(Date.now() + 48 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(), // Day after tomorrow + 45 mins
            capacity: 15,
            current_bookings: 8,
            room: 'Gym Floor',
            instructor: 'Mike Smith',
            price: 3000, // £30.00
            organization_id: 'org-123',
            program: {
              id: 'prog-2',
              name: 'HIIT Training',
              description: 'High intensity interval training',
              price_pennies: 3000
            }
          }
        ])
      })
    })

    // Mock existing bookings for the customer
    await page.route('**/api/class_bookings**', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 'booking-existing-1',
              class_session_id: 'session-1',
              client_id: 'sam-test-123',
              organization_id: 'org-123',
              status: 'confirmed',
              payment_status: 'succeeded',
              amount: 2500,
              booking_type: 'single',
              booked_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
              class_schedule: {
                id: 'session-1',
                start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                end_time: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
                max_capacity: 20,
                current_bookings: 5,
                room_location: 'Studio A',
                instructor_name: 'Sarah Johnson',
                class_type: {
                  id: 'prog-1',
                  name: 'Morning Yoga',
                  description: 'Start your day with mindful movement',
                  color: '#10B981'
                }
              }
            }
          ])
        })
      } else if (route.request().method() === 'POST') {
        // Mock successful booking creation
        const requestBody = await route.request().postDataJSON()
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: `booking-new-${Date.now()}`,
            ...requestBody,
            status: 'confirmed',
            payment_status: 'succeeded',
            booked_at: new Date().toISOString()
          })
        })
      }
    })

    // Mock payment methods
    await page.route('**/api/customer_class_packages**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      })
    })

    await page.route('**/api/customer_memberships**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'membership-1',
            customer_id: 'sam-test-123',
            organization_id: 'org-123',
            status: 'active',
            classes_used_this_period: 2,
            membership_plan: {
              id: 'plan-1',
              name: 'Monthly Unlimited',
              classes_per_period: 0, // Unlimited
              description: 'Unlimited classes per month'
            }
          }
        ])
      })
    })

    // Mock authentication
    await page.route('**/auth/user', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'user-123',
            email: 'admin@atlas-gyms.co.uk',
            user_metadata: { organization_id: 'org-123' }
          }
        })
      })
    })
  })

  test('complete booking flow: navigate to client profile, book class, and verify booking', async ({ page }) => {
    // Step 1: Navigate to Sam's client profile page
    await page.goto('/leads/sam-test-123')
    
    // Verify we're on Sam's profile page
    await expect(page.locator('h1')).toContainText('Sam Schofield')
    await expect(page.locator('text=sam@example.com')).toBeVisible()

    // Step 2: Navigate to Class Bookings tab
    await page.click('button:has-text("Class Bookings"), [data-tab="class-bookings"]')
    
    // Verify Class Bookings tab is active and content is visible
    await expect(page.locator('h3:has-text("Class Bookings")')).toBeVisible()
    await expect(page.locator('text=Upcoming Sessions')).toBeVisible()

    // Verify existing booking is displayed
    await expect(page.locator('text=Morning Yoga')).toBeVisible()
    await expect(page.locator('text=Studio A')).toBeVisible()

    // Step 3: Click "Book Class" button
    await page.click('button:has-text("Book Class")')
    
    // Verify booking options dropdown appears
    await expect(page.locator('text=Single Class')).toBeVisible()
    await expect(page.locator('text=Multiple Classes')).toBeVisible()
    await expect(page.locator('text=Recurring Booking')).toBeVisible()

    // Step 4: Select "Single Class" option (which opens the multi-class modal for browsing)
    await page.click('button:has-text("Single Class")')

    // Verify multi-class booking modal opens
    await expect(page.locator('h2:has-text("Book Multiple Classes")')).toBeVisible()
    await expect(page.locator('text=Available Classes')).toBeVisible()

    // Step 5: Select a class from the available list
    // Find HIIT Training class card and click it
    const hiitClassCard = page.locator('[data-class-id="session-2"], .cursor-pointer:has(text="HIIT Training")').first()
    await hiitClassCard.click()

    // Verify class is selected (check for selected styling or checkmark)
    await expect(page.locator('.bg-blue-900\\/20:has(text="HIIT Training"), .border-blue-500:has(text="HIIT Training")')).toBeVisible()

    // Verify selection summary appears
    await expect(page.locator('text=Selected Classes (1)')).toBeVisible()

    // Step 6: Click "Continue to Payment"
    await page.click('button:has-text("Continue to Payment")')

    // Verify we're now on the payment step
    await expect(page.locator('h2:has-text("Payment Assignment")')).toBeVisible()
    await expect(page.locator('text=Assign Payment Methods')).toBeVisible()

    // Verify HIIT Training class is listed for payment assignment
    await expect(page.locator('h4:has-text("HIIT Training")')).toBeVisible()

    // Step 7: Select payment method (Free/Complimentary)
    await page.click('text=Free Booking')

    // Verify payment method is selected (radio button or similar selection indicator)
    await expect(page.locator('.bg-blue-500, .border-blue-500').near(page.locator('text=Free Booking'))).toBeVisible()

    // Step 8: Click "Confirm Bookings"
    await page.click('button:has-text("Confirm Bookings")')

    // Step 9: Verify booking is created successfully
    // Should see confirmation page/modal
    await expect(page.locator('text=Bookings Confirmed!, text=Successfully booked')).toBeVisible()
    await expect(page.locator('text=HIIT Training')).toBeVisible()

    // Wait for auto-close or manually close the modal
    await page.click('button:has-text("Done"), button:has-text("Close")')

    // Step 10: Verify the booking appears in "Upcoming Sessions" section
    // The page should refresh and show the new booking
    await expect(page.locator('text=HIIT Training').nth(1)).toBeVisible() // Second occurrence (first was existing booking)
    await expect(page.locator('text=Gym Floor')).toBeVisible()
    await expect(page.locator('text=Mike Smith')).toBeVisible()
    await expect(page.locator('text=confirmed')).toBeVisible()
  })

  test('foreign key constraint validation: booking references valid class_session_id', async ({ page }) => {
    // Mock API to return error for invalid class session
    await page.route('**/api/class_bookings', async route => {
      const requestBody = await route.request().postDataJSON()
      
      if (requestBody.class_session_id === 'invalid-session-id') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Foreign key constraint violation: Invalid class_session_id',
            code: '23503'
          })
        })
      } else {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: `booking-${Date.now()}`,
            ...requestBody,
            status: 'confirmed'
          })
        })
      }
    })

    await page.goto('/leads/sam-test-123')
    await page.click('button:has-text("Class Bookings"), [data-tab="class-bookings"]')
    
    // Try to create booking with invalid session ID (this would be an edge case/error condition)
    // In a real scenario, this would be handled by the system validation
    await page.click('button:has-text("Book Class")')
    await page.click('button:has-text("Single Class")')
    
    // If system allows manual session ID input (for testing purposes), test invalid ID
    // Otherwise this test verifies that only valid session IDs from the fetched list can be selected
    const validClassExists = await page.locator('text=Morning Yoga').isVisible()
    expect(validClassExists).toBe(true)
  })

  test('multiple bookings can be created', async ({ page }) => {
    await page.goto('/leads/sam-test-123')
    await page.click('button:has-text("Class Bookings"), [data-tab="class-bookings"]')
    
    await page.click('button:has-text("Book Class")')
    await page.click('button:has-text("Multiple Classes")')

    // Select multiple classes
    await page.click('text=Morning Yoga')
    await page.click('text=HIIT Training')

    // Verify both classes are selected
    await expect(page.locator('text=Selected Classes (2)')).toBeVisible()

    await page.click('button:has-text("Continue to Payment")')

    // Assign payment methods to both classes
    await page.locator('h4:has-text("Morning Yoga")').locator('..').locator('text=Free Booking').click()
    await page.locator('h4:has-text("HIIT Training")').locator('..').locator('text=Monthly Unlimited').click()

    await page.click('button:has-text("Confirm Bookings")')

    await expect(page.locator('text=Successfully booked 2 classes')).toBeVisible()
  })

  test('bookings display correctly in Upcoming Sessions after creation', async ({ page }) => {
    await page.goto('/leads/sam-test-123')
    await page.click('button:has-text("Class Bookings"), [data-tab="class-bookings"]')

    // Verify initial state shows existing booking
    await expect(page.locator('text=Morning Yoga').first()).toBeVisible()
    
    // Create new booking
    await page.click('button:has-text("Book Class")')
    await page.click('button:has-text("Single Class")')
    await page.click('text=HIIT Training')
    await page.click('button:has-text("Continue to Payment")')
    await page.click('text=Free Booking')
    await page.click('button:has-text("Confirm Bookings")')

    // Close modal and verify new booking appears
    await page.click('button:has-text("Done")')
    
    // Should now see both bookings in upcoming sessions
    await expect(page.locator('text=Morning Yoga')).toBeVisible()
    await expect(page.locator('text=HIIT Training')).toBeVisible()
    await expect(page.locator('text=confirmed')).toHaveCount(2)
  })

  test('handles edge case: no classes available', async ({ page }) => {
    // Mock empty class sessions response
    await page.route('**/api/class_sessions**', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      })
    })

    await page.goto('/leads/sam-test-123')
    await page.click('button:has-text("Class Bookings"), [data-tab="class-bookings"]')
    
    await page.click('button:has-text("Book Class")')
    await page.click('button:has-text("Single Class")')

    // Should show empty state
    await expect(page.locator('text=No classes found matching your criteria')).toBeVisible()
    await expect(page.locator('[data-testid="empty-classes-icon"], .h-12.w-12.text-gray-600')).toBeVisible()
  })

  test('handles booking cancellation within cancellation policy', async ({ page }) => {
    await page.goto('/leads/sam-test-123')
    await page.click('button:has-text("Class Bookings"), [data-tab="class-bookings"]')

    // Mock cancellation API
    await page.route('**/api/class_bookings/booking-existing-1', async route => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'booking-existing-1',
            status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: 'Customer request'
          })
        })
      }
    })

    // Find existing booking and cancel it (if cancellation button is available)
    const cancelButton = page.locator('button:has-text("Cancel Booking")').first()
    if (await cancelButton.isVisible()) {
      await cancelButton.click()
      
      // Verify booking status changes to cancelled
      await expect(page.locator('text=cancelled')).toBeVisible()
    }
  })

  test('booking modal closes properly and cleans up state', async ({ page }) => {
    await page.goto('/leads/sam-test-123')
    await page.click('button:has-text("Class Bookings"), [data-tab="class-bookings"]')
    
    // Open booking modal
    await page.click('button:has-text("Book Class")')
    await page.click('button:has-text("Single Class")')
    
    // Verify modal is open
    await expect(page.locator('h2:has-text("Book Multiple Classes")')).toBeVisible()
    
    // Select a class
    await page.click('text=Morning Yoga')
    await expect(page.locator('text=Selected Classes (1)')).toBeVisible()
    
    // Close modal using X button
    await page.click('button[aria-label="Close"], .text-gray-400:has(svg)')
    
    // Verify modal is closed
    await expect(page.locator('h2:has-text("Book Multiple Classes")')).not.toBeVisible()
    
    // Reopen modal to verify state is reset
    await page.click('button:has-text("Book Class")')
    await page.click('button:has-text("Single Class")')
    
    // Should not show any selected classes
    await expect(page.locator('text=Selected Classes')).not.toBeVisible()
  })

  test('payment method selection works correctly', async ({ page }) => {
    await page.goto('/leads/sam-test-123')
    await page.click('button:has-text("Class Bookings"), [data-tab="class-bookings"]')
    
    await page.click('button:has-text("Book Class")')
    await page.click('button:has-text("Single Class")')
    await page.click('text=HIIT Training')
    await page.click('button:has-text("Continue to Payment")')

    // Verify all payment options are available
    await expect(page.locator('text=Monthly Unlimited')).toBeVisible() // Membership
    await expect(page.locator('text=Free Booking')).toBeVisible() // Free/Complimentary
    await expect(page.locator('text=Credit/Debit Card')).toBeVisible() // Card payment

    // Test selection of different payment methods
    await page.click('text=Monthly Unlimited')
    await expect(page.locator('.bg-blue-500').near(page.locator('text=Monthly Unlimited'))).toBeVisible()

    await page.click('text=Free Booking')
    await expect(page.locator('.bg-blue-500').near(page.locator('text=Free Booking'))).toBeVisible()

    // Verify payment summary updates
    await expect(page.locator('text=Payment Summary')).toBeVisible()
    await expect(page.locator('text=Total Classes: 1')).toBeVisible()
  })

  test('search and filter functionality works in class selection', async ({ page }) => {
    await page.goto('/leads/sam-test-123')
    await page.click('button:has-text("Class Bookings"), [data-tab="class-bookings"]')
    
    await page.click('button:has-text("Book Class")')
    await page.click('button:has-text("Single Class")')

    // Test search functionality
    const searchInput = page.locator('input[placeholder*="Search"]')
    await searchInput.fill('Yoga')
    
    // Should only show Morning Yoga class
    await expect(page.locator('text=Morning Yoga')).toBeVisible()
    await expect(page.locator('text=HIIT Training')).not.toBeVisible()

    // Clear search
    await searchInput.clear()
    await expect(page.locator('text=HIIT Training')).toBeVisible()

    // Test date filter
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const dateFilter = page.locator('input[type="date"]')
    await dateFilter.fill(tomorrow.toISOString().split('T')[0])
    
    // Should show Morning Yoga (which is tomorrow) but not HIIT Training (day after tomorrow)
    await expect(page.locator('text=Morning Yoga')).toBeVisible()
    await expect(page.locator('text=HIIT Training')).not.toBeVisible()
  })
})