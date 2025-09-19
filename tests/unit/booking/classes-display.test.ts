/**
 * Unit tests for Class Display/Booking API
 *
 * Tests verify:
 * 1. Classes appear correctly in calendar view
 * 2. Cancelled classes are filtered out
 * 3. Capacity is correctly resolved (max_capacity prioritized)
 * 4. Required fields validation for display
 * 5. Booking count and membership status
 */

import { NextRequest, NextResponse } from 'next/server'
import { GET as getClasses } from '@/app/api/booking/classes/route'

// Mock dependencies
jest.mock('@/app/lib/supabase/server', () => ({
  createClient: jest.fn()
}))

jest.mock('@/app/lib/api/auth-check', () => ({
  requireAuth: jest.fn(),
  createErrorResponse: jest.fn((error) =>
    NextResponse.json({ error: error.message }, { status: 500 })
  )
}))

// Mock NextRequest to avoid URL property conflicts
class MockNextRequest {
  public nextUrl: { searchParams: URLSearchParams }

  constructor(public url: string, init?: { method?: string }) {
    this.nextUrl = {
      searchParams: new URLSearchParams(new URL(url).search)
    }
  }
}

describe('Class Display/Booking API', () => {
  let mockSupabase: any
  let mockRequest: NextRequest

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock authenticated user
    const { requireAuth } = require('@/app/lib/api/auth-check')
    requireAuth.mockResolvedValue({
      organizationId: 'org-123',
      userId: 'user-456'
    })

    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn()
    }

    const { createClient } = require('@/app/lib/supabase/server')
    createClient.mockReturnValue(mockSupabase)

    // Create mock request
    mockRequest = new MockNextRequest('http://localhost:3000/api/booking/classes') as any
  })

  describe('Class Filtering and Display', () => {
    it('should filter out cancelled classes', async () => {
      const mockClassesData = [
        {
          id: 'session-1',
          organization_id: 'org-123',
          program_id: 'program-1',
          start_time: '2025-09-22T06:00:00.000Z',
          end_time: '2025-09-22T07:00:00.000Z',
          duration_minutes: 60,
          session_status: 'scheduled',
          max_capacity: 8,
          program: { name: 'Morning Strength', max_participants: 8 },
          bookings: []
        },
        {
          id: 'session-2',
          organization_id: 'org-123',
          program_id: 'program-1',
          start_time: '2025-09-22T18:00:00.000Z',
          end_time: '2025-09-22T19:00:00.000Z',
          duration_minutes: 60,
          session_status: 'cancelled', // This should be filtered out
          max_capacity: 8,
          program: { name: 'Evening Strength', max_participants: 8 },
          bookings: []
        },
        {
          id: 'session-3',
          organization_id: 'org-123',
          program_id: 'program-2',
          start_time: '2025-09-22T10:00:00.000Z',
          end_time: '2025-09-22T11:00:00.000Z',
          duration_minutes: 60,
          session_status: 'scheduled',
          max_capacity: 12,
          program: { name: 'Yoga Flow', max_participants: 12 },
          bookings: []
        }
      ]

      const classesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockClassesData,
          error: null
        })
      }

      const membershipsQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1 && table === 'class_sessions') return classesQuery
        if (callCount === 2 && table === 'customer_memberships') return membershipsQuery
        return mockSupabase
      })

      const response = await getClasses(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)

      // Verify neq('session_status', 'cancelled') was called to filter cancelled classes
      expect(classesQuery.neq).toHaveBeenCalledWith('session_status', 'cancelled')

      // Response should contain all 3 classes since the filtering happens in the query
      expect(data.classes).toHaveLength(3)

      // None of the returned classes should have cancelled status
      data.classes.forEach((cls: any) => {
        expect(cls.session_status).not.toBe('cancelled')
      })
    })

    it('should correctly resolve capacity priorities', async () => {
      const mockClassesData = [
        {
          id: 'session-1',
          max_capacity: 8, // Direct max_capacity should be used
          capacity: 12, // This should be ignored
          program: { max_participants: 10, default_capacity: 15 },
          session_status: 'scheduled',
          bookings: []
        },
        {
          id: 'session-2',
          max_capacity: null, // No direct max_capacity
          capacity: 20,
          program: { max_participants: 8, default_capacity: 15 }, // Should use max_participants
          session_status: 'scheduled',
          bookings: []
        },
        {
          id: 'session-3',
          max_capacity: null,
          capacity: 25,
          program: { max_participants: null, default_capacity: 12 }, // Should use default_capacity
          session_status: 'scheduled',
          bookings: []
        },
        {
          id: 'session-4',
          max_capacity: null,
          capacity: 18, // Should use capacity as fallback
          program: { max_participants: null, default_capacity: null },
          session_status: 'scheduled',
          bookings: []
        }
      ]

      const classesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockClassesData,
          error: null
        })
      }

      const membershipsQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) return classesQuery
        if (callCount === 2) return membershipsQuery
        return mockSupabase
      })

      const response = await getClasses(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.classes).toHaveLength(4)

      // Verify capacity resolution priorities
      expect(data.classes[0].capacity).toBe(8) // max_capacity
      expect(data.classes[1].capacity).toBe(8) // program.max_participants
      expect(data.classes[2].capacity).toBe(12) // program.default_capacity
      expect(data.classes[3].capacity).toBe(18) // capacity field fallback
    })

    it('should include all required fields for display', async () => {
      const mockClassesData = [
        {
          id: 'session-1',
          organization_id: 'org-123',
          program_id: 'program-1',
          trainer_id: 'trainer-123',
          start_time: '2025-09-22T06:00:00.000Z',
          end_time: '2025-09-22T07:00:00.000Z',
          duration_minutes: 60,
          instructor_name: 'John Trainer',
          location: 'Main Studio',
          session_status: 'scheduled',
          created_at: '2025-09-19T10:00:00.000Z',
          updated_at: '2025-09-19T10:00:00.000Z',
          max_capacity: 8,
          capacity: null,
          program: {
            name: 'Morning Strength',
            description: 'Build strength and endurance',
            price_pennies: 2500,
            max_participants: 8,
            default_capacity: null
          },
          bookings: []
        }
      ]

      const classesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockClassesData,
          error: null
        })
      }

      const membershipsQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) return classesQuery
        if (callCount === 2) return membershipsQuery
        return mockSupabase
      })

      const response = await getClasses(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.classes).toHaveLength(1)

      const cls = data.classes[0]

      // Verify all required fields are present
      expect(cls).toHaveProperty('id', 'session-1')
      expect(cls).toHaveProperty('start_time', '2025-09-22T06:00:00.000Z')
      expect(cls).toHaveProperty('duration_minutes', 60)
      expect(cls).toHaveProperty('session_status', 'scheduled')
      expect(cls).toHaveProperty('organization_id', 'org-123')
      expect(cls).toHaveProperty('capacity', 8)
      expect(cls).toHaveProperty('max_capacity', 8)
      expect(cls).toHaveProperty('instructor_name', 'John Trainer')
      expect(cls).toHaveProperty('location', 'Main Studio')
      expect(cls).toHaveProperty('program')
      expect(cls.program).toHaveProperty('name', 'Morning Strength')
    })
  })

  describe('Booking Count and Membership Status', () => {
    it('should correctly count unique bookings and add membership status', async () => {
      const mockMemberships = [
        {
          client_id: 'client-1',
          plan_name: 'Premium Monthly',
          status: 'active',
          start_date: '2025-09-01',
          end_date: '2025-10-01'
        },
        {
          client_id: 'client-2',
          plan_name: 'Basic Annual',
          status: 'active',
          start_date: '2025-01-01',
          end_date: '2026-01-01'
        }
      ]

      const mockClassesData = [
        {
          id: 'session-1',
          max_capacity: 8,
          session_status: 'scheduled',
          program: { name: 'Test Class', max_participants: 8 },
          bookings: [
            {
              id: 'booking-1',
              client_id: 'client-1',
              customer_id: null,
              booking_status: 'confirmed',
              client: { id: 'client-1', name: 'John Doe', email: 'john@example.com' }
            },
            {
              id: 'booking-2',
              client_id: 'client-2',
              customer_id: null,
              booking_status: 'confirmed',
              client: { id: 'client-2', name: 'Jane Smith', email: 'jane@example.com' }
            },
            {
              id: 'booking-3',
              client_id: 'client-1', // Duplicate client - should be deduplicated
              customer_id: null,
              booking_status: 'confirmed',
              client: { id: 'client-1', name: 'John Doe', email: 'john@example.com' }
            },
            {
              id: 'booking-4',
              client_id: 'client-3',
              customer_id: null,
              booking_status: 'confirmed',
              client: { id: 'client-3', name: 'Bob Wilson', email: 'bob@example.com' }
            }
          ]
        }
      ]

      const classesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockClassesData,
          error: null
        })
      }

      const membershipsQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: mockMemberships,
          error: null
        })
      }

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) return classesQuery
        if (callCount === 2) return membershipsQuery
        return mockSupabase
      })

      const response = await getClasses(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.classes).toHaveLength(1)

      const cls = data.classes[0]

      // Should have 3 unique bookings (client-1 deduplicated)
      expect(cls.bookings_count).toBe(3)
      expect(cls.bookings).toHaveLength(3)

      // Check membership status assignment
      const johnBooking = cls.bookings.find((b: any) => b.client_id === 'client-1')
      const janeBooking = cls.bookings.find((b: any) => b.client_id === 'client-2')
      const bobBooking = cls.bookings.find((b: any) => b.client_id === 'client-3')

      expect(johnBooking.membership_status).toBe('Premium Monthly')
      expect(johnBooking.membership_active).toBe(true)

      expect(janeBooking.membership_status).toBe('Basic Annual')
      expect(janeBooking.membership_active).toBe(true)

      expect(bobBooking.membership_status).toBe('Pay as you go')
      expect(bobBooking.membership_active).toBe(false)
    })

    it('should handle classes with no bookings', async () => {
      const mockClassesData = [
        {
          id: 'session-1',
          max_capacity: 10,
          session_status: 'scheduled',
          program: { name: 'Empty Class', max_participants: 10 },
          bookings: []
        },
        {
          id: 'session-2',
          max_capacity: 10,
          session_status: 'scheduled',
          program: { name: 'Null Bookings Class', max_participants: 10 },
          bookings: null
        }
      ]

      const classesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: mockClassesData,
          error: null
        })
      }

      const membershipsQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) return classesQuery
        if (callCount === 2) return membershipsQuery
        return mockSupabase
      })

      const response = await getClasses(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.classes).toHaveLength(2)

      data.classes.forEach((cls: any) => {
        expect(cls.bookings_count).toBe(0)
        expect(cls.bookings).toEqual([])
      })
    })
  })

  describe('Date Range Filtering', () => {
    it('should filter classes by provided date range', async () => {
      const classesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      const membershipsQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) return classesQuery
        if (callCount === 2) return membershipsQuery
        return mockSupabase
      })

      const mockRequestWithDates = new MockNextRequest('http://localhost:3000/api/booking/classes?startDate=2025-09-22&endDate=2025-09-29') as any

      await getClasses(mockRequestWithDates)

      // Verify date filtering was applied
      expect(classesQuery.gte).toHaveBeenCalledWith('start_time', '2025-09-22T00:00:00.000Z')
      expect(classesQuery.lte).toHaveBeenCalledWith('start_time', '2025-09-29T00:00:00.000Z')
    })

    it('should use default 7-day range when no dates provided', async () => {
      const classesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      const membershipsQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) return classesQuery
        if (callCount === 2) return membershipsQuery
        return mockSupabase
      })

      await getClasses(mockRequest)

      // Should apply some date range (exact dates will vary based on current time)
      expect(classesQuery.gte).toHaveBeenCalledWith('start_time', expect.any(String))
      expect(classesQuery.lte).toHaveBeenCalledWith('start_time', expect.any(String))
    })
  })

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const classesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Database connection failed')
        })
      }

      mockSupabase.from.mockReturnValue(classesQuery)

      const response = await getClasses(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch classes')
    })

    it('should handle authentication errors', async () => {
      const { requireAuth } = require('@/app/lib/api/auth-check')
      requireAuth.mockRejectedValue(new Error('Unauthorized'))

      const response = await getClasses(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Unauthorized')
    })
  })

  describe('Organization Security', () => {
    it('should only return classes for authenticated user organization', async () => {
      const classesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      const membershipsQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }

      let callCount = 0
      mockSupabase.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) return classesQuery
        if (callCount === 2) return membershipsQuery
        return mockSupabase
      })

      await getClasses(mockRequest)

      // Verify organization filtering was applied
      expect(classesQuery.eq).toHaveBeenCalledWith('organization_id', 'org-123')
    })
  })
})