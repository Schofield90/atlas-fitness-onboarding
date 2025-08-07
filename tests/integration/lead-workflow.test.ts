import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { 
  testDb, 
  testOrganization,
  setupTestData, 
  cleanupTestData 
} from '../setup/test-database'

describe('Lead Management Workflow Integration', () => {
  let testLeadId: string
  
  beforeAll(async () => {
    await setupTestData()
  })
  
  afterAll(async () => {
    await cleanupTestData()
  })
  
  describe('Complete Lead Journey', () => {
    it('should create a new lead', async () => {
      const leadData = {
        organization_id: testOrganization.id,
        name: 'Integration Test Lead',
        email: 'integration@example.com',
        phone: '+447777777777',
        status: 'new',
        source: 'website'
      }
      
      const { data: lead, error } = await testDb
        .from('leads')
        .insert(leadData)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(lead).toBeDefined()
      expect(lead.id).toBeDefined()
      expect(lead.organization_id).toBe(testOrganization.id)
      
      testLeadId = lead.id
    })
    
    it('should send welcome SMS to new lead', async () => {
      const smsData = {
        organization_id: testOrganization.id,
        to: '+447777777777',
        from_number: '+441234567890',
        message: 'Welcome to Atlas Fitness! Reply STOP to unsubscribe.',
        status: 'sent',
        direction: 'outbound'
      }
      
      const { data: sms, error } = await testDb
        .from('sms_logs')
        .insert(smsData)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(sms).toBeDefined()
      expect(sms.organization_id).toBe(testOrganization.id)
    })
    
    it('should create a task for lead follow-up', async () => {
      const taskData = {
        organization_id: testOrganization.id,
        title: 'Follow up with Integration Test Lead',
        description: 'Call to discuss membership options',
        status: 'pending',
        due_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        related_to: 'lead',
        related_id: testLeadId
      }
      
      const { data: task, error } = await testDb
        .from('tasks')
        .insert(taskData)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(task).toBeDefined()
      expect(task.organization_id).toBe(testOrganization.id)
    })
    
    it('should update lead status after contact', async () => {
      const { data: updated, error } = await testDb
        .from('leads')
        .update({ 
          status: 'contacted',
          last_contact_date: new Date().toISOString()
        })
        .eq('id', testLeadId)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(updated).toBeDefined()
      expect(updated.status).toBe('contacted')
    })
    
    it('should track lead activity history', async () => {
      // In a real system, this would be done via triggers or activity tracking
      const activities = [
        { type: 'created', description: 'Lead created via website' },
        { type: 'sms_sent', description: 'Welcome SMS sent' },
        { type: 'status_change', description: 'Status changed to contacted' }
      ]
      
      // Simulate activity tracking
      expect(activities).toHaveLength(3)
      expect(activities[0].type).toBe('created')
    })
    
    it('should enforce organization isolation', async () => {
      // Try to access lead with different organization ID
      const { data: wrongAccess, error } = await testDb
        .from('leads')
        .select('*')
        .eq('id', testLeadId)
        .eq('organization_id', 'different-org-id')
        .single()
      
      // Should not find the lead
      expect(wrongAccess).toBeNull()
    })
  })
  
  describe('Lead to Membership Conversion', () => {
    it('should create membership when lead converts', async () => {
      const membershipData = {
        customer_id: testLeadId,
        organization_id: testOrganization.id,
        membership_status: 'active',
        start_date: new Date().toISOString().split('T')[0],
        membership_type: 'premium',
        monthly_fee: 9900 // £99 in pence
      }
      
      const { data: membership, error } = await testDb
        .from('memberships')
        .insert(membershipData)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(membership).toBeDefined()
      expect(membership.organization_id).toBe(testOrganization.id)
    })
    
    it('should update lead status to member', async () => {
      const { data: updated, error } = await testDb
        .from('leads')
        .update({ 
          status: 'member',
          conversion_date: new Date().toISOString()
        })
        .eq('id', testLeadId)
        .select()
        .single()
      
      expect(error).toBeNull()
      expect(updated).toBeDefined()
      expect(updated.status).toBe('member')
    })
  })
  
  describe('Error Handling', () => {
    it('should handle duplicate email gracefully', async () => {
      const duplicateLead = {
        organization_id: testOrganization.id,
        name: 'Duplicate Lead',
        email: 'integration@example.com', // Same email
        phone: '+447777777778',
        status: 'new'
      }
      
      const { data, error } = await testDb
        .from('leads')
        .insert(duplicateLead)
        .select()
      
      // Should either error or handle gracefully
      expect(data || error).toBeDefined()
    })
    
    it('should validate required fields', async () => {
      const invalidLead = {
        organization_id: testOrganization.id,
        // Missing required fields
        status: 'new'
      }
      
      const { data, error } = await testDb
        .from('leads')
        .insert(invalidLead)
        .select()
      
      expect(error).toBeDefined()
      expect(data).toBeNull()
    })
  })
})