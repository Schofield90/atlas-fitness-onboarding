import { test, expect } from '@playwright/test'
import { createTestAdmin, cleanupTestAdmin } from '../helpers/admin-helpers'
import { createTestOrganization } from '../helpers/org-helpers'

test.describe('Admin Dashboard E2E Tests', () => {
  let adminUser: any
  let testOrg: any

  test.beforeAll(async () => {
    // Setup test admin and organization
    adminUser = await createTestAdmin('platform_admin')
    testOrg = await createTestOrganization()
  })

  test.afterAll(async () => {
    // Cleanup
    await cleanupTestAdmin(adminUser.id)
  })

  test.describe('Authentication & Authorization', () => {
    test('should require admin authentication', async ({ page }) => {
      await page.goto('/admin')
      await expect(page).toHaveURL('/signin')
    })

    test('should reject non-admin users', async ({ page }) => {
      // Login as regular user
      await page.goto('/signin')
      await page.fill('[name="email"]', 'user@example.com')
      await page.fill('[name="password"]', 'password123')
      await page.click('[type="submit"]')

      // Try to access admin
      await page.goto('/admin')
      await expect(page).toHaveURL('/dashboard')
    })

    test('should allow admin access', async ({ page }) => {
      // Login as admin
      await page.goto('/signin')
      await page.fill('[name="email"]', adminUser.email)
      await page.fill('[name="password"]', adminUser.password)
      await page.click('[type="submit"]')

      // Access admin dashboard
      await page.goto('/admin')
      await expect(page).toHaveURL('/admin')
      await expect(page.locator('h1')).toContainText('Admin HQ')
    })
  })

  test.describe('Dashboard Overview', () => {
    test('should display KPI tiles', async ({ page }) => {
      await page.goto('/admin')
      
      // Check KPI tiles are visible
      await expect(page.locator('text=Active Gyms')).toBeVisible()
      await expect(page.locator('text=Total MRR')).toBeVisible()
      await expect(page.locator('text=Total ARR')).toBeVisible()
      await expect(page.locator('text=Platform Fees')).toBeVisible()
    })

    test('should show organizations table', async ({ page }) => {
      await page.goto('/admin')
      
      // Check table headers
      await expect(page.locator('th:text("Organization")')).toBeVisible()
      await expect(page.locator('th:text("Status")')).toBeVisible()
      await expect(page.locator('th:text("Plan")')).toBeVisible()
      await expect(page.locator('th:text("MRR")')).toBeVisible()
    })

    test('should filter organizations', async ({ page }) => {
      await page.goto('/admin')
      
      // Use search filter
      await page.fill('input[placeholder="Search..."]', testOrg.name)
      await page.waitForTimeout(500) // Debounce delay
      
      // Check filtered results
      const rows = page.locator('tbody tr')
      await expect(rows).toHaveCount(1)
      await expect(rows.first()).toContainText(testOrg.name)
    })

    test('should export organizations to CSV', async ({ page }) => {
      await page.goto('/admin')
      
      // Start waiting for download
      const downloadPromise = page.waitForEvent('download')
      
      // Click export button
      await page.click('button:text("Export CSV")')
      
      // Wait for download and verify
      const download = await downloadPromise
      expect(download.suggestedFilename()).toContain('organizations')
      expect(download.suggestedFilename()).toContain('.csv')
    })
  })

  test.describe('Organization Details', () => {
    test('should navigate to organization details', async ({ page }) => {
      await page.goto('/admin')
      
      // Click on organization
      await page.click(`text=${testOrg.name}`)
      
      // Check we're on detail page
      await expect(page).toHaveURL(new RegExp(`/admin/organizations/${testOrg.id}`))
      await expect(page.locator('h1')).toContainText(testOrg.name)
    })

    test('should display organization metrics', async ({ page }) => {
      await page.goto(`/admin/organizations/${testOrg.id}`)
      
      // Check metrics are displayed
      await expect(page.locator('text=Active Users')).toBeVisible()
      await expect(page.locator('text=Total Leads')).toBeVisible()
      await expect(page.locator('text=MRR')).toBeVisible()
      await expect(page.locator('text=Last Activity')).toBeVisible()
    })

    test('should switch between tabs', async ({ page }) => {
      await page.goto(`/admin/organizations/${testOrg.id}`)
      
      // Test each tab
      const tabs = ['Billing', 'Payments', 'Users', 'Activity', 'Settings']
      
      for (const tab of tabs) {
        await page.click(`button:text("${tab}")`)
        await expect(page.locator(`button:text("${tab}")`)).toHaveClass(/border-blue-500/)
      }
    })
  })

  test.describe('Impersonation', () => {
    test('should show impersonation controls', async ({ page }) => {
      await page.goto(`/admin/organizations/${testOrg.id}`)
      
      await expect(page.locator('text=Impersonate Organization')).toBeVisible()
    })

    test('should require reason for impersonation', async ({ page }) => {
      await page.goto(`/admin/organizations/${testOrg.id}`)
      
      // Click impersonate button
      await page.click('text=Impersonate Organization')
      
      // Modal should appear
      await expect(page.locator('text=Reason for Access')).toBeVisible()
      
      // Try to submit without reason
      await page.click('button:text("Start Impersonation")')
      
      // Should show error
      await expect(page.locator('text=Please provide a reason')).toBeVisible()
    })

    test('should start impersonation session', async ({ page }) => {
      await page.goto(`/admin/organizations/${testOrg.id}`)
      
      // Start impersonation
      await page.click('text=Impersonate Organization')
      await page.fill('textarea', 'Testing impersonation feature')
      await page.selectOption('select[value="read"]', 'read')
      await page.selectOption('text=Duration', '15')
      await page.click('button:text("Start Impersonation")')
      
      // Should redirect to org dashboard
      await expect(page).toHaveURL(new RegExp('/dashboard'))
      
      // Should show impersonation banner
      await expect(page.locator('text=Impersonating:')).toBeVisible()
    })

    test('should stop impersonation session', async ({ page }) => {
      // Assume impersonation is active
      await page.goto('/dashboard')
      
      // Click stop impersonation
      await page.click('text=Stop Impersonation')
      
      // Banner should disappear
      await expect(page.locator('text=Impersonating:')).not.toBeVisible()
    })
  })

  test.describe('Audit Logging', () => {
    test('should log admin actions', async ({ page }) => {
      await page.goto('/admin')
      
      // Perform an action
      await page.goto(`/admin/organizations/${testOrg.id}`)
      
      // Check activity feed
      await page.goto('/admin/audit')
      
      // Should see the action logged
      await expect(page.locator('text=ORGANIZATION_VIEW')).toBeVisible()
    })

    test('should show activity details', async ({ page }) => {
      await page.goto('/admin/audit')
      
      // Check activity has required fields
      const activity = page.locator('.activity-item').first()
      await expect(activity.locator('text=IP:')).toBeVisible()
      await expect(activity.locator('text=ago')).toBeVisible()
    })
  })

  test.describe('Billing Management', () => {
    test('should display billing overview', async ({ page }) => {
      await page.goto('/admin/billing')
      
      await expect(page.locator('h1')).toContainText('Billing & Revenue')
      await expect(page.locator('text=Active Subscriptions')).toBeVisible()
      await expect(page.locator('text=Total MRR')).toBeVisible()
    })

    test('should show revenue chart', async ({ page }) => {
      await page.goto('/admin/billing')
      
      await expect(page.locator('text=Monthly Revenue Trend')).toBeVisible()
      // Check chart is rendered
      await expect(page.locator('.revenue-chart')).toBeVisible()
    })

    test('should display processor stats', async ({ page }) => {
      await page.goto('/admin/billing')
      
      await expect(page.locator('text=Stripe Connect')).toBeVisible()
      await expect(page.locator('text=GoCardless')).toBeVisible()
      await expect(page.locator('text=Success Rate')).toBeVisible()
    })
  })

  test.describe('System Health', () => {
    test('should show system health metrics', async ({ page }) => {
      await page.goto('/admin')
      
      const healthSection = page.locator('text=System Health').locator('..')
      await expect(healthSection.locator('text=Database')).toBeVisible()
      await expect(healthSection.locator('text=Stripe API')).toBeVisible()
      await expect(healthSection.locator('text=Email Service')).toBeVisible()
    })

    test('should refresh health status', async ({ page }) => {
      await page.goto('/admin')
      
      // Click refresh
      await page.click('text=Refresh status')
      
      // Should update (check for loading state)
      await expect(page.locator('.animate-pulse')).toBeVisible()
      await expect(page.locator('.animate-pulse')).not.toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Search Functionality', () => {
    test('should search across organizations', async ({ page }) => {
      await page.goto('/admin')
      
      // Use header search
      await page.fill('input[placeholder*="Search organizations"]', 'test')
      await page.press('input[placeholder*="Search organizations"]', 'Enter')
      
      // Should navigate to search results
      await expect(page).toHaveURL(/\/admin\/search/)
    })
  })

  test.describe('Role-Based Access', () => {
    test('platform_readonly should not see danger zone', async ({ page }) => {
      // Login as readonly admin
      const readonlyAdmin = await createTestAdmin('platform_readonly')
      
      await page.goto('/signin')
      await page.fill('[name="email"]', readonlyAdmin.email)
      await page.fill('[name="password"]', readonlyAdmin.password)
      await page.click('[type="submit"]')
      
      await page.goto(`/admin/organizations/${testOrg.id}`)
      await page.click('button:text("Settings")')
      
      // Should not see danger zone
      await expect(page.locator('text=Danger Zone')).not.toBeVisible()
      
      await cleanupTestAdmin(readonlyAdmin.id)
    })
  })
})