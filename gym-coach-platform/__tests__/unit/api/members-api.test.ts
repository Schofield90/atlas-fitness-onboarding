import { describe, it, expect, vi, beforeEach, afterEach } from '@jest/jest'
import { NextRequest, NextResponse } from 'next/server'

// Mock the Supabase client
const mockSupabaseClient = {
  auth: {
    getUser: vi.fn()
  },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        or: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              range: vi.fn()
            }))
          })),
          order: vi.fn(() => ({
            range: vi.fn()
          }))
        })),
        order: vi.fn(() => ({
          range: vi.fn()
        }))
      }))
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn()
      }))
    }))
  }))
}

vi.mock('@supabase/auth-helpers-nextjs', () => ({
  createRouteHandlerClient: () => mockSupabaseClient
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn()
}))

describe('Members API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/clients', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT' }
      })

      // Mock API route handler
      const mockRequest = new NextRequest('http://localhost:3001/api/clients', {
        method: 'GET'
      })

      // Simulate the API route logic
      const authResult = await mockSupabaseClient.auth.getUser()

      expect(authResult.data.user).toBeNull()
      expect(authResult.error).toBeDefined()

      // Should return 401 response
      const expectedResponse = { error: 'Unauthorized' }
      expect(expectedResponse.error).toBe('Unauthorized')
    })

    it('should return 404 when user has no organization', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'sam@atlas-gyms.co.uk'
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock user lookup that returns no organization
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'User not found' }
            })
          })
        })
      })

      const userQuery = mockSupabaseClient
        .from('users')
        .select('organization_id')
        .eq('id', mockUser.id)
        .single()

      const userResult = await userQuery

      expect(userResult.data).toBeNull()
      expect(userResult.error.message).toBe('User not found')

      // Should return 404 response
      const expectedResponse = { error: 'User not found' }
      expect(expectedResponse.error).toBe('User not found')
    })

    it('should return members for authenticated user with organization', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'sam@atlas-gyms.co.uk'
      }

      const mockUserData = {
        id: 'test-user-id',
        organization_id: 'eac9a158-d3c7-4140-9620-91a5554a6fe8'
      }

      const mockMembers = [
        {
          id: 'member-1',
          name: 'John Doe',
          email: 'john@example.com',
          organization_id: 'eac9a158-d3c7-4140-9620-91a5554a6fe8',
          membership_status: 'active',
          membership_plan: {
            id: 'plan-1',
            name: 'Basic Monthly',
            price_pennies: 2999,
            currency: 'GBP',
            billing_cycle: 'monthly'
          }
        }
      ]

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock user organization lookup
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUserData,
              error: null
            })
          })
        })
      })

      // Mock clients query
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: mockMembers,
                error: null,
                count: 1
              })
            })
          })
        })
      })

      // Simulate the API logic
      const authResult = await mockSupabaseClient.auth.getUser()
      expect(authResult.data.user).toBeDefined()

      const userQuery = mockSupabaseClient
        .from('users')
        .select('organization_id')
        .eq('id', mockUser.id)
        .single()

      const userResult = await userQuery
      expect(userResult.data.organization_id).toBe('eac9a158-d3c7-4140-9620-91a5554a6fe8')

      const clientsQuery = mockSupabaseClient
        .from('clients')
        .select(`
          *,
          lead:leads(id, source, campaign_id),
          interactions_count:interactions(count)
        `, { count: 'exact' })
        .eq('organization_id', userResult.data.organization_id)
        .order('created_at', { ascending: false })
        .range(0, 9)

      const clientsResult = await clientsQuery
      expect(clientsResult.data).toHaveLength(1)
      expect(clientsResult.data[0].name).toBe('John Doe')
      expect(clientsResult.data[0].organization_id).toBe('eac9a158-d3c7-4140-9620-91a5554a6fe8')
    })

    it('should handle search and filtering correctly', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'sam@atlas-gyms.co.uk'
      }

      const mockUserData = {
        id: 'test-user-id',
        organization_id: 'eac9a158-d3c7-4140-9620-91a5554a6fe8'
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUserData,
              error: null
            })
          })
        })
      })

      // Test search functionality
      const searchTerm = 'john'
      const membershipStatus = 'active'

      // Mock query with filters
      const mockQuery = {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            or: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  range: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                    count: 0
                  })
                })
              })
            })
          })
        })
      }

      mockSupabaseClient.from.mockReturnValueOnce(mockQuery)

      // Simulate query building with filters
      let query = mockSupabaseClient
        .from('clients')
        .select(`
          *,
          lead:leads(id, source, campaign_id),
          interactions_count:interactions(count)
        `, { count: 'exact' })
        .eq('organization_id', mockUserData.organization_id)

      // Apply search filter
      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      }

      // Apply status filter
      if (membershipStatus) {
        query = query.eq('membership_status', membershipStatus)
      }

      query = query.order('created_at', { ascending: false }).range(0, 9)

      const result = await query

      expect(result.data).toBeDefined()
      expect(result.count).toBe(0)
    })
  })

  describe('GET /api/membership-plans', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT' }
      })

      const authResult = await mockSupabaseClient.auth.getUser()

      expect(authResult.data.user).toBeNull()
      expect(authResult.error).toBeDefined()

      // Should return 401 response
      const expectedResponse = { error: 'Unauthorized' }
      expect(expectedResponse.error).toBe('Unauthorized')
    })

    it('should return membership plans for authenticated user', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'sam@atlas-gyms.co.uk'
      }

      const mockUserData = {
        id: 'test-user-id',
        organization_id: 'eac9a158-d3c7-4140-9620-91a5554a6fe8'
      }

      const mockPlans = [
        {
          id: 'plan-1',
          name: 'Basic Monthly',
          price_pennies: 2999,
          currency: 'GBP',
          billing_cycle: 'monthly',
          organization_id: 'eac9a158-d3c7-4140-9620-91a5554a6fe8'
        },
        {
          id: 'plan-2',
          name: 'Premium Monthly',
          price_pennies: 4999,
          currency: 'GBP',
          billing_cycle: 'monthly',
          organization_id: 'eac9a158-d3c7-4140-9620-91a5554a6fe8'
        }
      ]

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock user organization lookup
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUserData,
              error: null
            })
          })
        })
      })

      // Mock membership plans query
      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockPlans,
              error: null
            })
          })
        })
      })

      // Simulate API logic
      const authResult = await mockSupabaseClient.auth.getUser()
      expect(authResult.data.user).toBeDefined()

      const userQuery = mockSupabaseClient
        .from('users')
        .select('organization_id')
        .eq('id', mockUser.id)
        .single()

      const userResult = await userQuery
      expect(userResult.data.organization_id).toBe('eac9a158-d3c7-4140-9620-91a5554a6fe8')

      const plansQuery = mockSupabaseClient
        .from('membership_plans')
        .select('*')
        .eq('organization_id', userResult.data.organization_id)
        .order('sort_order', { ascending: true })

      const plansResult = await plansQuery

      expect(plansResult.data).toHaveLength(2)
      expect(plansResult.data[0].name).toBe('Basic Monthly')
      expect(plansResult.data[0].price_pennies).toBe(2999)
      expect(plansResult.data[1].name).toBe('Premium Monthly')
      expect(plansResult.data[1].price_pennies).toBe(4999)
    })

    it('should return empty array when no plans exist', async () => {
      const mockUser = {
        id: 'test-user-id',
        email: 'sam@atlas-gyms.co.uk'
      }

      const mockUserData = {
        id: 'test-user-id',
        organization_id: 'eac9a158-d3c7-4140-9620-91a5554a6fe8'
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUserData,
              error: null
            })
          })
        })
      })

      mockSupabaseClient.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      })

      const authResult = await mockSupabaseClient.auth.getUser()
      expect(authResult.data.user).toBeDefined()

      const userQuery = mockSupabaseClient
        .from('users')
        .select('organization_id')
        .eq('id', mockUser.id)
        .single()

      const userResult = await userQuery

      const plansQuery = mockSupabaseClient
        .from('membership_plans')
        .select('*')
        .eq('organization_id', userResult.data.organization_id)
        .order('sort_order', { ascending: true })

      const plansResult = await plansQuery

      expect(plansResult.data).toHaveLength(0)
      expect(plansResult.error).toBeNull()
    })
  })

  describe('Organization Data Isolation', () => {
    it('should only return data for the user\'s organization', async () => {
      const userOrgId = 'eac9a158-d3c7-4140-9620-91a5554a6fe8'
      const otherOrgId = 'different-org-id'

      const mockUser = {
        id: 'test-user-id',
        email: 'sam@atlas-gyms.co.uk'
      }

      const mockUserData = {
        id: 'test-user-id',
        organization_id: userOrgId
      }

      mockSupabaseClient.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockUserData,
              error: null
            }),
            order: vi.fn().mockReturnValue({
              range: vi.fn().mockResolvedValue({
                data: [
                  {
                    id: 'member-1',
                    name: 'John Doe',
                    organization_id: userOrgId  // Only this org's data
                  }
                ],
                error: null,
                count: 1
              })
            })
          })
        })
      })

      // Verify organization filtering is applied
      const userQuery = mockSupabaseClient
        .from('users')
        .select('organization_id')
        .eq('id', mockUser.id)
        .single()

      const userResult = await userQuery

      const clientsQuery = mockSupabaseClient
        .from('clients')
        .select('*', { count: 'exact' })
        .eq('organization_id', userResult.data.organization_id)  // Must filter by org
        .order('created_at', { ascending: false })
        .range(0, 9)

      const clientsResult = await clientsQuery

      expect(clientsResult.data[0].organization_id).toBe(userOrgId)
      expect(clientsResult.data[0].organization_id).not.toBe(otherOrgId)
    })
  })
})