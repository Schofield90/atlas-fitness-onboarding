/**
 * Test Suite: Migration Error Handling and Recovery
 *
 * Tests error scenarios, recovery mechanisms, and graceful degradation
 * for the migration CSV processing system.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest, NextResponse } from 'next/server'

// Mock dependencies
const mockSupabaseAdmin = {
  from: jest.fn(),
  storage: {
    from: jest.fn()
  }
}

const mockCreateClient = jest.fn()

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

// Import after mocking
import { POST } from '@/app/api/migration/jobs/[id]/parse-csv/route'
import Papa from 'papaparse'

describe('Migration Error Handling Tests', () => {
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
      storage_path: 'migrations/test-org-123/test-job-123/test-data.csv',
      file_size_bytes: 1024
    }]
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Reset global fetch mock
    global.fetch = jest.fn()

    // Setup default successful mocks
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
  })

  describe('Storage Access Failures', () => {
    it('should handle storage service unavailable', async () => {
      mockSupabaseAdmin.storage.from.mockReturnValue({
        download: jest.fn().mockRejectedValue(new Error('Storage service unavailable')),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/migration-uploads/test-path' }
        })
      })

      global.fetch = jest.fn().mockRejectedValue(new Error('Network unreachable'))

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Storage access failed')
      expect(result.logs).toContain(
        expect.stringMatching(/Storage service unavailable/)
      )
    })

    it('should handle file not found in any storage location', async () => {
      mockSupabaseAdmin.storage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'File not found' }
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/migration-uploads/test-path' }
        })
      })

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: jest.fn().mockResolvedValue('File not found')
      })

      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toContain('migration-uploads bucket - check bucket permissions')
      expect(result.logs).toContain(
        expect.stringMatching(/Direct URL failed.*404/)
      )
    })

    it('should handle storage permission denied errors', async () => {
      mockSupabaseAdmin.storage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Permission denied' }
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/migration-uploads/test-path' }
        })
      })

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: jest.fn().mockResolvedValue('Access denied')
      })

      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.logs).toContain(
        expect.stringMatching(/Permission denied/)
      )
      expect(result.logs).toContain(
        expect.stringMatching(/403 Forbidden/)
      )
    })

    it('should handle storage timeout errors', async () => {
      mockSupabaseAdmin.storage.from.mockReturnValue({
        download: jest.fn().mockImplementation(() => new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), 100)
        })),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/migration-uploads/test-path' }
        })
      })

      global.fetch = jest.fn().mockImplementation(() => new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Fetch timeout')), 100)
      }))

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.logs).toContain(
        expect.stringMatching(/timeout/)
      )
    })
  })

  describe('CSV Parsing Failures', () => {
    beforeEach(() => {
      // Mock successful file download
      const mockFileData = new Blob(['Name,Email\nTest,test@example.com'], { type: 'text/csv' })
      mockSupabaseAdmin.storage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: mockFileData,
          error: null
        })
      })
    })

    it('should handle severely malformed CSV files', async () => {
      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: [],
        errors: [
          { message: 'Unable to parse CSV', row: 1, code: 'ParseError' },
          { message: 'Invalid format', row: 2, code: 'FormatError' },
          { message: 'Too many parsing errors', code: 'TooManyErrors' }
        ]
      })

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(200) // Still returns success but with 0 records
      expect(result.success).toBe(true)
      expect(result.stats.totalRows).toBe(0)
      expect(result.logs).toContain(
        expect.stringMatching(/Parse errors.*Unable to parse CSV/)
      )
    })

    it('should handle CSV files with all invalid data', async () => {
      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: [
          { '': '', '  ': '  ', ' ': ' ' }, // All empty/whitespace headers
          { '': '', '  ': '  ', ' ': ' ' }
        ],
        errors: []
      })

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.stats.totalRows).toBe(2)
      expect(result.stats.recordsCreated).toBe(2)
    })

    it('should handle extremely large CSV parsing that exhausts memory', async () => {
      ;(Papa.parse as jest.Mock).mockImplementation(() => {
        throw new Error('RangeError: Maximum call stack size exceeded')
      })

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Maximum call stack size exceeded')
    })

    it('should handle CSV parsing with corrupted file content', async () => {
      const corruptedBlob = new Blob(['�����invalid binary data�����'], { type: 'text/csv' })
      mockSupabaseAdmin.storage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: corruptedBlob,
          error: null
        })
      })

      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: [],
        errors: [
          { message: 'Invalid character encoding', code: 'EncodingError' }
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
        expect.stringMatching(/Invalid character encoding/)
      )
    })
  })

  describe('Database Operation Failures', () => {
    beforeEach(() => {
      // Mock successful file download and parsing
      const mockFileData = new Blob(['Name,Email\nTest User,test@example.com'], { type: 'text/csv' })
      mockSupabaseAdmin.storage.from.mockImplementation((bucket) => {
        if (bucket === 'migration-uploads') {
          return {
            download: jest.fn().mockResolvedValue({
              data: mockFileData,
              error: null
            })
          }
        }
        return {}
      })

      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: [{ Name: 'Test User', Email: 'test@example.com' }],
        errors: []
      })
    })

    it('should handle database connection failures during record insertion', async () => {
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
            insert: jest.fn().mockRejectedValue(new Error('Connection lost to database'))
          }
        }
        return {}
      })

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Connection lost to database')
    })

    it('should handle partial database insertion failures', async () => {
      let insertCallCount = 0
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
            insert: jest.fn().mockImplementation(() => {
              insertCallCount++
              if (insertCallCount === 1) {
                return Promise.resolve({ data: null, error: null }) // First batch succeeds
              } else {
                return Promise.resolve({
                  data: null,
                  error: { message: 'Unique constraint violation' }
                }) // Subsequent batches fail
              }
            })
          }
        }
        return {}
      })

      // Mock parsing result with multiple batches
      const largeDataSet = Array.from({ length: 75 }, (_, i) => ({
        Name: `User ${i + 1}`,
        Email: `user${i + 1}@example.com`
      }))

      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: largeDataSet,
        errors: []
      })

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(200) // Still succeeds overall
      expect(result.success).toBe(true)
      expect(result.logs).toContain(
        expect.stringMatching(/Batch 1 inserted successfully/)
      )
      expect(result.logs).toContain(
        expect.stringMatching(/Batch 2 error.*Unique constraint violation/)
      )
    })

    it('should handle database constraint violations', async () => {
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
              error: {
                message: 'duplicate key value violates unique constraint "migration_records_pkey"',
                code: '23505'
              }
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

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.logs).toContain(
        expect.stringMatching(/duplicate key value/)
      )
    })

    it('should handle job status update failures', async () => {
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
              eq: jest.fn().mockRejectedValue(new Error('Failed to update job status'))
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

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toContain('Failed to update job status')
    })
  })

  describe('Resource Exhaustion Scenarios', () => {
    it('should handle out of memory errors during processing', async () => {
      const mockFileData = new Blob(['Name,Email\nTest,test@example.com'], { type: 'text/csv' })
      mockSupabaseAdmin.storage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: mockFileData,
          error: null
        })
      })

      ;(Papa.parse as jest.Mock).mockImplementation(() => {
        throw new Error('JavaScript heap out of memory')
      })

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toContain('JavaScript heap out of memory')
    })

    it('should handle request timeout scenarios', async () => {
      jest.setTimeout(30000) // Extend test timeout

      const mockFileData = new Blob(['Name,Email\nTest,test@example.com'], { type: 'text/csv' })
      mockSupabaseAdmin.storage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: mockFileData,
          error: null
        })
      })

      // Simulate very slow parsing
      ;(Papa.parse as jest.Mock).mockImplementation(() => {
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve({
              data: [{ Name: 'Test', Email: 'test@example.com' }],
              errors: []
            })
          }, 25000) // 25 second delay
        })
      })

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      // This would timeout in real scenarios - testing the timeout handling
      const startTime = Date.now()
      const response = await POST(request, { params: { id: testJobId } })
      const endTime = Date.now()

      // Either completes successfully or times out - both are valid behaviors
      if (response.status === 200) {
        expect(endTime - startTime).toBeGreaterThan(20000)
      } else {
        expect([500, 408, 504]).toContain(response.status) // Various timeout status codes
      }
    })
  })

  describe('Concurrent Access Issues', () => {
    it('should handle concurrent parsing attempts on same job', async () => {
      const mockFileData = new Blob(['Name,Email\nTest,test@example.com'], { type: 'text/csv' })
      mockSupabaseAdmin.storage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: mockFileData,
          error: null
        })
      })

      ;(Papa.parse as jest.Mock).mockReturnValue({
        data: [{ Name: 'Test', Email: 'test@example.com' }],
        errors: []
      })

      // Mock job with status already being processed
      const processingJob = {
        ...mockMigrationJob,
        status: 'processing'
      }

      mockSupabaseAdmin.from.mockImplementation((table) => {
        if (table === 'migration_jobs') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: processingJob
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

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      // Should handle gracefully - either succeed or provide appropriate message
      expect([200, 409, 423]).toContain(response.status) // Success, Conflict, or Locked
      if (response.status !== 200) {
        expect(result.success).toBe(false)
      }
    })
  })

  describe('Recovery and Retry Mechanisms', () => {
    it('should log detailed error information for debugging', async () => {
      const mockFileData = new Blob(['invalid csv content'], { type: 'text/csv' })
      mockSupabaseAdmin.storage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: mockFileData,
          error: null
        })
      })

      ;(Papa.parse as jest.Mock).mockImplementation(() => {
        const error = new Error('Detailed parsing error with context')
        error.stack = 'Error: Detailed parsing error\n    at Papa.parse\n    at processFile'
        throw error
      })

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.logs).toContain(
        expect.stringMatching(/Fatal error.*Detailed parsing error/)
      )
      expect(result.error).toContain('Detailed parsing error with context')
    })

    it('should provide actionable error messages for common issues', async () => {
      mockSupabaseAdmin.storage.from.mockReturnValue({
        download: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Object not found' }
        }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: 'https://test.supabase.co/storage/v1/object/public/migration-uploads/test-path' }
        })
      })

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      })

      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.success).toBe(false)
      expect(result.error).toContain('check bucket permissions and file existence')
      expect(result.logs).toContain(
        expect.stringMatching(/Object not found/)
      )
    })
  })
})