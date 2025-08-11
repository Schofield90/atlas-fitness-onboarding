import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { 
  testDb, 
  testOrganization, 
  testUser, 
  testUser2,
  setupTestData, 
  cleanupTestData,
  createTestLead
} from '../setup/test-database'

describe('Organization Isolation Tests', () => {
  beforeAll(async () => {
    await setupTestData()
  })
  
  afterAll(async () => {
    await cleanupTestData()
  })
  
  describe('Row Level Security (RLS)', () => {
    it('should prevent cross-organization data access for leads', async () => {
      // Create a lead for test organization
      const lead = await createTestLead(testOrganization.id)
      
      // Try to access as user from different organization
      const { data, error } = await testDb
        .from('leads')
        .select('*')
        .eq('id', lead.id)
        .single()
      
      // Should not be able to access
      expect(data).toBeNull()
      expect(error).toBeDefined()
    })
    
    it('should allow access to own organization data', async () => {
      // Create a lead for test organization
      const lead = await createTestLead(testOrganization.id)
      
      // Access as user from same organization (simulated)
      const { data, error } = await testDb
        .from('leads')
        .select('*')
        .eq('id', lead.id)
        .eq('organization_id', testOrganization.id)
        .single()
      
      // Should be able to access
      expect(error).toBeNull()
      expect(data).toBeDefined()
      expect(data.id).toBe(lead.id)
    })
  })
  
  describe('Organization ID Columns', () => {
    const tablesToCheck = ['tasks', 'bookings', 'memberships', 'leads', 'sms_logs']
    
    tablesToCheck.forEach(table => {
      it(`${table} table should have organization_id column`, async () => {
        const { data, error } = await testDb
          .rpc('get_table_columns', { table_name: table })
        
        expect(error).toBeNull()
        expect(data).toBeDefined()
        
        const hasOrgId = data.some((col: any) => col.column_name === 'organization_id')
        expect(hasOrgId).toBe(true)
      })
      
      it(`${table} table should not allow NULL organization_id`, async () => {
        const { data, error } = await testDb
          .rpc('get_column_info', { 
            table_name: table,
            column_name: 'organization_id'
          })
        
        expect(error).toBeNull()
        expect(data).toBeDefined()
        expect(data.is_nullable).toBe('NO')
      })
    })
  })
  
  describe('Cross-Organization Access Prevention', () => {
    it('should prevent updating data from another organization', async () => {
      // Create a lead
      const lead = await createTestLead(testOrganization.id)
      
      // Try to update with different organization_id
      const { error } = await testDb
        .from('leads')
        .update({ name: 'Hacked Name' })
        .eq('id', lead.id)
        .eq('organization_id', 'different-org-456')
      
      // Should fail
      expect(error).toBeDefined()
      
      // Verify data wasn't changed
      const { data } = await testDb
        .from('leads')
        .select('name')
        .eq('id', lead.id)
        .single()
      
      expect(data?.name).toBe('Test Lead')
    })
    
    it('should prevent deleting data from another organization', async () => {
      // Create a lead
      const lead = await createTestLead(testOrganization.id)
      
      // Try to delete with different organization_id
      const { error } = await testDb
        .from('leads')
        .delete()
        .eq('id', lead.id)
        .eq('organization_id', 'different-org-456')
      
      // Should fail
      expect(error).toBeDefined()
      
      // Verify data still exists
      const { data } = await testDb
        .from('leads')
        .select('id')
        .eq('id', lead.id)
        .single()
      
      expect(data).toBeDefined()
    })
  })
  
  describe('Organization Access Validation Function', () => {
    it('should correctly validate organization access', async () => {
      // Create test data
      const lead = await createTestLead(testOrganization.id)
      
      // Test valid access
      const { data: validAccess } = await testDb
        .rpc('validate_organization_access', {
          p_user_id: testUser.id,
          p_resource_table: 'leads',
          p_resource_id: lead.id
        })
      
      expect(validAccess).toBe(true)
      
      // Test invalid access
      const { data: invalidAccess } = await testDb
        .rpc('validate_organization_access', {
          p_user_id: testUser2.id,
          p_resource_table: 'leads',
          p_resource_id: lead.id
        })
      
      expect(invalidAccess).toBe(false)
    })
  })
})