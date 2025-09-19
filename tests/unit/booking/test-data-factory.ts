/**
 * Test Data Factory for Class Creation and Display Tests
 *
 * Provides utilities to:
 * 1. Create realistic test data scenarios
 * 2. Simulate the exact reported bug conditions
 * 3. Generate edge case data for thorough testing
 * 4. Provide consistent test data across different test suites
 */

export interface TestProgram {
  id: string
  name: string
  description?: string
  max_participants?: number
  default_capacity?: number
  organization_id: string
  trainer_id?: string
  instructor_name?: string
  location?: string
  price_pennies?: number
}

export interface TestSession {
  id: string
  program_id: string
  organization_id: string
  trainer_id?: string
  instructor_name?: string
  location?: string
  start_time: string
  end_time: string
  duration_minutes: number
  session_status: 'scheduled' | 'cancelled' | 'completed'
  current_bookings?: number
  max_capacity?: number
  capacity?: number
  created_at?: string
  updated_at?: string
  program?: TestProgram
  bookings?: TestBooking[]
}

export interface TestBooking {
  id: string
  client_id?: string
  customer_id?: string
  booking_status: 'confirmed' | 'pending' | 'cancelled'
  created_at?: string
  client?: {
    id: string
    name: string
    email?: string
    phone?: string
  }
}

export interface TestMembership {
  client_id: string
  plan_name: string
  status: 'active' | 'expired' | 'suspended'
  start_date: string
  end_date?: string
}

/**
 * Factory class for creating test data scenarios
 */
export class TestDataFactory {
  private static sessionCounter = 1
  private static bookingCounter = 1
  private static clientCounter = 1

  /**
   * Reset counters for consistent test data across test runs
   */
  static reset(): void {
    this.sessionCounter = 1
    this.bookingCounter = 1
    this.clientCounter = 1
  }

  /**
   * Create a realistic program with typical gym class parameters
   */
  static createProgram(overrides: Partial<TestProgram> = {}): TestProgram {
    const defaults: TestProgram = {
      id: `program-${Date.now()}`,
      name: 'Test Fitness Program',
      description: 'A comprehensive fitness program',
      max_participants: 8,
      default_capacity: 12,
      organization_id: 'org-123',
      trainer_id: 'trainer-456',
      instructor_name: 'John Trainer',
      location: 'Main Studio',
      price_pennies: 2500
    }

    return { ...defaults, ...overrides }
  }

  /**
   * Create a session with realistic defaults
   */
  static createSession(overrides: Partial<TestSession> = {}): TestSession {
    const sessionId = `session-${this.sessionCounter++}`
    const baseTime = new Date('2025-09-22T06:00:00.000Z')
    const startTime = new Date(baseTime)
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000) // 1 hour later

    const defaults: TestSession = {
      id: sessionId,
      program_id: 'program-123',
      organization_id: 'org-123',
      trainer_id: 'trainer-456',
      instructor_name: 'John Trainer',
      location: 'Main Studio',
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_minutes: 60,
      session_status: 'scheduled',
      current_bookings: 0,
      max_capacity: 8,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      bookings: []
    }

    return { ...defaults, ...overrides }
  }

  /**
   * Create a booking with realistic client data
   */
  static createBooking(overrides: Partial<TestBooking> = {}): TestBooking {
    const bookingId = `booking-${this.bookingCounter++}`
    const clientId = `client-${this.clientCounter++}`

    const defaults: TestBooking = {
      id: bookingId,
      client_id: clientId,
      booking_status: 'confirmed',
      created_at: new Date().toISOString(),
      client: {
        id: clientId,
        name: `Test Client ${this.clientCounter}`,
        email: `client${this.clientCounter}@example.com`,
        phone: `555-010${this.clientCounter.toString().padStart(4, '0')}`
      }
    }

    return { ...defaults, ...overrides }
  }

  /**
   * Create a membership record
   */
  static createMembership(overrides: Partial<TestMembership> = {}): TestMembership {
    const defaults: TestMembership = {
      client_id: `client-${this.clientCounter}`,
      plan_name: 'Premium Monthly',
      status: 'active',
      start_date: '2025-09-01',
      end_date: '2025-10-01'
    }

    return { ...defaults, ...overrides }
  }

  /**
   * Simulate the exact reported bug scenario:
   * - Program with max_participants = 8
   * - Classes at 6am
   * - Some cancelled sessions
   * - Expected capacity should be 8, not 12
   */
  static createBugReportScenario(): {
    program: TestProgram
    sessions: TestSession[]
    memberships: TestMembership[]
  } {
    this.reset()

    const program = this.createProgram({
      id: 'bug-report-program',
      name: 'Early Morning Boot Camp',
      max_participants: 8,    // This should be the final capacity
      default_capacity: 12,   // This should NOT be used
      instructor_name: 'Sarah Coach',
      location: 'Outdoor Area'
    })

    // Create sessions at 6am for a week
    const sessions: TestSession[] = []
    const baseDate = new Date('2025-09-22')

    for (let day = 0; day < 7; day++) {
      const sessionDate = new Date(baseDate)
      sessionDate.setDate(baseDate.getDate() + day)
      sessionDate.setUTCHours(6, 0, 0, 0) // 6am UTC

      const endTime = new Date(sessionDate.getTime() + 60 * 60 * 1000)

      const session = this.createSession({
        id: `bug-session-${day + 1}`,
        program_id: program.id,
        start_time: sessionDate.toISOString(),
        end_time: endTime.toISOString(),
        duration_minutes: 60,
        max_capacity: program.max_participants, // Should be 8
        session_status: day === 2 || day === 5 ? 'cancelled' : 'scheduled', // Cancel Tuesday and Friday
        program: {
          name: program.name,
          max_participants: program.max_participants,
          default_capacity: program.default_capacity
        } as TestProgram
      })

      // Add some bookings to first few sessions
      if (day < 3 && session.session_status === 'scheduled') {
        const bookingCount = Math.min(day + 2, 6) // 2, 3, 4 bookings respectively
        const bookings: TestBooking[] = []

        for (let b = 0; b < bookingCount; b++) {
          bookings.push(this.createBooking({
            client_id: `client-${b + 1}`
          }))
        }

        session.bookings = bookings
      }

      sessions.push(session)
    }

    // Create memberships for some clients
    const memberships = [
      this.createMembership({
        client_id: 'client-1',
        plan_name: 'Premium Monthly'
      }),
      this.createMembership({
        client_id: 'client-2',
        plan_name: 'Basic Annual'
      }),
      this.createMembership({
        client_id: 'client-3',
        plan_name: 'Day Pass',
        status: 'expired'
      })
    ]

    return { program, sessions, memberships }
  }

  /**
   * Create a capacity resolution test scenario with different capacity sources
   */
  static createCapacityResolutionScenario(): TestSession[] {
    this.reset()

    return [
      // Session with direct max_capacity (should win)
      this.createSession({
        id: 'capacity-direct',
        max_capacity: 15,
        capacity: 20,
        program: this.createProgram({
          max_participants: 10,
          default_capacity: 25
        })
      }),

      // Session using program.max_participants
      this.createSession({
        id: 'capacity-program-max',
        max_capacity: null,
        capacity: 30,
        program: this.createProgram({
          max_participants: 12,
          default_capacity: 25
        })
      }),

      // Session using program.default_capacity
      this.createSession({
        id: 'capacity-program-default',
        max_capacity: null,
        capacity: 35,
        program: this.createProgram({
          max_participants: null,
          default_capacity: 18
        })
      }),

      // Session using capacity field fallback
      this.createSession({
        id: 'capacity-fallback',
        max_capacity: null,
        capacity: 22,
        program: this.createProgram({
          max_participants: null,
          default_capacity: null
        })
      }),

      // Session with no capacity info (should default to 20)
      this.createSession({
        id: 'capacity-none',
        max_capacity: null,
        capacity: null,
        program: this.createProgram({
          max_participants: null,
          default_capacity: null
        })
      })
    ]
  }

  /**
   * Create sessions with various status types for filtering tests
   */
  static createMixedStatusScenario(): TestSession[] {
    this.reset()

    const statuses = ['scheduled', 'cancelled', 'completed']
    const sessions: TestSession[] = []

    statuses.forEach((status, index) => {
      sessions.push(this.createSession({
        id: `status-${status}`,
        session_status: status as any,
        start_time: `2025-09-22T${10 + index}:00:00.000Z`,
        end_time: `2025-09-22T${11 + index}:00:00.000Z`
      }))
    })

    // Add edge cases
    sessions.push(
      this.createSession({
        id: 'status-null',
        session_status: null as any,
        start_time: '2025-09-22T13:00:00.000Z',
        end_time: '2025-09-22T14:00:00.000Z'
      }),
      this.createSession({
        id: 'status-invalid',
        session_status: 'unknown_status' as any,
        start_time: '2025-09-22T14:00:00.000Z',
        end_time: '2025-09-22T15:00:00.000Z'
      })
    )

    return sessions
  }

  /**
   * Create sessions with booking deduplication scenarios
   */
  static createBookingDeduplicationScenario(): TestSession[] {
    this.reset()

    const session = this.createSession({
      id: 'deduplication-test',
      max_capacity: 10
    })

    // Create bookings with duplicates
    session.bookings = [
      this.createBooking({ client_id: 'client-1', id: 'booking-1' }),
      this.createBooking({ client_id: 'client-2', id: 'booking-2' }),
      this.createBooking({ client_id: 'client-1', id: 'booking-3' }), // Duplicate client-1
      this.createBooking({ client_id: 'client-3', id: 'booking-4' }),
      this.createBooking({ client_id: 'client-2', id: 'booking-5' }), // Duplicate client-2
      this.createBooking({ client_id: null, customer_id: 'customer-1', id: 'booking-6' }),
      this.createBooking({ client_id: null, customer_id: null, id: 'booking-7' }) // Invalid booking
    ]

    return [session]
  }

  /**
   * Create a realistic multi-time-slot recurring class scenario
   */
  static createMultiTimeSlotScenario(): {
    program: TestProgram
    timeSlots: Array<{ time: string; duration: number }>
    expectedSessionCount: number
  } {
    const program = this.createProgram({
      id: 'multi-slot-program',
      name: 'All Day Fitness',
      max_participants: 12,
      instructor_name: 'Multi Trainer'
    })

    const timeSlots = [
      { time: '06:00', duration: 60 }, // Morning
      { time: '12:00', duration: 45 }, // Lunch
      { time: '18:00', duration: 90 }, // Evening
      { time: '20:00', duration: 60 }  // Night
    ]

    // If running for 1 week (7 days) with 4 time slots each day
    const expectedSessionCount = 7 * 4 // 28 sessions

    return { program, timeSlots, expectedSessionCount }
  }

  /**
   * Create sessions with missing required fields for edge case testing
   */
  static createMissingFieldsScenario(): Partial<TestSession>[] {
    return [
      // Missing ID
      {
        organization_id: 'org-123',
        start_time: '2025-09-22T10:00:00.000Z',
        duration_minutes: 60,
        session_status: 'scheduled'
      },

      // Missing start_time
      {
        id: 'session-no-start',
        organization_id: 'org-123',
        duration_minutes: 60,
        session_status: 'scheduled'
      },

      // Missing duration
      {
        id: 'session-no-duration',
        organization_id: 'org-123',
        start_time: '2025-09-22T12:00:00.000Z',
        session_status: 'scheduled'
      },

      // Missing session_status
      {
        id: 'session-no-status',
        organization_id: 'org-123',
        start_time: '2025-09-22T14:00:00.000Z',
        duration_minutes: 60
      },

      // Missing organization_id (security critical)
      {
        id: 'session-no-org',
        start_time: '2025-09-22T16:00:00.000Z',
        duration_minutes: 60,
        session_status: 'scheduled'
      }
    ]
  }

  /**
   * Create realistic time zone test data
   */
  static createTimeZoneScenario(): {
    program: TestProgram
    timeSlots: Array<{ time: string; duration: number }>
    expectedUTCTimes: string[]
  } {
    const program = this.createProgram({
      id: 'timezone-program',
      name: 'Timezone Test Program',
      max_participants: 8
    })

    const timeSlots = [
      { time: '06:00', duration: 60 },
      { time: '14:30', duration: 45 },
      { time: '19:15', duration: 90 }
    ]

    // Expected UTC times (assuming input times are treated as UTC)
    const expectedUTCTimes = [
      '06:00:00.000Z',
      '14:30:00.000Z',
      '19:15:00.000Z'
    ]

    return { program, timeSlots, expectedUTCTimes }
  }

  /**
   * Create a large-scale test scenario for performance testing
   */
  static createLargeScaleScenario(sessionCount: number = 100): {
    program: TestProgram
    sessions: TestSession[]
    memberships: TestMembership[]
  } {
    this.reset()

    const program = this.createProgram({
      id: 'large-scale-program',
      name: 'High Volume Program',
      max_participants: 20
    })

    const sessions: TestSession[] = []
    const memberships: TestMembership[] = []

    for (let i = 0; i < sessionCount; i++) {
      const sessionDate = new Date('2025-09-22')
      sessionDate.setDate(sessionDate.getDate() + Math.floor(i / 4))
      sessionDate.setUTCHours(6 + (i % 4) * 3, 0, 0, 0) // Sessions every 3 hours

      const session = this.createSession({
        id: `large-session-${i + 1}`,
        program_id: program.id,
        start_time: sessionDate.toISOString(),
        end_time: new Date(sessionDate.getTime() + 60 * 60 * 1000).toISOString(),
        max_capacity: program.max_participants,
        session_status: i % 10 === 0 ? 'cancelled' : 'scheduled' // Cancel every 10th session
      })

      // Add random bookings (0-25 per session)
      const bookingCount = Math.floor(Math.random() * 26)
      const bookings: TestBooking[] = []

      for (let b = 0; b < bookingCount; b++) {
        const clientId = `large-client-${(i * 25 + b) % 500 + 1}` // Simulate recurring clients
        bookings.push(this.createBooking({ client_id: clientId }))

        // Create membership for some clients
        if (b < 5 && i < 10) {
          memberships.push(this.createMembership({
            client_id: clientId,
            plan_name: ['Basic Monthly', 'Premium Annual', 'Day Pass'][b % 3]
          }))
        }
      }

      session.bookings = bookings
      sessions.push(session)
    }

    return { program, sessions, memberships }
  }
}

/**
 * Mock helpers for test setup
 */
export class MockHelpers {
  /**
   * Create a mock Supabase query builder for sessions
   */
  static createMockSessionQuery(data: TestSession[], error: any = null) {
    return {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      order: jest.fn().mockResolvedValue({ data, error })
    }
  }

  /**
   * Create a mock Supabase query builder for programs
   */
  static createMockProgramQuery(data: TestProgram | null, error: any = null) {
    return {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data, error })
    }
  }

  /**
   * Create a mock Supabase insert query
   */
  static createMockInsertQuery(returnData: TestSession[], error: any = null) {
    return {
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockResolvedValue({ data: returnData, error })
    }
  }

  /**
   * Create a mock Supabase membership query
   */
  static createMockMembershipQuery(data: TestMembership[], error: any = null) {
    return {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      eq: jest.fn().mockResolvedValue({ data, error })
    }
  }

  /**
   * Setup complete mock Supabase client for class display tests
   */
  static setupMockSupabaseForDisplay(
    sessions: TestSession[],
    memberships: TestMembership[] = []
  ) {
    return jest.fn().mockImplementation((table: string) => {
      if (table === 'class_sessions') {
        return this.createMockSessionQuery(sessions)
      }
      if (table === 'customer_memberships') {
        return this.createMockMembershipQuery(memberships)
      }
      return { select: jest.fn().mockReturnThis() }
    })
  }

  /**
   * Setup complete mock Supabase admin for class creation tests
   */
  static setupMockSupabaseForCreation(
    program: TestProgram,
    createdSessions: TestSession[]
  ) {
    return jest.fn().mockImplementation((table: string) => {
      if (table === 'programs') {
        return this.createMockProgramQuery(program)
      }
      if (table === 'class_sessions') {
        return this.createMockInsertQuery(createdSessions)
      }
      return { select: jest.fn().mockReturnThis() }
    })
  }
}