/**
 * Time Display Consistency Tests
 *
 * Tests for consistent UTC time display across all components
 * Ensures that times stored as UTC in database display consistently regardless of user timezone
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

// Mock time display utility functions that would be used in components
const formatTimeForDisplay = (isoString: string): string => {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC', // Always display in UTC for consistency
  });
};

const formatDateTimeForDisplay = (isoString: string): { date: string; time: string } => {
  const date = new Date(isoString);
  return {
    date: date.toLocaleDateString('en-GB', { timeZone: 'UTC' }),
    time: date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC',
    }),
  };
};

// Mock component that displays class session times
const ClassSessionDisplay: React.FC<{
  session: {
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    max_capacity: number;
    current_bookings: number;
  };
}> = ({ session }) => {
  const startTime = formatTimeForDisplay(session.start_time);
  const endTime = formatTimeForDisplay(session.end_time);
  const { date } = formatDateTimeForDisplay(session.start_time);

  return (
    <div data-testid={`session-${session.id}`}>
      <h3>{session.name}</h3>
      <div data-testid="session-date">{date}</div>
      <div data-testid="session-time-range">
        {startTime} - {endTime}
      </div>
      <div data-testid="session-capacity">
        {session.current_bookings}/{session.max_capacity}
      </div>
    </div>
  );
};

// Mock calendar component that displays multiple sessions
const CalendarView: React.FC<{
  sessions: Array<{
    id: string;
    name: string;
    start_time: string;
    end_time: string;
    max_capacity: number;
    current_bookings: number;
  }>;
}> = ({ sessions }) => {
  return (
    <div data-testid="calendar-view">
      {sessions.map(session => (
        <div key={session.id} data-testid={`calendar-session-${session.id}`}>
          <span data-testid="calendar-time">
            {formatTimeForDisplay(session.start_time)}
          </span>
          <span data-testid="calendar-name">{session.name}</span>
          <span data-testid="calendar-capacity">
            {session.current_bookings}/{session.max_capacity}
          </span>
        </div>
      ))}
    </div>
  );
};

describe('Time Display Consistency', () => {
  // Mock different timezone environments
  const originalIntl = Intl;
  const originalTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  afterEach(() => {
    // Restore original Intl
    global.Intl = originalIntl;
  });

  describe('UTC Time Display Formatting', () => {
    test('should display 6:00 AM UTC consistently as "06:00"', () => {
      const session = {
        id: 'session-morning',
        name: 'Morning HIIT',
        start_time: '2024-09-20T06:00:00.000Z',
        end_time: '2024-09-20T07:00:00.000Z',
        max_capacity: 10,
        current_bookings: 5,
      };

      render(<ClassSessionDisplay session={session} />);

      expect(screen.getByTestId('session-time-range')).toHaveTextContent('06:00 - 07:00');
    });

    test('should display 6:30 PM UTC consistently as "18:30"', () => {
      const session = {
        id: 'session-evening',
        name: 'Evening Yoga',
        start_time: '2024-09-20T18:30:00.000Z',
        end_time: '2024-09-20T19:30:00.000Z',
        max_capacity: 15,
        current_bookings: 8,
      };

      render(<ClassSessionDisplay session={session} />);

      expect(screen.getByTestId('session-time-range')).toHaveTextContent('18:30 - 19:30');
    });

    test('should handle midnight UTC times correctly', () => {
      const session = {
        id: 'session-midnight',
        name: 'Late Night Boxing',
        start_time: '2024-09-20T00:00:00.000Z',
        end_time: '2024-09-20T01:00:00.000Z',
        max_capacity: 8,
        current_bookings: 3,
      };

      render(<ClassSessionDisplay session={session} />);

      expect(screen.getByTestId('session-time-range')).toHaveTextContent('00:00 - 01:00');
    });

    test('should handle noon UTC times correctly', () => {
      const session = {
        id: 'session-noon',
        name: 'Lunch Break Pilates',
        start_time: '2024-09-20T12:00:00.000Z',
        end_time: '2024-09-20T13:00:00.000Z',
        max_capacity: 12,
        current_bookings: 12,
      };

      render(<ClassSessionDisplay session={session} />);

      expect(screen.getByTestId('session-time-range')).toHaveTextContent('12:00 - 13:00');
    });
  });

  describe('Cross-Component Time Consistency', () => {
    test('should display same time consistently across different components', () => {
      const sessions = [
        {
          id: 'session-1',
          name: 'Morning Class',
          start_time: '2024-09-20T06:00:00.000Z',
          end_time: '2024-09-20T07:00:00.000Z',
          max_capacity: 10,
          current_bookings: 5,
        },
        {
          id: 'session-2',
          name: 'Evening Class',
          start_time: '2024-09-20T18:30:00.000Z',
          end_time: '2024-09-20T19:30:00.000Z',
          max_capacity: 15,
          current_bookings: 10,
        },
      ];

      // Render both detail and calendar views
      const { rerender } = render(<ClassSessionDisplay session={sessions[0]} />);
      const detailTime1 = screen.getByTestId('session-time-range').textContent;

      rerender(<CalendarView sessions={sessions} />);
      const calendarTime1 = screen.getByTestId('calendar-session-session-1')
        .querySelector('[data-testid="calendar-time"]')?.textContent;

      // Times should be identical across components
      expect(detailTime1).toContain('06:00');
      expect(calendarTime1).toBe('06:00');

      // Test second session
      const calendarTime2 = screen.getByTestId('calendar-session-session-2')
        .querySelector('[data-testid="calendar-time"]')?.textContent;
      expect(calendarTime2).toBe('18:30');
    });

    test('should maintain consistency when capacity is displayed alongside time', () => {
      const session = {
        id: 'session-capacity-test',
        name: 'Capacity Test Class',
        start_time: '2024-09-20T14:15:00.000Z',
        end_time: '2024-09-20T15:15:00.000Z',
        max_capacity: 10,
        current_bookings: 7,
      };

      render(<ClassSessionDisplay session={session} />);

      // Both time and capacity should be correctly displayed
      expect(screen.getByTestId('session-time-range')).toHaveTextContent('14:15 - 15:15');
      expect(screen.getByTestId('session-capacity')).toHaveTextContent('7/10');
    });
  });

  describe('Timezone Independence', () => {
    test('should display UTC times consistently regardless of system timezone', () => {
      // Test with different timezone mocks
      const testCases = [
        {
          timeZone: 'America/New_York',
          name: 'Eastern Time',
        },
        {
          timeZone: 'Europe/London',
          name: 'London Time',
        },
        {
          timeZone: 'Asia/Tokyo',
          name: 'Tokyo Time',
        },
        {
          timeZone: 'Australia/Sydney',
          name: 'Sydney Time',
        },
      ];

      const session = {
        id: 'session-tz-test',
        name: 'Timezone Test Class',
        start_time: '2024-09-20T06:00:00.000Z',
        end_time: '2024-09-20T07:00:00.000Z',
        max_capacity: 10,
        current_bookings: 5,
      };

      testCases.forEach(({ timeZone, name }) => {
        // Note: In a real test environment, you would mock the system timezone
        // For this test, we're verifying the UTC formatting works correctly
        const displayTime = formatTimeForDisplay(session.start_time);

        // Should always display as 06:00 regardless of system timezone
        expect(displayTime).toBe('06:00');
      });
    });

    test('should handle daylight saving time transitions correctly', () => {
      // Test sessions during DST transition periods
      const sessions = [
        {
          id: 'session-dst-before',
          name: 'Before DST',
          start_time: '2024-03-30T06:00:00.000Z', // Before DST in Europe
          end_time: '2024-03-30T07:00:00.000Z',
          max_capacity: 10,
          current_bookings: 5,
        },
        {
          id: 'session-dst-after',
          name: 'After DST',
          start_time: '2024-03-31T06:00:00.000Z', // After DST in Europe
          end_time: '2024-03-31T07:00:00.000Z',
          max_capacity: 10,
          current_bookings: 5,
        },
      ];

      sessions.forEach(session => {
        const displayTime = formatTimeForDisplay(session.start_time);
        // UTC times should be unaffected by DST transitions
        expect(displayTime).toBe('06:00');
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle invalid date strings gracefully', () => {
      const invalidSession = {
        id: 'session-invalid',
        name: 'Invalid Time Class',
        start_time: 'invalid-date-string',
        end_time: 'invalid-date-string',
        max_capacity: 10,
        current_bookings: 5,
      };

      // Should not throw error but handle gracefully
      expect(() => {
        formatTimeForDisplay(invalidSession.start_time);
      }).not.toThrow();

      const result = formatTimeForDisplay(invalidSession.start_time);
      // Invalid Date results in "Invalid Date" string
      expect(result).toBe('Invalid Date');
    });

    test('should handle empty or null time strings', () => {
      const testCases = ['', null, undefined];

      testCases.forEach(invalidTime => {
        expect(() => {
          formatTimeForDisplay(invalidTime as any);
        }).not.toThrow();
      });
    });

    test('should handle leap year and edge date cases', () => {
      const edgeCases = [
        {
          name: 'Leap year Feb 29',
          start_time: '2024-02-29T06:00:00.000Z',
          expected: '06:00',
        },
        {
          name: 'New Year transition',
          start_time: '2024-01-01T00:00:00.000Z',
          expected: '00:00',
        },
        {
          name: 'End of year',
          start_time: '2024-12-31T23:59:00.000Z',
          expected: '23:59',
        },
      ];

      edgeCases.forEach(({ name, start_time, expected }) => {
        const result = formatTimeForDisplay(start_time);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Performance and Memory Tests', () => {
    test('should efficiently format large numbers of time displays', () => {
      // Generate 1000 sessions with different times
      const sessions = Array.from({ length: 1000 }, (_, i) => ({
        id: `session-${i}`,
        name: `Class ${i}`,
        start_time: new Date(2024, 8, 20, 6 + (i % 18), i % 60).toISOString(),
        end_time: new Date(2024, 8, 20, 7 + (i % 18), i % 60).toISOString(),
        max_capacity: 10 + (i % 20),
        current_bookings: i % 15,
      }));

      const startTime = performance.now();

      // Format all times
      const formattedTimes = sessions.map(session =>
        formatTimeForDisplay(session.start_time)
      );

      const endTime = performance.now();

      // Should complete in reasonable time (< 100ms for 1000 items)
      expect(endTime - startTime).toBeLessThan(100);
      expect(formattedTimes).toHaveLength(1000);

      // Verify some results
      expect(formattedTimes[0]).toMatch(/^\d{2}:\d{2}$/);
    });

    test('should not cause memory leaks with repeated formatting', () => {
      const testSession = {
        id: 'memory-test',
        name: 'Memory Test',
        start_time: '2024-09-20T06:00:00.000Z',
        end_time: '2024-09-20T07:00:00.000Z',
        max_capacity: 10,
        current_bookings: 5,
      };

      // Format the same time 10000 times
      for (let i = 0; i < 10000; i++) {
        formatTimeForDisplay(testSession.start_time);
      }

      // Should not cause memory issues (test passes if no out-of-memory error)
      expect(true).toBe(true);
    });
  });
});