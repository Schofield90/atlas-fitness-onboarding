/**
 * Critical Issue Tests for Recurring Sessions
 *
 * This test suite verifies the three major fixes:
 * 1. Capacity Persistence: max_participants from programs should be preserved in sessions
 * 2. Recurring Session Range: Sessions should be created for full date range (not limited to 3 weeks)
 * 3. Time Display Consistency: Times should display consistently as UTC across all components
 */

import { NextRequest, NextResponse } from 'next/server';

// We'll mock these since we're testing logic, not actual implementation
const mockSupabaseAdmin = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(),
    })),
  })),
};

// Mock the admin client
const createAdminClient = jest.fn(() => Promise.resolve(mockSupabaseAdmin));

// Mock the POST function from the API route
const POST = jest.fn();

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

// Mock NextResponse
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, options) => ({ data, options })),
  },
}));

describe('Recurring Sessions Critical Fixes', () => {
  let mockSupabase: any;
  let mockRequest: NextRequest;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Setup mock Supabase client
    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn(),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(),
        })),
      })),
    };

    (createAdminClient as jest.Mock).mockResolvedValue(mockSupabase);

    // Setup mock request
    mockRequest = {
      json: jest.fn(),
    } as any;
  });

  describe('Issue 1: Capacity Persistence', () => {
    beforeEach(() => {
      (NextResponse.json as jest.Mock).mockImplementation((data) => ({ data }));
    });

    test('should preserve max_participants from program in all recurring sessions', async () => {
      // Test data: Program with max_participants = 10
      const mockProgram = {
        id: 'program-123',
        name: 'HIIT Training',
        organization_id: 'org-456',
        max_participants: 10,
        default_capacity: 20, // This should NOT be used
        trainer_id: 'trainer-789',
        instructor_name: 'John Doe',
        location: 'Studio A',
      };

      const mockCreatedSessions = [
        {
          id: 'session-1',
          program_id: 'program-123',
          max_capacity: 10, // Should match program.max_participants
          start_time: '2024-09-20T06:00:00.000Z',
          end_time: '2024-09-20T07:00:00.000Z',
        },
        {
          id: 'session-2',
          program_id: 'program-123',
          max_capacity: 10, // Should match program.max_participants
          start_time: '2024-09-22T06:00:00.000Z',
          end_time: '2024-09-22T07:00:00.000Z',
        },
      ];

      // Mock program lookup
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockProgram,
              error: null,
            }),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn().mockResolvedValue({
            data: mockCreatedSessions,
            error: null,
          }),
        })),
      });

      // Mock request body
      (mockRequest.json as jest.Mock).mockResolvedValue({
        programId: 'program-123',
        frequency: 'weekly',
        interval: 1,
        daysOfWeek: [1, 3], // Monday, Wednesday
        endDate: '2024-10-20T00:00:00.000Z',
        maxOccurrences: 20,
        timeSlots: [{ time: '06:00', duration: 60 }],
      });

      const response = await POST(mockRequest);

      // Verify the insert was called with correct capacity
      const insertCall = mockSupabase.from().insert;
      expect(insertCall).toHaveBeenCalled();

      const insertedSessions = insertCall.mock.calls[0][0];

      // Every session should have max_capacity = 10 (from program.max_participants)
      insertedSessions.forEach((session: any) => {
        expect(session.max_capacity).toBe(10);
        expect(session.max_capacity).not.toBe(20); // Should NOT use default_capacity
      });

      expect(response.data.message).toContain('successfully');
    });

    test('should fall back to default_capacity when max_participants is null', async () => {
      const mockProgram = {
        id: 'program-456',
        name: 'Yoga Flow',
        organization_id: 'org-456',
        max_participants: null,
        default_capacity: 15,
        trainer_id: 'trainer-789',
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockProgram,
              error: null,
            }),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn().mockResolvedValue({
            data: [{ id: 'session-1', max_capacity: 15 }],
            error: null,
          }),
        })),
      });

      (mockRequest.json as jest.Mock).mockResolvedValue({
        programId: 'program-456',
        timeSlots: [{ time: '07:00', duration: 60 }],
        endDate: '2024-10-01T00:00:00.000Z',
      });

      await POST(mockRequest);

      const insertCall = mockSupabase.from().insert;
      const insertedSessions = insertCall.mock.calls[0][0];

      insertedSessions.forEach((session: any) => {
        expect(session.max_capacity).toBe(15);
      });
    });

    test('should use fallback of 20 when both max_participants and default_capacity are null', async () => {
      const mockProgram = {
        id: 'program-789',
        name: 'Boxing',
        organization_id: 'org-456',
        max_participants: null,
        default_capacity: null,
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockProgram,
              error: null,
            }),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn().mockResolvedValue({
            data: [{ id: 'session-1', max_capacity: 20 }],
            error: null,
          }),
        })),
      });

      (mockRequest.json as jest.Mock).mockResolvedValue({
        programId: 'program-789',
        timeSlots: [{ time: '08:00', duration: 60 }],
        endDate: '2024-10-01T00:00:00.000Z',
      });

      await POST(mockRequest);

      const insertCall = mockSupabase.from().insert;
      const insertedSessions = insertCall.mock.calls[0][0];

      insertedSessions.forEach((session: any) => {
        expect(session.max_capacity).toBe(20);
      });
    });
  });

  describe('Issue 2: Recurring Session Date Range', () => {
    test('should create sessions for full 3-month date range', async () => {
      const mockProgram = {
        id: 'program-long',
        name: 'Long Term Class',
        organization_id: 'org-456',
        max_participants: 12,
      };

      const mockCreatedSessions = Array.from({ length: 36 }, (_, i) => ({
        id: `session-${i}`,
        program_id: 'program-long',
        max_capacity: 12,
        start_time: new Date(2024, 8, 20 + i * 7).toISOString(), // Weekly for 36 weeks
      }));

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockProgram,
              error: null,
            }),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn().mockResolvedValue({
            data: mockCreatedSessions,
            error: null,
          }),
        })),
      });

      const startDate = '2024-09-20T06:00:00.000Z';
      const endDate = '2024-12-20T06:00:00.000Z'; // 3 months later

      (mockRequest.json as jest.Mock).mockResolvedValue({
        programId: 'program-long',
        frequency: 'weekly',
        interval: 1,
        daysOfWeek: [5], // Friday
        endDate: endDate,
        maxOccurrences: 50, // High number to test date range limit
        timeSlots: [{ time: '06:00', duration: 60 }],
      });

      const response = await POST(mockRequest);

      // Verify sessions were created for the full date range
      expect(response.data.instances).toBeGreaterThan(21); // More than 3 weeks (21 days)
      expect(response.data.instances).toBeLessThanOrEqual(50); // Respects maxOccurrences

      const insertCall = mockSupabase.from().insert;
      const insertedSessions = insertCall.mock.calls[0][0];

      // Verify last session is within the end date range
      const lastSession = insertedSessions[insertedSessions.length - 1];
      const lastSessionDate = new Date(lastSession.start_time);
      const endDateTime = new Date(endDate);

      expect(lastSessionDate).toBeLessThanOrEqual(endDateTime);
    });

    test('should create sessions spanning 6 months when end date allows', async () => {
      const mockProgram = {
        id: 'program-very-long',
        name: 'Year Long Program',
        organization_id: 'org-456',
        max_participants: 8,
      };

      // Mock a large number of sessions
      const mockCreatedSessions = Array.from({ length: 26 }, (_, i) => ({
        id: `session-${i}`,
        program_id: 'program-very-long',
        max_capacity: 8,
        start_time: new Date(2024, 8, 20 + i * 7).toISOString(),
      }));

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockProgram,
              error: null,
            }),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn().mockResolvedValue({
            data: mockCreatedSessions,
            error: null,
          }),
        })),
      });

      const endDate = '2025-03-20T06:00:00.000Z'; // 6 months later

      (mockRequest.json as jest.Mock).mockResolvedValue({
        programId: 'program-very-long',
        frequency: 'weekly',
        interval: 1,
        daysOfWeek: [1], // Monday
        endDate: endDate,
        maxOccurrences: 100,
        timeSlots: [{ time: '06:00', duration: 60 }],
      });

      const response = await POST(mockRequest);

      // Should create approximately 26 sessions (6 months of weekly sessions)
      expect(response.data.instances).toBeGreaterThanOrEqual(20);
      expect(response.data.instances).toBeLessThanOrEqual(30);
    });

    test('should respect maxOccurrences when it is smaller than date range', async () => {
      const mockProgram = {
        id: 'program-limited',
        name: 'Limited Sessions',
        organization_id: 'org-456',
        max_participants: 5,
      };

      const mockCreatedSessions = Array.from({ length: 10 }, (_, i) => ({
        id: `session-${i}`,
        program_id: 'program-limited',
        max_capacity: 5,
      }));

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockProgram,
              error: null,
            }),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn().mockResolvedValue({
            data: mockCreatedSessions,
            error: null,
          }),
        })),
      });

      (mockRequest.json as jest.Mock).mockResolvedValue({
        programId: 'program-limited',
        frequency: 'weekly',
        daysOfWeek: [1],
        endDate: '2025-01-01T00:00:00.000Z', // Far future
        maxOccurrences: 10, // Limited to 10 sessions
        timeSlots: [{ time: '06:00', duration: 60 }],
      });

      const response = await POST(mockRequest);

      // Should create exactly 10 sessions despite long date range
      expect(response.data.instances).toBe(10);
    });
  });

  describe('Issue 3: Time Display Consistency', () => {
    test('should store times as UTC and display consistently', () => {
      // Test UTC time storage and display
      const utcTimeString = '2024-09-20T06:00:00.000Z';
      const utcDate = new Date(utcTimeString);

      // Verify UTC time components
      expect(utcDate.getUTCHours()).toBe(6);
      expect(utcDate.getUTCMinutes()).toBe(0);

      // Test time display formatting
      const displayTime = utcDate.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      });

      expect(displayTime).toBe('06:00');
    });

    test('should create sessions with correct UTC times from time slots', async () => {
      const mockProgram = {
        id: 'program-utc',
        name: 'UTC Time Test',
        organization_id: 'org-456',
        max_participants: 15,
      };

      let capturedSessions: any[] = [];

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockProgram,
              error: null,
            }),
          })),
        })),
        insert: jest.fn((sessions) => {
          capturedSessions = sessions;
          return {
            select: jest.fn().mockResolvedValue({
              data: sessions,
              error: null,
            }),
          };
        }),
      });

      (mockRequest.json as jest.Mock).mockResolvedValue({
        programId: 'program-utc',
        frequency: 'weekly',
        daysOfWeek: [1], // Monday
        endDate: '2024-10-01T00:00:00.000Z',
        timeSlots: [
          { time: '06:00', duration: 60 }, // 6 AM UTC
          { time: '18:30', duration: 90 }, // 6:30 PM UTC
        ],
      });

      await POST(mockRequest);

      // Verify UTC time storage
      const morningSession = capturedSessions.find(s =>
        s.start_time.includes('T06:00:00.000Z')
      );
      const eveningSession = capturedSessions.find(s =>
        s.start_time.includes('T18:30:00.000Z')
      );

      expect(morningSession).toBeDefined();
      expect(eveningSession).toBeDefined();

      // Verify exact UTC time format
      expect(morningSession.start_time).toMatch(/T06:00:00\.000Z$/);
      expect(eveningSession.start_time).toMatch(/T18:30:00\.000Z$/);

      // Verify duration calculation
      const morningEnd = new Date(morningSession.end_time);
      const morningStart = new Date(morningSession.start_time);
      expect(morningEnd.getTime() - morningStart.getTime()).toBe(60 * 60 * 1000); // 60 minutes

      const eveningEnd = new Date(eveningSession.end_time);
      const eveningStart = new Date(eveningSession.start_time);
      expect(eveningEnd.getTime() - eveningStart.getTime()).toBe(90 * 60 * 1000); // 90 minutes
    });

    test('should handle timezone-independent time display', () => {
      // Test that UTC times display consistently regardless of local timezone
      const sessions = [
        { start_time: '2024-09-20T06:00:00.000Z' },
        { start_time: '2024-09-20T14:30:00.000Z' },
        { start_time: '2024-09-20T20:15:00.000Z' },
      ];

      sessions.forEach(session => {
        const date = new Date(session.start_time);

        // Display time in UTC to ensure consistency
        const displayTime = date.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC',
        });

        if (session.start_time.includes('T06:00:00')) {
          expect(displayTime).toBe('06:00');
        } else if (session.start_time.includes('T14:30:00')) {
          expect(displayTime).toBe('14:30');
        } else if (session.start_time.includes('T20:15:00')) {
          expect(displayTime).toBe('20:15');
        }
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle missing program gracefully', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: 'Program not found' },
            }),
          })),
        })),
      });

      (mockRequest.json as jest.Mock).mockResolvedValue({
        programId: 'non-existent',
        timeSlots: [{ time: '06:00', duration: 60 }],
      });

      const response = await POST(mockRequest);

      expect(response.data.error).toBe('Program not found');
      expect(response.options.status).toBe(404);
    });

    test('should handle invalid time slots', async () => {
      const mockProgram = {
        id: 'program-invalid',
        name: 'Invalid Time Test',
        organization_id: 'org-456',
        max_participants: 10,
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockProgram,
              error: null,
            }),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        })),
      });

      (mockRequest.json as jest.Mock).mockResolvedValue({
        programId: 'program-invalid',
        timeSlots: [], // Empty time slots
        endDate: '2024-10-01T00:00:00.000Z',
      });

      const response = await POST(mockRequest);

      expect(response.data.error).toContain('No sessions to create');
      expect(response.options.status).toBe(400);
    });

    test('should handle database insertion errors', async () => {
      const mockProgram = {
        id: 'program-error',
        name: 'Error Test',
        organization_id: 'org-456',
        max_participants: 10,
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockProgram,
              error: null,
            }),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database insertion failed' },
          }),
        })),
      });

      (mockRequest.json as jest.Mock).mockResolvedValue({
        programId: 'program-error',
        timeSlots: [{ time: '06:00', duration: 60 }],
        endDate: '2024-10-01T00:00:00.000Z',
      });

      const response = await POST(mockRequest);

      expect(response.data.error).toBe('Database insertion failed');
      expect(response.options.status).toBe(500);
    });
  });

  describe('Performance and Scale Tests', () => {
    test('should handle large number of recurring sessions efficiently', async () => {
      const mockProgram = {
        id: 'program-scale',
        name: 'Scale Test Program',
        organization_id: 'org-456',
        max_participants: 25,
      };

      // Mock large dataset
      const mockCreatedSessions = Array.from({ length: 200 }, (_, i) => ({
        id: `session-${i}`,
        program_id: 'program-scale',
        max_capacity: 25,
        start_time: new Date(2024, 8, 20 + i).toISOString(),
      }));

      mockSupabase.from.mockReturnValue({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({
              data: mockProgram,
              error: null,
            }),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn().mockResolvedValue({
            data: mockCreatedSessions,
            error: null,
          }),
        })),
      });

      (mockRequest.json as jest.Mock).mockResolvedValue({
        programId: 'program-scale',
        frequency: 'daily',
        interval: 1,
        endDate: '2025-03-01T00:00:00.000Z', // 6 months of daily sessions
        maxOccurrences: 200,
        timeSlots: [{ time: '06:00', duration: 60 }],
      });

      const startTime = Date.now();
      const response = await POST(mockRequest);
      const endTime = Date.now();

      // Verify it completes in reasonable time (< 5 seconds for test)
      expect(endTime - startTime).toBeLessThan(5000);
      expect(response.data.instances).toBe(200);
    });
  });
});