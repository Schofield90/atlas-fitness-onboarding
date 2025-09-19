/**
 * Test Setup for Critical Fixes Tests
 *
 * Provides common setup, mocking, and utilities for testing the three critical fixes:
 * 1. Capacity Persistence
 * 2. Recurring Session Range
 * 3. Time Display Consistency
 */

import { jest } from '@jest/globals';

// Mock environment variables for tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

// Mock Supabase admin client
export const createMockSupabaseAdmin = () => {
  const mockQuery = {
    data: null,
    error: null,
  };

  const mockSelect = jest.fn(() => ({
    eq: jest.fn(() => ({
      single: jest.fn(() => Promise.resolve(mockQuery)),
      order: jest.fn(() => Promise.resolve(mockQuery)),
      gte: jest.fn(() => ({
        lte: jest.fn(() => Promise.resolve(mockQuery)),
        order: jest.fn(() => Promise.resolve(mockQuery)),
      })),
      in: jest.fn(() => ({
        single: jest.fn(() => Promise.resolve(mockQuery)),
      })),
    })),
  }));

  const mockInsert = jest.fn(() => ({
    select: jest.fn(() => Promise.resolve(mockQuery)),
  }));

  const mockUpdate = jest.fn(() => ({
    eq: jest.fn(() => Promise.resolve(mockQuery)),
  }));

  const mockDelete = jest.fn(() => ({
    eq: jest.fn(() => Promise.resolve(mockQuery)),
  }));

  const mockFrom = jest.fn(() => ({
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  }));

  return {
    from: mockFrom,
    _mocks: {
      from: mockFrom,
      select: mockSelect,
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
      query: mockQuery,
    },
  };
};

// Test data factories
export const createTestProgram = (overrides = {}) => ({
  id: 'test-program-123',
  name: 'Test Program',
  organization_id: 'test-org-456',
  max_participants: 10,
  default_capacity: 20,
  price_pennies: 1500,
  trainer_id: 'test-trainer-789',
  instructor_name: 'Test Instructor',
  location: 'Test Studio',
  created_at: '2024-09-01T00:00:00.000Z',
  updated_at: '2024-09-01T00:00:00.000Z',
  ...overrides,
});

export const createTestSession = (overrides = {}) => ({
  id: 'test-session-123',
  program_id: 'test-program-123',
  organization_id: 'test-org-456',
  trainer_id: 'test-trainer-789',
  instructor_name: 'Test Instructor',
  location: 'Test Studio',
  start_time: '2024-09-20T06:00:00.000Z',
  end_time: '2024-09-20T07:00:00.000Z',
  duration_minutes: 60,
  session_status: 'scheduled',
  current_bookings: 0,
  max_capacity: 10,
  created_at: '2024-09-01T00:00:00.000Z',
  updated_at: '2024-09-01T00:00:00.000Z',
  ...overrides,
});

export const createTestBooking = (overrides = {}) => ({
  id: 'test-booking-123',
  customer_id: 'test-customer-456',
  class_session_id: 'test-session-123',
  booking_status: 'confirmed',
  payment_status: 'paid',
  created_at: '2024-09-01T00:00:00.000Z',
  updated_at: '2024-09-01T00:00:00.000Z',
  ...overrides,
});

export const createTestWaitlistEntry = (overrides = {}) => ({
  id: 'test-waitlist-123',
  customer_id: 'test-customer-456',
  class_session_id: 'test-session-123',
  position: 1,
  auto_book: true,
  created_at: '2024-09-01T00:00:00.000Z',
  leads: {
    id: 'test-customer-456',
    name: 'Test Customer',
    email: 'test@example.com',
    phone: '+1234567890',
  },
  ...overrides,
});

// Time utilities for consistent testing
export const timeUtils = {
  /**
   * Format time for display (UTC)
   */
  formatTimeForDisplay: (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    });
  },

  /**
   * Create UTC time string from time components
   */
  createUTCTimeString: (year: number, month: number, day: number, hour: number, minute: number): string => {
    const date = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
    return date.toISOString();
  },

  /**
   * Generate date range for testing
   */
  generateDateRange: (startDate: Date, endDate: Date, frequency: 'daily' | 'weekly' | 'monthly' = 'weekly'): Date[] => {
    const dates: Date[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      dates.push(new Date(current));

      switch (frequency) {
        case 'daily':
          current.setDate(current.getDate() + 1);
          break;
        case 'weekly':
          current.setDate(current.getDate() + 7);
          break;
        case 'monthly':
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    return dates;
  },

  /**
   * Check if date range spans more than N weeks
   */
  isRangeLongerThanWeeks: (dates: Date[], weeks: number): boolean => {
    if (dates.length < 2) return false;
    const firstDate = dates[0];
    const lastDate = dates[dates.length - 1];
    const diffMs = lastDate.getTime() - firstDate.getTime();
    const diffWeeks = diffMs / (7 * 24 * 60 * 60 * 1000);
    return diffWeeks > weeks;
  },
};

// Capacity testing utilities
export const capacityUtils = {
  /**
   * Calculate available spaces
   */
  calculateAvailableSpaces: (maxCapacity: number, currentBookings: number): number => {
    return maxCapacity - currentBookings;
  },

  /**
   * Check if class is full
   */
  isClassFull: (maxCapacity: number, currentBookings: number): boolean => {
    return currentBookings >= maxCapacity;
  },

  /**
   * Validate capacity value
   */
  validateCapacity: (capacity: any): number => {
    if (typeof capacity === 'number' && capacity > 0) {
      return capacity;
    }
    return 20; // Default fallback
  },

  /**
   * Get effective capacity from program data
   */
  getEffectiveCapacity: (program: any): number => {
    return program.max_participants || program.default_capacity || 20;
  },
};

// Recurring session testing utilities
export const recurringUtils = {
  /**
   * Generate test recurring session data
   */
  generateRecurringSessionData: (
    programId: string,
    organizationId: string,
    timeSlots: Array<{ time: string; duration: number }>,
    dates: Date[],
    capacity: number
  ) => {
    const sessions: any[] = [];

    dates.forEach(date => {
      timeSlots.forEach(slot => {
        const [hours, minutes] = slot.time.split(':').map(Number);
        const sessionStart = new Date(date);
        sessionStart.setUTCHours(hours, minutes, 0, 0);
        const sessionEnd = new Date(sessionStart.getTime() + slot.duration * 60 * 1000);

        sessions.push({
          program_id: programId,
          organization_id: organizationId,
          start_time: sessionStart.toISOString(),
          end_time: sessionEnd.toISOString(),
          duration_minutes: slot.duration,
          session_status: 'scheduled',
          current_bookings: 0,
          max_capacity: capacity,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      });
    });

    return sessions;
  },

  /**
   * Validate recurring session data
   */
  validateRecurringSessionData: (sessions: any[], expectedCapacity: number): boolean => {
    return sessions.every(session => {
      return (
        session.max_capacity === expectedCapacity &&
        session.session_status === 'scheduled' &&
        typeof session.current_bookings === 'number' &&
        session.start_time &&
        session.end_time
      );
    });
  },

  /**
   * Check if sessions span required date range
   */
  checkDateRangeSpan: (sessions: any[], minWeeks: number): boolean => {
    if (sessions.length < 2) return false;

    const startTimes = sessions.map(s => new Date(s.start_time)).sort((a, b) => a.getTime() - b.getTime());
    const firstSession = startTimes[0];
    const lastSession = startTimes[startTimes.length - 1];

    const diffMs = lastSession.getTime() - firstSession.getTime();
    const diffWeeks = diffMs / (7 * 24 * 60 * 60 * 1000);

    return diffWeeks >= minWeeks;
  },
};

// Test assertions for critical fixes
export const criticalFixAssertions = {
  /**
   * Assert capacity persistence across all sessions
   */
  assertCapacityPersistence: (sessions: any[], expectedCapacity: number) => {
    sessions.forEach((session, index) => {
      expect(session.max_capacity).toBe(expectedCapacity);
      expect(session.max_capacity).not.toBe(12); // Common wrong value
      expect(session.max_capacity).not.toBe(20); // Default that shouldn't override
    });
  },

  /**
   * Assert date range spans beyond 3 weeks
   */
  assertDateRangeExtension: (sessions: any[], minWeeks: number = 3) => {
    expect(sessions.length).toBeGreaterThan(minWeeks * 7); // More than N weeks of daily sessions

    const isLongRange = recurringUtils.checkDateRangeSpan(sessions, minWeeks);
    expect(isLongRange).toBe(true);
  },

  /**
   * Assert time display consistency
   */
  assertTimeDisplayConsistency: (timeString: string, expectedTime: string) => {
    expect(timeString).toBe(expectedTime);
    expect(timeString).toMatch(/^\d{2}:\d{2}$/); // Format: HH:MM
  },

  /**
   * Assert all critical fixes together
   */
  assertAllCriticalFixes: (
    sessions: any[],
    expectedCapacity: number,
    minWeeks: number = 3,
    expectedTimes: string[] = []
  ) => {
    criticalFixAssertions.assertCapacityPersistence(sessions, expectedCapacity);
    criticalFixAssertions.assertDateRangeExtension(sessions, minWeeks);

    if (expectedTimes.length > 0) {
      expectedTimes.forEach(expectedTime => {
        const sessionsAtTime = sessions.filter(s => {
          const displayTime = timeUtils.formatTimeForDisplay(s.start_time);
          return displayTime === expectedTime;
        });
        expect(sessionsAtTime.length).toBeGreaterThan(0);
      });
    }
  },
};

// Export commonly used test scenarios
export const testScenarios = {
  capacityPersistence: {
    program: createTestProgram({ max_participants: 10 }),
    timeSlots: [{ time: '06:00', duration: 60 }],
    expectedSessions: 8, // 2 months weekly
    expectedCapacity: 10,
  },

  dateRangeExtension: {
    program: createTestProgram({ max_participants: 15 }),
    timeSlots: [{ time: '18:00', duration: 90 }],
    endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 3 months
    expectedMinSessions: 25,
  },

  timeDisplayConsistency: {
    program: createTestProgram({ max_participants: 12 }),
    timeSlots: [
      { time: '06:00', duration: 60 },
      { time: '18:30', duration: 75 },
    ],
    expectedTimes: ['06:00', '18:30'],
  },

  comprehensive: {
    program: createTestProgram({ max_participants: 8 }),
    timeSlots: [
      { time: '06:00', duration: 60 },
      { time: '12:00', duration: 45 },
      { time: '19:00', duration: 90 },
    ],
    daysOfWeek: [1, 3, 5], // Monday, Wednesday, Friday
    endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 4 months
    expectedCapacity: 8,
    expectedTimes: ['06:00', '12:00', '19:00'],
    expectedMinSessions: 45, // 4 months × 3 days/week × 3 sessions/day ≈ 144 sessions
  },
};

// Mock fetch for API calls in tests
export const mockFetch = () => {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({}),
    })
  ) as jest.Mock;
};

// Clean up after tests
export const cleanup = () => {
  jest.clearAllMocks();
  if (global.fetch && typeof global.fetch === 'object' && 'mockRestore' in global.fetch) {
    (global.fetch as jest.Mock).mockRestore();
  }
};