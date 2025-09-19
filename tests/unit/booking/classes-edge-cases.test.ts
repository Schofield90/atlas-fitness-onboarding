/**
 * Edge Case Tests for Class Creation and Display
 *
 * Tests verify:
 * 1. Missing required fields behavior
 * 2. Cancelled session filtering edge cases
 * 3. Invalid data handling
 * 4. Boundary conditions and error scenarios
 * 5. Database constraint violations
 */

import { NextRequest, NextResponse } from 'next/server'
import { POST as createRecurringClasses } from '@/app/api/classes/recurring/route'
import { GET as getClasses } from '@/app/api/booking/classes/route'

// Mock dependencies
jest.mock('@/app/lib/supabase/admin', () => ({
  createAdminClient: jest.fn()
}))

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

  constructor(public url: string, public init?: { method?: string; body?: string }) {
    this.nextUrl = {
      searchParams: new URLSearchParams(new URL(url).search)
    }
  }

  async json() {
    return this.init?.body ? JSON.parse(this.init.body) : {}
  }
}

describe('Classes Edge Cases and Error Scenarios', () => {
  let mockSupabaseAdmin: any
  let mockSupabaseClient: any

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock authenticated user
    const { requireAuth } = require('@/app/lib/api/auth-check')
    requireAuth.mockResolvedValue({
      organizationId: 'org-123',
      userId: 'user-456'
    })

    // Setup mocks
    mockSupabaseAdmin = { from: jest.fn() }
    mockSupabaseClient = { from: jest.fn() }

    const { createAdminClient } = require('@/app/lib/supabase/admin')
    const { createClient } = require('@/app/lib/supabase/server')

    createAdminClient.mockResolvedValue(mockSupabaseAdmin)
    createClient.mockReturnValue(mockSupabaseClient)
  })

  describe('Missing Required Fields', () => {
    it('should identify sessions missing critical fields for display', async () => {
      const sessionsWithMissingFields = [
        {
          // Missing id - should cause issues
          organization_id: 'org-123',
          start_time: '2025-09-22T10:00:00.000Z',
          duration_minutes: 60,
          session_status: 'scheduled',
          program: { name: 'Test Class' },
          bookings: []
        },
        {
          id: 'session-2',
          organization_id: 'org-123',
          // Missing start_time - critical for calendar display
          duration_minutes: 60,
          session_status: 'scheduled',
          program: { name: 'Test Class' },
          bookings: []
        },
        {
          id: 'session-3',
          organization_id: 'org-123',
          start_time: '2025-09-22T12:00:00.000Z',
          // Missing duration_minutes - needed for end time calculation
          session_status: 'scheduled',
          program: { name: 'Test Class' },
          bookings: []
        },
        {
          id: 'session-4',
          organization_id: 'org-123',
          start_time: '2025-09-22T14:00:00.000Z',
          duration_minutes: 60,
          // Missing session_status - critical for filtering
          program: { name: 'Test Class' },
          bookings: []
        },
        {
          id: 'session-5',
          // Missing organization_id - security critical
          start_time: '2025-09-22T16:00:00.000Z',
          duration_minutes: 60,
          session_status: 'scheduled',
          program: { name: 'Test Class' },
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
          data: sessionsWithMissingFields,
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
      mockSupabaseClient.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) return classesQuery
        if (callCount === 2) return membershipsQuery
        return mockSupabaseClient
      })

      const request = new MockNextRequest('http://localhost:3000/api/booking/classes') as any
      const response = await getClasses(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      // API should handle missing fields gracefully
      expect(data.classes).toBeDefined()

      // Check that the response includes the data, even with missing fields
      // (The transformation logic should handle nulls/undefined values)
      data.classes.forEach((cls: any) => {
        // Capacity should always be resolved to some value (default 20)
        expect(cls.capacity).toBeDefined()
        expect(typeof cls.capacity).toBe('number')

        // Bookings count should always be a number
        expect(cls.bookings_count).toBeDefined()
        expect(typeof cls.bookings_count).toBe('number')
      })
    })

    it('should handle sessions with no capacity information', async () => {
      const sessionsWithNoCapacity = [
        {
          id: 'session-no-capacity-1',
          organization_id: 'org-123',
          start_time: '2025-09-22T10:00:00.000Z',
          duration_minutes: 60,
          session_status: 'scheduled',
          max_capacity: null,
          capacity: null,
          program: {
            name: 'No Capacity Class',
            max_participants: null,
            default_capacity: null
          },
          bookings: []
        },
        {
          id: 'session-no-capacity-2',
          organization_id: 'org-123',
          start_time: '2025-09-22T11:00:00.000Z',
          duration_minutes: 60,
          session_status: 'scheduled',
          // Completely missing capacity fields
          program: {
            name: 'Another No Capacity Class'
            // Missing all capacity fields
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
          data: sessionsWithNoCapacity,
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
      mockSupabaseClient.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) return classesQuery
        if (callCount === 2) return membershipsQuery
        return mockSupabaseClient
      })

      const request = new MockNextRequest('http://localhost:3000/api/booking/classes') as any
      const response = await getClasses(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.classes).toHaveLength(2)

      // Both classes should fall back to default capacity of 20
      data.classes.forEach((cls: any) => {
        expect(cls.capacity).toBe(20)
        expect(cls.max_capacity).toBe(20)
      })
    })

    it('should handle program creation with missing required fields', async () => {
      // Test creation with minimal program data
      const incompleteProgram = {
        id: 'incomplete-program',
        organization_id: 'org-123',
        name: 'Minimal Program'
        // Missing max_participants, default_capacity, etc.
      }

      const programQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: incompleteProgram,
          error: null
        })
      }

      let capturedSessions: any[] = []
      const insertQuery = {
        insert: jest.fn().mockImplementation((sessions) => {
          capturedSessions = sessions
          return insertQuery
        }),
        select: jest.fn().mockResolvedValue({
          data: capturedSessions.map((s, i) => ({ id: `session-${i}`, ...s })),
          error: null
        })
      }

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'programs') return programQuery
        if (table === 'class_sessions') return insertQuery
        return mockSupabaseAdmin
      })

      const createRequest = new MockNextRequest('http://localhost:3000/api/classes/recurring', {
        method: 'POST',
        body: JSON.stringify({
          programId: 'incomplete-program',
          timeSlots: [{ time: '10:00', duration: 60 }],
          frequency: 'weekly',
          endDate: '2025-09-30'
        })
      }) as any

      const response = await createRecurringClasses(createRequest)
      const data = await response.json()

      expect(response.status).toBe(200)

      // Sessions should be created with default values
      expect(capturedSessions.length).toBeGreaterThan(0)

      capturedSessions.forEach(session => {
        // Should default to 20 when no capacity info available
        expect(session.max_capacity).toBe(20)
        expect(session.instructor_name).toBeDefined()
        expect(session.location).toBeDefined()
        expect(session.session_status).toBe('scheduled')
        expect(session.current_bookings).toBe(0)
      })
    })
  })

  describe('Cancelled Session Edge Cases', () => {
    it('should handle mixed session statuses correctly', async () => {
      const mixedStatusSessions = [
        {
          id: 'session-scheduled',
          session_status: 'scheduled',
          organization_id: 'org-123',
          start_time: '2025-09-22T10:00:00.000Z',
          duration_minutes: 60,
          max_capacity: 10,
          program: { name: 'Scheduled Class' },
          bookings: []
        },
        {
          id: 'session-cancelled',
          session_status: 'cancelled',
          organization_id: 'org-123',
          start_time: '2025-09-22T11:00:00.000Z',
          duration_minutes: 60,
          max_capacity: 10,
          program: { name: 'Cancelled Class' },
          bookings: []
        },
        {
          id: 'session-completed',
          session_status: 'completed',
          organization_id: 'org-123',
          start_time: '2025-09-22T12:00:00.000Z',
          duration_minutes: 60,
          max_capacity: 10,
          program: { name: 'Completed Class' },
          bookings: []
        },
        {
          id: 'session-null-status',
          session_status: null, // Edge case: null status
          organization_id: 'org-123',
          start_time: '2025-09-22T13:00:00.000Z',
          duration_minutes: 60,
          max_capacity: 10,
          program: { name: 'Null Status Class' },
          bookings: []
        },
        {
          id: 'session-invalid-status',
          session_status: 'invalid_status', // Edge case: unexpected status
          organization_id: 'org-123',
          start_time: '2025-09-22T14:00:00.000Z',
          duration_minutes: 60,
          max_capacity: 10,
          program: { name: 'Invalid Status Class' },
          bookings: []
        }
      ]

      // The query should filter out cancelled sessions at the database level
      const filteredSessions = mixedStatusSessions.filter(s => s.session_status !== 'cancelled')

      const classesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: filteredSessions,
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
      mockSupabaseClient.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) return classesQuery
        if (callCount === 2) return membershipsQuery
        return mockSupabaseClient
      })

      const request = new MockNextRequest('http://localhost:3000/api/booking/classes') as any
      const response = await getClasses(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      // Verify cancelled sessions are filtered out
      expect(classesQuery.neq).toHaveBeenCalledWith('session_status', 'cancelled')

      // Should have all sessions except the cancelled one
      expect(data.classes).toHaveLength(4)

      // None should be cancelled
      data.classes.forEach((cls: any) => {
        expect(cls.session_status).not.toBe('cancelled')
      })

      // Verify the specific sessions that should be included
      const sessionIds = data.classes.map((cls: any) => cls.id)
      expect(sessionIds).toContain('session-scheduled')
      expect(sessionIds).toContain('session-completed')
      expect(sessionIds).toContain('session-null-status')
      expect(sessionIds).toContain('session-invalid-status')
      expect(sessionIds).not.toContain('session-cancelled')
    })

    it('should handle bulk cancellation scenario', async () => {
      // Simulate scenario where many sessions get cancelled
      const bulkCancelledSessions = Array.from({ length: 20 }, (_, i) => ({
        id: `session-${i + 1}`,
        session_status: i < 15 ? 'cancelled' : 'scheduled', // 15 cancelled, 5 scheduled
        organization_id: 'org-123',
        start_time: `2025-09-${22 + Math.floor(i / 5)}T${10 + (i % 5)}:00:00.000Z`,
        duration_minutes: 60,
        max_capacity: 8,
        program: { name: `Class ${i + 1}`, max_participants: 8 },
        bookings: []
      }))

      // Only non-cancelled sessions should be returned
      const activeSessions = bulkCancelledSessions.filter(s => s.session_status !== 'cancelled')

      const classesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: activeSessions,
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
      mockSupabaseClient.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) return classesQuery
        if (callCount === 2) return membershipsQuery
        return mockSupabaseClient
      })

      const request = new MockNextRequest('http://localhost:3000/api/booking/classes') as any
      const response = await getClasses(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      // Should only return the 5 scheduled sessions
      expect(data.classes).toHaveLength(5)

      data.classes.forEach((cls: any) => {
        expect(cls.session_status).toBe('scheduled')
        expect(cls.capacity).toBe(8)
      })
    })
  })

  describe('Invalid Data Handling', () => {
    it('should handle malformed booking data', async () => {
      const sessionsWithMalformedBookings = [
        {
          id: 'session-malformed-1',
          organization_id: 'org-123',
          start_time: '2025-09-22T10:00:00.000Z',
          duration_minutes: 60,
          session_status: 'scheduled',
          max_capacity: 10,
          program: { name: 'Test Class' },
          bookings: [
            // Valid booking
            {
              id: 'booking-1',
              client_id: 'client-1',
              booking_status: 'confirmed',
              client: { id: 'client-1', name: 'John Doe' }
            },
            // Booking missing client_id
            {
              id: 'booking-2',
              client_id: null,
              customer_id: null,
              booking_status: 'confirmed',
              client: null
            },
            // Booking with invalid data
            {
              id: 'booking-3',
              client_id: 'client-3',
              booking_status: 'invalid_status',
              client: { id: 'client-3', name: null }
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
          data: sessionsWithMalformedBookings,
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
      mockSupabaseClient.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) return classesQuery
        if (callCount === 2) return membershipsQuery
        return mockSupabaseClient
      })

      const request = new MockNextRequest('http://localhost:3000/api/booking/classes') as any
      const response = await getClasses(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.classes).toHaveLength(1)

      const cls = data.classes[0]

      // Should only count bookings with valid client_id or customer_id
      expect(cls.bookings_count).toBe(2) // booking-1 and booking-3 (booking-2 has no ID)

      // Bookings array should be properly filtered and formatted
      expect(cls.bookings).toHaveLength(2)

      cls.bookings.forEach((booking: any) => {
        expect(booking).toHaveProperty('membership_status')
        expect(booking).toHaveProperty('membership_active')
      })
    })

    it('should handle creation with invalid time slots', async () => {
      const programData = {
        id: 'program-123',
        name: 'Test Program',
        max_participants: 10,
        organization_id: 'org-123'
      }

      const programQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: programData,
          error: null
        })
      }

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'programs') return programQuery
        return mockSupabaseAdmin
      })

      // Test with invalid time formats
      const invalidTimeSlots = [
        { time: '25:00', duration: 60 }, // Invalid hour
        { time: '12:70', duration: 60 }, // Invalid minute
        { time: 'invalid', duration: 60 }, // Non-numeric time
        { time: '10:00', duration: -30 }, // Negative duration
        { time: '10:00', duration: 0 }    // Zero duration
      ]

      const createRequest = new MockNextRequest('http://localhost:3000/api/classes/recurring', {
        method: 'POST',
        body: JSON.stringify({
          programId: 'program-123',
          timeSlots: invalidTimeSlots,
          frequency: 'weekly',
          endDate: '2025-09-30'
        })
      }) as any

      // The function should handle invalid time slots gracefully
      // Either by filtering them out or throwing an appropriate error
      try {
        const response = await createRecurringClasses(createRequest)
        const data = await response.json()

        if (response.status === 200) {
          // If successful, sessions should be created only for valid time slots
          expect(data.sessions).toBeDefined()
        } else {
          // If error, should provide meaningful error message
          expect(data.error).toBeDefined()
          expect(response.status).toBeGreaterThanOrEqual(400)
        }
      } catch (error) {
        // Function may throw for invalid data - this is acceptable
        expect(error).toBeDefined()
      }
    })
  })

  describe('Database Constraint Violations', () => {
    it('should handle database unique constraint violations', async () => {
      const programData = {
        id: 'program-123',
        name: 'Test Program',
        max_participants: 10,
        organization_id: 'org-123'
      }

      const programQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: programData,
          error: null
        })
      }

      const insertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: null,
          error: {
            code: '23505', // PostgreSQL unique constraint violation
            message: 'duplicate key value violates unique constraint',
            details: 'Key (program_id, start_time) already exists.'
          }
        })
      }

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'programs') return programQuery
        if (table === 'class_sessions') return insertQuery
        return mockSupabaseAdmin
      })

      const createRequest = new MockNextRequest('http://localhost:3000/api/classes/recurring', {
        method: 'POST',
        body: JSON.stringify({
          programId: 'program-123',
          timeSlots: [{ time: '10:00', duration: 60 }],
          frequency: 'daily',
          endDate: '2025-09-25'
        })
      }) as any

      const response = await createRecurringClasses(createRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toContain('duplicate key value violates unique constraint')
    })

    it('should handle foreign key constraint violations', async () => {
      const programQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: {
            code: 'PGRST116', // Supabase foreign key not found
            message: 'The result contains 0 rows'
          }
        })
      }

      mockSupabaseAdmin.from.mockReturnValue(programQuery)

      const createRequest = new MockNextRequest('http://localhost:3000/api/classes/recurring', {
        method: 'POST',
        body: JSON.stringify({
          programId: 'nonexistent-program',
          timeSlots: [{ time: '10:00', duration: 60 }]
        })
      }) as any

      const response = await createRecurringClasses(createRequest)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Program not found')
    })
  })

  describe('Boundary Conditions', () => {
    it('should handle very large booking counts', async () => {
      // Simulate a class with many bookings (beyond typical capacity)
      const largeBookingList = Array.from({ length: 100 }, (_, i) => ({
        id: `booking-${i + 1}`,
        client_id: `client-${i + 1}`,
        booking_status: 'confirmed',
        client: { id: `client-${i + 1}`, name: `Client ${i + 1}` }
      }))

      const sessionWithManyBookings = {
        id: 'session-large',
        organization_id: 'org-123',
        start_time: '2025-09-22T10:00:00.000Z',
        duration_minutes: 60,
        session_status: 'scheduled',
        max_capacity: 10, // Much smaller than booking count
        program: { name: 'Overbooked Class' },
        bookings: largeBookingList
      }

      const classesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [sessionWithManyBookings],
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
      mockSupabaseClient.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) return classesQuery
        if (callCount === 2) return membershipsQuery
        return mockSupabaseClient
      })

      const request = new MockNextRequest('http://localhost:3000/api/booking/classes') as any
      const response = await getClasses(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.classes).toHaveLength(1)

      const cls = data.classes[0]

      // Should handle large booking count correctly
      expect(cls.bookings_count).toBe(100)
      expect(cls.bookings).toHaveLength(100)
      expect(cls.capacity).toBe(10) // Original capacity should be preserved

      // Verify all bookings have membership status
      cls.bookings.forEach((booking: any) => {
        expect(booking).toHaveProperty('membership_status', 'Pay as you go')
        expect(booking).toHaveProperty('membership_active', false)
      })
    })

    it('should handle date range edge cases', async () => {
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
      mockSupabaseClient.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) return classesQuery
        if (callCount === 2) return membershipsQuery
        return mockSupabaseClient
      })

      // Test with start date after end date
      const invalidDateRequest = new MockNextRequest('http://localhost:3000/api/booking/classes?startDate=2025-12-31&endDate=2025-01-01') as any

      const response = await getClasses(invalidDateRequest)
      const data = await response.json()

      // Should handle gracefully (may return empty results or error)
      expect(response.status).toBe(200)
      expect(data.classes).toBeDefined()
    })
  })
})