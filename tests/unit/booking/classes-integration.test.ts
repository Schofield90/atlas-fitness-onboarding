/**
 * Integration tests for Class Creation and Display Flow
 *
 * Tests verify:
 * 1. Complete data flow from class creation to display
 * 2. End-to-end scenarios that simulate actual usage
 * 3. Cross-API consistency between creation and retrieval
 * 4. Real-world capacity and booking scenarios
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

describe('Class Creation to Display Integration', () => {
  let mockSupabaseAdmin: any
  let mockSupabaseClient: any
  let createdSessionsData: any[] = []

  beforeEach(() => {
    jest.clearAllMocks()
    createdSessionsData = []

    // Mock authenticated user
    const { requireAuth } = require('@/app/lib/api/auth-check')
    requireAuth.mockResolvedValue({
      organizationId: 'org-123',
      userId: 'user-456'
    })

    // Setup mock admin client for creation
    mockSupabaseAdmin = {
      from: jest.fn()
    }

    // Setup mock client for display
    mockSupabaseClient = {
      from: jest.fn()
    }

    const { createAdminClient } = require('@/app/lib/supabase/admin')
    const { createClient } = require('@/app/lib/supabase/server')

    createAdminClient.mockResolvedValue(mockSupabaseAdmin)
    createClient.mockReturnValue(mockSupabaseClient)
  })

  describe('End-to-End Class Lifecycle', () => {
    it('should create classes and display them correctly with proper capacity', async () => {
      // Step 1: Setup program data
      const programData = {
        id: 'program-123',
        name: 'Morning Strength Training',
        max_participants: 8,
        default_capacity: 12,
        organization_id: 'org-123',
        trainer_id: 'trainer-456',
        instructor_name: 'Sarah Johnson',
        location: 'Main Studio'
      }

      // Step 2: Mock program fetch for creation
      const programQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: programData,
          error: null
        })
      }

      // Step 3: Mock session insertion and capture created data
      const insertQuery = {
        insert: jest.fn().mockImplementation((sessions) => {
          // Simulate database assigning IDs and timestamps
          createdSessionsData = sessions.map((session, index) => ({
            id: `session-${index + 1}`,
            ...session,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))
          return insertQuery
        }),
        select: jest.fn().mockResolvedValue({
          data: createdSessionsData,
          error: null
        })
      }

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'programs') return programQuery
        if (table === 'class_sessions') return insertQuery
        return mockSupabaseAdmin
      })

      // Step 4: Create recurring classes
      const createRequest = new MockNextRequest('http://localhost:3000/api/classes/recurring', {
        method: 'POST',
        body: JSON.stringify({
          programId: 'program-123',
          frequency: 'weekly',
          daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
          endDate: '2025-10-31',
          maxOccurrences: 6,
          timeSlots: [
            { time: '06:00', duration: 60 }
          ]
        })
      }) as any

      const createResponse = await createRecurringClasses(createRequest)
      const createData = await createResponse.json()

      expect(createResponse.status).toBe(200)
      expect(createData.sessions).toHaveLength(6)

      // Step 5: Mock display query to return the created sessions
      const displayClassesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: createdSessionsData.map(session => ({
            ...session,
            program: {
              name: programData.name,
              description: 'Strength training program',
              price_pennies: 2500,
              max_participants: programData.max_participants,
              default_capacity: programData.default_capacity
            },
            bookings: []
          })),
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

      let displayCallCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        displayCallCount++
        if (displayCallCount === 1 && table === 'class_sessions') return displayClassesQuery
        if (displayCallCount === 2 && table === 'customer_memberships') return membershipsQuery
        return mockSupabaseClient
      })

      // Step 6: Display classes
      const displayRequest = new MockNextRequest('http://localhost:3000/api/booking/classes?startDate=2025-09-01&endDate=2025-11-30')

      const displayResponse = await getClasses(displayRequest)
      const displayData = await displayResponse.json()

      expect(displayResponse.status).toBe(200)
      expect(displayData.classes).toHaveLength(6)

      // Step 7: Verify data consistency between creation and display
      displayData.classes.forEach((displayedClass: any, index: number) => {
        const createdSession = createData.sessions[index]

        // Verify essential fields match
        expect(displayedClass.id).toBe(createdSession.id)
        expect(displayedClass.program_id).toBe(createdSession.program_id)
        expect(displayedClass.organization_id).toBe(createdSession.organization_id)
        expect(displayedClass.start_time).toBe(createdSession.start_time)
        expect(displayedClass.end_time).toBe(createdSession.end_time)
        expect(displayedClass.duration_minutes).toBe(createdSession.duration_minutes)
        expect(displayedClass.session_status).toBe(createdSession.session_status)

        // Verify capacity is correctly resolved (should use max_participants = 8, not default_capacity = 12)
        expect(displayedClass.capacity).toBe(8)
        expect(displayedClass.max_capacity).toBe(8)

        // Verify program data is included
        expect(displayedClass.program.name).toBe(programData.name)
        expect(displayedClass.program.max_participants).toBe(8)

        // Verify booking data is initialized
        expect(displayedClass.bookings).toEqual([])
        expect(displayedClass.bookings_count).toBe(0)
      })
    })

    it('should handle the exact scenario: 6am classes with max_participants=8', async () => {
      // Simulate the exact reported issue scenario
      const programData = {
        id: 'program-early-morning',
        name: 'Early Morning Boot Camp',
        max_participants: 8, // Should be used for capacity
        default_capacity: 12, // Should NOT be used
        organization_id: 'org-123',
        trainer_id: 'trainer-123',
        instructor_name: 'Mike Trainer',
        location: 'Outdoor Area'
      }

      // Create classes at 6am
      const timeSlots = [{ time: '06:00', duration: 60 }]

      // Mock creation flow
      const programQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: programData,
          error: null
        })
      }

      const insertQuery = {
        insert: jest.fn().mockImplementation((sessions) => {
          createdSessionsData = sessions.map((session, index) => ({
            id: `early-session-${index + 1}`,
            ...session,
          }))
          return insertQuery
        }),
        select: jest.fn().mockResolvedValue({
          data: createdSessionsData,
          error: null
        })
      }

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'programs') return programQuery
        if (table === 'class_sessions') return insertQuery
        return mockSupabaseAdmin
      })

      // Create sessions
      const createRequest = new MockNextRequest('http://localhost:3000/api/classes/recurring', {
        method: 'POST',
        body: JSON.stringify({
          programId: 'program-early-morning',
          frequency: 'weekly',
          daysOfWeek: [1, 2, 3, 4, 5], // Monday through Friday
          endDate: '2025-10-03',
          timeSlots
        })
      }) as any

      const createResponse = await createRecurringClasses(createRequest)
      expect(createResponse.status).toBe(200)

      // Verify creation uses correct capacity
      expect(insertQuery.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            max_capacity: 8, // Should be 8 from max_participants
            start_time: expect.stringMatching(/T06:00:00\.000Z$/),
            duration_minutes: 60
          })
        ])
      )

      // Mock display with some cancelled sessions to test filtering
      const displayData = createdSessionsData.map((session, index) => ({
        ...session,
        session_status: index === 2 ? 'cancelled' : 'scheduled', // Cancel one session
        program: {
          name: programData.name,
          max_participants: programData.max_participants,
          default_capacity: programData.default_capacity
        },
        bookings: index === 0 ? [
          { id: 'booking-1', client_id: 'client-1', booking_status: 'confirmed' },
          { id: 'booking-2', client_id: 'client-2', booking_status: 'confirmed' }
        ] : []
      }))

      const displayClassesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: displayData,
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

      let displayCallCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        displayCallCount++
        if (displayCallCount === 1) return displayClassesQuery
        if (displayCallCount === 2) return membershipsQuery
        return mockSupabaseClient
      })

      // Display classes
      const displayRequest = new MockNextRequest('http://localhost:3000/api/booking/classes')
      const displayResponse = await getClasses(displayRequest)
      const displayResult = await displayResponse.json()

      expect(displayResponse.status).toBe(200)

      // Verify cancelled classes are filtered out
      expect(displayClassesQuery.neq).toHaveBeenCalledWith('session_status', 'cancelled')

      // All displayed classes should have capacity of 8, not 12
      displayResult.classes.forEach((cls: any) => {
        expect(cls.capacity).toBe(8)
        expect(cls.max_capacity).toBe(8)
        expect(cls.session_status).not.toBe('cancelled')

        // Verify 6am timing
        expect(cls.start_time).toMatch(/T06:00:00\.000Z$/)
      })

      // First class should have booking count
      if (displayResult.classes.length > 0) {
        expect(displayResult.classes[0].bookings_count).toBe(2)
      }
    })
  })

  describe('Data Consistency Edge Cases', () => {
    it('should handle mixed capacity scenarios correctly', async () => {
      // Test scenario with different capacity sources
      const sessionVariations = [
        {
          id: 'session-direct-capacity',
          max_capacity: 15, // Direct max_capacity
          program: { max_participants: 10, default_capacity: 20 }
        },
        {
          id: 'session-program-max',
          max_capacity: null,
          program: { max_participants: 12, default_capacity: 20 }
        },
        {
          id: 'session-program-default',
          max_capacity: null,
          program: { max_participants: null, default_capacity: 8 }
        },
        {
          id: 'session-fallback',
          max_capacity: null,
          capacity: 25,
          program: { max_participants: null, default_capacity: null }
        }
      ]

      const displayData = sessionVariations.map(session => ({
        ...session,
        organization_id: 'org-123',
        session_status: 'scheduled',
        start_time: '2025-09-22T10:00:00.000Z',
        end_time: '2025-09-22T11:00:00.000Z',
        duration_minutes: 60,
        program: {
          name: 'Mixed Capacity Test',
          ...session.program
        },
        bookings: []
      }))

      const displayClassesQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: displayData,
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
        if (callCount === 1) return displayClassesQuery
        if (callCount === 2) return membershipsQuery
        return mockSupabaseClient
      })

      const displayRequest = new MockNextRequest('http://localhost:3000/api/booking/classes')
      const displayResponse = await getClasses(displayRequest)
      const result = await displayResponse.json()

      expect(displayResponse.status).toBe(200)
      expect(result.classes).toHaveLength(4)

      // Verify capacity resolution priority
      expect(result.classes[0].capacity).toBe(15) // max_capacity wins
      expect(result.classes[1].capacity).toBe(12) // program.max_participants
      expect(result.classes[2].capacity).toBe(8)  // program.default_capacity
      expect(result.classes[3].capacity).toBe(25) // capacity field fallback
    })

    it('should maintain data integrity across creation and multiple retrievals', async () => {
      // Create sessions with specific data
      const programData = {
        id: 'program-integrity-test',
        name: 'Data Integrity Program',
        max_participants: 6,
        organization_id: 'org-123'
      }

      // Mock creation
      const programQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: programData,
          error: null
        })
      }

      const insertQuery = {
        insert: jest.fn().mockImplementation((sessions) => {
          createdSessionsData = sessions.map((session, index) => ({
            id: `integrity-session-${index + 1}`,
            ...session,
          }))
          return insertQuery
        }),
        select: jest.fn().mockResolvedValue({
          data: createdSessionsData,
          error: null
        })
      }

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === 'programs') return programQuery
        if (table === 'class_sessions') return insertQuery
        return mockSupabaseAdmin
      })

      // Create sessions
      const createRequest = new MockNextRequest('http://localhost:3000/api/classes/recurring', {
        method: 'POST',
        body: JSON.stringify({
          programId: 'program-integrity-test',
          frequency: 'daily',
          endDate: '2025-09-25',
          timeSlots: [{ time: '14:00', duration: 45 }]
        })
      }) as any

      await createRecurringClasses(createRequest)

      // Mock multiple display calls with consistent data
      const consistentDisplayData = createdSessionsData.map(session => ({
        ...session,
        program: {
          name: programData.name,
          max_participants: programData.max_participants
        },
        bookings: []
      }))

      const createDisplayQuery = () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        neq: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: consistentDisplayData,
          error: null
        })
      }) as any

      const createMembershipsQuery = () => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }) as any

      // First retrieval
      let callCount = 0
      mockSupabaseClient.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 1) return createDisplayQuery()
        if (callCount === 2) return createMembershipsQuery()
        return mockSupabaseClient
      })

      const displayRequest1 = new MockNextRequest('http://localhost:3000/api/booking/classes') as any
      const displayResponse1 = await getClasses(displayRequest1)
      const result1 = await displayResponse1.json()

      // Second retrieval
      mockSupabaseClient.from.mockImplementation((table: string) => {
        callCount++
        if (callCount === 3) return createDisplayQuery()
        if (callCount === 4) return createMembershipsQuery()
        return mockSupabaseClient
      })

      const displayRequest2 = new MockNextRequest('http://localhost:3000/api/booking/classes') as any
      const displayResponse2 = await getClasses(displayRequest2)
      const result2 = await displayResponse2.json()

      // Verify consistency across multiple retrievals
      expect(result1.classes).toHaveLength(result2.classes.length)

      result1.classes.forEach((class1: any, index: number) => {
        const class2 = result2.classes[index]

        expect(class1.id).toBe(class2.id)
        expect(class1.capacity).toBe(class2.capacity)
        expect(class1.max_capacity).toBe(class2.max_capacity)
        expect(class1.start_time).toBe(class2.start_time)
        expect(class1.session_status).toBe(class2.session_status)

        // Both should show capacity of 6 from max_participants
        expect(class1.capacity).toBe(6)
        expect(class2.capacity).toBe(6)
      })
    })
  })
})