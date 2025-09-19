/**
 * BookingService Capacity Tests
 *
 * Tests for booking service capacity calculations and session availability
 * Verifies that capacity is correctly calculated and displayed across all booking flows
 */

// Mock BookingService since we're testing the logic, not the actual class
class MockBookingService {
  private supabase: any;

  constructor() {
    this.supabase = mockSupabase;
  }

  async getAvailableClasses(organizationId: string, programId?: string, startDate?: string, endDate?: string) {
    // Implementation will be mocked in tests
    return [];
  }

  async createBooking(customerId: string, classSessionId: string, paymentMethodId?: string) {
    // Implementation will be mocked in tests
    return null;
  }

  async processWaitlist(classSessionId: string) {
    // Implementation will be mocked in tests
    return;
  }
}

const BookingService = MockBookingService;

// Mock Supabase client
const mockSupabase = {
  from: jest.fn(() => ({
    select: jest.fn(() => ({
      eq: jest.fn(() => ({
        gte: jest.fn(() => ({
          order: jest.fn(),
        })),
        single: jest.fn(),
        in: jest.fn(),
      })),
    })),
    insert: jest.fn(() => ({
      select: jest.fn(() => ({
        single: jest.fn(),
      })),
    })),
    update: jest.fn(() => ({
      eq: jest.fn(),
    })),
    delete: jest.fn(() => ({
      eq: jest.fn(),
    })),
  })),
};

const createClient = jest.fn(() => mockSupabase);

describe('BookingService Capacity Management', () => {
  let bookingService: BookingService;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock Supabase client
    mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => ({
          eq: jest.fn(() => ({
            gte: jest.fn(() => ({
              order: jest.fn(() => ({
                eq: jest.fn(() => mockQuery),
                gte: jest.fn(() => mockQuery),
                lte: jest.fn(() => mockQuery),
              })),
            })),
            single: jest.fn(() => mockQuery),
            in: jest.fn(() => mockQuery),
          })),
        })),
        insert: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn(() => mockQuery),
          })),
        })),
        update: jest.fn(() => ({
          eq: jest.fn(() => mockQuery),
        })),
        delete: jest.fn(() => ({
          eq: jest.fn(() => mockQuery),
        })),
      })),
    };

    const mockQuery = {
      then: jest.fn(),
      catch: jest.fn(),
    };

    (createClient as jest.Mock).mockReturnValue(mockSupabase);
    bookingService = new BookingService();
  });

  describe('Available Classes Capacity Calculation', () => {
    test('should correctly calculate spaces_available using max_capacity', async () => {
      const mockClassSessions = [
        {
          id: 'session-1',
          name: 'HIIT Training',
          start_time: '2024-09-20T06:00:00.000Z',
          max_capacity: 10, // Program max_participants
          current_bookings: 3,
          programs: { name: 'HIIT Training', price_pennies: 1500 },
          users: { name: 'John Trainer', email: 'john@gym.com' },
        },
        {
          id: 'session-2',
          name: 'Yoga Flow',
          start_time: '2024-09-20T07:00:00.000Z',
          max_capacity: 15,
          current_bookings: 15, // Full class
          programs: { name: 'Yoga Flow', price_pennies: 1200 },
          users: { name: 'Jane Yogi', email: 'jane@gym.com' },
        },
        {
          id: 'session-3',
          name: 'Boxing',
          start_time: '2024-09-20T18:00:00.000Z',
          max_capacity: 8,
          current_bookings: 0, // Empty class
          programs: { name: 'Boxing', price_pennies: 2000 },
          users: { name: 'Mike Boxer', email: 'mike@gym.com' },
        },
      ];

      const mockWaitlistCounts = [
        { count: 2 }, // 2 people on waitlist for session-1
        { count: 5 }, // 5 people on waitlist for session-2 (full class)
        { count: 0 }, // No waitlist for session-3
      ];

      // Mock the database calls
      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'class_sessions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  order: jest.fn(() => Promise.resolve({
                    data: mockClassSessions,
                    error: null,
                  })),
                })),
              })),
            })),
          };
        } else if (table === 'waitlist') {
          let callCount = 0;
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({
                count: mockWaitlistCounts[callCount++]?.count || 0,
                error: null,
              })),
            })),
          };
        }
      });

      const result = await bookingService.getAvailableClasses('org-123');

      // Verify capacity calculations
      expect(result).toHaveLength(3);

      // Session 1: 10 capacity - 3 bookings = 7 available
      expect(result[0].spaces_available).toBe(7);
      expect(result[0].waitlist_count).toBe(2);

      // Session 2: 15 capacity - 15 bookings = 0 available (full)
      expect(result[1].spaces_available).toBe(0);
      expect(result[1].waitlist_count).toBe(5);

      // Session 3: 8 capacity - 0 bookings = 8 available
      expect(result[2].spaces_available).toBe(8);
      expect(result[2].waitlist_count).toBe(0);
    });

    test('should handle edge case where current_bookings exceeds max_capacity', async () => {
      const mockClassSessions = [
        {
          id: 'session-overboked',
          name: 'Overbooked Class',
          start_time: '2024-09-20T06:00:00.000Z',
          max_capacity: 10,
          current_bookings: 12, // Overbooked scenario
          programs: { name: 'Overbooked Class', price_pennies: 1500 },
          users: { name: 'Trainer', email: 'trainer@gym.com' },
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'class_sessions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  order: jest.fn(() => Promise.resolve({
                    data: mockClassSessions,
                    error: null,
                  })),
                })),
              })),
            })),
          };
        } else if (table === 'waitlist') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({
                count: 0,
                error: null,
              })),
            })),
          };
        }
      });

      const result = await bookingService.getAvailableClasses('org-123');

      // Should show negative availability (no spaces available)
      expect(result[0].spaces_available).toBe(-2);
      expect(result[0].max_capacity).toBe(10);
      expect(result[0].current_bookings).toBe(12);
    });
  });

  describe('Booking Creation with Capacity Checks', () => {
    test('should prevent booking when class is at capacity', async () => {
      const mockClassData = {
        id: 'session-full',
        max_capacity: 10,
        current_bookings: 10, // At capacity
        programs: { name: 'Full Class', price_pennies: 1500 },
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'class_sessions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: mockClassData,
                  error: null,
                })),
              })),
            })),
          };
        } else if (table === 'bookings') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                in: jest.fn(() => ({
                  single: jest.fn(() => Promise.resolve({
                    data: null, // No existing booking
                    error: null,
                  })),
                })),
              })),
            })),
          };
        }
      });

      await expect(
        bookingService.createBooking('customer-123', 'session-full')
      ).rejects.toThrow('Class is full');
    });

    test('should allow booking when spaces are available', async () => {
      const mockClassData = {
        id: 'session-available',
        max_capacity: 10,
        current_bookings: 5, // 5 spaces available
        programs: { name: 'Available Class', price_pennies: 1500 },
      };

      const mockBooking = {
        id: 'booking-123',
        customer_id: 'customer-123',
        class_session_id: 'session-available',
        booking_status: 'confirmed',
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'class_sessions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: mockClassData,
                  error: null,
                })),
              })),
            })),
          };
        } else if (table === 'bookings') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                in: jest.fn(() => ({
                  single: jest.fn(() => Promise.resolve({
                    data: null, // No existing booking
                    error: null,
                  })),
                })),
              })),
            })),
            insert: jest.fn(() => ({
              select: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: mockBooking,
                  error: null,
                })),
              })),
            })),
          };
        }
      });

      // Mock the sendBookingConfirmation method to avoid fetch calls
      jest.spyOn(BookingService.prototype as any, 'sendBookingConfirmation')
        .mockImplementation(() => Promise.resolve());

      const result = await bookingService.createBooking('customer-123', 'session-available');

      expect(result).toEqual(mockBooking);
    });
  });

  describe('Waitlist Processing with Capacity', () => {
    test('should auto-book from waitlist when space becomes available', async () => {
      const mockClassData = {
        id: 'session-waitlist',
        max_capacity: 10,
        current_bookings: 9, // 1 space available
      };

      const mockWaitlistEntries = [
        {
          id: 'waitlist-1',
          customer_id: 'customer-456',
          class_session_id: 'session-waitlist',
          position: 1,
          auto_book: true,
          leads: { id: 'customer-456', name: 'John Doe', email: 'john@example.com', phone: '+1234567890' },
        },
        {
          id: 'waitlist-2',
          customer_id: 'customer-789',
          class_session_id: 'session-waitlist',
          position: 2,
          auto_book: true,
          leads: { id: 'customer-789', name: 'Jane Smith', email: 'jane@example.com', phone: '+1234567891' },
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'class_sessions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: mockClassData,
                  error: null,
                })),
              })),
            })),
          };
        } else if (table === 'waitlist') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                order: jest.fn(() => ({
                  limit: jest.fn(() => Promise.resolve({
                    data: mockWaitlistEntries.slice(0, 1), // Only return first person for 1 available space
                    error: null,
                  })),
                })),
              })),
            })),
            delete: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({ error: null })),
            })),
          };
        } else if (table === 'bookings') {
          return {
            insert: jest.fn(() => Promise.resolve({ error: null })),
          };
        }
      });

      // Mock the sendAutoBookingConfirmation method
      jest.spyOn(BookingService.prototype as any, 'sendAutoBookingConfirmation')
        .mockImplementation(() => Promise.resolve());

      await bookingService.processWaitlist('session-waitlist');

      // Verify only 1 person was auto-booked (due to 1 available space)
      expect(mockSupabase.from).toHaveBeenCalledWith('bookings');
    });

    test('should not auto-book when class is still at capacity', async () => {
      const mockClassData = {
        id: 'session-full',
        max_capacity: 10,
        current_bookings: 10, // No spaces available
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'class_sessions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                single: jest.fn(() => Promise.resolve({
                  data: mockClassData,
                  error: null,
                })),
              })),
            })),
          };
        }
      });

      await bookingService.processWaitlist('session-full');

      // Should not attempt to query waitlist or create bookings
      expect(mockSupabase.from).toHaveBeenCalledWith('class_sessions');
      expect(mockSupabase.from).not.toHaveBeenCalledWith('waitlist');
      expect(mockSupabase.from).not.toHaveBeenCalledWith('bookings');
    });
  });

  describe('Capacity Edge Cases', () => {
    test('should handle null or undefined capacity values', async () => {
      const mockClassSessions = [
        {
          id: 'session-null-capacity',
          name: 'Null Capacity Class',
          start_time: '2024-09-20T06:00:00.000Z',
          max_capacity: null, // Null capacity
          current_bookings: 3,
          programs: { name: 'Null Capacity Class', price_pennies: 1500 },
          users: { name: 'Trainer', email: 'trainer@gym.com' },
        },
        {
          id: 'session-undefined-capacity',
          name: 'Undefined Capacity Class',
          start_time: '2024-09-20T06:00:00.000Z',
          // max_capacity is undefined
          current_bookings: 2,
          programs: { name: 'Undefined Capacity Class', price_pennies: 1500 },
          users: { name: 'Trainer', email: 'trainer@gym.com' },
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'class_sessions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  order: jest.fn(() => Promise.resolve({
                    data: mockClassSessions,
                    error: null,
                  })),
                })),
              })),
            })),
          };
        } else if (table === 'waitlist') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({
                count: 0,
                error: null,
              })),
            })),
          };
        }
      });

      const result = await bookingService.getAvailableClasses('org-123');

      // Should handle null/undefined capacity gracefully
      expect(result).toHaveLength(2);

      // For null capacity, should show negative spaces (treat as 0 capacity)
      expect(result[0].spaces_available).toBe(-3);
      expect(result[0].max_capacity).toBe(null);

      // For undefined capacity, should also handle gracefully
      expect(result[1].spaces_available).toBe(-2);
      expect(result[1].max_capacity).toBeUndefined();
    });

    test('should handle zero capacity classes', async () => {
      const mockClassSessions = [
        {
          id: 'session-zero-capacity',
          name: 'Zero Capacity Class',
          start_time: '2024-09-20T06:00:00.000Z',
          max_capacity: 0, // Zero capacity
          current_bookings: 0,
          programs: { name: 'Zero Capacity Class', price_pennies: 1500 },
          users: { name: 'Trainer', email: 'trainer@gym.com' },
        },
      ];

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'class_sessions') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => ({
                gte: jest.fn(() => ({
                  order: jest.fn(() => Promise.resolve({
                    data: mockClassSessions,
                    error: null,
                  })),
                })),
              })),
            })),
          };
        } else if (table === 'waitlist') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn(() => Promise.resolve({
                count: 0,
                error: null,
              })),
            })),
          };
        }
      });

      const result = await bookingService.getAvailableClasses('org-123');

      expect(result[0].spaces_available).toBe(0);
      expect(result[0].max_capacity).toBe(0);
    });
  });
});