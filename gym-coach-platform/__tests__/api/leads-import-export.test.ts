import { NextRequest } from 'next/server'
import { POST as importHandler } from '@/app/api/leads/import/route'
import { GET as exportGetHandler, POST as exportPostHandler } from '@/app/api/leads/export/route'

// Mock dependencies
jest.mock('@/lib/supabase/server')
jest.mock('@/lib/api/middleware')
jest.mock('@/lib/utils/csv-export')

import { supabase } from '@/lib/supabase/server'
import { validateApiRequest } from '@/lib/api/middleware'
import { leadsToCSV, generateExportFilename } from '@/lib/utils/csv-export'

const mockSupabase = jest.mocked(supabase)
const mockValidateApiRequest = jest.mocked(validateApiRequest)
const mockLeadsToCSV = jest.mocked(leadsToCSV)
const mockGenerateExportFilename = jest.mocked(generateExportFilename)

describe('Leads Import/Export API Integration Tests', () => {
  const mockUser = { id: 'user-1', email: 'test@example.com' }
  const mockOrganization = { id: 'org-1', name: 'Test Gym' }

  beforeEach(() => {
    jest.clearAllMocks()
    mockValidateApiRequest.mockResolvedValue({
      success: true,
      user: mockUser,
      organization: mockOrganization
    })
  })

  describe('Import API (/api/leads/import)', () => {
    test('successfully imports valid leads', async () => {
      const leadsData = [
        { name: 'John Doe', email: 'john@test.com', phone: '123456', status: 'warm', source: 'Website' },
        { name: 'Jane Smith', email: 'jane@test.com', phone: '789012', status: 'hot', source: 'Facebook' }
      ]

      // Mock Supabase responses
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [], // No existing emails
              error: null
            })
          })
        }),
        insert: jest.fn().mockResolvedValue({
          error: null
        })
      } as any)

      const request = new NextRequest('http://localhost/api/leads/import', {
        method: 'POST',
        body: JSON.stringify({ leads: leadsData })
      })

      const response = await importHandler(request)
      const result = await response.json()

      expect(response.status).toBe(200)
      expect(result.success).toBe(true)
      expect(result.imported).toBe(2)
      expect(result.failed).toBe(0)
      expect(result.message).toContain('Successfully imported all 2 leads')
    })

    test('handles duplicate email validation', async () => {
      const leadsData = [
        { name: 'John Doe', email: 'existing@test.com', status: 'warm' },
        { name: 'Jane Smith', email: 'jane@test.com', status: 'hot' }
      ]

      // Mock existing email found
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({
              data: [{ email: 'existing@test.com' }],
              error: null
            })
          })
        }),
        insert: jest.fn().mockResolvedValue({
          error: null
        })
      } as any)

      const request = new NextRequest('http://localhost/api/leads/import', {
        method: 'POST',
        body: JSON.stringify({ leads: leadsData })
      })

      const response = await importHandler(request)
      const result = await response.json()

      expect(response.status).toBe(207) // Multi-status for partial success
      expect(result.imported).toBe(1)
      expect(result.failed).toBe(1)
      expect(result.errors[0].error).toContain('Email already exists')
    })

    test('validates required fields', async () => {
      const invalidLeadsData = [
        { name: 'John Doe' }, // Missing email
        { email: 'jane@test.com' }, // Missing name
        { name: 'Bob Smith', email: 'invalid-email' } // Invalid email format
      ]

      const request = new NextRequest('http://localhost/api/leads/import', {
        method: 'POST',
        body: JSON.stringify({ leads: invalidLeadsData })
      })

      const response = await importHandler(request)
      const result = await response.json()

      expect(response.status).toBe(207)
      expect(result.imported).toBe(0)
      expect(result.failed).toBe(3)
      expect(result.errors).toHaveLength(3)
      expect(result.errors[0].error).toContain('Email is required')
      expect(result.errors[1].error).toContain('Name is required')
      expect(result.errors[2].error).toContain('Invalid email format')
    })

    test('enforces import limits', async () => {
      const tooManyLeads = Array.from({ length: 1001 }, (_, i) => ({
        name: `User ${i}`,
        email: `user${i}@test.com`
      }))

      const request = new NextRequest('http://localhost/api/leads/import', {
        method: 'POST',
        body: JSON.stringify({ leads: tooManyLeads })
      })

      const response = await importHandler(request)
      const result = await response.json()

      expect(response.status).toBe(400)
      expect(result.error).toContain('Cannot import more than 1000 leads at once')
    })

    test('handles database insertion errors', async () => {
      const leadsData = [{ name: 'John Doe', email: 'john@test.com' }]

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        }),
        insert: jest.fn().mockResolvedValue({
          error: { message: 'Database connection failed' }
        })
      } as any)

      const request = new NextRequest('http://localhost/api/leads/import', {
        method: 'POST',
        body: JSON.stringify({ leads: leadsData })
      })

      const response = await importHandler(request)
      const result = await response.json()

      expect(response.status).toBe(207)
      expect(result.failed).toBe(1)
      expect(result.errors[0].error).toContain('Database connection failed')
    })

    test('validates request body structure', async () => {
      const invalidBodies = [
        {}, // No leads array
        { leads: 'not-an-array' }, // Invalid leads type
        { leads: [] } // Empty array
      ]

      for (const body of invalidBodies) {
        const request = new NextRequest('http://localhost/api/leads/import', {
          method: 'POST',
          body: JSON.stringify(body)
        })

        const response = await importHandler(request)
        expect(response.status).toBe(400)
      }
    })
  })

  describe('Export API (/api/leads/export)', () => {
    const mockLeadsData = [
      {
        id: '1',
        name: 'John Doe',
        email: 'john@test.com',
        phone: '123456',
        status: 'warm',
        source: 'Website',
        lead_score: 75,
        qualification_notes: 'Interested',
        created_at: '2024-01-15T10:30:00Z'
      },
      {
        id: '2',
        name: 'Jane Smith',
        email: 'jane@test.com',
        phone: null,
        status: 'hot',
        source: 'Facebook',
        lead_score: 90,
        qualification_notes: null,
        created_at: '2024-01-14T09:15:00Z'
      }
    ]

    describe('GET Export', () => {
      beforeEach(() => {
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockLeadsData,
                  error: null
                })
              })
            })
          })
        } as any)

        mockLeadsToCSV.mockReturnValue('Name,Email\nJohn Doe,john@test.com\nJane Smith,jane@test.com')
        mockGenerateExportFilename.mockReturnValue('leads-2024-01-15-14-30-45.csv')
      })

      test('exports leads as CSV with default parameters', async () => {
        const request = new NextRequest('http://localhost/api/leads/export?format=csv')

        const response = await exportGetHandler(request)

        expect(response.status).toBe(200)
        expect(response.headers.get('Content-Type')).toBe('text/csv; charset=utf-8')
        expect(response.headers.get('Content-Disposition')).toContain('attachment; filename="leads-2024-01-15-14-30-45.csv"')
        expect(response.headers.get('X-Total-Records')).toBe('2')

        const csvContent = await response.text()
        expect(csvContent).toContain('John Doe,john@test.com')
      })

      test('exports leads as JSON when specified', async () => {
        const request = new NextRequest('http://localhost/api/leads/export?format=json')

        const response = await exportGetHandler(request)
        const result = await response.json()

        expect(response.status).toBe(200)
        expect(result.data).toEqual(mockLeadsData)
        expect(result.meta.total).toBe(2)
        expect(result.meta.organization_id).toBe(mockOrganization.id)
      })

      test('applies status filter', async () => {
        const filteredQuery = {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockImplementation((field, value) => {
              if (field === 'organization_id') {
                return {
                  limit: jest.fn().mockReturnValue({
                    order: jest.fn().mockReturnValue({
                      eq: jest.fn().mockResolvedValue({
                        data: mockLeadsData.filter(lead => lead.status === 'warm'),
                        error: null
                      })
                    })
                  })
                }
              }
              return {
                limit: jest.fn().mockReturnValue({
                  order: jest.fn().mockResolvedValue({
                    data: mockLeadsData.filter(lead => lead.status === value),
                    error: null
                  })
                })
              }
            })
          })
        }

        mockSupabase.from.mockReturnValue(filteredQuery as any)

        const request = new NextRequest('http://localhost/api/leads/export?status=warm')

        const response = await exportGetHandler(request)
        expect(response.status).toBe(200)
      })

      test('applies search filter', async () => {
        const searchQuery = {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  or: jest.fn().mockResolvedValue({
                    data: mockLeadsData.filter(lead => 
                      lead.name.includes('John') || lead.email.includes('john')
                    ),
                    error: null
                  })
                })
              })
            })
          })
        }

        mockSupabase.from.mockReturnValue(searchQuery as any)

        const request = new NextRequest('http://localhost/api/leads/export?search=john')

        const response = await exportGetHandler(request)
        expect(response.status).toBe(200)
      })

      test('handles limit validation', async () => {
        const request = new NextRequest('http://localhost/api/leads/export?limit=20000')

        const response = await exportGetHandler(request)
        const result = await response.json()

        expect(response.status).toBe(400)
        expect(result.error).toContain('Limit must be between 1 and 10000')
      })

      test('handles no results found', async () => {
        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          })
        } as any)

        const request = new NextRequest('http://localhost/api/leads/export')

        const response = await exportGetHandler(request)
        const result = await response.json()

        expect(response.status).toBe(404)
        expect(result.error).toContain('No leads found matching the criteria')
      })
    })

    describe('POST Export (Selected Leads)', () => {
      test('exports selected leads by IDs', async () => {
        const leadIds = ['1', '2']

        mockSupabase.from.mockReturnValue({
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                order: jest.fn().mockResolvedValue({
                  data: mockLeadsData,
                  error: null
                })
              })
            })
          })
        } as any)

        mockLeadsToCSV.mockReturnValue('Name,Email\nJohn Doe,john@test.com\nJane Smith,jane@test.com')
        mockGenerateExportFilename.mockReturnValue('leads-selected-2024-01-15-14-30-45.csv')

        const request = new NextRequest('http://localhost/api/leads/export', {
          method: 'POST',
          body: JSON.stringify({ leadIds, format: 'csv' })
        })

        const response = await exportPostHandler(request)

        expect(response.status).toBe(200)
        expect(response.headers.get('X-Total-Records')).toBe('2')
        expect(response.headers.get('X-Requested-Records')).toBe('2')
      })

      test('validates lead IDs in request body', async () => {
        const invalidBodies = [
          {}, // No leadIds
          { leadIds: 'not-an-array' }, // Invalid type
          { leadIds: [] } // Empty array
        ]

        for (const body of invalidBodies) {
          const request = new NextRequest('http://localhost/api/leads/export', {
            method: 'POST',
            body: JSON.stringify(body)
          })

          const response = await exportPostHandler(request)
          expect(response.status).toBe(400)
        }
      })

      test('enforces export limits', async () => {
        const tooManyIds = Array.from({ length: 10001 }, (_, i) => `${i}`)

        const request = new NextRequest('http://localhost/api/leads/export', {
          method: 'POST',
          body: JSON.stringify({ leadIds: tooManyIds })
        })

        const response = await exportPostHandler(request)
        const result = await response.json()

        expect(response.status).toBe(400)
        expect(result.error).toContain('Cannot export more than 10000 leads at once')
      })
    })

    test('handles database errors gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              order: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database connection failed' }
              })
            })
          })
        })
      } as any)

      const request = new NextRequest('http://localhost/api/leads/export')

      const response = await exportGetHandler(request)
      const result = await response.json()

      expect(response.status).toBe(500)
      expect(result.error).toBe('Failed to fetch leads')
    })
  })

  describe('Authentication and Authorization', () => {
    test('returns 401 for unauthenticated requests', async () => {
      mockValidateApiRequest.mockResolvedValue({
        success: false,
        error: 'Unauthorized',
        status: 401
      })

      const request = new NextRequest('http://localhost/api/leads/import', {
        method: 'POST',
        body: JSON.stringify({ leads: [] })
      })

      const response = await importHandler(request)
      const result = await response.json()

      expect(response.status).toBe(401)
      expect(result.error).toBe('Unauthorized')
    })

    test('returns 403 for insufficient permissions', async () => {
      mockValidateApiRequest.mockResolvedValue({
        success: false,
        error: 'Insufficient permissions',
        status: 403
      })

      const request = new NextRequest('http://localhost/api/leads/export')

      const response = await exportGetHandler(request)
      const result = await response.json()

      expect(response.status).toBe(403)
      expect(result.error).toBe('Insufficient permissions')
    })
  })

  describe('Performance and Error Handling', () => {
    test('handles large import batches within time limits', async () => {
      const largeLeadsBatch = Array.from({ length: 1000 }, (_, i) => ({
        name: `User ${i}`,
        email: `user${i}@test.com`,
        status: 'cold'
      }))

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            in: jest.fn().mockResolvedValue({ data: [], error: null })
          })
        }),
        insert: jest.fn().mockResolvedValue({ error: null })
      } as any)

      const request = new NextRequest('http://localhost/api/leads/import', {
        method: 'POST',
        body: JSON.stringify({ leads: largeLeadsBatch })
      })

      const startTime = Date.now()
      const response = await importHandler(request)
      const endTime = Date.now()

      expect(endTime - startTime).toBeLessThan(10000) // Should complete within 10 seconds
      expect(response.status).toBe(200)
    })

    test('handles malformed JSON requests', async () => {
      const request = new NextRequest('http://localhost/api/leads/import', {
        method: 'POST',
        body: 'invalid json{'
      })

      const response = await importHandler(request)
      expect(response.status).toBe(500)
    })
  })
})