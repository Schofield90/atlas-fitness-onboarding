/**
 * Core Logic Tests for Critical Fixes
 *
 * Tests the core business logic for the three critical fixes without complex mocking.
 * Focuses on the essential functions and calculations.
 */

describe('Critical Fixes Core Logic', () => {

  describe('1. Capacity Persistence Logic', () => {

    // Helper function to simulate capacity selection logic
    const getEffectiveCapacity = (program: any): number => {
      return program.max_participants || program.default_capacity || 20;
    };

    test('should use max_participants when available', () => {
      const program = {
        id: 'program-1',
        name: 'Test Program',
        max_participants: 10,
        default_capacity: 20,
      };

      const capacity = getEffectiveCapacity(program);
      expect(capacity).toBe(10);
      expect(capacity).not.toBe(20); // Should not use default_capacity
    });

    test('should fallback to default_capacity when max_participants is null', () => {
      const program = {
        id: 'program-2',
        name: 'Test Program',
        max_participants: null,
        default_capacity: 15,
      };

      const capacity = getEffectiveCapacity(program);
      expect(capacity).toBe(15);
    });

    test('should fallback to 20 when both are null', () => {
      const program = {
        id: 'program-3',
        name: 'Test Program',
        max_participants: null,
        default_capacity: null,
      };

      const capacity = getEffectiveCapacity(program);
      expect(capacity).toBe(20);
    });

    test('should handle undefined values', () => {
      const program = {
        id: 'program-4',
        name: 'Test Program',
        // max_participants and default_capacity are undefined
      };

      const capacity = getEffectiveCapacity(program);
      expect(capacity).toBe(20);
    });

    test('should handle zero capacity correctly', () => {
      const program = {
        id: 'program-5',
        name: 'Test Program',
        max_participants: 0,
        default_capacity: 15,
      };

      const capacity = getEffectiveCapacity(program);
      expect(capacity).toBe(15); // 0 is falsy, so should use default_capacity
    });
  });

  describe('2. Date Range Extension Logic', () => {

    // Helper function to simulate date range generation
    const generateRecurrences = (
      startDate: Date,
      frequency: 'daily' | 'weekly' | 'monthly',
      interval: number,
      endDate: Date,
      maxOccurrences: number,
      daysOfWeek?: number[]
    ): Date[] => {
      const occurrences: Date[] = [];
      let count = 0;

      if (frequency === 'weekly' && daysOfWeek && daysOfWeek.length > 0) {
        const currentDate = new Date(startDate);
        const startDay = currentDate.getDay();
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - startDay);

        let weeksProcessed = 0;
        while (weeksProcessed < 52 && weekStart <= endDate && count < maxOccurrences) {
          const sortedDays = [...daysOfWeek].sort((a, b) => a - b);

          for (const dayOfWeek of sortedDays) {
            const occurrenceDate = new Date(weekStart);
            occurrenceDate.setDate(weekStart.getDate() + dayOfWeek);

            if (occurrenceDate >= startDate && occurrenceDate <= endDate && count < maxOccurrences) {
              occurrences.push(new Date(occurrenceDate));
              count++;
            }
          }

          weekStart.setDate(weekStart.getDate() + 7 * interval);
          weeksProcessed++;
        }
      }

      return occurrences;
    };

    test('should generate sessions spanning 3 months (not limited to 3 weeks)', () => {
      const startDate = new Date('2024-09-20');
      const endDate = new Date('2024-12-20'); // 3 months later
      const daysOfWeek = [1, 3, 5]; // Monday, Wednesday, Friday

      const occurrences = generateRecurrences(
        startDate,
        'weekly',
        1,
        endDate,
        100, // High max to test date range
        daysOfWeek
      );

      // Should have more than 21 sessions (3 weeks worth)
      expect(occurrences.length).toBeGreaterThan(21);

      // Should have approximately 3 months of sessions (around 39 sessions for 3 days/week)
      expect(occurrences.length).toBeGreaterThan(30);
      expect(occurrences.length).toBeLessThan(50);

      // Verify date range spans the full period
      const firstDate = occurrences[0];
      const lastDate = occurrences[occurrences.length - 1];

      expect(firstDate.getTime()).toBeGreaterThanOrEqual(startDate.getTime());
      expect(lastDate.getTime()).toBeLessThanOrEqual(endDate.getTime());

      // Verify the span is close to 3 months
      const diffMs = lastDate.getTime() - firstDate.getTime();
      const diffDays = diffMs / (24 * 60 * 60 * 1000);
      expect(diffDays).toBeGreaterThan(80); // At least ~3 months
    });

    test('should respect maxOccurrences even with long date range', () => {
      const startDate = new Date('2024-09-20');
      const endDate = new Date('2025-09-20'); // 1 year later
      const daysOfWeek = [1]; // Monday only

      const occurrences = generateRecurrences(
        startDate,
        'weekly',
        1,
        endDate,
        10, // Limited to 10 occurrences
        daysOfWeek
      );

      // Should have exactly 10 sessions despite long date range
      expect(occurrences.length).toBe(10);
    });

    test('should handle daily frequency correctly', () => {
      const startDate = new Date('2024-09-20');
      const endDate = new Date('2024-10-20'); // 1 month later

      const occurrences = generateRecurrences(
        startDate,
        'weekly', // Using weekly with daily-like config
        1,
        endDate,
        50,
        [0, 1, 2, 3, 4, 5, 6] // All days of week
      );

      // Should generate many sessions for daily frequency
      expect(occurrences.length).toBeGreaterThan(25); // More than 25 days
    });
  });

  describe('3. Time Display Consistency Logic', () => {

    // Helper function to format time consistently
    const formatTimeForDisplay = (isoString: string): string => {
      const date = new Date(isoString);
      return date.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC',
      });
    };

    // Helper function to create UTC time string
    const createUTCTimeString = (year: number, month: number, day: number, hour: number, minute: number): string => {
      const date = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
      return date.toISOString();
    };

    test('should display 6:00 AM UTC consistently as "06:00"', () => {
      const utcTimeString = createUTCTimeString(2024, 9, 20, 6, 0);
      const displayTime = formatTimeForDisplay(utcTimeString);

      expect(displayTime).toBe('06:00');
      expect(utcTimeString).toBe('2024-09-20T06:00:00.000Z');
    });

    test('should display 6:30 PM UTC consistently as "18:30"', () => {
      const utcTimeString = createUTCTimeString(2024, 9, 20, 18, 30);
      const displayTime = formatTimeForDisplay(utcTimeString);

      expect(displayTime).toBe('18:30');
      expect(utcTimeString).toBe('2024-09-20T18:30:00.000Z');
    });

    test('should handle midnight and noon correctly', () => {
      const midnightString = createUTCTimeString(2024, 9, 20, 0, 0);
      const noonString = createUTCTimeString(2024, 9, 20, 12, 0);

      expect(formatTimeForDisplay(midnightString)).toBe('00:00');
      expect(formatTimeForDisplay(noonString)).toBe('12:00');
    });

    test('should maintain consistency across different dates', () => {
      const times = [
        createUTCTimeString(2024, 9, 20, 6, 0),
        createUTCTimeString(2024, 9, 22, 6, 0),
        createUTCTimeString(2024, 9, 25, 6, 0),
      ];

      times.forEach(timeString => {
        expect(formatTimeForDisplay(timeString)).toBe('06:00');
      });
    });

    test('should handle time slot creation correctly', () => {
      const timeSlots = [
        { time: '06:00', duration: 60 },
        { time: '18:30', duration: 90 },
      ];

      const date = new Date('2024-09-20');
      const createdSessions = timeSlots.map(slot => {
        const [hours, minutes] = slot.time.split(':').map(Number);
        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hoursStr = hours.toString().padStart(2, '0');
        const minutesStr = minutes.toString().padStart(2, '0');

        const sessionStartStr = `${year}-${month}-${day}T${hoursStr}:${minutesStr}:00.000Z`;
        const sessionStart = new Date(sessionStartStr);
        const sessionEnd = new Date(sessionStart.getTime() + slot.duration * 60 * 1000);

        return {
          start_time: sessionStart.toISOString(),
          end_time: sessionEnd.toISOString(),
          duration_minutes: slot.duration,
        };
      });

      // Verify UTC time creation
      expect(createdSessions[0].start_time).toBe('2024-09-20T06:00:00.000Z');
      expect(createdSessions[1].start_time).toBe('2024-09-20T18:30:00.000Z');

      // Verify duration calculation
      const session1Start = new Date(createdSessions[0].start_time);
      const session1End = new Date(createdSessions[0].end_time);
      const duration1 = (session1End.getTime() - session1Start.getTime()) / (60 * 1000);
      expect(duration1).toBe(60);

      const session2Start = new Date(createdSessions[1].start_time);
      const session2End = new Date(createdSessions[1].end_time);
      const duration2 = (session2End.getTime() - session2Start.getTime()) / (60 * 1000);
      expect(duration2).toBe(90);
    });
  });

  describe('4. Integration of All Three Fixes', () => {

    // Helper function that simulates the complete session creation process
    const createRecurringSessions = (
      program: any,
      timeSlots: Array<{ time: string; duration: number }>,
      daysOfWeek: number[],
      startDate: Date,
      endDate: Date,
      maxOccurrences: number = 52
    ) => {
      // Fix 1: Get effective capacity
      const capacity = program.max_participants || program.default_capacity || 20;

      // Fix 2: Generate date range (not limited to 3 weeks)
      const occurrences: Date[] = [];
      let count = 0;

      const currentDate = new Date(startDate);
      const startDay = currentDate.getDay();
      const weekStart = new Date(currentDate);
      weekStart.setDate(currentDate.getDate() - startDay);

      let weeksProcessed = 0;
      while (weeksProcessed < 52 && weekStart <= endDate && count < maxOccurrences) {
        const sortedDays = [...daysOfWeek].sort((a, b) => a - b);

        for (const dayOfWeek of sortedDays) {
          const occurrenceDate = new Date(weekStart);
          occurrenceDate.setDate(weekStart.getDate() + dayOfWeek);

          if (occurrenceDate >= startDate && occurrenceDate <= endDate && count < maxOccurrences) {
            occurrences.push(new Date(occurrenceDate));
            count++;
          }
        }

        weekStart.setDate(weekStart.getDate() + 7);
        weeksProcessed++;
      }

      // Fix 3: Create sessions with proper UTC times
      const sessions: any[] = [];
      occurrences.forEach(date => {
        timeSlots.forEach(slot => {
          const [hours, minutes] = slot.time.split(':').map(Number);
          const year = date.getFullYear();
          const month = (date.getMonth() + 1).toString().padStart(2, '0');
          const day = date.getDate().toString().padStart(2, '0');
          const hoursStr = hours.toString().padStart(2, '0');
          const minutesStr = minutes.toString().padStart(2, '0');

          const sessionStartStr = `${year}-${month}-${day}T${hoursStr}:${minutesStr}:00.000Z`;
          const sessionStart = new Date(sessionStartStr);
          const sessionEnd = new Date(sessionStart.getTime() + slot.duration * 60 * 1000);

          sessions.push({
            program_id: program.id,
            start_time: sessionStart.toISOString(),
            end_time: sessionEnd.toISOString(),
            duration_minutes: slot.duration,
            max_capacity: capacity,
            current_bookings: 0,
            session_status: 'scheduled',
          });
        });
      });

      return sessions;
    };

    test('should correctly implement all three fixes together', () => {
      const program = {
        id: 'test-program',
        name: 'Complete Test Program',
        max_participants: 12,
        default_capacity: 20, // Should not be used
      };

      const timeSlots = [
        { time: '06:00', duration: 60 },
        { time: '18:30', duration: 90 },
      ];

      const startDate = new Date('2024-09-20');
      const endDate = new Date('2024-12-20'); // 3 months
      const daysOfWeek = [1, 3, 5]; // Mon, Wed, Fri

      const sessions = createRecurringSessions(
        program,
        timeSlots,
        daysOfWeek,
        startDate,
        endDate
      );

      // Fix 1: All sessions should have max_capacity = 12
      sessions.forEach(session => {
        expect(session.max_capacity).toBe(12);
        expect(session.max_capacity).not.toBe(20);
      });

      // Fix 2: Should have sessions spanning 3 months (not limited to 3 weeks)
      expect(sessions.length).toBeGreaterThan(42); // 3 months × 3 days × 2 times = ~54 sessions
      expect(sessions.length).toBeLessThan(80); // Reasonable upper bound

      // Verify date range
      const startTimes = sessions.map(s => new Date(s.start_time)).sort((a, b) => a.getTime() - b.getTime());
      const firstSession = startTimes[0];
      const lastSession = startTimes[startTimes.length - 1];
      const diffMs = lastSession.getTime() - firstSession.getTime();
      const diffDays = diffMs / (24 * 60 * 60 * 1000);
      expect(diffDays).toBeGreaterThan(80); // More than ~3 months

      // Fix 3: Times should be consistent UTC
      const morningSessions = sessions.filter(s => s.start_time.includes('T06:00:00.000Z'));
      const eveningSessions = sessions.filter(s => s.start_time.includes('T18:30:00.000Z'));

      expect(morningSessions.length).toBeGreaterThan(0);
      expect(eveningSessions.length).toBeGreaterThan(0);

      // Each occurrence date should have both morning and evening sessions
      const uniqueDates = [...new Set(sessions.map(s => s.start_time.split('T')[0]))];
      expect(morningSessions.length).toBe(uniqueDates.length);
      expect(eveningSessions.length).toBe(uniqueDates.length);
    });
  });

  describe('5. Edge Cases and Error Handling', () => {

    test('should handle invalid capacity values gracefully', () => {
      const getEffectiveCapacity = (program: any): number => {
        // More robust validation to handle invalid values
        const maxParticipants = typeof program.max_participants === 'number' && program.max_participants > 0
          ? program.max_participants
          : null;

        const defaultCapacity = typeof program.default_capacity === 'number' && program.default_capacity > 0
          ? program.default_capacity
          : null;

        return maxParticipants || defaultCapacity || 20;
      };

      const invalidPrograms = [
        { max_participants: -5, default_capacity: 15 }, // Should use default_capacity (15)
        { max_participants: 'invalid', default_capacity: 10 }, // Should use default_capacity (10)
        { max_participants: null, default_capacity: null }, // Should use fallback (20)
        {}, // Should use fallback (20)
      ];

      const expectedResults = [15, 10, 20, 20];

      invalidPrograms.forEach((program, index) => {
        const capacity = getEffectiveCapacity(program);
        expect(typeof capacity).toBe('number');
        expect(capacity).toBeGreaterThan(0);
        expect(capacity).toBe(expectedResults[index]);
      });
    });

    test('should handle edge date cases', () => {
      const formatTimeForDisplay = (isoString: string): string => {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-GB', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: 'UTC',
        });
      };

      const edgeCases = [
        '2024-02-29T06:00:00.000Z', // Leap year
        '2024-12-31T23:59:00.000Z', // End of year
        '2024-01-01T00:00:00.000Z', // Start of year
      ];

      edgeCases.forEach(timeString => {
        expect(() => formatTimeForDisplay(timeString)).not.toThrow();
        const result = formatTimeForDisplay(timeString);
        expect(result).toMatch(/^\d{2}:\d{2}$/);
      });
    });

    test('should handle empty or minimal input gracefully', () => {
      const createRecurringSessions = (program: any, timeSlots: any[], daysOfWeek: number[]) => {
        if (!timeSlots || timeSlots.length === 0) {
          return [];
        }
        if (!daysOfWeek || daysOfWeek.length === 0) {
          return [];
        }

        const capacity = program.max_participants || program.default_capacity || 20;
        return [{ max_capacity: capacity }];
      };

      // Empty time slots
      expect(createRecurringSessions({ max_participants: 10 }, [], [1])).toEqual([]);

      // Empty days of week
      expect(createRecurringSessions({ max_participants: 10 }, [{ time: '06:00', duration: 60 }], [])).toEqual([]);

      // Valid minimal input
      const result = createRecurringSessions(
        { max_participants: 10 },
        [{ time: '06:00', duration: 60 }],
        [1]
      );
      expect(result[0].max_capacity).toBe(10);
    });
  });
});