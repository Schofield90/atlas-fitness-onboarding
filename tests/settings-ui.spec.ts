import { test, expect } from '@playwright/test'

// Test credentials
const TEST_EMAIL = 'sam@atlas-gyms.co.uk'
const TEST_PASSWORD = 'SecurePassword123!'
const BASE_URL = 'http://localhost:3000'

// Settings pages to test
const SETTINGS_PAGES = [
  { path: '/settings/business', name: 'Business Settings' },
  { path: '/settings/staff', name: 'Staff Management' },
  { path: '/settings/pipelines', name: 'Pipeline Management' },
  { path: '/settings/calendar', name: 'Calendar Settings' },
  { path: '/settings/custom-fields', name: 'Custom Fields' },
  { path: '/settings/templates', name: 'Email Templates' },
  { path: '/settings/phone', name: 'Phone Settings' },
  { path: '/settings/lead-scoring', name: 'Lead Scoring' }
]

test.describe('Settings Pages UI Tests', () => {
  // Login before each test
  test.beforeEach(async ({ page }) => {
    // Go to login page
    await page.goto(`${BASE_URL}/login`)
    
    // Fill in credentials
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    
    // Click login button
    await page.click('button:has-text("Sign in")')
    
    // Wait for navigation to dashboard
    await page.waitForURL(/\/dashboard|\/leads/, { timeout: 10000 })
  })
  
  test('All settings pages load without infinite spinners', async ({ page }) => {
    for (const settingsPage of SETTINGS_PAGES) {
      console.log(`Testing ${settingsPage.name}...`)
      
      // Navigate to settings page
      await page.goto(`${BASE_URL}${settingsPage.path}`)
      
      // Wait for page to be ready (but not indefinitely)
      await page.waitForLoadState('networkidle', { timeout: 10000 })
      
      // Check that loading spinner is NOT visible after load
      const loadingSpinner = page.locator('.animate-spin, [class*="loading"], [class*="spinner"]')
      
      // Wait a bit to ensure any loading states have time to appear
      await page.waitForTimeout(2000)
      
      // Verify no spinner is visible
      const spinnerCount = await loadingSpinner.count()
      if (spinnerCount > 0) {
        // Check if it's actually visible
        const isVisible = await loadingSpinner.first().isVisible()
        expect(isVisible).toBe(false)
      }
      
      // Verify page has actual content (not just loading state)
      const hasContent = await page.locator('h1, h2, [class*="Settings"], [class*="settings"]').count()
      expect(hasContent).toBeGreaterThan(0)
      
      // Check for "Loading..." text
      const loadingText = await page.locator('text=/loading/i').count()
      expect(loadingText).toBe(0)
      
      console.log(`✓ ${settingsPage.name} loaded successfully`)
    }
  })
  
  test('Business Settings page functionality', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings/business`)
    await page.waitForLoadState('networkidle')
    
    // Check for form fields
    await expect(page.locator('input[name="business_name"]')).toBeVisible()
    await expect(page.locator('input[name="email"]')).toBeVisible()
    await expect(page.locator('input[name="phone"]')).toBeVisible()
    
    // Test form interaction
    await page.fill('input[name="business_name"]', 'Atlas Fitness Test')
    
    // Check save button exists and is enabled
    const saveButton = page.locator('button:has-text("Save")')
    await expect(saveButton).toBeVisible()
    await expect(saveButton).toBeEnabled()
  })
  
  test('Staff Management page functionality', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings/staff`)
    await page.waitForLoadState('networkidle')
    
    // Check for staff list or empty state
    const staffContent = await page.locator('table, text=/staff member/i, text=/no staff/i').count()
    expect(staffContent).toBeGreaterThan(0)
    
    // Check Add Staff button exists
    await expect(page.locator('button:has-text("Add Staff")')).toBeVisible()
  })
  
  test('Pipeline Management page functionality', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings/pipelines`)
    await page.waitForLoadState('networkidle')
    
    // Check for pipeline content
    const pipelineContent = await page.locator('text=/pipeline/i, text=/stage/i').count()
    expect(pipelineContent).toBeGreaterThan(0)
    
    // Check for default stages if present
    const stages = ['Lead Captured', 'Contacted', 'Tour Scheduled', 'Trial Session', 'Joined']
    for (const stage of stages) {
      const stageElement = await page.locator(`text=/${stage}/i`).count()
      if (stageElement > 0) {
        console.log(`  Found stage: ${stage}`)
      }
    }
  })
  
  test('Calendar Settings page functionality', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings/calendar`)
    await page.waitForLoadState('networkidle')
    
    // Check for calendar settings
    await expect(page.locator('text=/slot duration/i, text=/buffer time/i')).toBeVisible()
    
    // Check for working hours section
    const workingHours = await page.locator('text=/monday/i, text=/tuesday/i').count()
    expect(workingHours).toBeGreaterThan(0)
  })
  
  test('Custom Fields page functionality', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings/custom-fields`)
    await page.waitForLoadState('networkidle')
    
    // Check for tabs
    await expect(page.locator('text=/client fields/i, text=/lead fields/i')).toBeVisible()
    
    // Check for Add Field button
    await expect(page.locator('button:has-text("Add Field")')).toBeVisible()
  })
  
  test('Email Templates page functionality', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings/templates`)
    await page.waitForLoadState('networkidle')
    
    // Check for template list
    const templates = ['Appointment Confirmation', 'Appointment Reminder', 'Welcome', 'Follow Up']
    for (const template of templates) {
      const templateElement = await page.locator(`text=/${template}/i`).count()
      if (templateElement > 0) {
        console.log(`  Found template: ${template}`)
      }
    }
  })
  
  test('Phone Settings page functionality', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings/phone`)
    await page.waitForLoadState('networkidle')
    
    // Check for phone settings sections
    await expect(page.locator('text=/primary phone/i, text=/voicemail/i')).toBeVisible()
    
    // Check for form fields
    const phoneInput = await page.locator('input[type="tel"]').count()
    expect(phoneInput).toBeGreaterThan(0)
  })
  
  test('Lead Scoring page functionality', async ({ page }) => {
    await page.goto(`${BASE_URL}/settings/lead-scoring`)
    await page.waitForLoadState('networkidle')
    
    // Check for scoring rules
    await expect(page.locator('text=/scoring rule/i, text=/points/i')).toBeVisible()
    
    // Check for thresholds
    const thresholds = ['Cold', 'Warm', 'Hot', 'Ready to Buy']
    for (const threshold of thresholds) {
      const thresholdElement = await page.locator(`text=/${threshold}/i`).count()
      if (thresholdElement > 0) {
        console.log(`  Found threshold: ${threshold}`)
      }
    }
  })
})

test.describe('Loading State Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[type="email"]', TEST_EMAIL)
    await page.fill('input[type="password"]', TEST_PASSWORD)
    await page.click('button:has-text("Sign in")')
    await page.waitForURL(/\/dashboard|\/leads/, { timeout: 10000 })
  })
  
  test('No orange loading circles persist after page load', async ({ page }) => {
    for (const settingsPage of SETTINGS_PAGES) {
      await page.goto(`${BASE_URL}${settingsPage.path}`)
      
      // Wait for initial load
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(3000) // Wait 3 seconds to ensure loading completes
      
      // Check for any orange loading indicators
      const orangeSpinners = await page.locator('.border-orange-500.animate-spin, .bg-orange-500.animate-spin, [class*="orange"][class*="spin"]').count()
      expect(orangeSpinners).toBe(0)
      
      // Check for generic loading spinners that might be orange
      const spinners = await page.locator('.animate-spin').all()
      for (const spinner of spinners) {
        const isVisible = await spinner.isVisible()
        if (isVisible) {
          // Get computed styles to check color
          const color = await spinner.evaluate(el => {
            const styles = window.getComputedStyle(el)
            return styles.borderColor || styles.backgroundColor
          })
          
          // Check if color is orange-ish
          expect(color).not.toContain('orange')
          expect(color).not.toContain('rgb(249, 115, 22)') // orange-500
          expect(color).not.toContain('rgb(251, 146, 60)') // orange-400
        }
      }
      
      console.log(`✓ ${settingsPage.name} - No persistent loading spinners`)
    }
  })
})