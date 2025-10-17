/**
 * Unit tests for Staff API Route
 * 
 * Tests verify:
 * 1. Correct join syntax in Supabase query
 * 2. Authorization checks
 * 3. Organization member validation
 * 4. Data transformation and response format
 */

import { NextRequest, NextResponse } from 'next/server'
import { GET } from '../route'
import { createClient } from '@/app/lib/supabase/server'

// Mock Supabase client
jest.mock('@/app/lib/supabase/server', () => ({
  createClient: jest.fn()
}))

describe('Staff API Route', () => {
  let mockSupabase: any
  let mockRequest: NextRequest

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()

    // Create mock request
    mockRequest = new NextRequest('http://localhost:3000/api/staff')

    // Setup mock Supabase client
    mockSupabase = {
      auth: {
        getUser: jest.fn()
      },
      from: jest.fn()
    }

    ;(createClient as jest.Mock).mockReturnValue(mockSupabase)
  })

  describe('Authentication', () => {
    it('should return 401 if user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: new Error('Auth error')
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error).toBe('Unauthorized')
    })

    it('should proceed if user is authenticated', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      // Mock organization member check
      const fromMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 'org-123' },
          error: null
        })
      }
      mockSupabase.from.mockReturnValue(fromMock)

      await GET(mockRequest)

      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
    })
  })

  describe('Organization Validation', () => {
    beforeEach(() => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
    })

    it('should return 404 if user has no organization', async () => {
      const fromMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('No organization')
        })
      }
      mockSupabase.from.mockReturnValue(fromMock)

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Organization not found')
    })
  })

  describe('Staff Query with Correct Join Syntax', () => {
    beforeEach(() => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
    })

    it('should use correct join syntax: users!user_id', async () => {
      let capturedQuery = ''

      const orgMemberMock = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { organization_id: 'org-123' },
          error: null
        })
      }

      const staffMembersMock = {
        select: jest.fn((query) => {
          capturedQuery = query
          return staffMembersMock
        }),
        eq: jest.fn().mockReturnThis(),
        mockResolvedValue: jest.fn().mockResolvedValue({
          data: [
            {
              user_id: 'user-1',
              role: 'coach',
              users: {
                id: 'user-1',
                full_name: 'John Coach',
                email: 'john@example.com',
                avatar_url: null,
                title: 'Senior Coach'
              }
            }
          ],
          error: null
        })
      }

      // Mock sequence of from() calls
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) {
          // First call for organization_members
          return orgMemberMock
        } else if (callCount === 2) {
          // Second call for staff members
          return staffMembersMock
        } else {
          // Subsequent calls for specializations
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            mockResolvedValue: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          }
        }
      })

      // Make the actual call
      await GET(mockRequest)

      // Verify the correct join syntax was used
      expect(capturedQuery).toContain('users!user_id')
      expect(capturedQuery).not.toContain('users!inner')
      expect(capturedQuery).toMatch(/users!user_id\s*\(/);
    })

    it('should handle staff members with specializations', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })

      const mockStaffData = [
        {
          user_id: 'user-1',
          role: 'coach',
          users: {
            id: 'user-1',
            full_name: 'John Coach',
            email: 'john@example.com',
            avatar_url: 'https://example.com/avatar.jpg',
            title: 'Senior Coach'
          }
        }
      ]

      const mockSpecializations = [
        {
          specialization_type: 'strength_training',
          certification_name: 'NASM CPT',
          is_active: true
        },
        {
          specialization_type: 'nutrition',
          certification_name: 'Precision Nutrition',
          is_active: true
        }
      ]

      // Mock organization member query
      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { organization_id: 'org-123' },
              error: null
            })
          }
        } else if (callCount === 2) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: mockStaffData,
              error: null
            })
          }
        } else {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: mockSpecializations,
              error: null
            })
          }
        }
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.staff).toHaveLength(1)
      expect(data.staff[0]).toEqual({
        id: 'user-1',
        full_name: 'John Coach',
        email: 'john@example.com',
        avatar_url: 'https://example.com/avatar.jpg',
        title: 'Senior Coach',
        role: 'coach',
        specializations: [
          {
            type: 'strength_training',
            certification: 'NASM CPT',
            active: true
          },
          {
            type: 'nutrition',
            certification: 'Precision Nutrition',
            active: true
          }
        ]
      })
    })
  })

  describe('Error Handling', () => {
    beforeEach(() => {
      const mockUser = { id: 'user-123', email: 'test@example.com' }
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      })
    })

    it('should return 500 if staff query fails', async () => {
      let callCount = 0
      mockSupabase.from.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { organization_id: 'org-123' },
              error: null
            })
          }
        } else {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: null,
              error: new Error('Database query failed')
            })
          }
        }
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch staff members')
    })

    it('should handle empty staff list gracefully', async () => {
      let callCount = 0
      mockSupabase.from.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: { organization_id: 'org-123' },
              error: null
            })
          }
        } else {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({
              data: [],
              error: null
            })
          }
        }
      })

      const response = await GET(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.staff).toEqual([])
    })
  })
})