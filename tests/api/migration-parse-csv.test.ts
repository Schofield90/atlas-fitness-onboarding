/**
 * Test Suite: Migration CSV Parsing API
 *
 * Tests the parse-csv endpoint to verify the bucket mismatch fix and
 * comprehensive CSV parsing functionality.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// Mock implementations
const mockSupabaseAdmin = {
  from: jest.fn(),
  storage: {
    from: jest.fn()
  }
}

const mockCreateClient = jest.fn()

// Mock modules
jest.mock('@/app/lib/supabase/admin', () => ({
  supabaseAdmin: mockSupabaseAdmin
}))

jest.mock('@/app/lib/supabase/server', () => ({
  createClient: mockCreateClient
}))

jest.mock('papaparse', () => ({
  default: {
    parse: jest.fn()
  }
}))

// Import the route after mocking
import { POST } from '@/app/api/migration/jobs/[id]/parse-csv/route'
import Papa from 'papaparse'

describe('Migration Parse CSV API Tests', () => {
  const testJobId = 'test-job-123'
  const testOrgId = 'test-org-123'
  const testUserId = 'test-user-123'

  const mockUser = {
    id: testUserId,
    email: 'test@example.com'
  }

  const mockUserOrg = {
    organization_id: testOrgId
  }

  const mockMigrationJob = {
    id: testJobId,
    organization_id: testOrgId,
    migration_files: [{
      id: 'file-123',
      file_name: 'test-data.csv',
      storage_path: 'migrations/test-org-123/test-job-123/1234567890-test-data.csv',
      file_size_bytes: 1024
    }]
  }

  const mockCsvContent = `Name,Email,Phone,Source
John Doe,john@example.com,555-1234,website
Jane Smith,jane@example.com,555-5678,referral
Bob Johnson,bob@example.com,555-9012,social`

  const mockParsedData = [
    { Name: 'John Doe', Email: 'john@example.com', Phone: '555-1234', Source: 'website' },
    { Name: 'Jane Smith', Email: 'jane@example.com', Phone: '555-5678', Source: 'referral' },
    { Name: 'Bob Johnson', Email: 'bob@example.com', Phone: '555-9012', Source: 'social' }
  ]

  beforeEach(() => {
    jest.clearAllMocks()

    // Setup default mocks
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: jest.fn().mockResolvedValue({
          data: { user: mockUser }
        })
      },
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: mockUserOrg
            })
          })
        })
      })
    })

    mockSupabaseAdmin.from.mockImplementation((table) => {
      if (table === 'migration_jobs') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: mockMigrationJob
                })
              })
            })
          }),
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ data: null, error: null })
          })
        }
      }
      if (table === 'migration_records') {
        return {
          insert: jest.fn().mockResolvedValue({ data: null, error: null })
        }
      }
      return {}
    })

    ;(Papa.parse as jest.Mock).mockReturnValue({
      data: mockParsedData,
      errors: []
    })
  })

  describe('Authentication and Authorization', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null }
          })
        }
      })

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(401)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
    })

    it('should return 401 when user organization is not found', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: mockUser }
          })
        },
        from: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null
              })
            })
          })
        })
      })

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(401)
      expect(result.success).toBe(false)
      expect(result.error).toBe('User organization not found')
    })
  })

  describe('Migration Job Validation', () => {
    it('should return 404 when migration job is not found', async () => {
      mockSupabaseAdmin.from.mockImplementation((table) => {
        if (table === 'migration_jobs') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null,
                    error: { message: 'Job not found' }
                  })
                })
              })
            })
          }
        }
        return {}
      })

      const request = new NextRequest('http://localhost/api/migration/jobs/invalid-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: 'invalid-job' } })
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Migration job not found')
    })

    it('should return 400 when no files are associated with the job', async () => {
      const jobWithoutFiles = { ...mockMigrationJob, migration_files: [] }

      mockSupabaseAdmin.from.mockImplementation((table) => {
        if (table === 'migration_jobs') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: jobWithoutFiles
                  })
                })
              })
            })
          }
        }
        return {}
      })

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.success).toBe(false)
      expect(result.error).toBe('No files found for this job')
    })
  })

  describe('Bucket Fix Verification - migration-uploads bucket', () => {
    it('should successfully download file from migration-uploads bucket via authenticated download', async () => {
      const mockFileData = new Blob([mockCsvContent], { type: 'text/csv' })

      mockSupabaseAdmin.storage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: mockFileData,
          error: null
        })
      })

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      // Verify the correct bucket was used
      expect(mockSupabaseAdmin.storage.from).toHaveBeenCalledWith('migration-uploads')

      // Verify successful response
      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.stats.totalRows).toBe(3)
    })

    it('should try public URL when authenticated download fails from migration-uploads bucket', async () => {
      // Mock authenticated download failure
      mockSupabaseAdmin.storage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'File not found in authenticated download' }
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/migration-uploads/test-path' }
        })
      })

      // Mock successful fetch from public URL
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        text: jest.fn().mockResolvedValue(mockCsvContent)
      })

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      // Verify both methods were tried with correct bucket
      expect(mockSupabaseAdmin.storage.from).toHaveBeenCalledWith('migration-uploads')
      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
    })

    it('should try direct URL when public URL fails from migration-uploads bucket', async () => {
      // Mock both authenticated download and public URL failures
      mockSupabaseAdmin.storage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Authenticated download failed' }
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/migration-uploads/test-path' }
        })
      })

      let fetchCallCount = 0
      global.fetch = jest.fn().mockImplementation((url) => {
        fetchCallCount++
        if (fetchCallCount === 1) {
          // First call (public URL) fails
          return Promise.resolve({
            ok: false,
            status: 403,
            statusText: 'Forbidden'
          })
        } else {
          // Second call (direct URL) succeeds
          return Promise.resolve({
            ok: true,
            text: jest.fn().mockResolvedValue(mockCsvContent)
          })
        }
      })

      // Mock environment variable
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      // Verify direct URL was constructed with migration-uploads bucket
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('migration-uploads')
      )
      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
    })

    it('should return 500 when all download methods fail from migration-uploads bucket', async () => {
      // Mock all download methods failing
      mockSupabaseAdmin.storage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Authenticated download failed' }
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/migration-uploads/test-path' }
        })
      })

      global.fetch = jest.fn().mockImplementation(() => {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found'
        })
      })

      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toContain('migration-uploads bucket')
      expect(result.logs).toContain(
        expect.stringMatching(/migration-uploads bucket.*failed/)
      )
    })
  })

  describe('CSV Parsing Functionality', () => {
    beforeEach(() => {
      const mockFileData = new Blob([mockCsvContent], { type: 'text/csv' })

      mockSupabaseAdmin.storage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: mockFileData,
          error: null
        })
      })
    })

    it('should parse CSV content correctly', async () => {
      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(Papa.parse).toHaveBeenCalledWith(mockCsvContent, {
        header: true,
        skipEmptyLines: true,
        transformHeader: expect.any(Function)
      })

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.stats.totalRows).toBe(3)
      expect(result.stats.recordsCreated).toBe(3)
      expect(result.stats.sampleData).toHaveLength(2)
    })

    it('should handle CSV parsing errors gracefully', async () => {
      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: [],
        errors: [
          { message: 'Invalid CSV format', row: 1 },
          { message: 'Missing column', row: 2 }
        ]
      })

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.stats.totalRows).toBe(0)
      expect(result.logs).toContain(
        expect.stringMatching(/Parse errors/)
      )
    })

    it('should handle large CSV files with batch processing', async () => {
      // Create a large dataset
      const largeData = Array.from({ length: 150 }, (_, i) => ({
        Name: `User ${i + 1}`,
        Email: `user${i + 1}@example.com`,
        Phone: `555-${String(i + 1).padStart(4, '0')}`,
        Source: 'bulk_import'
      }))

      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: largeData,
        errors: []
      })

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      // Should process in batches of 50
      expect(mockSupabaseAdmin.from('migration_records').insert).toHaveBeenCalledTimes(3)
      expect(response.status).toBe(200)
      expect(result.stats.totalRows).toBe(150)
    })

    it('should create migration records with correct structure', async () => {
      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })

      // Verify migration records were created with correct structure
      expect(mockSupabaseAdmin.from('migration_records').insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            migration_job_id: testJobId,
            organization_id: testOrgId,
            source_row_number: 2, // +2 because row 1 is headers
            source_data: mockParsedData[0],
            status: 'pending',
            record_type: 'client'
          })
        ])
      )
    })

    it('should update job status to ready_to_process after successful parsing', async () => {
      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })

      expect(mockSupabaseAdmin.from('migration_jobs').update).toHaveBeenCalledWith({
        status: 'ready_to_process',
        total_records: 3
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle file download exceptions', async () => {
      mockSupabaseAdmin.storage.from.mockReturnValue({
        download: jest.fn().mockRejectedValue(new Error('Network error')),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/migration-uploads/test-path' }
        })
      })

      global.fetch = jest.fn().mockRejectedValue(new Error('Fetch failed'))

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toContain('migration-uploads bucket')
      expect(result.logs).toContain(
        expect.stringMatching(/exception/)
      )
    })

    it('should handle database insertion errors', async () => {
      const mockFileData = new Blob([mockCsvContent], { type: 'text/csv' })

      mockSupabaseAdmin.storage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: mockFileData,
          error: null
        })
      })

      mockSupabaseAdmin.from.mockImplementation((table) => {
        if (table === 'migration_jobs') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: mockMigrationJob
                  })
                })
              })
            }),
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ data: null, error: null })
            })
          }
        }
        if (table === 'migration_records') {
          return {
            insert: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database constraint violation' }
            })
          }
        }
        return {}
      })

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(200) // Still succeeds but logs error
      expect(result.logs).toContain(
        expect.stringMatching(/Batch.*error/)
      )
    })
  })

  describe('File Size and Format Handling', () => {
    it('should handle empty CSV files', async () => {
      const emptyFileData = new Blob(['Name,Email\n'], { type: 'text/csv' })

      mockSupabaseAdmin.storage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: emptyFileData,
          error: null
        })
      })

      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: [],
        errors: []
      })

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.stats.totalRows).toBe(0)
    })

    it('should handle CSV with special characters and formatting', async () => {
      const specialCharsCsv = `Name,Email,Notes
"Smith, John",john@example.com,"Referred by ""Jane"""
María García,maria@example.com,Special chars: áéíóú
O'Brien,obrien@example.com,"Multi-line
note with breaks"`

      const mockFileData = new Blob([specialCharsCsv], { type: 'text/csv' })

      mockSupabaseAdmin.storage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: mockFileData,
          error: null
        })
      })

      const specialParsedData = [
        { Name: 'Smith, John', Email: 'john@example.com', Notes: 'Referred by "Jane"' },
        { Name: 'María García', Email: 'maria@example.com', Notes: 'Special chars: áéíóú' },
        { Name: "O'Brien", Email: 'obrien@example.com', Notes: 'Multi-line\nnote with breaks' }
      ]

      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: specialParsedData,
        errors: []
      })

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.stats.totalRows).toBe(3)
    })
  })
})