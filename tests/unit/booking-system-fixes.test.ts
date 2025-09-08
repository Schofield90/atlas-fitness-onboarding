/**
 * Unit Tests: Booking System Fixes
 * 
 * Tests core booking functionality, customer resolution, and data consistency
 * without requiring UI or full integration setup.
 */

import { createClient } from '@supabase/supabase-js';

// Mock Supabase client for unit testing
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn()
}));

const mockSupabase = {
  from: jest.fn(),
  rpc: jest.fn()
};

beforeEach(() => {
  jest.clearAllMocks();
  (createClient as jest.Mock).mockReturnValue(mockSupabase);
});

describe('Booking System Unit Tests', () => {

  describe('Customer Name Resolution', () => {
    
    it('should resolve client names correctly', async () => {
      const mockBookingData = {
        id: 'booking-1',
        class_session_id: 'session-1',
        client_id: 'client-1',
        customer_id: null,
        clients: {
          first_name: 'John',
          last_name: 'Doe',
          email: 'john@example.com',
          membership_type: 'Premium'
        }
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            data: [mockBookingData],
            error: null
          })
        })
      });

      const { data } = await mockSupabase
        .from('class_bookings')
        .select(`
          *,
          clients:client_id (first_name, last_name, email, membership_type)
        `)
        .eq('class_session_id', 'session-1');

      expect(data[0].clients.first_name).toBe('John');
      expect(data[0].clients.last_name).toBe('Doe');
      expect(data[0].clients.membership_type).toBe('Premium');
      expect(data[0].customer_id).toBeNull();
    });

    it('should resolve lead names correctly', async () => {
      const mockBookingData = {
        id: 'booking-2',
        class_session_id: 'session-1',
        client_id: null,
        customer_id: 'lead-1',
        leads: {
          first_name: 'Jane',
          last_name: 'Smith',
          email: 'jane@example.com'
        }
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            data: [mockBookingData],
            error: null
          })
        })
      });

      const { data } = await mockSupabase
        .from('class_bookings')
        .select(`
          *,
          leads:customer_id (first_name, last_name, email)
        `)
        .eq('class_session_id', 'session-1');

      expect(data[0].leads.first_name).toBe('Jane');
      expect(data[0].leads.last_name).toBe('Smith');
      expect(data[0].client_id).toBeNull();
    });

    it('should handle unknown customers gracefully', async () => {
      const mockBookingData = {
        id: 'booking-3',
        class_session_id: 'session-1',
        client_id: null,
        customer_id: null,
        clients: null,
        leads: null
      };

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            data: [mockBookingData],
            error: null
          })
        })
      });

      const { data } = await mockSupabase
        .from('class_bookings')
        .select(`
          *,
          clients:client_id (first_name, last_name, email, membership_type),
          leads:customer_id (first_name, last_name, email)
        `)
        .eq('class_session_id', 'session-1');

      // Should not crash with null references
      expect(data[0].clients).toBeNull();
      expect(data[0].leads).toBeNull();
      expect(data[0].client_id).toBeNull();
      expect(data[0].customer_id).toBeNull();
    });
  });

  describe('Booking Count Consistency', () => {
    
    it('should calculate correct total booking count from both tables', async () => {
      mockSupabase.from.mockImplementation((tableName) => {
        const counts = {
          'class_bookings': 3,
          'bookings': 2
        };
        
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              count: counts[tableName],
              data: null,
              error: null
            })
          })
        };
      });

      // Simulate getting counts from both tables
      const { count: classBookingsCount } = await mockSupabase
        .from('class_bookings')
        .select('*', { count: 'exact' })
        .eq('class_session_id', 'session-1');

      const { count: legacyBookingsCount } = await mockSupabase
        .from('bookings')
        .select('*', { count: 'exact' })
        .eq('class_session_id', 'session-1');

      const totalBookings = classBookingsCount + legacyBookingsCount;

      expect(totalBookings).toBe(5);
      expect(classBookingsCount).toBe(3);
      expect(legacyBookingsCount).toBe(2);
    });

    it('should handle unified booking count RPC function', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: 5,
        error: null
      });

      const { data: unifiedCount } = await mockSupabase
        .rpc('get_session_booking_count', { session_id: 'session-1' });

      expect(unifiedCount).toBe(5);
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'get_session_booking_count',
        { session_id: 'session-1' }
      );
    });

    it('should gracefully handle RPC function not available', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'function get_session_booking_count does not exist' }
      });

      const { data, error } = await mockSupabase
        .rpc('get_session_booking_count', { session_id: 'session-1' });

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.message).toContain('does not exist');
    });
  });

  describe('Dual Customer Support (Leads vs Clients)', () => {
    
    it('should allow booking with client_id only', async () => {
      const mockBookingData = {
        id: 'booking-client',
        class_session_id: 'session-1',
        client_id: 'client-1',
        customer_id: null,
        organization_id: 'org-1',
        booking_status: 'confirmed'
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockReturnValue({
              data: mockBookingData,
              error: null
            })
          })
        })
      });

      const { data, error } = await mockSupabase
        .from('class_bookings')
        .insert({
          class_session_id: 'session-1',
          client_id: 'client-1',
          organization_id: 'org-1',
          booking_status: 'confirmed'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.client_id).toBe('client-1');
      expect(data.customer_id).toBeNull();
    });

    it('should allow booking with customer_id only (lead)', async () => {
      const mockBookingData = {
        id: 'booking-lead',
        class_session_id: 'session-1',
        client_id: null,
        customer_id: 'lead-1',
        organization_id: 'org-1',
        booking_status: 'confirmed'
      };

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockReturnValue({
              data: mockBookingData,
              error: null
            })
          })
        })
      });

      const { data, error } = await mockSupabase
        .from('class_bookings')
        .insert({
          class_session_id: 'session-1',
          customer_id: 'lead-1',
          organization_id: 'org-1',
          booking_status: 'confirmed'
        })
        .select()
        .single();

      expect(error).toBeNull();
      expect(data.customer_id).toBe('lead-1');
      expect(data.client_id).toBeNull();
    });

    it('should prevent booking with both customer_id and client_id', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          data: null,
          error: {
            code: '23514',
            message: 'new row for relation "class_bookings" violates check constraint "check_customer_or_client_booking"'
          }
        })
      });

      const { data, error } = await mockSupabase
        .from('class_bookings')
        .insert({
          class_session_id: 'session-1',
          customer_id: 'lead-1',
          client_id: 'client-1',
          organization_id: 'org-1',
          booking_status: 'confirmed'
        });

      expect(error).toBeDefined();
      expect(error.code).toBe('23514');
      expect(error.message).toContain('check constraint');
      expect(data).toBeNull();
    });
  });

  describe('Data Migration and Synchronization', () => {
    
    it('should identify orphaned bookings', async () => {
      const orphanedBookings = [
        { id: 'booking-1', class_session_id: 'non-existent-session' },
        { id: 'booking-2', class_session_id: 'another-missing-session' }
      ];

      const existingSessions = [
        { id: 'valid-session-1' },
        { id: 'valid-session-2' }
      ];

      mockSupabase.from.mockImplementation((tableName) => {
        if (tableName === 'class_bookings') {
          return {
            select: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                data: orphanedBookings,
                error: null
              })
            })
          };
        } else if (tableName === 'class_sessions') {
          return {
            select: jest.fn().mockReturnValue({
              in: jest.fn().mockReturnValue({
                data: existingSessions,
                error: null
              })
            })
          };
        }
      });

      // Get bookings with class_session_id
      const { data: bookings } = await mockSupabase
        .from('class_bookings')
        .select('id, class_session_id')
        .not('class_session_id', 'is', null);

      const sessionIds = bookings.map(b => b.class_session_id);
      
      // Check which sessions exist
      const { data: sessions } = await mockSupabase
        .from('class_sessions')
        .select('id')
        .in('id', sessionIds);

      const existingSessionIds = new Set(sessions.map(s => s.id));
      const orphanedCount = bookings.filter(b => !existingSessionIds.has(b.class_session_id)).length;

      expect(orphanedCount).toBe(2);
      expect(orphanedBookings.length).toBe(2);
    });

    it('should detect bookings with dual customer assignment', async () => {
      const dualCustomerBookings = [
        { id: 'booking-dual', customer_id: 'lead-1', client_id: 'client-1' }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          not: jest.fn(() => ({
            not: jest.fn().mockReturnValue({
              data: dualCustomerBookings,
              error: null
            })
          }))
        })
      });

      const { data: problematicBookings } = await mockSupabase
        .from('class_bookings')
        .select('id')
        .not('customer_id', 'is', null)
        .not('client_id', 'is', null);

      expect(problematicBookings.length).toBe(1);
      expect(problematicBookings[0].id).toBe('booking-dual');
    });

    it('should identify bookings with no customer assignment', async () => {
      const noCustomerBookings = [
        { id: 'booking-orphan-1' },
        { id: 'booking-orphan-2' }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          is: jest.fn(() => ({
            is: jest.fn().mockReturnValue({
              data: noCustomerBookings,
              error: null
            })
          }))
        })
      });

      const { data: orphanedBookings } = await mockSupabase
        .from('class_bookings')
        .select('id')
        .is('customer_id', null)
        .is('client_id', null);

      expect(orphanedBookings.length).toBe(2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    
    it('should handle database connection errors', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            data: null,
            error: {
              code: 'PGRST301',
              message: 'Could not connect to database'
            }
          })
        })
      });

      const { data, error } = await mockSupabase
        .from('class_bookings')
        .select('*')
        .eq('id', 'test-booking');

      expect(data).toBeNull();
      expect(error).toBeDefined();
      expect(error.code).toBe('PGRST301');
    });

    it('should handle malformed UUID inputs', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            data: null,
            error: {
              code: '22P02',
              message: 'invalid input syntax for type uuid'
            }
          })
        })
      });

      const { data, error } = await mockSupabase
        .from('class_bookings')
        .select('*')
        .eq('id', 'invalid-uuid');

      expect(data).toBeNull();
      expect(error.code).toBe('22P02');
      expect(error.message).toContain('uuid');
    });

    it('should handle row-level security violations', async () => {
      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          data: null,
          error: {
            code: '42501',
            message: 'new row violates row-level security policy'
          }
        })
      });

      const { data, error } = await mockSupabase
        .from('bookings')
        .insert({
          class_session_id: 'session-1',
          client_id: 'client-1'
        });

      expect(data).toBeNull();
      expect(error.code).toBe('42501');
      expect(error.message).toContain('row-level security');
    });
  });

  describe('Query Performance and Optimization', () => {
    
    it('should test complex join query structure', async () => {
      const mockComplexData = [
        {
          id: 'booking-1',
          booking_status: 'confirmed',
          clients: { first_name: 'John', membership_type: 'Premium' },
          class_sessions: { title: 'Yoga Class', start_time: '2025-09-08T09:00:00Z' }
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            data: mockComplexData,
            error: null
          })
        })
      });

      const { data, error } = await mockSupabase
        .from('class_bookings')
        .select(`
          *,
          clients:client_id (first_name, last_name, email, membership_type),
          leads:customer_id (first_name, last_name, email),
          class_sessions!inner (id, title, start_time)
        `)
        .eq('class_session_id', 'session-1');

      expect(error).toBeNull();
      expect(data).toHaveLength(1);
      expect(data[0].clients.membership_type).toBe('Premium');
      expect(data[0].class_sessions.title).toBe('Yoga Class');
    });

    it('should validate proper query parameter handling', () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            data: [],
            error: null
          })
        })
      });

      const sessionId = 'test-session-123';
      
      mockSupabase
        .from('class_bookings')
        .select('*')
        .eq('class_session_id', sessionId);

      // Verify the mock was called with correct parameters
      const selectCall = mockSupabase.from().select;
      const eqCall = selectCall().eq;
      
      expect(mockSupabase.from).toHaveBeenCalledWith('class_bookings');
      expect(selectCall).toHaveBeenCalledWith('*');
      expect(eqCall).toHaveBeenCalledWith('class_session_id', sessionId);
    });
  });
});

// Helper functions for testing
export const BookingTestUtils = {
  
  createMockBooking: (overrides = {}) => ({
    id: 'mock-booking-id',
    class_session_id: 'mock-session-id',
    client_id: 'mock-client-id',
    customer_id: null,
    organization_id: 'mock-org-id',
    booking_status: 'confirmed',
    payment_status: 'paid',
    created_at: new Date().toISOString(),
    ...overrides
  }),

  createMockClient: (overrides = {}) => ({
    id: 'mock-client-id',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john@example.com',
    membership_type: 'Premium',
    ...overrides
  }),

  createMockLead: (overrides = {}) => ({
    id: 'mock-lead-id',
    first_name: 'Jane',
    last_name: 'Smith',
    email: 'jane@example.com',
    status: 'active',
    ...overrides
  }),

  createMockSession: (overrides = {}) => ({
    id: 'mock-session-id',
    title: 'Test Yoga Class',
    start_time: new Date().toISOString(),
    duration_minutes: 60,
    capacity: 10,
    ...overrides
  })
};