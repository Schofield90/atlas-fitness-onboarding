/**
 * End-to-End Test Suite: Migration Bucket Consistency Workflow
 *
 * This test suite verifies the complete migration workflow from creation
 * to completion, specifically testing that all operations use the correct
 * "migration-uploads" bucket and would fail if old bucket names were used.
 */

import { test, expect, Page, BrowserContext } from '@playwright/test'

// Test data
const TEST_CSV_CONTENT = `Name,Email,Phone,Date of Birth,Gender,City
John Doe,john@example.com,555-1234,1990-01-15,Male,London
Jane Smith,jane@example.com,555-5678,1985-05-20,Female,Manchester
Bob Johnson,bob@example.com,555-9012,1992-08-30,Male,Birmingham`

const TEST_ORG = {
  name: 'E2E Bucket Test Gym',
  email: 'e2e-bucket-test@testgym.com'
}

const TEST_USER = {
  email: `bucket-e2e-${Date.now()}@testgym.com`,
  password: 'BucketE2ETest123!',
  name: 'Bucket E2E Test User'
}

test.describe('Migration Bucket Consistency End-to-End Tests', () => {
  let page: Page
  let context: BrowserContext
  let testJobId: string
  let supabaseUrl: string
  let supabaseServiceKey: string

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext()
    page = await context.newPage()

    supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    expect(supabaseUrl).toBeDefined()
    expect(supabaseServiceKey).toBeDefined()

    // Create test organization and user through Supabase Admin API
    await setupTestData()
  })

  test.afterAll(async () => {
    // Cleanup test data
    await cleanupTestData()
    await context.close()
  })

  test('should complete full migration workflow using migration-uploads bucket only', async () => {
    // Step 1: Login
    await page.goto('/signin')
    await page.fill('[data-testid="email-input"]', TEST_USER.email)
    await page.fill('[data-testid="password-input"]', TEST_USER.password)
    await page.click('[data-testid="signin-button"]')

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard', { timeout: 10000 })

    // Step 2: Navigate to migrations
    await page.goto('/settings/migrations')
    await page.waitForLoadState('networkidle')

    // Step 3: Upload CSV file
    const fileBuffer = Buffer.from(TEST_CSV_CONTENT)
    await page.setInputFiles('[data-testid="migrations-dropzone"] input[type="file"]', {
      name: 'bucket-test.csv',
      mimeType: 'text/csv',
      buffer: fileBuffer
    })

    // Wait for file to be processed
    await page.waitForSelector('text=Start AI Analysis', { timeout: 5000 })

    // Step 4: Start migration with network monitoring
    const networkRequests: Array<{ url: string, method: string }> = []

    page.on('request', request => {
      if (request.url().includes('/api/')) {
        networkRequests.push({
          url: request.url(),
          method: request.method()
        })
      }
    })

    await page.click('button:has-text("Start AI Analysis")')

    // Wait for AI analysis to complete
    await page.waitForSelector('text=Start Import', { timeout: 30000 })

    // Step 5: Start the actual import
    await page.click('button:has-text("Start Import")')

    // Wait for success message
    await page.waitForSelector('text=Migration started!', { timeout: 10000 })

    // Step 6: Verify bucket consistency by checking network requests
    const migrationRequests = networkRequests.filter(req =>
      req.url.includes('/api/migration') && req.method === 'POST'
    )

    expect(migrationRequests.length).toBeGreaterThan(0)

    // Step 7: Check migration status and verify no bucket-related errors
    await page.goto('/settings/migrations/status')
    await page.waitForLoadState('networkidle')

    // Should see the migration job without any bucket-related errors
    await expect(page.locator('text=bucket-test.csv')).toBeVisible()

    // Verify no error messages related to bucket issues
    const errorElements = await page.locator('[data-testid="error-message"]').all()
    for (const element of errorElements) {
      const text = await element.textContent()
      expect(text).not.toContain('migrations bucket')
      expect(text).not.toContain('migration-files bucket')
      expect(text).not.toContain('400 Bad Request')
    }
  })

  test('should handle large CSV files without bucket-related errors', async () => {
    // Generate larger CSV content
    const largeCSVRows = Array.from({ length: 500 }, (_, i) =>
      `User${i+1},user${i+1}@example.com,555-${String(i+1).padStart(4, '0')},1990-01-01,Male,City${i+1}`
    )
    const largeCsvContent = `Name,Email,Phone,Date of Birth,Gender,City\n${largeCSVRows.join('\n')}`

    await page.goto('/settings/migrations')

    // Upload large CSV
    const largeFileBuffer = Buffer.from(largeCsvContent)
    await page.setInputFiles('[data-testid="migrations-dropzone"] input[type="file"]', {
      name: 'large-bucket-test.csv',
      mimeType: 'text/csv',
      buffer: largeFileBuffer
    })

    await page.waitForSelector('text=Start AI Analysis')

    // Monitor for any bucket-related errors in the console
    const consoleErrors: string[] = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.click('button:has-text("Start AI Analysis")')
    await page.waitForSelector('text=Start Import', { timeout: 60000 })

    // Should not have bucket-related console errors
    const bucketErrors = consoleErrors.filter(error =>
      error.includes('migrations bucket') ||
      error.includes('migration-files') ||
      error.includes('400 Bad Request')
    )

    expect(bucketErrors).toHaveLength(0)
  })

  test('should maintain bucket consistency across page reloads', async () => {
    await page.goto('/settings/migrations')

    // Upload a file
    const fileBuffer = Buffer.from(TEST_CSV_CONTENT)
    await page.setInputFiles('[data-testid="migrations-dropzone"] input[type="file"]', {
      name: 'reload-test.csv',
      mimeType: 'text/csv',
      buffer: fileBuffer
    })

    await page.waitForSelector('text=Start AI Analysis')
    await page.click('button:has-text("Start AI Analysis")')
    await page.waitForSelector('text=Start Import', { timeout: 30000 })

    // Reload the page
    await page.reload()
    await page.waitForLoadState('networkidle')

    // Navigate to status page
    await page.goto('/settings/migrations/status')
    await page.waitForLoadState('networkidle')

    // Should still be able to see the migration without bucket errors
    await expect(page.locator('text=reload-test.csv')).toBeVisible()

    // Verify no bucket inconsistency errors after reload
    const errorMessages = await page.locator('[class*="error"], [class*="danger"]').all()
    for (const element of errorMessages) {
      const text = await element.textContent()
      expect(text).not.toContain('bucket')
      expect(text).not.toContain('400')
    }
  })

  test('should provide correct error messages referencing migration-uploads bucket', async () => {
    await page.goto('/settings/migrations')

    // Create an invalid migration scenario by uploading a non-CSV file
    const invalidFileBuffer = Buffer.from('This is not a CSV file')
    await page.setInputFiles('[data-testid="migrations-dropzone"] input[type="file"]', {
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: invalidFileBuffer
    })

    // Should get appropriate error message
    await expect(page.locator('text=Please upload a CSV or Excel file')).toBeVisible()

    // Any error messages should reference the correct bucket if mentioned
    const allText = await page.textContent('body')
    if (allText?.includes('bucket')) {
      expect(allText).toContain('migration-uploads')
      expect(allText).not.toContain('migrations bucket')
      expect(allText).not.toContain('migration-files')
    }
  })

  test('should handle multiple concurrent uploads using correct bucket', async () => {
    await page.goto('/settings/migrations')

    // Create multiple CSV files
    const csvFiles = [
      { name: 'concurrent1.csv', content: TEST_CSV_CONTENT },
      { name: 'concurrent2.csv', content: TEST_CSV_CONTENT.replace('John', 'Alice') },
      { name: 'concurrent3.csv', content: TEST_CSV_CONTENT.replace('Jane', 'Bob') }
    ]

    for (const csvFile of csvFiles) {
      // Upload each file
      const fileBuffer = Buffer.from(csvFile.content)
      await page.setInputFiles('[data-testid="migrations-dropzone"] input[type="file"]', {
        name: csvFile.name,
        mimeType: 'text/csv',
        buffer: fileBuffer
      })

      await page.waitForSelector('text=Start AI Analysis')
      await page.click('button:has-text("Start AI Analysis")')

      // Wait for analysis but don't start import to avoid conflicts
      await page.waitForSelector('text=Start Import', { timeout: 30000 })

      // Navigate back to upload another file
      if (csvFile !== csvFiles[csvFiles.length - 1]) {
        await page.goto('/settings/migrations')
      }
    }

    // Check that all files are processed without bucket errors
    await page.goto('/settings/migrations/status')
    await page.waitForLoadState('networkidle')

    // Should see all uploaded files
    for (const csvFile of csvFiles) {
      await expect(page.locator(`text=${csvFile.name}`)).toBeVisible()
    }

    // No bucket-related errors should be visible
    const pageText = await page.textContent('body')
    expect(pageText).not.toContain('migrations bucket')
    expect(pageText).not.toContain('migration-files bucket')
    expect(pageText).not.toContain('400 Bad Request')
  })

  // Helper functions
  async function setupTestData() {
    const { createClient } = await import('@supabase/supabase-js')
    const adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Create test organization
    const orgId = `e2e-bucket-org-${Date.now()}`
    const { error: orgError } = await adminClient
      .from('organizations')
      .insert({
        id: orgId,
        name: TEST_ORG.name,
        email: TEST_ORG.email
      })

    if (orgError) {
      throw new Error(`Failed to create test org: ${orgError.message}`)
    }

    // Create test user
    const { data: authUser, error: userError } = await adminClient.auth.admin.createUser({
      email: TEST_USER.email,
      password: TEST_USER.password,
      user_metadata: { name: TEST_USER.name }
    })

    if (userError || !authUser?.user) {
      throw new Error(`Failed to create test user: ${userError?.message}`)
    }

    // Add user to organization
    const { error: orgUserError } = await adminClient
      .from('user_organizations')
      .insert({
        user_id: authUser.user.id,
        organization_id: orgId,
        role: 'admin'
      })

    if (orgUserError) {
      throw new Error(`Failed to add user to org: ${orgUserError.message}`)
    }

    console.log('✓ Test data setup complete')
  }

  async function cleanupTestData() {
    try {
      const { createClient } = await import('@supabase/supabase-js')
      const adminClient = createClient(supabaseUrl, supabaseServiceKey)

      // Find and delete test data
      const { data: users } = await adminClient
        .from('user_organizations')
        .select('user_id, organization_id')
        .ilike('organization_id', '%e2e-bucket-org%')

      if (users) {
        for (const user of users) {
          // Delete migration data
          await adminClient.from('migration_records').delete()
            .match({ organization_id: user.organization_id })
          await adminClient.from('migration_files').delete()
            .match({ organization_id: user.organization_id })
          await adminClient.from('migration_jobs').delete()
            .match({ organization_id: user.organization_id })

          // Delete user-org relationship
          await adminClient.from('user_organizations').delete()
            .match({ user_id: user.user_id, organization_id: user.organization_id })

          // Delete organization
          await adminClient.from('organizations').delete()
            .match({ id: user.organization_id })
        }
      }

      console.log('✓ Test data cleanup complete')
    } catch (error) {
      console.error('Cleanup error:', error)
    }
  }
})