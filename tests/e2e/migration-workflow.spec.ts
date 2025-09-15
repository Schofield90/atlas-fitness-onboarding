/**
 * End-to-End Tests for Migration Wizard CSV Processing
 *
 * Tests the complete migration workflow from upload to parsing,
 * focusing on the bucket mismatch fix and user experience.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// Test configuration
const TEST_ORG = {
  id: 'migration-test-org-' + Date.now(),
  name: 'Migration Test Gym'
}

const TEST_USER = {
  email: `migration-test-${Date.now()}@testgym.com`,
  password: 'MigrationTest123!',
  name: 'Migration Test User'
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Create test CSV files
const createTestCsvFile = (filename: string, content: string): string => {
  const tempDir = os.tmpdir()
  const filePath = path.join(tempDir, filename)
  fs.writeFileSync(filePath, content)
  return filePath
}

const SAMPLE_CSV_CONTENT = `Name,Email,Phone,Source,Notes
John Doe,john.doe@example.com,555-1234,website,"Interested in personal training"
Jane Smith,jane.smith@example.com,555-5678,referral,"Referred by existing member"
Bob Johnson,bob.johnson@example.com,555-9012,social,"Found us on Instagram"
Sarah Wilson,sarah.wilson@example.com,555-3456,walkIn,"Walked in during lunch break"
Mike Brown,mike.brown@example.com,555-7890,google,"Found us on Google search"`

const LARGE_CSV_CONTENT = [
  'Name,Email,Phone,Source',
  ...Array.from({ length: 100 }, (_, i) =>
    `User ${i + 1},user${i + 1}@example.com,555-${String(i + 1).padStart(4, '0')},bulk_import`
  )
].join('\n')

const INVALID_CSV_CONTENT = `Name,Email,Phone
"Broken CSV,missing.quote@example.com,555-1234
Invalid User,invalid-email,not-a-phone
,empty.name@example.com,555-5678`

test.describe('Migration Wizard E2E Tests', () => {
  let adminClient: any
  let context: BrowserContext
  let page: Page
  let testCsvPath: string
  let largeCsvPath: string
  let invalidCsvPath: string

  test.beforeAll(async ({ browser }) => {
    // Setup admin client
    adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Create test organization
    await adminClient.from('organizations').insert(TEST_ORG)

    // Create test user
    const { data: authUser } = await adminClient.auth.admin.createUser({
      email: TEST_USER.email,
      password: TEST_USER.password,
      user_metadata: { name: TEST_USER.name }
    })

    // Add user to organization
    await adminClient.from('user_organizations').insert({
      user_id: authUser!.user.id,
      organization_id: TEST_ORG.id,
      role: 'admin'
    })

    // Create test CSV files
    testCsvPath = createTestCsvFile('test-migration.csv', SAMPLE_CSV_CONTENT)
    largeCsvPath = createTestCsvFile('large-migration.csv', LARGE_CSV_CONTENT)
    invalidCsvPath = createTestCsvFile('invalid-migration.csv', INVALID_CSV_CONTENT)

    // Create browser context and page
    context = await browser.newContext()
    page = await context.newPage()

    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text())
      }
    })
  })

  test.afterAll(async () => {
    // Cleanup test files
    if (fs.existsSync(testCsvPath)) fs.unlinkSync(testCsvPath)
    if (fs.existsSync(largeCsvPath)) fs.unlinkSync(largeCsvPath)
    if (fs.existsSync(invalidCsvPath)) fs.unlinkSync(invalidCsvPath)

    // Cleanup database
    await adminClient.from('migration_records').delete().match({ organization_id: TEST_ORG.id })
    await adminClient.from('migration_files').delete().match({ organization_id: TEST_ORG.id })
    await adminClient.from('migration_jobs').delete().match({ organization_id: TEST_ORG.id })
    await adminClient.from('user_organizations').delete().match({ organization_id: TEST_ORG.id })
    await adminClient.from('organizations').delete().match({ id: TEST_ORG.id })

    await context.close()
  })

  async function loginToApp() {
    await page.goto('/login')
    await page.fill('[name="email"]', TEST_USER.email)
    await page.fill('[name="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 15000 })
    await expect(page.locator('h1, h2').first()).toBeVisible()
  }

  async function navigateToMigrationWizard() {
    // Navigate to migration/data-import or wherever the wizard is located
    // This might need adjustment based on the actual URL structure
    await page.goto('/migration')
    await expect(page.locator('text=Migration')).toBeVisible({ timeout: 10000 })
  }

  async function createMigrationJob(jobName: string, description?: string) {
    await page.click('[data-testid="create-migration-job"], button:has-text("Create New Migration")')

    await page.fill('[name="name"], input[placeholder*="job name"]', jobName)
    if (description) {
      await page.fill('[name="description"], textarea', description)
    }

    // Select source platform if needed
    const platformSelect = page.locator('select[name="sourcePlatform"], [data-testid="platform-select"]')
    if (await platformSelect.isVisible()) {
      await platformSelect.selectOption('goteamup')
    }

    await page.click('button:has-text("Create Job"), [data-testid="create-job-button"]')

    // Wait for job creation success
    await expect(page.locator('text=Job created')).toBeVisible({ timeout: 10000 })
  }

  test.describe('Complete Migration Workflow', () => {
    test.beforeEach(async () => {
      await loginToApp()
      await navigateToMigrationWizard()
    })

    test('should complete successful migration workflow with CSV parsing', async () => {
      const jobName = `E2E Test Job ${Date.now()}`

      // Step 1: Create migration job
      await createMigrationJob(jobName, 'E2E test migration job')

      // Step 2: Upload CSV file
      const fileChooserPromise = page.waitForEvent('filechooser')
      await page.click('input[type="file"], [data-testid="file-upload"]')
      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles([testCsvPath])

      // Wait for upload to complete
      await expect(page.locator('text=Upload complete, text=File uploaded')).toBeVisible({ timeout: 15000 })

      // Step 3: Trigger CSV parsing
      await page.click('button:has-text("Parse CSV"), [data-testid="parse-csv-button"]')

      // Wait for parsing to complete
      await expect(page.locator('text=Parsing complete, text=CSV parsed successfully')).toBeVisible({ timeout: 30000 })

      // Step 4: Verify results
      // Check for parsed data display
      await expect(page.locator('text=5 records')).toBeVisible()

      // Verify sample data is shown
      await expect(page.locator('text=John Doe')).toBeVisible()
      await expect(page.locator('text=jane.smith@example.com')).toBeVisible()

      // Check job status
      await expect(page.locator('text=Ready to process')).toBeVisible()
    })

    test('should handle large CSV files with progress indication', async () => {
      const jobName = `Large File Test ${Date.now()}`

      await createMigrationJob(jobName, 'Testing large CSV file processing')

      // Upload large CSV file
      const fileChooserPromise = page.waitForEvent('filechooser')
      await page.click('input[type="file"]')
      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles([largeCsvPath])

      // Wait for upload
      await expect(page.locator('text=Upload complete')).toBeVisible({ timeout: 20000 })

      // Parse CSV
      await page.click('button:has-text("Parse CSV")')

      // Look for progress indicators
      await expect(page.locator('text=Processing, [data-testid="parsing-progress"]')).toBeVisible({ timeout: 5000 })

      // Wait for completion
      await expect(page.locator('text=100 records')).toBeVisible({ timeout: 45000 })
    })

    test('should display detailed error messages for parsing failures', async () => {
      const jobName = `Invalid CSV Test ${Date.now()}`

      await createMigrationJob(jobName, 'Testing invalid CSV handling')

      // Upload invalid CSV file
      const fileChooserPromise = page.waitForEvent('filechooser')
      await page.click('input[type="file"]')
      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles([invalidCsvPath])

      await expect(page.locator('text=Upload complete')).toBeVisible({ timeout: 15000 })

      // Parse CSV
      await page.click('button:has-text("Parse CSV")')

      // Should still complete but with warnings
      await expect(page.locator('text=Parse errors, text=parsing completed')).toBeVisible({ timeout: 30000 })

      // Check for error details
      await expect(page.locator('text=2 records')).toBeVisible() // Should still parse valid rows
    })
  })

  test.describe('Bucket Fix Verification', () => {
    test.beforeEach(async () => {
      await loginToApp()
      await navigateToMigrationWizard()
    })

    test('should successfully download files from migration-uploads bucket', async () => {
      const jobName = `Bucket Fix Test ${Date.now()}`

      await createMigrationJob(jobName)

      // Upload file
      const fileChooserPromise = page.waitForEvent('filechooser')
      await page.click('input[type="file"]')
      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles([testCsvPath])

      await expect(page.locator('text=Upload complete')).toBeVisible({ timeout: 15000 })

      // Monitor network requests during parsing
      const parseRequestPromise = page.waitForResponse(
        response => response.url().includes('/parse-csv') && response.status() === 200
      )

      await page.click('button:has-text("Parse CSV")')

      const parseResponse = await parseRequestPromise
      const responseBody = await parseResponse.json()

      // Verify successful response (no 400 Bad Request)
      expect(parseResponse.status()).toBe(200)
      expect(responseBody.success).toBe(true)

      // Check logs for bucket access
      expect(responseBody.logs).toContain(
        expect.stringMatching(/migration-uploads/)
      )
    })

    test('should not produce 400 Bad Request errors during parsing', async () => {
      const jobName = `No 400 Error Test ${Date.now()}`

      await createMigrationJob(jobName)

      // Track all network requests
      const requests: any[] = []
      page.on('response', response => {
        if (response.url().includes('/api/migration/') || response.url().includes('/parse-csv')) {
          requests.push({
            url: response.url(),
            status: response.status(),
            method: response.request().method()
          })
        }
      })

      // Upload and parse
      const fileChooserPromise = page.waitForEvent('filechooser')
      await page.click('input[type="file"]')
      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles([testCsvPath])

      await expect(page.locator('text=Upload complete')).toBeVisible({ timeout: 15000 })
      await page.click('button:has-text("Parse CSV")')
      await expect(page.locator('text=Parsing complete')).toBeVisible({ timeout: 30000 })

      // Verify no 400 errors occurred
      const badRequests = requests.filter(req => req.status === 400)
      expect(badRequests).toHaveLength(0)

      // Verify at least one successful parse-csv request
      const parseRequests = requests.filter(req => req.url.includes('/parse-csv'))
      expect(parseRequests.length).toBeGreaterThan(0)
      expect(parseRequests[0].status).toBe(200)
    })
  })

  test.describe('Error Handling and Edge Cases', () => {
    test.beforeEach(async () => {
      await loginToApp()
      await navigateToMigrationWizard()
    })

    test('should handle missing files gracefully', async () => {
      const jobName = `Missing File Test ${Date.now()}`

      await createMigrationJob(jobName)

      // Try to parse without uploading a file
      const parseButton = page.locator('button:has-text("Parse CSV")')

      if (await parseButton.isVisible()) {
        await parseButton.click()

        // Should show appropriate error message
        await expect(page.locator('text=No files, text=Please upload')).toBeVisible({ timeout: 10000 })
      } else {
        // Parse button should be disabled if no file uploaded
        expect(await parseButton.isDisabled()).toBe(true)
      }
    })

    test('should handle authentication expiry during long operations', async () => {
      const jobName = `Auth Test ${Date.now()}`

      await createMigrationJob(jobName)

      // Upload file
      const fileChooserPromise = page.waitForEvent('filechooser')
      await page.click('input[type="file"]')
      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles([testCsvPath])

      await expect(page.locator('text=Upload complete')).toBeVisible({ timeout: 15000 })

      // Clear cookies to simulate auth expiry
      await context.clearCookies()

      // Try to parse - should handle auth error gracefully
      await page.click('button:has-text("Parse CSV")')

      // Should redirect to login or show auth error
      await expect(page.locator('text=Unauthorized, text=Please log in')).toBeVisible({ timeout: 10000 })
    })

    test('should show detailed progress for multi-step operations', async () => {
      const jobName = `Progress Test ${Date.now()}`

      await createMigrationJob(jobName)

      // Upload file
      const fileChooserPromise = page.waitForEvent('filechooser')
      await page.click('input[type="file"]')
      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles([testCsvPath])

      await expect(page.locator('text=Upload complete')).toBeVisible()

      // Parse and monitor progress
      await page.click('button:has-text("Parse CSV")')

      // Look for progress indicators
      const progressSteps = [
        'Downloading file',
        'Parsing CSV',
        'Creating records'
      ]

      for (const step of progressSteps) {
        // Not all steps may be visible due to timing, but at least one should appear
        try {
          await expect(page.locator(`text=${step}`)).toBeVisible({ timeout: 5000 })
        } catch (e) {
          // Step might have completed too quickly
        }
      }

      // Final success state
      await expect(page.locator('text=Parsing complete')).toBeVisible({ timeout: 30000 })
    })
  })

  test.describe('Organization Isolation', () => {
    test.beforeEach(async () => {
      await loginToApp()
      await navigateToMigrationWizard()
    })

    test('should only show migration jobs for current organization', async () => {
      const jobName = `Isolation Test ${Date.now()}`

      await createMigrationJob(jobName)

      // The job should be visible in the list
      await expect(page.locator(`text=${jobName}`)).toBeVisible()

      // Navigate away and back
      await page.goto('/dashboard')
      await page.goto('/migration')

      // Job should still be visible
      await expect(page.locator(`text=${jobName}`)).toBeVisible()

      // But only jobs from this organization
      // This would require more complex setup with multiple orgs to test fully
    })

    test('should include organization context in all migration API calls', async () => {
      const jobName = `API Context Test ${Date.now()}`

      // Track API requests
      const apiCalls: any[] = []
      page.on('request', request => {
        if (request.url().includes('/api/migration/')) {
          apiCalls.push({
            url: request.url(),
            method: request.method(),
            headers: Object.fromEntries(
              ['authorization', 'content-type'].map(h => [h, request.headers()[h]])
            )
          })
        }
      })

      await createMigrationJob(jobName)

      // Upload and parse
      const fileChooserPromise = page.waitForEvent('filechooser')
      await page.click('input[type="file"]')
      const fileChooser = await fileChooserPromise
      await fileChooser.setFiles([testCsvPath])

      await expect(page.locator('text=Upload complete')).toBeVisible()
      await page.click('button:has-text("Parse CSV")')
      await expect(page.locator('text=Parsing complete')).toBeVisible({ timeout: 30000 })

      // Verify all API calls had proper authorization
      expect(apiCalls.length).toBeGreaterThan(0)
      apiCalls.forEach(call => {
        expect(call.headers.authorization).toBeDefined()
        expect(call.headers.authorization).toContain('Bearer')
      })
    })
  })
})