import { test, expect, Page } from '@playwright/test'

// Test configuration
const DASHBOARD_URL = 'http://localhost:3003/dashboard'
const TIMEOUT = 30000

test.describe('Dashboard Action Fixes - E2E Tests', () => {
  let page: Page

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage()
    
    // Enable accessibility testing
    await page.setViewportSize({ width: 1280, height: 720 })
    
    // Navigate to dashboard
    await page.goto(DASHBOARD_URL)
    
    // Wait for the page to load completely
    await page.waitForLoadState('networkidle')
  })

  test.afterEach(async () => {
    await page.close()
  })

  test.describe('Plus Button Functionality', () => {
    test('should display plus button with correct attributes', async () => {
      const plusButton = page.getByTestId('plus-button')
      
      await expect(plusButton).toBeVisible()
      await expect(plusButton).toHaveAttribute('aria-label', 'Create new item')
      await expect(plusButton).toHaveAttribute('title', 'Create new item')
    })

    test('should open popover menu when plus button is clicked', async () => {
      const plusButton = page.getByTestId('plus-button')
      await plusButton.click()
      
      // Verify all three options are visible
      await expect(page.getByTestId('create-lead-option')).toBeVisible()
      await expect(page.getByTestId('create-task-option')).toBeVisible()
      await expect(page.getByTestId('schedule-meeting-option')).toBeVisible()
    })

    test('should navigate to leads page when Create lead is clicked', async () => {
      const plusButton = page.getByTestId('plus-button')
      await plusButton.click()
      
      const createLeadOption = page.getByTestId('create-lead-option')
      await expect(createLeadOption).toHaveText('Create lead')
      
      // Click and verify navigation
      await createLeadOption.click()
      await page.waitForURL(/.*\/dashboard\/leads\?action=new.*/, { timeout: TIMEOUT })
      
      expect(page.url()).toContain('/dashboard/leads?action=new')
    })

    test('should show Create task as disabled with coming soon text', async () => {
      const plusButton = page.getByTestId('plus-button')
      await plusButton.click()
      
      const createTaskOption = page.getByTestId('create-task-option')
      
      await expect(createTaskOption).toBeVisible()
      await expect(createTaskOption).toHaveText(/Create task.*Coming soon/)
      await expect(createTaskOption).toBeDisabled()
      
      // Verify disabled styling
      await expect(createTaskOption).toHaveClass(/opacity-50/)
      await expect(createTaskOption).toHaveClass(/cursor-not-allowed/)
    })

    test('should show toast when Create task is clicked despite being disabled', async () => {
      const plusButton = page.getByTestId('plus-button')
      await plusButton.click()
      
      const createTaskOption = page.getByTestId('create-task-option')
      
      // Force click on disabled element to test toast
      await createTaskOption.click({ force: true })
      
      // Look for toast notification
      await expect(page.locator('.Toaster')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('Coming soon - Task creation feature')).toBeVisible()
    })

    test('should show toast when Schedule meeting is clicked', async () => {
      const plusButton = page.getByTestId('plus-button')
      await plusButton.click()
      
      const scheduleMeetingOption = page.getByTestId('schedule-meeting-option')
      await expect(scheduleMeetingOption).toHaveText('Schedule meeting')
      
      await scheduleMeetingOption.click()
      
      // Look for toast notification
      await expect(page.locator('.Toaster')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('Schedule meeting modal would open here')).toBeVisible()
    })

    test('should close popover menu after option selection', async () => {
      const plusButton = page.getByTestId('plus-button')
      await plusButton.click()
      
      // Verify menu is open
      await expect(page.getByTestId('create-lead-option')).toBeVisible()
      
      // Click schedule meeting (doesn't navigate)
      await page.getByTestId('schedule-meeting-option').click()
      
      // Verify menu is closed
      await expect(page.getByTestId('create-lead-option')).not.toBeVisible()
    })
  })

  test.describe('Notifications Bell Functionality', () => {
    test('should display notifications bell with unread count badge', async () => {
      const notificationsBell = page.getByTestId('notifications-bell')
      
      await expect(notificationsBell).toBeVisible()
      await expect(notificationsBell).toHaveAttribute('aria-label', 'View notifications')
      await expect(notificationsBell).toHaveAttribute('title', 'View notifications')
      
      // Check unread count badge (should show 3 based on mock data)
      await expect(page.locator('[data-testid="notifications-bell"] span').filter({ hasText: '3' })).toBeVisible()
    })

    test('should open right-side drawer when bell is clicked', async () => {
      const notificationsBell = page.getByTestId('notifications-bell')
      await notificationsBell.click()
      
      // Verify drawer opens
      await expect(page.getByText('Notifications')).toBeVisible()
      await expect(page.getByTestId('mark-all-read-button')).toBeVisible()
      
      // Verify drawer position (should be on the right side)
      const drawer = page.locator('[role="dialog"]')
      await expect(drawer).toHaveClass(/right-0/)
    })

    test('should display notification items in drawer', async () => {
      const notificationsBell = page.getByTestId('notifications-bell')
      await notificationsBell.click()
      
      // Verify all mock notifications are displayed
      await expect(page.getByTestId('notification-1')).toBeVisible()
      await expect(page.getByTestId('notification-2')).toBeVisible()
      await expect(page.getByTestId('notification-3')).toBeVisible()
      
      // Verify notification content
      await expect(page.getByText('New lead assigned')).toBeVisible()
      await expect(page.getByText('Client payment received')).toBeVisible()
      await expect(page.getByText('Campaign performance')).toBeVisible()
      
      // Verify timestamps
      await expect(page.getByText('2 minutes ago')).toBeVisible()
      await expect(page.getByText('1 hour ago')).toBeVisible()
      await expect(page.getByText('3 hours ago')).toBeVisible()
    })

    test('should show success toast when Mark all read is clicked', async () => {
      const notificationsBell = page.getByTestId('notifications-bell')
      await notificationsBell.click()
      
      const markAllReadButton = page.getByTestId('mark-all-read-button')
      await markAllReadButton.click()
      
      // Look for success toast
      await expect(page.locator('.Toaster')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('All notifications marked as read')).toBeVisible()
    })

    test('should close drawer when clicking outside', async () => {
      const notificationsBell = page.getByTestId('notifications-bell')
      await notificationsBell.click()
      
      // Verify drawer is open
      await expect(page.getByText('Notifications')).toBeVisible()
      
      // Click outside the drawer (on the overlay)
      await page.locator('body').click({ position: { x: 100, y: 100 } })
      
      // Verify drawer is closed
      await expect(page.getByText('Notifications')).not.toBeVisible()
    })

    test('should close drawer when pressing Escape key', async () => {
      const notificationsBell = page.getByTestId('notifications-bell')
      await notificationsBell.click()
      
      // Verify drawer is open
      await expect(page.getByText('Notifications')).toBeVisible()
      
      // Press Escape key
      await page.keyboard.press('Escape')
      
      // Verify drawer is closed
      await expect(page.getByText('Notifications')).not.toBeVisible()
    })

    test('should close drawer when close button is clicked', async () => {
      const notificationsBell = page.getByTestId('notifications-bell')
      await notificationsBell.click()
      
      // Verify drawer is open
      await expect(page.getByText('Notifications')).toBeVisible()
      
      // Click close button
      await page.getByTestId('drawer-close').click()
      
      // Verify drawer is closed
      await expect(page.getByText('Notifications')).not.toBeVisible()
    })
  })

  test.describe('Integration Cards Functionality', () => {
    test('should display integration cards with correct status indicators', async () => {
      // WhatsApp should be connected
      const whatsappCard = page.locator('[data-testid="manage-connection-whatsapp"]').locator('..')
      await expect(whatsappCard.getByText('WhatsApp')).toBeVisible()
      await expect(whatsappCard.getByText('Connected')).toBeVisible()
      
      // Facebook should be connected
      const facebookCard = page.locator('[data-testid="manage-connection-facebook"]').locator('..')
      await expect(facebookCard.getByText('Facebook')).toBeVisible()
      await expect(facebookCard.getByText('Connected')).toBeVisible()
      
      // Google Calendar should be disconnected
      await expect(page.getByText('Google Calendar')).toBeVisible()
      await expect(page.getByText('Disconnected')).toBeVisible()
    })

    test('should show toast when Manage Connection is clicked', async () => {
      const manageButton = page.getByTestId('manage-connection-whatsapp')
      await expect(manageButton).toBeVisible()
      await expect(manageButton).toHaveText('Manage Connection')
      
      await manageButton.click()
      
      // Look for toast notification
      await expect(page.locator('.Toaster')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('Redirecting to integration settings...')).toBeVisible()
    })

    test('should show confirmation dialog when Disconnect is clicked', async () => {
      // Set up dialog handler
      page.on('dialog', async dialog => {
        expect(dialog.message()).toBe('Are you sure you want to disconnect WhatsApp?')
        await dialog.dismiss()
      })
      
      const disconnectButton = page.getByTestId('disconnect-whatsapp')
      await expect(disconnectButton).toBeVisible()
      await expect(disconnectButton).toHaveText('Disconnect')
      
      await disconnectButton.click()
    })

    test('should disconnect and update status when confirmed', async () => {
      // Set up dialog handler to accept
      page.on('dialog', async dialog => {
        await dialog.accept()
      })
      
      const disconnectButton = page.getByTestId('disconnect-whatsapp')
      await disconnectButton.click()
      
      // Verify loading state
      await expect(disconnectButton).toBeDisabled()
      await expect(disconnectButton.locator('.animate-spin')).toBeVisible()
      
      // Wait for success toast
      await expect(page.locator('.Toaster')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('WhatsApp disconnected successfully')).toBeVisible()
      
      // Verify status change
      await expect(page.getByText('Disconnected')).toBeVisible()
    })

    test('should show WhatsApp-specific Configure AI and Send Test buttons', async () => {
      const configureAIButton = page.getByTestId('configure-ai-whatsapp')
      const sendTestButton = page.getByTestId('send-test-whatsapp')
      
      await expect(configureAIButton).toBeVisible()
      await expect(configureAIButton).toHaveText('Configure AI')
      
      await expect(sendTestButton).toBeVisible()
      await expect(sendTestButton).toHaveText('Send Test')
    })

    test('should show Coming soon toast for WhatsApp Configure AI', async () => {
      const configureAIButton = page.getByTestId('configure-ai-whatsapp')
      await configureAIButton.click()
      
      // Look for toast notification
      await expect(page.locator('.Toaster')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('Coming soon - AI configuration for WhatsApp')).toBeVisible()
    })

    test('should show success message for WhatsApp Send Test', async () => {
      const sendTestButton = page.getByTestId('send-test-whatsapp')
      await sendTestButton.click()
      
      // Look for success toast
      await expect(page.locator('.Toaster')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('Test message sent (stub)')).toBeVisible()
    })

    test('should show redirecting toast for non-WhatsApp Configure AI', async () => {
      const configureAIButton = page.getByTestId('configure-ai-facebook')
      await configureAIButton.click()
      
      // Look for toast notification
      await expect(page.locator('.Toaster')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('Redirecting to AI configuration...')).toBeVisible()
    })

    test('should show Connect button for disconnected integrations', async () => {
      const connectButton = page.getByTestId('connect-google calendar')
      await expect(connectButton).toBeVisible()
      await expect(connectButton).toHaveText('Connect Google Calendar')
    })
  })

  test.describe('Accessibility Features', () => {
    test('should support keyboard navigation for plus button', async () => {
      const plusButton = page.getByTestId('plus-button')
      
      // Focus on plus button
      await plusButton.focus()
      await expect(plusButton).toBeFocused()
      
      // Press Enter to open menu
      await page.keyboard.press('Enter')
      
      // Verify menu is open
      await expect(page.getByTestId('create-lead-option')).toBeVisible()
      
      // Tab through options
      await page.keyboard.press('Tab')
      await expect(page.getByTestId('create-lead-option')).toBeFocused()
      
      await page.keyboard.press('Tab')
      await expect(page.getByTestId('create-task-option')).toBeFocused()
      
      await page.keyboard.press('Tab')
      await expect(page.getByTestId('schedule-meeting-option')).toBeFocused()
    })

    test('should support keyboard navigation for notifications bell', async () => {
      const notificationsBell = page.getByTestId('notifications-bell')
      
      // Focus and activate with keyboard
      await notificationsBell.focus()
      await expect(notificationsBell).toBeFocused()
      
      await page.keyboard.press('Enter')
      await expect(page.getByText('Notifications')).toBeVisible()
      
      // Tab through drawer elements
      await page.keyboard.press('Tab')
      await expect(page.getByTestId('mark-all-read-button')).toBeFocused()
    })

    test('should have proper ARIA attributes', async () => {
      // Check plus button
      const plusButton = page.getByTestId('plus-button')
      await expect(plusButton).toHaveAttribute('aria-label', 'Create new item')
      
      // Check notifications bell
      const notificationsBell = page.getByTestId('notifications-bell')
      await expect(notificationsBell).toHaveAttribute('aria-label', 'View notifications')
      
      // Check integration buttons
      const manageButton = page.getByTestId('manage-connection-whatsapp')
      await expect(manageButton).toHaveAttribute('aria-label', 'Manage WhatsApp connection')
    })

    test('should have proper role attributes for modals and menus', async () => {
      // Open plus menu
      await page.getByTestId('plus-button').click()
      const popoverMenu = page.locator('[role="menu"]')
      await expect(popoverMenu).toBeVisible()
      
      // Open notifications drawer
      await page.getByTestId('notifications-bell').click()
      const drawer = page.locator('[role="dialog"]')
      await expect(drawer).toBeVisible()
      await expect(drawer).toHaveAttribute('aria-modal', 'true')
    })
  })

  test.describe('Responsive Design', () => {
    test('should work correctly on mobile viewport', async () => {
      await page.setViewportSize({ width: 375, height: 667 })
      
      // Test plus button still works
      const plusButton = page.getByTestId('plus-button')
      await expect(plusButton).toBeVisible()
      await plusButton.click()
      await expect(page.getByTestId('create-lead-option')).toBeVisible()
      
      // Test notifications bell still works
      await page.getByTestId('notifications-bell').click()
      await expect(page.getByText('Notifications')).toBeVisible()
    })

    test('should work correctly on tablet viewport', async () => {
      await page.setViewportSize({ width: 768, height: 1024 })
      
      // Test integration cards layout
      const integrationCards = page.locator('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-3')
      await expect(integrationCards).toBeVisible()
      
      // Should show 2 columns on tablet
      const cards = integrationCards.locator('> div')
      await expect(cards).toHaveCount(3) // WhatsApp, Facebook, Google Calendar
    })
  })

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully during disconnect', async () => {
      // Intercept network request and make it fail
      await page.route('**/*', route => {
        if (route.request().method() === 'DELETE') {
          route.abort('failed')
        } else {
          route.continue()
        }
      })
      
      // Set up dialog handler to accept
      page.on('dialog', async dialog => {
        await dialog.accept()
      })
      
      const disconnectButton = page.getByTestId('disconnect-whatsapp')
      await disconnectButton.click()
      
      // Should show error toast
      await expect(page.locator('.Toaster')).toBeVisible({ timeout: 5000 })
      await expect(page.getByText('Failed to disconnect integration')).toBeVisible()
    })
  })

  test.describe('Performance', () => {
    test('should load dashboard within acceptable time', async () => {
      const startTime = Date.now()
      await page.goto(DASHBOARD_URL)
      await page.waitForLoadState('networkidle')
      const loadTime = Date.now() - startTime
      
      // Dashboard should load within 5 seconds
      expect(loadTime).toBeLessThan(5000)
    })

    test('should handle rapid clicks without issues', async () => {
      const plusButton = page.getByTestId('plus-button')
      
      // Rapidly click plus button multiple times
      for (let i = 0; i < 5; i++) {
        await plusButton.click()
        await page.waitForTimeout(100)
      }
      
      // Menu should still work correctly
      await expect(page.getByTestId('create-lead-option')).toBeVisible()
    })
  })
})