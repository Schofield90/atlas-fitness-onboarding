/**
 * Unit tests for Recurring Class Creation API
 *
 * Tests verify:
 * 1. Bulk class creation with correct field mapping
 * 2. Max capacity inheritance from program
 * 3. Required field validation
 * 4. Session creation with proper time slots
 * 5. Edge cases and error handling
 */

import { NextRequest, NextResponse } from 'next/server'
import { POST as createRecurringClasses } from '@/app/api/classes/recurring/route'

// Mock dependencies
jest.mock('@/app/lib/supabase/admin', () => ({
  createAdminClient: jest.fn()
}))

// Mock NextRequest to avoid URL property conflicts
class MockNextRequest {
  constructor(public url: string, public init?: { method?: string; body?: string }) {}

  async json() {
    return this.init?.body ? JSON.parse(this.init.body) : {}
  }
}

describe('Recurring Class Creation API', () => {
  let mockSupabase: any
  let mockRequest: NextRequest

  beforeEach(() => {
    jest.clearAllMocks()

    // Create mock Supabase client
    mockSupabase = {
      from: jest.fn(),
      select: jest.fn(),
      insert: jest.fn(),
      eq: jest.fn(),
      single: jest.fn()
    }

    // Mock createAdminClient
    const { createAdminClient } = require('@/app/lib/supabase/admin')
    createAdminClient.mockResolvedValue(mockSupabase)
  })

  describe('Program-based Class Creation', () => {
    it('should create sessions with correct max_capacity from program', async () => {
      const programData = {
        id: 'program-123',
        name: 'Morning Strength',
        max_participants: 8,
        default_capacity: 12,
        organization_id: 'org-123',
        trainer_id: 'trainer-456',
        instructor_name: 'John Doe',
        location: 'Main Studio'
      }

      const requestBody = {
        programId: 'program-123',
        frequency: 'weekly',
        interval: 1,
        daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
        endDate: '2025-12-31',
        maxOccurrences: 12,
        timeSlots: [
          { time: '06:00', duration: 60 }
        ]
      }

      // Mock program fetch
      const programQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: programData,
          error: null
        })
      }

      // Mock session insertion
      const insertedSessions = [
        {
          id: 'session-1',
          program_id: 'program-123',
          organization_id: 'org-123',
          max_capacity: 8, // Should inherit from program.max_participants
          start_time: '2025-09-22T06:00:00.000Z',
          end_time: '2025-09-22T07:00:00.000Z',
          duration_minutes: 60,
          session_status: 'scheduled'
        }
      ]

      const insertQuery = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockResolvedValue({
          data: insertedSessions,
          error: null
        })
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'programs') return programQuery
        if (table === 'class_sessions') return insertQuery
        return mockSupabase
      })

      mockRequest = new MockNextRequest('http://localhost:3000/api/classes/recurring', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      }) as any

      const response = await createRecurringClasses(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.sessions).toHaveLength(1)
      expect(data.sessions[0].max_capacity).toBe(8) // Should use program.max_participants
      expect(insertQuery.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            max_capacity: 8,
            organization_id: 'org-123',
            session_status: 'scheduled',
            duration_minutes: 60
          })
        ])
      )
    })

    it('should fallback to default_capacity when max_participants is null', async () => {
      const programData = {
        id: 'program-123',
        name: 'Evening Yoga',
        max_participants: null,
        default_capacity: 20,
        organization_id: 'org-123'
      }

      const requestBody = {
        programId: 'program-123',
        timeSlots: [{ time: '18:00', duration: 90 }],
        frequency: 'weekly',
        daysOfWeek: [2],
        endDate: '2025-12-31'
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
          data: [{ max_capacity: 20 }],
          error: null
        })
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'programs') return programQuery
        if (table === 'class_sessions') return insertQuery
        return mockSupabase
      })

      mockRequest = new MockNextRequest('http://localhost:3000/api/classes/recurring', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      }) as any

      await createRecurringClasses(mockRequest)

      expect(insertQuery.insert).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            max_capacity: 20 // Should use default_capacity
          })
        ])
      )
    })

    it('should include all required session fields', async () => {
      const programData = {
        id: 'program-123',
        name: 'Test Program',
        max_participants: 10,
        organization_id: 'org-123',
        trainer_id: 'trainer-456',
        instructor_name: 'Jane Smith',
        location: 'Studio A'
      }

      const requestBody = {
        programId: 'program-123',
        timeSlots: [{ time: '10:00', duration: 45 }],
        frequency: 'daily',
        endDate: '2025-09-25'
      }

      const programQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: programData,
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
          data: capturedSessions,
          error: null
        })
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'programs') return programQuery
        if (table === 'class_sessions') return insertQuery
        return mockSupabase
      })

      mockRequest = new MockNextRequest('http://localhost:3000/api/classes/recurring', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      }) as any

      await createRecurringClasses(mockRequest)

      expect(capturedSessions.length).toBeGreaterThan(0)

      const session = capturedSessions[0]
      expect(session).toHaveProperty('program_id', 'program-123')
      expect(session).toHaveProperty('organization_id', 'org-123')
      expect(session).toHaveProperty('trainer_id', 'trainer-456')
      expect(session).toHaveProperty('instructor_name', 'Jane Smith')
      expect(session).toHaveProperty('location', 'Studio A')
      expect(session).toHaveProperty('start_time')
      expect(session).toHaveProperty('end_time')
      expect(session).toHaveProperty('duration_minutes', 45)
      expect(session).toHaveProperty('session_status', 'scheduled')
      expect(session).toHaveProperty('current_bookings', 0)
      expect(session).toHaveProperty('max_capacity', 10)
      expect(session).toHaveProperty('created_at')
      expect(session).toHaveProperty('updated_at')
    })
  })

  describe('Multiple Time Slots', () => {
    it('should create sessions for each time slot and occurrence', async () => {
      const programData = {
        id: 'program-123',
        name: 'Multi-slot Program',
        max_participants: 15,
        organization_id: 'org-123'
      }

      const requestBody = {
        programId: 'program-123',
        timeSlots: [
          { time: '07:00', duration: 60 },
          { time: '18:00', duration: 60 },
          { time: '19:30', duration: 60 }
        ],
        frequency: 'weekly',
        daysOfWeek: [1, 3], // Monday, Wednesday
        endDate: '2025-10-01',
        maxOccurrences: 4
      }

      const programQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: programData,
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
          data: capturedSessions,
          error: null
        })
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'programs') return programQuery
        if (table === 'class_sessions') return insertQuery
        return mockSupabase
      })

      mockRequest = new MockNextRequest('http://localhost:3000/api/classes/recurring', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      }) as any

      const response = await createRecurringClasses(mockRequest)
      const data = await response.json()

      // Should create sessions for: 4 occurrences * 3 time slots = 12 sessions
      expect(capturedSessions).toHaveLength(12)

      // Check that all time slots are represented
      const timeSlots = capturedSessions.map(s => {
        const startTime = new Date(s.start_time)
        return `${startTime.getUTCHours().toString().padStart(2, '0')}:${startTime.getUTCMinutes().toString().padStart(2, '0')}`
      })

      expect(timeSlots).toContain('07:00')
      expect(timeSlots).toContain('18:00')
      expect(timeSlots).toContain('19:30')
    })
  })

  describe('Error Handling', () => {
    it('should return 404 when program not found', async () => {
      const programQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('Program not found')
        })
      }

      mockSupabase.from.mockReturnValue(programQuery)

      const requestBody = {
        programId: 'nonexistent-program',
        timeSlots: [{ time: '10:00', duration: 60 }]
      }

      mockRequest = new MockNextRequest('http://localhost:3000/api/classes/recurring', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      }) as any

      const response = await createRecurringClasses(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.error).toBe('Program not found')
    })

    it('should return 400 when neither classSessionId nor programId provided', async () => {
      const requestBody = {
        timeSlots: [{ time: '10:00', duration: 60 }]
      }

      mockRequest = new MockNextRequest('http://localhost:3000/api/classes/recurring', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      }) as any

      const response = await createRecurringClasses(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Either classSessionId or programId is required')
    })

    it('should return 400 when no sessions would be created', async () => {
      const programData = {
        id: 'program-123',
        name: 'Test Program',
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

      mockSupabase.from.mockReturnValue(programQuery)

      const requestBody = {
        programId: 'program-123',
        timeSlots: [], // Empty time slots
        endDate: '2025-09-19' // Past date
      }

      mockRequest = new MockNextRequest('http://localhost:3000/api/classes/recurring', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      }) as any

      const response = await createRecurringClasses(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('No sessions to create')
    })

    it('should handle database insertion errors', async () => {
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
          error: new Error('Database constraint violation')
        })
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'programs') return programQuery
        if (table === 'class_sessions') return insertQuery
        return mockSupabase
      })

      const requestBody = {
        programId: 'program-123',
        timeSlots: [{ time: '10:00', duration: 60 }],
        frequency: 'daily',
        endDate: '2025-09-25'
      }

      mockRequest = new MockNextRequest('http://localhost:3000/api/classes/recurring', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      }) as any

      const response = await createRecurringClasses(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Database constraint violation')
    })
  })

  describe('Time Zone Handling', () => {
    it('should create sessions with correct UTC times', async () => {
      const programData = {
        id: 'program-123',
        name: 'Early Morning Class',
        max_participants: 8,
        organization_id: 'org-123'
      }

      const requestBody = {
        programId: 'program-123',
        timeSlots: [{ time: '06:00', duration: 60 }],
        frequency: 'daily',
        endDate: '2025-09-23',
        maxOccurrences: 2
      }

      const programQuery = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: programData,
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
          data: capturedSessions,
          error: null
        })
      }

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'programs') return programQuery
        if (table === 'class_sessions') return insertQuery
        return mockSupabase
      })

      mockRequest = new MockNextRequest('http://localhost:3000/api/classes/recurring', {
        method: 'POST',
        body: JSON.stringify(requestBody)
      }) as any

      await createRecurringClasses(mockRequest)

      expect(capturedSessions).toHaveLength(2)

      // Verify that times are in UTC format and match the expected 6 AM time
      capturedSessions.forEach(session => {
        expect(session.start_time).toMatch(/T06:00:00\.000Z$/)
        expect(session.end_time).toMatch(/T07:00:00\.000Z$/)
        expect(session.duration_minutes).toBe(60)
      })
    })
  })
})