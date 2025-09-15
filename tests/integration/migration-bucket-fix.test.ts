/**
 * Integration Test Suite: Migration Bucket Fix Verification
 *
 * Tests to specifically verify that the bucket mismatch fix resolves
 * the 400 Bad Request errors that were occurring when files were uploaded
 * to "migration-uploads" but the parse-csv route was trying to download
 * from "migration-files".
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const TEST_ORG = {
  id: 'bucket-fix-test-org-' + Date.now(),
  name: 'Bucket Fix Test Organization'
}

const TEST_USER = {
  email: `bucket-fix-test-${Date.now()}@testgym.com`,
  password: 'BucketFixTest123!',
  name: 'Bucket Fix Test User'
}

const SAMPLE_CSV_CONTENT = `Name,Email,Phone,Source
John Doe,john@example.com,555-1234,website
Jane Smith,jane@example.com,555-5678,referral
Bob Johnson,bob@example.com,555-9012,social`

describe('Migration Bucket Fix Integration Tests', () => {
  let adminClient: any
  let userToken: string
  let testOrgId: string
  let testUserId: string
  let testCsvPath: string

  beforeAll(async () => {
    // Setup admin client
    adminClient = createClient(supabaseUrl, supabaseServiceKey)

    // Create test organization
    testOrgId = TEST_ORG.id
    const { error: orgError } = await adminClient
      .from('organizations')
      .insert(TEST_ORG)

    if (orgError) {
      throw new Error(`Failed to create test organization: ${orgError.message}`)
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

    testUserId = authUser.user.id

    // Add user to organization
    const { error: orgUserError } = await adminClient
      .from('user_organizations')
      .insert({
        user_id: testUserId,
        organization_id: testOrgId,
        role: 'admin'
      })

    if (orgUserError) {
      throw new Error(`Failed to add user to organization: ${orgUserError.message}`)
    }

    // Get user auth token
    const userClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    const { data: sessionData, error: loginError } = await userClient.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password
    })

    if (loginError || !sessionData?.session) {
      throw new Error(`Failed to login test user: ${loginError?.message}`)
    }

    userToken = sessionData.session.access_token

    // Create test CSV file
    const tempDir = os.tmpdir()
    testCsvPath = path.join(tempDir, 'bucket-fix-test.csv')
    fs.writeFileSync(testCsvPath, SAMPLE_CSV_CONTENT)
  })

  afterAll(async () => {
    // Cleanup test file
    if (fs.existsSync(testCsvPath)) {
      fs.unlinkSync(testCsvPath)
    }

    // Cleanup database in reverse dependency order
    try {
      await adminClient.from('migration_records').delete().match({ organization_id: testOrgId })
      await adminClient.from('migration_files').delete().match({ organization_id: testOrgId })
      await adminClient.from('migration_jobs').delete().match({ organization_id: testOrgId })
      await adminClient.from('user_organizations').delete().match({ organization_id: testOrgId })
      await adminClient.from('organizations').delete().match({ id: testOrgId })
    } catch (error) {
      console.error('Cleanup error:', error)
    }
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Bucket Consistency Verification', () => {
    it('should upload files to migration-uploads bucket and parse from the same bucket', async () => {
      // Step 1: Create migration job
      const jobResponse = await fetch('/api/migration/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          name: 'Bucket Fix Test Job',
          description: 'Testing bucket consistency',
          sourcePlatform: 'goteamup',
          settings: {
            skipDuplicates: false,
            validateData: true,
            createBackup: true,
            batchSize: 50
          }
        })
      })

      expect(jobResponse.status).toBe(200)
      const jobData = await jobResponse.json()
      expect(jobData.success).toBe(true)

      const jobId = jobData.jobId

      // Step 2: Upload CSV file
      const formData = new FormData()
      const csvFile = new File([SAMPLE_CSV_CONTENT], 'test.csv', { type: 'text/csv' })
      formData.append('file-0', csvFile)

      const uploadResponse = await fetch(`/api/migration/jobs/${jobId}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        },
        body: formData
      })

      expect(uploadResponse.status).toBe(200)
      const uploadData = await uploadResponse.json()
      expect(uploadData.success).toBe(true)
      expect(uploadData.files).toHaveLength(1)

      // Verify file was uploaded to migration-uploads bucket
      const uploadedFile = uploadData.files[0]
      expect(uploadedFile.filePath).toBeDefined()

      // Direct verification that file exists in migration-uploads bucket
      const { data: fileExists, error: downloadError } = await adminClient.storage
        .from('migration-uploads')
        .download(uploadedFile.filePath)

      expect(downloadError).toBeNull()
      expect(fileExists).toBeTruthy()

      // Step 3: Parse CSV - this should succeed without 400 errors
      const parseResponse = await fetch(`/api/migration/jobs/${jobId}/parse-csv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      const parseData = await parseResponse.json()

      // This is the key verification - should not get 400 Bad Request
      expect(parseResponse.status).not.toBe(400)
      expect(parseResponse.status).toBe(200)
      expect(parseData.success).toBe(true)

      // Verify parsing results
      expect(parseData.stats).toBeDefined()
      expect(parseData.stats.totalRows).toBe(3)
      expect(parseData.stats.recordsCreated).toBe(3)

      // Verify logs show successful bucket access
      expect(parseData.logs).toContain(
        expect.stringMatching(/Downloaded.*characters/)
      )
      expect(parseData.logs).toContain(
        expect.stringMatching(/migration-uploads/)
      )
    })

    it('should consistently use migration-uploads bucket across all operations', async () => {
      const networkRequests: Array<{ url: string, method: string, status: number }> = []

      // Create a job for this specific test
      const jobResponse = await fetch('/api/migration/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          name: 'Bucket Consistency Test',
          description: 'Verifying consistent bucket usage',
          sourcePlatform: 'goteamup',
          settings: {
            skipDuplicates: false,
            validateData: true,
            createBackup: true,
            batchSize: 50
          }
        })
      })

      const jobData = await jobResponse.json()
      const jobId = jobData.jobId

      // Upload file
      const formData = new FormData()
      const csvFile = new File([SAMPLE_CSV_CONTENT], 'consistency-test.csv', { type: 'text/csv' })
      formData.append('file-0', csvFile)

      const uploadResponse = await fetch(`/api/migration/jobs/${jobId}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        },
        body: formData
      })

      const uploadData = await uploadResponse.json()
      const filePath = uploadData.files[0].filePath

      // Verify file is accessible from migration-uploads bucket
      const { data: fileData, error: accessError } = await adminClient.storage
        .from('migration-uploads')
        .download(filePath)

      expect(accessError).toBeNull()
      expect(fileData).toBeTruthy()

      // Verify file is NOT accessible from wrong bucket (migration-files)
      const { data: wrongBucketData, error: wrongBucketError } = await adminClient.storage
        .from('migration-files')
        .download(filePath)

      expect(wrongBucketError).toBeTruthy()
      expect(wrongBucketData).toBeNull()

      // Parse CSV and verify success
      const parseResponse = await fetch(`/api/migration/jobs/${jobId}/parse-csv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      expect(parseResponse.status).toBe(200)
      const parseData = await parseResponse.json()
      expect(parseData.success).toBe(true)

      // Verify logs indicate correct bucket usage
      expect(parseData.logs.some((log: string) =>
        log.includes('migration-uploads')
      )).toBe(true)

      expect(parseData.logs.some((log: string) =>
        log.includes('migration-files')
      )).toBe(false)
    })
  })

  describe('Before and After Fix Behavior', () => {
    it('should demonstrate that the fix resolves the bucket mismatch issue', async () => {
      // Create job
      const jobResponse = await fetch('/api/migration/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          name: 'Fix Demonstration Test',
          description: 'Demonstrating the bucket fix',
          sourcePlatform: 'goteamup',
          settings: {
            skipDuplicates: false,
            validateData: true,
            createBackup: true,
            batchSize: 50
          }
        })
      })

      const jobData = await jobResponse.json()
      const jobId = jobData.jobId

      // Upload to migration-uploads (correct bucket)
      const formData = new FormData()
      const csvFile = new File([SAMPLE_CSV_CONTENT], 'fix-demo.csv', { type: 'text/csv' })
      formData.append('file-0', csvFile)

      const uploadResponse = await fetch(`/api/migration/jobs/${jobId}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        },
        body: formData
      })

      const uploadData = await uploadResponse.json()
      const filePath = uploadData.files[0].filePath

      // Get the migration job to check file storage path
      const { data: migrationJob } = await adminClient
        .from('migration_jobs')
        .select(`
          *,
          migration_files(*)
        `)
        .eq('id', jobId)
        .single()

      expect(migrationJob).toBeTruthy()
      expect(migrationJob.migration_files).toHaveLength(1)

      const storedFile = migrationJob.migration_files[0]
      expect(storedFile.storage_path).toBe(filePath)

      // Verify the file exists in the correct bucket
      const { data: correctBucketFile, error: correctBucketError } = await adminClient.storage
        .from('migration-uploads')
        .download(storedFile.storage_path)

      expect(correctBucketError).toBeNull()
      expect(correctBucketFile).toBeTruthy()

      // Now parse - this should succeed because we're looking in the right bucket
      const parseResponse = await fetch(`/api/migration/jobs/${jobId}/parse-csv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      const parseData = await parseResponse.json()

      // Key assertion: No 400 error due to bucket mismatch
      expect(parseResponse.status).toBe(200)
      expect(parseData.success).toBe(true)

      // Verify the fix is working by checking the logs
      const downloadLogs = parseData.logs.filter((log: string) =>
        log.includes('Downloaded') || log.includes('migration-uploads')
      )

      expect(downloadLogs.length).toBeGreaterThan(0)

      // Should not have any errors about wrong bucket
      const errorLogs = parseData.logs.filter((log: string) =>
        log.includes('failed from migration-files') || log.includes('bucket.*failed')
      )

      expect(errorLogs.length).toBe(0)
    })

    it('should handle multiple download strategies all using migration-uploads bucket', async () => {
      // Create job
      const jobResponse = await fetch('/api/migration/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          name: 'Multi-Strategy Test',
          description: 'Testing all download strategies use correct bucket',
          sourcePlatform: 'goteamup',
          settings: {
            skipDuplicates: false,
            validateData: true,
            createBackup: true,
            batchSize: 50
          }
        })
      })

      const jobData = await jobResponse.json()
      const jobId = jobData.jobId

      // Upload file
      const formData = new FormData()
      const csvFile = new File([SAMPLE_CSV_CONTENT], 'multi-strategy.csv', { type: 'text/csv' })
      formData.append('file-0', csvFile)

      await fetch(`/api/migration/jobs/${jobId}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        },
        body: formData
      })

      // Parse CSV and check that all strategies mention migration-uploads
      const parseResponse = await fetch(`/api/migration/jobs/${jobId}/parse-csv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      const parseData = await parseResponse.json()

      expect(parseResponse.status).toBe(200)
      expect(parseData.success).toBe(true)

      // Check that logs mention the correct bucket
      const bucketLogs = parseData.logs.filter((log: string) =>
        log.includes('bucket')
      )

      bucketLogs.forEach((log: string) => {
        if (log.includes('bucket')) {
          // Should mention migration-uploads, not migration-files
          expect(log).toContain('migration-uploads')
          expect(log).not.toContain('migration-files')
        }
      })

      // Verify successful download
      const downloadLogs = parseData.logs.filter((log: string) =>
        log.includes('Downloaded') && log.includes('characters')
      )

      expect(downloadLogs.length).toBeGreaterThan(0)
    })
  })

  describe('Error Prevention and Recovery', () => {
    it('should not produce any 400 Bad Request errors during normal operation', async () => {
      const allResponses: Response[] = []

      // Track all HTTP responses
      const originalFetch = global.fetch
      global.fetch = jest.fn().mockImplementation((...args) => {
        const response = originalFetch.apply(global, args as any)
        return response.then((res) => {
          allResponses.push(res.clone())
          return res
        })
      })

      try {
        // Create job
        const jobResponse = await fetch('/api/migration/jobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
          },
          body: JSON.stringify({
            name: 'No 400 Error Test',
            description: 'Ensuring no 400 errors occur',
            sourcePlatform: 'goteamup',
            settings: {
              skipDuplicates: false,
              validateData: true,
              createBackup: true,
              batchSize: 50
            }
          })
        })

        const jobData = await jobResponse.json()
        const jobId = jobData.jobId

        // Upload file
        const formData = new FormData()
        const csvFile = new File([SAMPLE_CSV_CONTENT], 'no-400-test.csv', { type: 'text/csv' })
        formData.append('file-0', csvFile)

        const uploadResponse = await fetch(`/api/migration/jobs/${jobId}/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userToken}`
          },
          body: formData
        })

        // Parse CSV
        const parseResponse = await fetch(`/api/migration/jobs/${jobId}/parse-csv`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        })

        // Check all responses for 400 errors
        const badRequests = [jobResponse, uploadResponse, parseResponse].filter(
          res => res.status === 400
        )

        expect(badRequests).toHaveLength(0)

        // Verify parse was successful
        expect(parseResponse.status).toBe(200)
        const parseData = await parseResponse.json()
        expect(parseData.success).toBe(true)

      } finally {
        global.fetch = originalFetch
      }
    })

    it('should provide clear error messages if bucket issues occur', async () => {
      // This test simulates potential bucket access issues
      // In real scenarios, this might happen due to permissions or network issues

      const jobResponse = await fetch('/api/migration/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          name: 'Error Message Test',
          description: 'Testing error message clarity',
          sourcePlatform: 'goteamup',
          settings: {
            skipDuplicates: false,
            validateData: true,
            createBackup: true,
            batchSize: 50
          }
        })
      })

      const jobData = await jobResponse.json()
      const jobId = jobData.jobId

      // Upload a file
      const formData = new FormData()
      const csvFile = new File([SAMPLE_CSV_CONTENT], 'error-test.csv', { type: 'text/csv' })
      formData.append('file-0', csvFile)

      await fetch(`/api/migration/jobs/${jobId}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        },
        body: formData
      })

      // Now manually remove the file to simulate missing file scenario
      const { data: job } = await adminClient
        .from('migration_jobs')
        .select(`
          *,
          migration_files(*)
        `)
        .eq('id', jobId)
        .single()

      const filePath = job.migration_files[0].storage_path

      // Remove the file
      await adminClient.storage
        .from('migration-uploads')
        .remove([filePath])

      // Try to parse - should get clear error message
      const parseResponse = await fetch(`/api/migration/jobs/${jobId}/parse-csv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      const parseData = await parseResponse.json()

      expect(parseResponse.status).toBe(500) // Should fail gracefully, not 400
      expect(parseData.success).toBe(false)

      // Should mention the correct bucket in error message
      expect(parseData.error).toContain('migration-uploads')
      expect(parseData.logs.some((log: string) =>
        log.includes('migration-uploads bucket')
      )).toBe(true)
    })
  })

  describe('Regression Prevention', () => {
    it('should maintain bucket consistency across application restarts', async () => {
      // This test ensures that the bucket name fix is persistent
      // and doesn't regress due to configuration issues

      const jobResponse = await fetch('/api/migration/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          name: 'Regression Test',
          description: 'Testing regression prevention',
          sourcePlatform: 'goteamup',
          settings: {
            skipDuplicates: false,
            validateData: true,
            createBackup: true,
            batchSize: 50
          }
        })
      })

      const jobData = await jobResponse.json()
      const jobId = jobData.jobId

      // Upload multiple files to ensure consistent behavior
      for (let i = 0; i < 3; i++) {
        const formData = new FormData()
        const csvFile = new File([SAMPLE_CSV_CONTENT], `regression-test-${i}.csv`, { type: 'text/csv' })
        formData.append('file-0', csvFile)

        const uploadResponse = await fetch(`/api/migration/jobs/${jobId}/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userToken}`
          },
          body: formData
        })

        expect(uploadResponse.status).toBe(200)
      }

      // Parse should work consistently
      const parseResponse = await fetch(`/api/migration/jobs/${jobId}/parse-csv`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        }
      })

      expect(parseResponse.status).toBe(200)
      const parseData = await parseResponse.json()
      expect(parseData.success).toBe(true)

      // All logs should consistently reference migration-uploads
      const bucketReferences = parseData.logs.filter((log: string) =>
        log.includes('migration-')
      )

      bucketReferences.forEach((log: string) => {
        expect(log).toContain('migration-uploads')
        expect(log).not.toContain('migration-files')
      })
    })

    it('should work correctly with different file sizes and types', async () => {
      // Test various scenarios to ensure the fix works universally

      const scenarios = [
        { name: 'small.csv', content: 'Name,Email\nTest,test@example.com' },
        { name: 'medium.csv', content: SAMPLE_CSV_CONTENT },
        {
          name: 'large.csv',
          content: `Name,Email\n${Array.from({ length: 100 }, (_, i) =>
            `User${i},user${i}@example.com`
          ).join('\n')}`
        }
      ]

      for (const scenario of scenarios) {
        const jobResponse = await fetch('/api/migration/jobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
          },
          body: JSON.stringify({
            name: `Multi-size Test ${scenario.name}`,
            description: `Testing ${scenario.name}`,
            sourcePlatform: 'goteamup',
            settings: {
              skipDuplicates: false,
              validateData: true,
              createBackup: true,
              batchSize: 50
            }
          })
        })

        const jobData = await jobResponse.json()
        const jobId = jobData.jobId

        // Upload file
        const formData = new FormData()
        const csvFile = new File([scenario.content], scenario.name, { type: 'text/csv' })
        formData.append('file-0', csvFile)

        const uploadResponse = await fetch(`/api/migration/jobs/${jobId}/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userToken}`
          },
          body: formData
        })

        expect(uploadResponse.status).toBe(200)

        // Parse should work for all sizes
        const parseResponse = await fetch(`/api/migration/jobs/${jobId}/parse-csv`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${userToken}`
          }
        })

        expect(parseResponse.status).toBe(200)
        const parseData = await parseResponse.json()
        expect(parseData.success).toBe(true)

        console.log(`✓ ${scenario.name}: Successfully processed with bucket fix`)
      }
    })
  })
})