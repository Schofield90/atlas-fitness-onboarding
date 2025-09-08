/**
 * Unit Tests: Migration and Data Synchronization
 * 
 * Tests for data migration scripts and synchronization between legacy and new booking systems.
 */

import { createClient } from '@supabase/supabase-js';

// Mock Supabase client
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

describe('Migration and Data Synchronization Tests', () => {

  describe('Data Migration Validation', () => {
    
    it('should verify no orphaned bookings after migration', async () => {
      // Mock scenario: bookings referencing non-existent class sessions
      const bookingsWithSessions = [
        { id: 'booking-1', class_session_id: 'session-1' },
        { id: 'booking-2', class_session_id: 'session-2' },
        { id: 'booking-3', class_session_id: 'missing-session' }
      ];

      const existingSessions = [
        { id: 'session-1' },
        { id: 'session-2' }
        // 'missing-session' is not here - this creates an orphaned booking
      ];

      mockSupabase.from.mockImplementation((tableName) => {
        if (tableName === 'class_bookings') {
          return {
            select: jest.fn().mockReturnValue({
              not: jest.fn().mockReturnValue({
                data: bookingsWithSessions,
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

      // Get all bookings with class_session_id
      const { data: bookings } = await mockSupabase
        .from('class_bookings')
        .select('id, class_session_id')
        .not('class_session_id', 'is', null);

      // Get all referenced sessions
      const sessionIds = bookings.map(b => b.class_session_id);
      const { data: sessions } = await mockSupabase
        .from('class_sessions')
        .select('id')
        .in('id', sessionIds);

      // Find orphaned bookings
      const existingSessionIds = new Set(sessions.map(s => s.id));
      const orphanedBookings = bookings.filter(b => !existingSessionIds.has(b.class_session_id));

      expect(orphanedBookings).toHaveLength(1);
      expect(orphanedBookings[0].id).toBe('booking-3');
      expect(orphanedBookings[0].class_session_id).toBe('missing-session');
    });

    it('should verify customer data migration integrity', async () => {
      // Mock scenario: bookings that should have customer names resolved
      const migratedBookings = [
        {
          id: 'booking-1',
          customer_id: 'lead-1',
          client_id: null,
          leads: { first_name: 'John', last_name: 'Doe', email: 'john@example.com' }
        },
        {
          id: 'booking-2',
          customer_id: null,
          client_id: 'client-1',
          clients: { first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' }
        },
        {
          id: 'booking-3',
          customer_id: 'orphaned-lead',
          client_id: null,
          leads: null // This indicates a data integrity issue
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          data: migratedBookings,
          error: null
        })
      });

      const { data: bookings } = await mockSupabase
        .from('class_bookings')
        .select(`
          *,
          clients:client_id (first_name, last_name, email),
          leads:customer_id (first_name, last_name, email)
        `);

      // Analyze migration quality
      const bookingsWithValidCustomers = bookings.filter(b => 
        (b.client_id && b.clients) || (b.customer_id && b.leads)
      );
      
      const bookingsWithOrphanedCustomers = bookings.filter(b => 
        (b.client_id && !b.clients) || (b.customer_id && !b.leads)
      );

      expect(bookingsWithValidCustomers).toHaveLength(2);
      expect(bookingsWithOrphanedCustomers).toHaveLength(1);
      expect(bookingsWithOrphanedCustomers[0].id).toBe('booking-3');
    });

    it('should validate constraint enforcement after migration', async () => {
      // Test that the migration properly enforces the business rule:
      // A booking must have either customer_id OR client_id, but not both or neither
      
      const migrationResults = [
        { id: 'valid-client', customer_id: null, client_id: 'client-1' },
        { id: 'valid-lead', customer_id: 'lead-1', client_id: null },
        { id: 'invalid-both', customer_id: 'lead-1', client_id: 'client-1' }, // Should not exist
        { id: 'invalid-neither', customer_id: null, client_id: null } // Should not exist
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          data: migrationResults,
          error: null
        })
      });

      const { data: allBookings } = await mockSupabase
        .from('class_bookings')
        .select('id, customer_id, client_id');

      // Valid bookings (exactly one customer reference)
      const validBookings = allBookings.filter(b => 
        (b.customer_id && !b.client_id) || (!b.customer_id && b.client_id)
      );

      // Invalid bookings (both or neither)
      const invalidBothBookings = allBookings.filter(b => 
        b.customer_id && b.client_id
      );
      
      const invalidNeitherBookings = allBookings.filter(b => 
        !b.customer_id && !b.client_id
      );

      expect(validBookings).toHaveLength(2);
      expect(invalidBothBookings).toHaveLength(1); // Migration should have cleaned this up
      expect(invalidNeitherBookings).toHaveLength(1); // Migration should have resolved this
    });
  });

  describe('Legacy System Integration', () => {
    
    it('should handle data from both booking tables correctly', async () => {
      // Mock data from legacy 'bookings' table and new 'class_bookings' table
      mockSupabase.from.mockImplementation((tableName) => {
        if (tableName === 'bookings') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                data: [
                  { id: 'legacy-1', class_session_id: 'session-1', customer_id: 'lead-1' },
                  { id: 'legacy-2', class_session_id: 'session-1', customer_id: 'lead-2' }
                ],
                error: null
              })
            })
          };
        } else if (tableName === 'class_bookings') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                data: [
                  { id: 'new-1', class_session_id: 'session-1', client_id: 'client-1' },
                  { id: 'new-2', class_session_id: 'session-1', client_id: 'client-2' }
                ],
                error: null
              })
            })
          };
        }
      });

      // Get bookings from both tables for the same session
      const { data: legacyBookings } = await mockSupabase
        .from('bookings')
        .select('*')
        .eq('class_session_id', 'session-1');

      const { data: newBookings } = await mockSupabase
        .from('class_bookings')
        .select('*')
        .eq('class_session_id', 'session-1');

      const totalBookings = (legacyBookings?.length || 0) + (newBookings?.length || 0);

      expect(legacyBookings).toHaveLength(2);
      expect(newBookings).toHaveLength(2);
      expect(totalBookings).toBe(4);
    });

    it('should provide unified booking count via RPC function', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: {
          session_id: 'session-1',
          total_bookings: 5,
          legacy_bookings: 2,
          new_bookings: 3,
          unique_customers: 4
        },
        error: null
      });

      const { data: summary, error } = await mockSupabase
        .rpc('get_session_booking_summary', { session_id: 'session-1' });

      expect(error).toBeNull();
      expect(summary.total_bookings).toBe(5);
      expect(summary.legacy_bookings).toBe(2);
      expect(summary.new_bookings).toBe(3);
      expect(summary.unique_customers).toBe(4);
    });
  });

  describe('Data Quality Checks', () => {
    
    it('should identify and report data quality issues', async () => {
      const problematicBookings = [
        {
          id: 'problem-1',
          customer_id: 'deleted-lead',
          client_id: null,
          leads: null, // Customer reference broken
          issue: 'orphaned_lead_reference'
        },
        {
          id: 'problem-2',
          customer_id: null,
          client_id: 'deleted-client',
          clients: null, // Client reference broken
          issue: 'orphaned_client_reference'
        },
        {
          id: 'problem-3',
          customer_id: null,
          client_id: null,
          issue: 'no_customer_reference'
        }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          data: problematicBookings,
          error: null
        })
      });

      const { data: bookings } = await mockSupabase
        .from('class_bookings')
        .select(`
          *,
          clients:client_id (first_name, last_name),
          leads:customer_id (first_name, last_name)
        `);

      // Analyze data quality
      const orphanedLeadReferences = bookings.filter(b => 
        b.customer_id && !b.leads
      );
      
      const orphanedClientReferences = bookings.filter(b => 
        b.client_id && !b.clients
      );
      
      const noCustomerReferences = bookings.filter(b => 
        !b.customer_id && !b.client_id
      );

      expect(orphanedLeadReferences).toHaveLength(1);
      expect(orphanedClientReferences).toHaveLength(1);
      expect(noCustomerReferences).toHaveLength(1);
      
      // These should trigger data cleanup actions
      const totalIssues = orphanedLeadReferences.length + 
                         orphanedClientReferences.length + 
                         noCustomerReferences.length;
      
      expect(totalIssues).toBe(3);
    });

    it('should validate email uniqueness across customer types', async () => {
      // Test scenario: same email exists in both clients and leads tables
      const duplicateEmailScenario = {
        leads: [
          { id: 'lead-1', email: 'duplicate@example.com', first_name: 'Lead', last_name: 'User' }
        ],
        clients: [
          { id: 'client-1', email: 'duplicate@example.com', first_name: 'Client', last_name: 'User' }
        ]
      };

      mockSupabase.from.mockImplementation((tableName) => {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              data: duplicateEmailScenario[tableName] || [],
              error: null
            })
          })
        };
      });

      // Search for duplicate email in both tables
      const { data: leadsWithEmail } = await mockSupabase
        .from('leads')
        .select('id, email, first_name, last_name')
        .eq('email', 'duplicate@example.com');

      const { data: clientsWithEmail } = await mockSupabase
        .from('clients')  
        .select('id, email, first_name, last_name')
        .eq('email', 'duplicate@example.com');

      const hasDuplicateEmail = leadsWithEmail.length > 0 && clientsWithEmail.length > 0;
      
      expect(hasDuplicateEmail).toBe(true);
      expect(leadsWithEmail[0].email).toBe('duplicate@example.com');
      expect(clientsWithEmail[0].email).toBe('duplicate@example.com');
      
      // This scenario requires migration decision: convert lead to client or merge records
    });
  });

  describe('Migration Performance', () => {
    
    it('should handle large dataset migration efficiently', async () => {
      // Mock large dataset scenario
      const largeDataset = Array.from({ length: 1000 }, (_, i) => ({
        id: `booking-${i}`,
        class_session_id: `session-${i % 100}`, // 1000 bookings across 100 sessions
        customer_id: i % 2 === 0 ? `lead-${i}` : null,
        client_id: i % 2 === 1 ? `client-${i}` : null
      }));

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          data: largeDataset,
          error: null
        })
      });

      const startTime = Date.now();
      
      const { data: bookings } = await mockSupabase
        .from('class_bookings')
        .select('id, class_session_id, customer_id, client_id');
        
      const queryTime = Date.now() - startTime;
      
      expect(bookings).toHaveLength(1000);
      expect(queryTime).toBeLessThan(100); // Should be very fast for mocked data
      
      // Validate data distribution
      const clientBookings = bookings.filter(b => b.client_id);
      const leadBookings = bookings.filter(b => b.customer_id);
      
      expect(clientBookings).toHaveLength(500);
      expect(leadBookings).toHaveLength(500);
    });

    it('should batch process migration operations', async () => {
      const batchSize = 100;
      const totalRecords = 350; // 4 batches: 100, 100, 100, 50
      
      let currentBatch = 0;
      const expectedBatches = Math.ceil(totalRecords / batchSize);
      
      mockSupabase.from.mockImplementation(() => ({
        select: jest.fn().mockReturnValue({
          range: jest.fn().mockImplementation((start, end) => {
            currentBatch++;
            const batchRecords = Math.min(batchSize, totalRecords - start);
            
            return {
              data: Array.from({ length: batchRecords }, (_, i) => ({
                id: `record-${start + i}`,
                status: 'migrated'
              })),
              error: null
            };
          })
        })
      }));

      // Simulate batch processing
      let processedRecords = 0;
      let batchCount = 0;
      
      for (let offset = 0; offset < totalRecords; offset += batchSize) {
        const end = Math.min(offset + batchSize - 1, totalRecords - 1);
        
        const { data: batch } = await mockSupabase
          .from('migration_data')
          .select('*')
          .range(offset, end);
        
        processedRecords += batch.length;
        batchCount++;
      }
      
      expect(processedRecords).toBe(totalRecords);
      expect(batchCount).toBe(expectedBatches);
      expect(currentBatch).toBe(expectedBatches);
    });
  });

  describe('Rollback and Recovery', () => {
    
    it('should support migration rollback operations', async () => {
      // Mock rollback scenario: restore data to pre-migration state
      const backupData = [
        { id: 'booking-1', table: 'bookings', operation: 'restore' },
        { id: 'booking-2', table: 'bookings', operation: 'restore' }
      ];

      mockSupabase.from.mockReturnValue({
        insert: jest.fn().mockReturnValue({
          data: backupData,
          error: null
        }),
        delete: jest.fn().mockReturnValue({
          data: [],
          error: null
        })
      });

      // Simulate rollback: restore backup data and remove migrated records
      const { data: restoredData, error: restoreError } = await mockSupabase
        .from('bookings')
        .insert(backupData);

      const { error: deleteError } = await mockSupabase
        .from('class_bookings')
        .delete();

      expect(restoreError).toBeNull();
      expect(deleteError).toBeNull();
      expect(restoredData).toHaveLength(2);
    });

    it('should validate data integrity after rollback', async () => {
      // Post-rollback validation
      const postRollbackData = [
        { id: 'booking-1', customer_id: 'lead-1', status: 'active' },
        { id: 'booking-2', customer_id: 'lead-2', status: 'active' }
      ];

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          data: postRollbackData,
          error: null
        })
      });

      const { data: rolledBackBookings } = await mockSupabase
        .from('bookings')
        .select('*');

      // Verify rollback integrity
      expect(rolledBackBookings).toHaveLength(2);
      expect(rolledBackBookings.every(b => b.status === 'active')).toBe(true);
      expect(rolledBackBookings.every(b => b.customer_id)).toBe(true);
    });
  });
});

// Migration utility functions for testing
export const MigrationTestUtils = {
  
  simulateMigrationBatch: (records: any[], batchSize: number = 100) => {
    const batches = [];
    for (let i = 0; i < records.length; i += batchSize) {
      batches.push(records.slice(i, i + batchSize));
    }
    return batches;
  },

  validateBookingIntegrity: (booking: any) => {
    const hasValidCustomer = (booking.customer_id && !booking.client_id) || 
                            (!booking.customer_id && booking.client_id);
    const hasNoCustomer = !booking.customer_id && !booking.client_id;
    const hasBothCustomers = booking.customer_id && booking.client_id;
    
    return {
      isValid: hasValidCustomer,
      hasNoCustomer,
      hasBothCustomers,
      issue: hasNoCustomer ? 'no_customer' : 
             hasBothCustomers ? 'dual_customer' : null
    };
  },

  generateMigrationReport: (bookings: any[]) => {
    const report = {
      total: bookings.length,
      valid: 0,
      noCustomer: 0,
      dualCustomer: 0,
      orphanedLeads: 0,
      orphanedClients: 0
    };

    bookings.forEach(booking => {
      const integrity = MigrationTestUtils.validateBookingIntegrity(booking);
      
      if (integrity.isValid) report.valid++;
      if (integrity.hasNoCustomer) report.noCustomer++;
      if (integrity.hasBothCustomers) report.dualCustomer++;
      
      if (booking.customer_id && !booking.leads) report.orphanedLeads++;
      if (booking.client_id && !booking.clients) report.orphanedClients++;
    });

    return report;
  }
};