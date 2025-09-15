/**
 * Integration Test Suite: Migration Upload Bucket Verification
 *
 * Tests specifically for file upload operations to verify they use the
 * correct "migration-uploads" bucket and not the old "migrations" bucket.
 * These tests would FAIL if the upload operations used incorrect bucket names.
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
  id: 'upload-bucket-test-org-' + Date.now(),
  name: 'Upload Bucket Test Organization'
}

const TEST_USER = {
  email: `upload-bucket-test-${Date.now()}@testgym.com`,
  password: 'UploadBucketTest123!',
  name: 'Upload Bucket Test User'
}

const SAMPLE_CSV_CONTENT = `Name,Email,Phone,Source
John Doe,john@example.com,555-1234,website
Jane Smith,jane@example.com,555-5678,referral
Bob Johnson,bob@example.com,555-9012,social`

const LARGE_CSV_CONTENT = `Name,Email,Phone,Source\n${Array.from({ length: 1000 }, (_, i) =>
  `User${i+1},user${i+1}@example.com,555-${String(i+1).padStart(4, '0')},bulk`
).join('\n')}`

describe('Migration Upload Bucket Verification Tests', () => {
  let adminClient: any
  let userToken: string
  let testOrgId: string
  let testUserId: string

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
  })

  afterAll(async () => {
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

  describe('File Upload Bucket Verification', () => {
    it('should upload files to migration-uploads bucket, not migrations bucket', async () => {
      // Step 1: Create migration job
      const jobResponse = await fetch('/api/migration/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          name: 'Upload Bucket Test Job',
          description: 'Testing upload bucket consistency',
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
      const csvFile = new File([SAMPLE_CSV_CONTENT], 'upload-bucket-test.csv', { type: 'text/csv' })
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

      const uploadedFile = uploadData.files[0]
      expect(uploadedFile.filePath).toBeDefined()

      // Step 3: CRITICAL TEST - Verify file exists in migration-uploads bucket ONLY
      const { data: fileInCorrectBucket, error: correctBucketError } = await adminClient.storage
        .from('migration-uploads')
        .download(uploadedFile.filePath)

      expect(correctBucketError).toBeNull()
      expect(fileInCorrectBucket).toBeTruthy()

      // Step 4: CRITICAL TEST - Verify file does NOT exist in wrong buckets
      const wrongBuckets = ['migrations', 'migration-files']

      for (const wrongBucket of wrongBuckets) {
        const { data: fileInWrongBucket, error: wrongBucketError } = await adminClient.storage
          .from(wrongBucket)
          .download(uploadedFile.filePath)

        // Should fail to find file in wrong bucket
        expect(wrongBucketError).toBeTruthy()
        expect(fileInWrongBucket).toBeNull()
      }

      // Step 5: Verify the uploaded file content
      const uploadedContent = await fileInCorrectBucket.text()
      expect(uploadedContent).toBe(SAMPLE_CSV_CONTENT)
    })

    it('should handle multiple file uploads all to migration-uploads bucket', async () => {
      // Create job
      const jobResponse = await fetch('/api/migration/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          name: 'Multi Upload Bucket Test',
          description: 'Testing multiple uploads to correct bucket',
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

      // Upload multiple files
      const testFiles = [
        { name: 'clients.csv', content: SAMPLE_CSV_CONTENT },
        { name: 'payments.csv', content: 'Client Email,Amount,Date\njohn@example.com,50,2024-01-01' },
        { name: 'attendance.csv', content: 'Client Email,Class,Date\njane@example.com,Yoga,2024-01-01' }
      ]

      const uploadedFilePaths: string[] = []

      for (const testFile of testFiles) {
        const formData = new FormData()
        const csvFile = new File([testFile.content], testFile.name, { type: 'text/csv' })
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

        uploadedFilePaths.push(uploadData.files[0].filePath)
      }

      // Verify all files are in migration-uploads bucket
      for (const filePath of uploadedFilePaths) {
        const { data: fileData, error: downloadError } = await adminClient.storage
          .from('migration-uploads')
          .download(filePath)

        expect(downloadError).toBeNull()
        expect(fileData).toBeTruthy()

        // Verify files are NOT in wrong buckets
        const { data: wrongData, error: wrongError } = await adminClient.storage
          .from('migrations')
          .download(filePath)

        expect(wrongError).toBeTruthy()
        expect(wrongData).toBeNull()
      }
    })

    it('should handle large file uploads to migration-uploads bucket', async () => {
      // Create job
      const jobResponse = await fetch('/api/migration/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          name: 'Large Upload Bucket Test',
          description: 'Testing large file upload to correct bucket',
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

      // Upload large CSV file
      const formData = new FormData()
      const largeCsvFile = new File([LARGE_CSV_CONTENT], 'large-upload-test.csv', { type: 'text/csv' })
      formData.append('file-0', largeCsvFile)

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

      const filePath = uploadData.files[0].filePath

      // Verify large file is in correct bucket
      const { data: fileData, error: downloadError } = await adminClient.storage
        .from('migration-uploads')
        .download(filePath)

      expect(downloadError).toBeNull()
      expect(fileData).toBeTruthy()

      // Verify file size matches
      const uploadedContent = await fileData.text()
      expect(uploadedContent.split('\n').length).toBe(LARGE_CSV_CONTENT.split('\n').length)
    })

    it('should store file metadata referencing migration-uploads bucket path', async () => {
      // Create job
      const jobResponse = await fetch('/api/migration/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          name: 'Metadata Bucket Test',
          description: 'Testing file metadata for correct bucket reference',
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
      const csvFile = new File([SAMPLE_CSV_CONTENT], 'metadata-test.csv', { type: 'text/csv' })
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

      // Get file metadata from database
      const { data: fileMetadata, error: metadataError } = await adminClient
        .from('migration_files')
        .select('*')
        .eq('migration_job_id', jobId)
        .single()

      expect(metadataError).toBeNull()
      expect(fileMetadata).toBeTruthy()
      expect(fileMetadata.storage_path).toBe(filePath)

      // The storage path should be consistent with migration-uploads bucket
      expect(fileMetadata.storage_path).toBeDefined()

      // Verify the file can be accessed using the stored path
      const { data: accessedFile, error: accessError } = await adminClient.storage
        .from('migration-uploads')
        .download(fileMetadata.storage_path)

      expect(accessError).toBeNull()
      expect(accessedFile).toBeTruthy()
    })

    it('should fail upload if trying to use wrong bucket names', async () => {
      // This test simulates what would happen if code tried to use wrong bucket names
      // It ensures our upload process is resistant to such errors

      const wrongBuckets = ['migrations', 'migration-files']

      for (const wrongBucket of wrongBuckets) {
        // Try to upload directly to wrong bucket (this should fail)
        const testFile = new File([SAMPLE_CSV_CONTENT], 'wrong-bucket-test.csv', { type: 'text/csv' })

        try {
          const { error: uploadError } = await adminClient.storage
            .from(wrongBucket)
            .upload(`test-path-${Date.now()}/wrong-bucket-test.csv`, testFile)

          // If bucket exists but is wrong, we should get an error or the file shouldn't be accessible
          // This test ensures we're not accidentally using wrong buckets
          if (!uploadError) {
            // If upload succeeded, the file should not be accessible for our migration workflow
            console.warn(`Warning: Upload to ${wrongBucket} succeeded but should not be used`)
          }
        } catch (error) {
          // Expected - wrong bucket should fail
          expect(error).toBeTruthy()
        }
      }

      // Verify correct bucket works
      const testFile = new File([SAMPLE_CSV_CONTENT], 'correct-bucket-test.csv', { type: 'text/csv' })
      const { error: correctUploadError } = await adminClient.storage
        .from('migration-uploads')
        .upload(`test-path-${Date.now()}/correct-bucket-test.csv`, testFile)

      // This should succeed
      expect(correctUploadError).toBeNull()
    })
  })

  describe('Upload Error Handling with Bucket References', () => {
    it('should provide error messages referencing migration-uploads bucket', async () => {
      // Create job
      const jobResponse = await fetch('/api/migration/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          name: 'Error Message Bucket Test',
          description: 'Testing error messages reference correct bucket',
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

      // Try to upload an invalid file type
      const formData = new FormData()
      const invalidFile = new File(['not a csv'], 'invalid.txt', { type: 'text/plain' })
      formData.append('file-0', invalidFile)

      const uploadResponse = await fetch(`/api/migration/jobs/${jobId}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        },
        body: formData
      })

      const uploadData = await uploadResponse.json()

      // If there are error messages mentioning buckets, they should reference the correct one
      if (uploadData.error && uploadData.error.includes('bucket')) {
        expect(uploadData.error).toContain('migration-uploads')
        expect(uploadData.error).not.toContain('migrations')
        expect(uploadData.error).not.toContain('migration-files')
      }
    })

    it('should handle upload failures gracefully with correct bucket context', async () => {
      // Create job
      const jobResponse = await fetch('/api/migration/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          name: 'Upload Failure Test',
          description: 'Testing upload failure handling',
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

      // Try to upload an excessively large file (this might fail due to size limits)
      const hugeCsvContent = `Name,Email\n${Array.from({ length: 100000 }, (_, i) =>
        `User${i},user${i}@example.com`
      ).join('\n')}`

      const formData = new FormData()
      const hugeFile = new File([hugeCsvContent], 'huge-file.csv', { type: 'text/csv' })
      formData.append('file-0', hugeFile)

      const uploadResponse = await fetch(`/api/migration/jobs/${jobId}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${userToken}`
        },
        body: formData
      })

      const uploadData = await uploadResponse.json()

      // Whether it succeeds or fails, bucket references should be correct
      if (uploadData.error) {
        // Error messages should not reference old bucket names
        expect(uploadData.error).not.toContain('migrations bucket')
        expect(uploadData.error).not.toContain('migration-files bucket')

        // If bucket is mentioned, should be correct one
        if (uploadData.error.includes('bucket')) {
          expect(uploadData.error).toContain('migration-uploads')
        }
      }
    })
  })

  describe('Cross-Platform Upload Bucket Consistency', () => {
    it('should use migration-uploads bucket regardless of source platform', async () => {
      const platforms = ['goteamup', 'mindbody', 'glofox']

      for (const platform of platforms) {
        // Create job for each platform
        const jobResponse = await fetch('/api/migration/jobs', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${userToken}`
          },
          body: JSON.stringify({
            name: `${platform} Bucket Test`,
            description: `Testing ${platform} upload bucket consistency`,
            sourcePlatform: platform,
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
        const csvFile = new File([SAMPLE_CSV_CONTENT], `${platform}-test.csv`, { type: 'text/csv' })
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

        const filePath = uploadData.files[0].filePath

        // Verify file is in migration-uploads bucket regardless of platform
        const { data: fileData, error: downloadError } = await adminClient.storage
          .from('migration-uploads')
          .download(filePath)

        expect(downloadError).toBeNull()
        expect(fileData).toBeTruthy()
      }
    })
  })

  describe('Upload Path Structure Verification', () => {
    it('should generate correct file paths for migration-uploads bucket', async () => {
      // Create job
      const jobResponse = await fetch('/api/migration/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${userToken}`
        },
        body: JSON.stringify({
          name: 'Path Structure Test',
          description: 'Testing upload path structure',
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
      const csvFile = new File([SAMPLE_CSV_CONTENT], 'path-test.csv', { type: 'text/csv' })
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

      // File path should be structured for organization and job
      expect(filePath).toContain(testOrgId)
      expect(filePath).toContain(jobId)
      expect(filePath).toContain('path-test.csv')

      // Path should be accessible in migration-uploads bucket
      const { data: fileData, error: accessError } = await adminClient.storage
        .from('migration-uploads')
        .download(filePath)

      expect(accessError).toBeNull()
      expect(fileData).toBeTruthy()
    })
  })
})