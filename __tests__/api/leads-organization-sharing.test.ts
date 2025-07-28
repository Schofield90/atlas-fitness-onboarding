/**
 * Test Suite: Organization-based Lead Sharing
 * 
 * These tests verify that leads are properly shared within an organization
 * while maintaining isolation between different organizations.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'
import { createClient } from '@supabase/supabase-js'

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Test data
const testOrg = {
  id: 'test-org-' + Date.now(),
  name: 'Test Gym Organization'
}

const testUsers = [
  {
    id: 'user1-' + Date.now(),
    email: `staff1-${Date.now()}@testgym.com`,
    password: 'TestPass123!',
    name: 'Staff Member 1',
    role: 'staff'
  },
  {
    id: 'user2-' + Date.now(),
    email: `manager-${Date.now()}@testgym.com`,
    password: 'TestPass123!',
    name: 'Manager',
    role: 'manager'
  }
]

const otherOrg = {
  id: 'other-org-' + Date.now(),
  name: 'Competitor Gym'
}

const otherOrgUser = {
  id: 'other-user-' + Date.now(),
  email: `competitor-${Date.now()}@othergym.com`,
  password: 'TestPass123!',
  name: 'Competitor Staff',
  role: 'staff'
}

describe('Organization Lead Sharing Tests', () => {
  let adminClient: any
  let staff1Client: any
  let managerClient: any
  let competitorClient: any
  let testLeadId: string

  beforeAll(async () => {
    adminClient = createClient(supabaseUrl, supabaseServiceKey)
    
    // Create organizations
    await adminClient.from('organizations').insert([testOrg, otherOrg])
    
    // Create users in the same organization
    for (const user of testUsers) {
      const { data: authUser } = await adminClient.auth.admin.createUser({
        email: user.email,
        password: user.password,
        user_metadata: { name: user.name }
      })
      
      // Add to users table with organization
      await adminClient.from('users').insert({
        id: authUser!.user.id,
        email: user.email,
        name: user.name,
        organization_id: testOrg.id,
        role: user.role
      })
    }
    
    // Create user in different organization
    const { data: authCompetitor } = await adminClient.auth.admin.createUser({
      email: otherOrgUser.email,
      password: otherOrgUser.password,
      user_metadata: { name: otherOrgUser.name }
    })
    
    await adminClient.from('users').insert({
      id: authCompetitor!.user.id,
      email: otherOrgUser.email,
      name: otherOrgUser.name,
      organization_id: otherOrg.id,
      role: otherOrgUser.role
    })
    
    // Create authenticated clients
    staff1Client = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    await staff1Client.auth.signInWithPassword({
      email: testUsers[0].email,
      password: testUsers[0].password
    })
    
    managerClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    await managerClient.auth.signInWithPassword({
      email: testUsers[1].email,
      password: testUsers[1].password
    })
    
    competitorClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
    await competitorClient.auth.signInWithPassword({
      email: otherOrgUser.email,
      password: otherOrgUser.password
    })
  })

  afterAll(async () => {
    // Cleanup
    await adminClient.from('leads').delete().eq('organization_id', testOrg.id)
    await adminClient.from('leads').delete().eq('organization_id', otherOrg.id)
    await adminClient.from('users').delete().eq('organization_id', testOrg.id)
    await adminClient.from('users').delete().eq('organization_id', otherOrg.id)
    await adminClient.from('organizations').delete().in('id', [testOrg.id, otherOrg.id])
  })

  describe('Lead Creation and Sharing', () => {
    it('should allow staff to create a lead for their organization', async () => {
      const leadData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '1234567890',
        source: 'website'
      }

      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await staff1Client.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify(leadData)
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.lead.organization_id).toBe(testOrg.id)
      expect(data.lead.created_by).toBeTruthy()
      
      testLeadId = data.lead.id
    })

    it('should allow manager to see leads created by staff', async () => {
      const response = await fetch('/api/leads', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await managerClient.auth.getSession()).data.session?.access_token}`
        }
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.leads.length).toBeGreaterThan(0)
      
      const createdLead = data.leads.find((lead: any) => lead.id === testLeadId)
      expect(createdLead).toBeTruthy()
      expect(createdLead.name).toBe('John Doe')
    })

    it('should NOT allow competitor to see leads from our organization', async () => {
      const response = await fetch('/api/leads', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await competitorClient.auth.getSession()).data.session?.access_token}`
        }
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.organizationId).toBe(otherOrg.id) // Different org
      
      // Should not contain our test lead
      const ourLead = data.leads.find((lead: any) => lead.id === testLeadId)
      expect(ourLead).toBeUndefined()
    })
  })

  describe('Lead Updates Across Team', () => {
    it('should allow manager to update leads created by staff', async () => {
      const updateData = {
        id: testLeadId,
        status: 'contacted',
        notes: 'Called and scheduled a tour'
      }

      const response = await fetch('/api/leads', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await managerClient.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify(updateData)
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.lead.status).toBe('contacted')
      expect(data.lead.notes).toBe('Called and scheduled a tour')
    })

    it('should show updated lead to all team members', async () => {
      const response = await fetch(`/api/leads/${testLeadId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await staff1Client.auth.getSession()).data.session?.access_token}`
        }
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.lead.status).toBe('contacted')
      expect(data.lead.notes).toBe('Called and scheduled a tour')
    })

    it('should NOT allow competitor to update our leads', async () => {
      const updateData = {
        id: testLeadId,
        status: 'lost',
        notes: 'HACKED BY COMPETITOR'
      }

      const response = await fetch('/api/leads', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await competitorClient.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify(updateData)
      })

      expect(response.status).toBe(404) // Not found for other org
      
      // Verify lead wasn't updated
      const checkResponse = await fetch(`/api/leads/${testLeadId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await staff1Client.auth.getSession()).data.session?.access_token}`
        }
      })
      
      const checkData = await checkResponse.json()
      expect(checkData.lead.status).toBe('contacted') // Still original status
      expect(checkData.lead.notes).not.toContain('HACKED')
    })
  })

  describe('Lead Assignment', () => {
    it('should allow assigning leads to other team members', async () => {
      // Get manager's user ID
      const { data: { user: manager } } = await managerClient.auth.getUser()
      
      const updateData = {
        id: testLeadId,
        assigned_to: manager!.id
      }

      const response = await fetch('/api/leads', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await staff1Client.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify(updateData)
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.lead.assigned_to).toBe(manager!.id)
      expect(data.lead.assigned_to_user).toBeTruthy()
      expect(data.lead.assigned_to_user.email).toBe(testUsers[1].email)
    })

    it('should filter leads by assignment', async () => {
      const { data: { user: manager } } = await managerClient.auth.getUser()
      
      const response = await fetch(`/api/leads?assigned_to=${manager!.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await managerClient.auth.getSession()).data.session?.access_token}`
        }
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.leads.length).toBeGreaterThan(0)
      expect(data.leads[0].assigned_to).toBe(manager!.id)
    })
  })

  describe('Lead Deletion', () => {
    it('should NOT allow competitor to delete our leads', async () => {
      const response = await fetch(`/api/leads?id=${testLeadId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${(await competitorClient.auth.getSession()).data.session?.access_token}`
        }
      })

      expect(response.status).toBe(404)
      
      // Verify lead still exists
      const checkResponse = await fetch(`/api/leads/${testLeadId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await staff1Client.auth.getSession()).data.session?.access_token}`
        }
      })
      
      expect(checkResponse.status).toBe(200)
    })

    it('should allow any team member to delete organization leads', async () => {
      const response = await fetch(`/api/leads?id=${testLeadId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${(await managerClient.auth.getSession()).data.session?.access_token}`
        }
      })

      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.success).toBe(true)
      expect(data.deleted).toBe(testLeadId)
      
      // Verify lead is deleted
      const checkResponse = await fetch(`/api/leads/${testLeadId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${(await staff1Client.auth.getSession()).data.session?.access_token}`
        }
      })
      
      expect(checkResponse.status).toBe(404)
    })
  })
})