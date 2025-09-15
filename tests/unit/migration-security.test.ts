/**
 * Test Suite: Migration Security and Organization Isolation
 *
 * Tests authentication flows, authorization checks, and organization-level
 * data isolation for the migration system.
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import { NextRequest } from 'next/server'

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
    parse: jest.fn().mockReturnValue({
      data: [{ Name: 'Test User', Email: 'test@example.com' }],
      errors: []
    })
  }
}))

// Import after mocking
import { POST } from '@/app/api/migration/jobs/[id]/parse-csv/route'

describe('Migration Security and Organization Isolation Tests', () => {
  const testJobId = 'test-job-123'
  const testOrgId = 'test-org-123'
  const otherOrgId = 'other-org-456'
  const testUserId = 'test-user-123'
  const otherUserId = 'other-user-456'

  const mockUser = {
    id: testUserId,
    email: 'test@example.com'
  }

  const mockOtherUser = {
    id: otherUserId,
    email: 'other@example.com'
  }

  const mockUserOrg = {
    organization_id: testOrgId
  }

  const mockOtherUserOrg = {
    organization_id: otherOrgId
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

  const mockOtherOrgJob = {
    id: 'other-job-456',
    organization_id: otherOrgId,
    migration_files: [{
      id: 'file-456',
      file_name: 'other-data.csv',
      storage_path: 'migrations/other-org-456/other-job-456/other-data.csv',
      file_size_bytes: 2048
    }]
  }

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock successful file download by default
    const mockFileData = new Blob(['Name,Email\nTest User,test@example.com'], { type: 'text/csv' })
    mockSupabaseAdmin.storage.from.mockReturnValue({
      download: jest.fn().mockResolvedValue({
        data: mockFileData,
        error: null
      })
    })
  })

  describe('Authentication Requirements', () => {
    it('should reject requests with no authentication', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'No user found' }
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

    it('should reject requests with invalid authentication tokens', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Invalid JWT' }
          })
        }
      })

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer invalid-token-123'
        }
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(401)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
    })

    it('should reject requests with expired authentication tokens', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'JWT expired' }
          })
        }
      })

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer expired-token-123'
        }
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(401)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
    })

    it('should accept requests with valid authentication tokens', async () => {
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

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer valid-token-123'
        }
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
    })
  })

  describe('Organization Membership Validation', () => {
    it('should reject users not associated with any organization', async () => {
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
                data: null, // No organization association
                error: { message: 'No organization found' }
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

    it('should validate organization membership exists', async () => {
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
                data: { organization_id: null } // Invalid org ID
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

  describe('Cross-Organization Access Prevention', () => {
    it('should prevent users from accessing jobs from other organizations', async () => {
      // User from organization A trying to access job from organization B
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
                data: { organization_id: testOrgId } // User is in org A
              })
            })
          })
        })
      })

      // But the job belongs to a different organization
      mockSupabaseAdmin.from.mockImplementation((table) => {
        if (table === 'migration_jobs') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null, // No job found due to organization filtering
                    error: { message: 'Job not found' }
                  })
                })
              })
            })
          }
        }
        return {}
      })

      const request = new NextRequest('http://localhost/api/migration/jobs/other-org-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: 'other-org-job' } })
      const result = await response.json()

      expect(response.status).toBe(404)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Migration job not found')
    })

    it('should only query jobs within the user\'s organization', async () => {
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

      const mockJobQuery = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({
            data: mockMigrationJob
          })
        })
      })

      const mockSelect = jest.fn().mockReturnValue({
        eq: mockJobQuery
      })

      mockSupabaseAdmin.from.mockImplementation((table) => {
        if (table === 'migration_jobs') {
          return {
            select: mockSelect,
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

      await POST(request, { params: { id: testJobId } })

      // Verify that the query included organization_id filtering
      expect(mockJobQuery).toHaveBeenCalledWith('id', testJobId)
      expect(mockJobQuery).toHaveBeenCalledWith('organization_id', testOrgId)
    })

    it('should create migration records with correct organization context', async () => {
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

      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null })

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
          return { insert: mockInsert }
        }
        return {}
      })

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      await POST(request, { params: { id: testJobId } })

      // Verify that migration records include the correct organization_id
      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            migration_job_id: testJobId,
            organization_id: testOrgId,
            source_data: { Name: 'Test User', Email: 'test@example.com' },
            status: 'pending'
          })
        ])
      )
    })
  })

  describe('File Access Security', () => {
    it('should only access files within organization\'s storage path', async () => {
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

      const mockDownload = jest.fn().mockResolvedValue({
        data: new Blob(['Name,Email\nTest,test@example.com'], { type: 'text/csv' }),
        error: null
      })

      mockSupabaseAdmin.storage.from.mockReturnValue({
        download: mockDownload
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

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      await POST(request, { params: { id: testJobId } })

      // Verify that download was called with the correct bucket and path
      expect(mockSupabaseAdmin.storage.from).toHaveBeenCalledWith('migration-uploads')
      expect(mockDownload).toHaveBeenCalledWith(mockMigrationJob.migration_files[0].storage_path)

      // Verify path contains organization ID
      expect(mockMigrationJob.migration_files[0].storage_path).toContain(testOrgId)
    })

    it('should prevent access to files from other organizations', async () => {
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

      // Mock a job that exists but belongs to a different organization
      const crossOrgJob = {
        ...mockMigrationJob,
        organization_id: otherOrgId,
        migration_files: [{
          ...mockMigrationJob.migration_files[0],
          storage_path: 'migrations/other-org-456/test-job/file.csv'
        }]
      }

      mockSupabaseAdmin.from.mockImplementation((table) => {
        if (table === 'migration_jobs') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                eq: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: null, // Should not find due to organization filtering
                    error: { message: 'No rows returned' }
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

      expect(response.status).toBe(404)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Migration job not found')

      // Verify storage was never accessed
      expect(mockSupabaseAdmin.storage.from).not.toHaveBeenCalled()
    })
  })

  describe('Permission Level Validation', () => {
    it('should allow users with appropriate role to access migration functions', async () => {
      const adminUser = { ...mockUser, role: 'admin' }

      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: adminUser }
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

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
    })
  })

  describe('Session and Token Security', () => {
    it('should validate session integrity', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockImplementation(() => {
            // Simulate session validation failure
            return Promise.resolve({
              data: { user: null },
              error: { message: 'Invalid session' }
            })
          })
        }
      })

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer potentially-tampered-token'
        }
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(401)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
    })

    it('should handle token refresh scenarios gracefully', async () => {
      let callCount = 0
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockImplementation(() => {
            callCount++
            if (callCount === 1) {
              return Promise.resolve({
                data: { user: null },
                error: { message: 'Token expired' }
              })
            } else {
              return Promise.resolve({
                data: { user: mockUser }
              })
            }
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

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      // Should handle first auth failure appropriately
      expect(response.status).toBe(401)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')
    })
  })

  describe('Audit and Logging Security', () => {
    it('should log security-relevant events without exposing sensitive data', async () => {
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

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST'
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)

      // Verify logs include organization context but not sensitive data
      expect(result.logs).toContain(
        expect.stringMatching(new RegExp(`Organization: ${testOrgId}`))
      )

      // Verify logs don't contain sensitive information
      result.logs.forEach((log: string) => {
        expect(log).not.toMatch(/password|token|secret|key/i)
        expect(log).not.toContain(mockUser.email) // Shouldn't log email in detail
      })
    })

    it('should include request context in error logs for security monitoring', async () => {
      mockCreateClient.mockResolvedValue({
        auth: {
          getUser: jest.fn().mockResolvedValue({
            data: { user: null },
            error: { message: 'Unauthorized access attempt' }
          })
        }
      })

      const request = new NextRequest('http://localhost/api/migration/jobs/test-job/parse-csv', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer suspicious-token-123',
          'User-Agent': 'Suspicious-Bot/1.0'
        }
      })

      const response = await POST(request, { params: { id: testJobId } })
      const result = await response.json()

      expect(response.status).toBe(401)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Unauthorized')

      // Should include job ID in logs for security tracking
      expect(result.logs).toContain(
        expect.stringMatching(new RegExp(`Starting CSV parse for job ${testJobId}`))
      )
    })
  })
})