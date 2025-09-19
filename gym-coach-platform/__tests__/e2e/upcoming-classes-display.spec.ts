import { test, expect, Page } from '@playwright/test'

// Test configuration
const CLIENT_DASHBOARD_URL = 'http://localhost:3003/client/dashboard'
const TIMEOUT = 30000

// Mock data for testing
const mockUpcomingSessions = [
  {
    id: 'session-1',
    title: 'Personal Training - Upper Body',
    session_type: 'personal_training',
    start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
    end_time: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(), // Tomorrow + 1 hour
    trainer_name: 'John Smith',
    location: 'Gym Floor A',
    status: 'scheduled',
    cost: 50
  },
  {
    id: 'session-2',
    title: 'Yoga Flow Class',
    session_type: 'gym_class',
    start_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
    end_time: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000).toISOString(), // 3 days + 90 mins
    trainer_name: 'Sarah Johnson',
    location: 'Studio B',
    status: 'scheduled',
    cost: 25
  },
  {
    id: 'session-3',
    title: 'Nutrition Coaching Call',
    session_type: 'coaching_call',
    start_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week from now
    end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 45 * 60 * 1000).toISOString(), // 1 week + 45 mins
    trainer_name: 'Dr. Emma Wilson',
    location: 'Online',
    status: 'scheduled',
    cost: 75
  }
]

const mockPastSession = {
  id: 'session-past',
  title: 'Past Session',
  session_type: 'personal_training',
  start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday
  end_time: new Date(Date.now() - 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
  trainer_name: 'Past Trainer',
  location: 'Past Location',
  status: 'completed',
  cost: 50
}

const mockCancelledSession = {
  id: 'session-cancelled',
  title: 'Cancelled Session',
  session_type: 'gym_class',
  start_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
  end_time: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
  trainer_name: 'Cancelled Trainer',
  location: 'Cancelled Location',
  status: 'cancelled',
  cost: 30
}

test.describe('Upcoming Classes Display - E2E Tests', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()

    // Enable accessibility testing
    await page.setViewportSize({ width: 1280, height: 720 })
  })

  test.afterEach(async () => {
    await page.close()
  })

  test.describe('Dashboard Load Test', () => {
    test('should navigate to client dashboard successfully', async () => {
      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle', { timeout: TIMEOUT })

      // Verify we're on the client dashboard
      await expect(page).toHaveURL(CLIENT_DASHBOARD_URL)
      await expect(page.getByText('Welcome back')).toBeVisible()
    })

    test('should display upcoming sessions section', async () => {
      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Verify upcoming sessions card exists
      const upcomingSessionsCard = page.locator('div').filter({ hasText: 'Upcoming Sessions' }).first()
      await expect(upcomingSessionsCard).toBeVisible()

      // Verify the section has proper heading
      await expect(page.getByRole('heading', { name: 'Upcoming Sessions' })).toBeVisible()

      // Verify "View all" link exists
      await expect(page.getByRole('link', { name: 'View all' })).toBeVisible()
    })

    test('should show loading state while fetching sessions', async () => {
      // Intercept API call to delay response
      await page.route('**/api/bookings**', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000)) // 2 second delay
        route.continue()
      })

      await page.goto(CLIENT_DASHBOARD_URL)

      // Should show loading skeleton
      const loadingSkeletons = page.locator('.animate-pulse')
      await expect(loadingSkeletons.first()).toBeVisible()

      // Loading indicators should have proper structure
      await expect(page.locator('.animate-pulse .bg-gray-200')).toHaveCount(6) // 2 skeletons * 3 lines each
    })

    test('should handle API failure gracefully', async () => {
      // Mock API failure
      await page.route('**/api/bookings**', route => {
        route.abort('failed')
      })

      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Should show empty state instead of error
      await expect(page.getByText('No upcoming sessions')).toBeVisible()
      await expect(page.getByText('Book your first session')).toBeVisible()

      // Should show error toast
      await expect(page.locator('.Toaster')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText(/Unable to load sessions|Failed to load upcoming sessions/)).toBeVisible()
    })

    test('should handle unauthorized access properly', async () => {
      // Mock 401 response
      await page.route('**/api/bookings**', route => {
        route.fulfill({
          status: 401,
          body: JSON.stringify({ error: 'Unauthorized' })
        })
      })

      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Should show appropriate error message
      await expect(page.locator('.Toaster')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('Please sign in to view your sessions')).toBeVisible()

      // Should show empty state
      await expect(page.getByText('No upcoming sessions')).toBeVisible()
    })
  })

  test.describe('Session Display Test', () => {
    test('should display real booked sessions with correct details', async () => {
      // Mock successful API response with sessions
      await page.route('**/api/bookings**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            bookings: mockUpcomingSessions
          })
        })
      })

      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Verify all sessions are displayed (only first 3 per dashboard logic)
      for (const session of mockUpcomingSessions) {
        await expect(page.getByText(session.title)).toBeVisible()
        await expect(page.getByText(session.trainer_name)).toBeVisible()
        await expect(page.getByText(session.location)).toBeVisible()
      }

      // Verify session badges show correct types
      await expect(page.getByText('personal training')).toBeVisible()
      await expect(page.getByText('gym class')).toBeVisible()
      await expect(page.getByText('coaching call')).toBeVisible()
    })

    test('should show session details with proper formatting', async () => {
      await page.route('**/api/bookings**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            bookings: [mockUpcomingSessions[0]] // Just first session
          })
        })
      })

      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      const sessionCard = page.locator('div').filter({ hasText: mockUpcomingSessions[0].title }).first()

      // Verify session structure
      await expect(sessionCard.getByText(mockUpcomingSessions[0].title)).toBeVisible()
      await expect(sessionCard.getByText('personal training')).toBeVisible()
      await expect(sessionCard.getByText(`${mockUpcomingSessions[0].trainer_name} •`)).toBeVisible()
      await expect(sessionCard.getByText(`${mockUpcomingSessions[0].location} •`)).toBeVisible()
      await expect(sessionCard.getByText('60 mins')).toBeVisible()

      // Verify manage button exists
      await expect(sessionCard.getByRole('button', { name: 'Manage' })).toBeVisible()
    })

    test('should filter out past sessions', async () => {
      // Mock API response including past session
      await page.route('**/api/bookings**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            bookings: [...mockUpcomingSessions, mockPastSession]
          })
        })
      })

      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Should show upcoming sessions
      await expect(page.getByText(mockUpcomingSessions[0].title)).toBeVisible()

      // Should NOT show past session
      await expect(page.getByText(mockPastSession.title)).not.toBeVisible()
    })

    test('should filter out cancelled sessions', async () => {
      // Mock API response including cancelled session
      await page.route('**/api/bookings**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            bookings: [...mockUpcomingSessions, mockCancelledSession]
          })
        })
      })

      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Should show upcoming sessions
      await expect(page.getByText(mockUpcomingSessions[0].title)).toBeVisible()

      // Should NOT show cancelled session
      await expect(page.getByText(mockCancelledSession.title)).not.toBeVisible()
    })

    test('should limit to 3 sessions on dashboard', async () => {
      // Create more than 3 sessions
      const manySessions = [...mockUpcomingSessions]
      for (let i = 0; i < 5; i++) {
        manySessions.push({
          ...mockUpcomingSessions[0],
          id: `extra-session-${i}`,
          title: `Extra Session ${i + 1}`,
          start_time: new Date(Date.now() + (10 + i) * 24 * 60 * 60 * 1000).toISOString()
        })
      }

      await page.route('**/api/bookings**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            bookings: manySessions
          })
        })
      })

      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Should only show first 3 sessions
      const sessionCards = page.locator('[data-testid*="session-card"], div:has(button:text("Manage"))')
      await expect(sessionCards).toHaveCount(3)
    })
  })

  test.describe('Time Display Test', () => {
    test('should display dates in correct local timezone format', async () => {
      await page.route('**/api/bookings**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            bookings: [mockUpcomingSessions[0]]
          })
        })
      })

      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Verify date format (should be in en-GB format: "Wed 20 Sep")
      const tomorrow = new Date(mockUpcomingSessions[0].start_time)
      const expectedDateFormat = tomorrow.toLocaleDateString('en-GB', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      })

      await expect(page.getByText(new RegExp(expectedDateFormat))).toBeVisible()
    })

    test('should display times in correct 24-hour format', async () => {
      await page.route('**/api/bookings**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            bookings: [mockUpcomingSessions[0]]
          })
        })
      })

      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Verify time format (should be HH:MM)
      const sessionTime = new Date(mockUpcomingSessions[0].start_time)
      const expectedTimeFormat = sessionTime.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit'
      })

      await expect(page.getByText(new RegExp(expectedTimeFormat))).toBeVisible()
    })

    test('should calculate and display correct session duration', async () => {
      await page.route('**/api/bookings**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            bookings: mockUpcomingSessions
          })
        })
      })

      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Verify different session durations
      await expect(page.getByText('60 mins')).toBeVisible() // Personal training
      await expect(page.getByText('90 mins')).toBeVisible() // Yoga class
      await expect(page.getByText('45 mins')).toBeVisible() // Coaching call
    })
  })

  test.describe('Empty State Test', () => {
    test('should show empty state when no sessions are available', async () => {
      // Mock empty response
      await page.route('**/api/bookings**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            bookings: []
          })
        })
      })

      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Verify empty state elements
      await expect(page.getByText('No upcoming sessions')).toBeVisible()
      await expect(page.getByRole('link', { name: 'Book your first session' })).toBeVisible()

      // Verify empty state icon (Calendar icon)
      const calendarIcon = page.locator('svg').filter({ hasText: '' }).first() // Calendar lucide icon
      await expect(calendarIcon).toBeVisible()
    })

    test('should provide working link to booking page in empty state', async () => {
      await page.route('**/api/bookings**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            bookings: []
          })
        })
      })

      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Click the booking link
      const bookingLink = page.getByRole('link', { name: 'Book your first session' })
      await expect(bookingLink).toHaveAttribute('href', '/client/booking')
    })

    test('should show Book a Session CTA in welcome section', async () => {
      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Verify main CTA button in welcome section
      const mainCTAButton = page.getByRole('link').filter({ hasText: 'Book a Session' }).first()
      await expect(mainCTAButton).toBeVisible()
      await expect(mainCTAButton).toHaveAttribute('href', '/client/booking')
    })
  })

  test.describe('Data Accuracy Test', () => {
    test('should request data with correct API parameters', async () => {
      let capturedUrl = ''

      // Capture the API request
      await page.route('**/api/bookings**', route => {
        capturedUrl = route.request().url()
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            bookings: mockUpcomingSessions
          })
        })
      })

      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Verify API was called with correct parameters
      expect(capturedUrl).toContain('/api/bookings')
      expect(capturedUrl).toContain('startDate=')
      expect(capturedUrl).toContain('memberId=')

      // Verify startDate is current time or later
      const url = new URL(capturedUrl)
      const startDate = url.searchParams.get('startDate')
      expect(new Date(startDate!).getTime()).toBeGreaterThanOrEqual(Date.now() - 60000) // Within last minute
    })

    test('should display sessions in chronological order', async () => {
      // Shuffle the sessions to test sorting
      const shuffledSessions = [mockUpcomingSessions[2], mockUpcomingSessions[0], mockUpcomingSessions[1]]

      await page.route('**/api/bookings**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            bookings: shuffledSessions
          })
        })
      })

      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Get all session cards in order
      const sessionCards = page.locator('div:has(button:text("Manage"))')

      // Verify they appear in chronological order (earliest first)
      await expect(sessionCards.first()).toContainText('Personal Training - Upper Body') // Tomorrow
      await expect(sessionCards.nth(1)).toContainText('Yoga Flow Class') // 3 days
      await expect(sessionCards.nth(2)).toContainText('Nutrition Coaching Call') // 1 week
    })

    test('should handle sessions without optional fields gracefully', async () => {
      const incompleteSession = {
        id: 'incomplete-session',
        title: 'Basic Session',
        session_type: 'gym_class',
        start_time: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        end_time: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
        status: 'scheduled',
        cost: 0
        // Missing trainer_name, location
      }

      await page.route('**/api/bookings**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            bookings: [incompleteSession]
          })
        })
      })

      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Should still display the session
      await expect(page.getByText('Basic Session')).toBeVisible()
      await expect(page.getByText('gym class')).toBeVisible()
      await expect(page.getByText('60 mins')).toBeVisible()
    })
  })

  test.describe('Authentication Test', () => {
    test('should handle authenticated user correctly', async () => {
      // Mock successful auth and sessions
      await page.route('**/api/bookings**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            bookings: mockUpcomingSessions
          })
        })
      })

      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Should show user-specific content
      await expect(page.getByText('Welcome back')).toBeVisible()
      await expect(page.getByText(mockUpcomingSessions[0].title)).toBeVisible()
    })

    test('should handle unauthenticated user with proper error message', async () => {
      // Mock 401 unauthorized response
      await page.route('**/api/bookings**', route => {
        route.fulfill({
          status: 401,
          body: JSON.stringify({ error: 'Unauthorized' })
        })
      })

      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Should show error toast
      await expect(page.locator('.Toaster')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('Please sign in to view your sessions')).toBeVisible()

      // Should show empty state
      await expect(page.getByText('No upcoming sessions')).toBeVisible()
    })
  })

  test.describe('Accessibility Features', () => {
    test('should have proper ARIA labels and roles', async () => {
      await page.route('**/api/bookings**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            bookings: [mockUpcomingSessions[0]]
          })
        })
      })

      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Check heading structure
      await expect(page.getByRole('heading', { name: 'Upcoming Sessions' })).toBeVisible()

      // Check button accessibility
      const manageButton = page.getByRole('button', { name: 'Manage' })
      await expect(manageButton).toBeVisible()

      // Check link accessibility
      const viewAllLink = page.getByRole('link', { name: 'View all' })
      await expect(viewAllLink).toBeVisible()
      await expect(viewAllLink).toHaveAttribute('href', '/client/booking')
    })

    test('should support keyboard navigation', async () => {
      await page.route('**/api/bookings**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            bookings: mockUpcomingSessions
          })
        })
      })

      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Tab through interactive elements
      await page.keyboard.press('Tab')

      // Find and focus on first manage button
      const firstManageButton = page.getByRole('button', { name: 'Manage' }).first()
      await firstManageButton.focus()
      await expect(firstManageButton).toBeFocused()

      // Press Enter should work
      await page.keyboard.press('Enter')
      // This would trigger the manage action in a real implementation
    })

    test('should provide proper focus indicators', async () => {
      await page.route('**/api/bookings**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            bookings: [mockUpcomingSessions[0]]
          })
        })
      })

      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Focus on manage button and verify focus styles
      const manageButton = page.getByRole('button', { name: 'Manage' })
      await manageButton.focus()

      // Check if focus indicator is visible (button should have focus styles)
      await expect(manageButton).toBeFocused()
    })
  })

  test.describe('Responsive Design', () => {
    test('should work correctly on mobile viewport', async () => {
      await page.setViewportSize({ width: 375, height: 667 })

      await page.route('**/api/bookings**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            bookings: [mockUpcomingSessions[0]]
          })
        })
      })

      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Verify upcoming sessions section is still visible and functional
      await expect(page.getByText('Upcoming Sessions')).toBeVisible()
      await expect(page.getByText(mockUpcomingSessions[0].title)).toBeVisible()

      // Verify manage button is still accessible
      const manageButton = page.getByRole('button', { name: 'Manage' })
      await expect(manageButton).toBeVisible()
    })

    test('should work correctly on tablet viewport', async () => {
      await page.setViewportSize({ width: 768, height: 1024 })

      await page.route('**/api/bookings**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            bookings: mockUpcomingSessions
          })
        })
      })

      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')

      // Verify layout works on tablet
      await expect(page.getByText('Upcoming Sessions')).toBeVisible()

      // All sessions should be visible
      for (const session of mockUpcomingSessions) {
        await expect(page.getByText(session.title)).toBeVisible()
      }
    })
  })

  test.describe('Performance Tests', () => {
    test('should load dashboard within acceptable time', async () => {
      await page.route('**/api/bookings**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            bookings: mockUpcomingSessions
          })
        })
      })

      const startTime = Date.now()
      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime

      // Dashboard should load within 5 seconds
      expect(loadTime).toBeLessThan(5000)

      // Verify content is loaded
      await expect(page.getByText('Upcoming Sessions')).toBeVisible()
    })

    test('should handle large session datasets efficiently', async () => {
      // Create a large dataset
      const largeSessions = []
      for (let i = 0; i < 100; i++) {
        largeSessions.push({
          ...mockUpcomingSessions[0],
          id: `session-${i}`,
          title: `Session ${i + 1}`,
          start_time: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000).toISOString()
        })
      }

      await page.route('**/api/bookings**', route => {
        route.fulfill({
          status: 200,
          body: JSON.stringify({
            bookings: largeSessions
          })
        })
      })

      const startTime = Date.now()
      await page.goto(CLIENT_DASHBOARD_URL)
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime

      // Should still load efficiently
      expect(loadTime).toBeLessThan(10000) // 10 seconds for large dataset

      // Should only display first 3 sessions (performance optimization)
      const sessionCards = page.locator('div:has(button:text("Manage"))')
      await expect(sessionCards).toHaveCount(3)
    })
  })
})