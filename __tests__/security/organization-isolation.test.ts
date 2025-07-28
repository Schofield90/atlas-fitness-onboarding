/**
 * Security Test Suite: Organization Isolation
 * 
 * These tests verify that users from one organization cannot access, modify, or delete
 * data from another organization. This is CRITICAL for multi-tenant security.
 */

import { createClient } from '@supabase/supabase-js'
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals'

// Test configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Test data
const testOrg1 = {
  id: 'org1-test-' + Date.now(),
  name: 'Test Gym A'
}

const testOrg2 = {
  id: 'org2-test-' + Date.now(),
  name: 'Test Gym B'
}

const testUser1 = {
  email: `user1-${Date.now()}@testgym.com`,
  password: 'TestPass123!',
  organizationId: testOrg1.id
}

const testUser2 = {
  email: `user2-${Date.now()}@testgym.com`,
  password: 'TestPass123!',
  organizationId: testOrg2.id
}

describe('Organization Isolation Security Tests', () => {
  let supabase1: any // User 1's client (Org A)
  let supabase2: any // User 2's client (Org B)
  let testLeadOrg1: any
  let testLeadOrg2: any

  beforeAll(async () => {
    // Setup test organizations and users
    const adminSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    
    // Create organizations
    await adminSupabase.from('organizations').insert([testOrg1, testOrg2])
    
    // Create users
    const { data: { user: user1 } } = await adminSupabase.auth.admin.createUser({
      email: testUser1.email,
      password: testUser1.password,
      user_metadata: { organization_id: testUser1.organizationId }
    })
    
    const { data: { user: user2 } } = await adminSupabase.auth.admin.createUser({
      email: testUser2.email,
      password: testUser2.password,
      user_metadata: { organization_id: testUser2.organizationId }
    })
    
    // Create user-organization relationships
    await adminSupabase.from('user_organizations').insert([
      { user_id: user1!.id, organization_id: testOrg1.id },
      { user_id: user2!.id, organization_id: testOrg2.id }
    ])
    
    // Create test leads for each organization
    const { data: lead1 } = await adminSupabase.from('leads').insert({
      name: 'Lead for Org A',
      email: 'lead1@test.com',
      phone: '1234567890',
      organization_id: testOrg1.id,
      user_id: user1!.id
    }).select().single()
    
    const { data: lead2 } = await adminSupabase.from('leads').insert({
      name: 'Lead for Org B',
      email: 'lead2@test.com',
      phone: '0987654321',
      organization_id: testOrg2.id,
      user_id: user2!.id
    }).select().single()
    
    testLeadOrg1 = lead1
    testLeadOrg2 = lead2
    
    // Create authenticated clients
    supabase1 = createClient(supabaseUrl, supabaseAnonKey)
    await supabase1.auth.signInWithPassword({
      email: testUser1.email,
      password: testUser1.password
    })
    
    supabase2 = createClient(supabaseUrl, supabaseAnonKey)
    await supabase2.auth.signInWithPassword({
      email: testUser2.email,
      password: testUser2.password
    })
  })

  afterAll(async () => {
    // Cleanup
    const adminSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    
    // Delete test data
    await adminSupabase.from('leads').delete().in('organization_id', [testOrg1.id, testOrg2.id])
    await adminSupabase.from('user_organizations').delete().in('organization_id', [testOrg1.id, testOrg2.id])
    await adminSupabase.auth.admin.deleteUser(testUser1.email)
    await adminSupabase.auth.admin.deleteUser(testUser2.email)
    await adminSupabase.from('organizations').delete().in('id', [testOrg1.id, testOrg2.id])
  })

  describe('READ Operations', () => {
    it('should NOT allow user from Org A to read leads from Org B', async () => {
      // User 1 tries to read Org 2's lead directly
      const { data, error } = await supabase1
        .from('leads')
        .select('*')
        .eq('id', testLeadOrg2.id)
        .single()
      
      expect(data).toBeNull()
      expect(error).toBeTruthy()
    })

    it('should only return leads from user\'s own organization', async () => {
      // User 1 gets all leads
      const { data: leads } = await supabase1
        .from('leads')
        .select('*')
      
      // Should only see leads from Org A
      expect(leads).toHaveLength(1)
      expect(leads[0].id).toBe(testLeadOrg1.id)
      expect(leads[0].organization_id).toBe(testOrg1.id)
    })
  })

  describe('UPDATE Operations', () => {
    it('should NOT allow user from Org A to update leads from Org B', async () => {
      // User 1 tries to update Org 2's lead
      const { data, error } = await supabase1
        .from('leads')
        .update({ name: 'HACKED BY ORG A' })
        .eq('id', testLeadOrg2.id)
      
      expect(error).toBeTruthy()
      
      // Verify the lead wasn't updated
      const adminSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      const { data: checkLead } = await adminSupabase
        .from('leads')
        .select('name')
        .eq('id', testLeadOrg2.id)
        .single()
      
      expect(checkLead.name).toBe('Lead for Org B') // Original name unchanged
    })

    it('should NOT allow changing organization_id to steal leads', async () => {
      // User 1 tries to steal a lead by changing its organization
      const { error } = await supabase1
        .from('leads')
        .update({ organization_id: testOrg1.id })
        .eq('id', testLeadOrg2.id)
      
      expect(error).toBeTruthy()
    })
  })

  describe('DELETE Operations', () => {
    it('should NOT allow user from Org A to delete leads from Org B', async () => {
      // User 1 tries to delete Org 2's lead
      const { error } = await supabase1
        .from('leads')
        .delete()
        .eq('id', testLeadOrg2.id)
      
      expect(error).toBeTruthy()
      
      // Verify the lead still exists
      const adminSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      const { data: checkLead } = await adminSupabase
        .from('leads')
        .select('id')
        .eq('id', testLeadOrg2.id)
        .single()
      
      expect(checkLead).toBeTruthy()
    })

    it('should NOT allow bulk delete across organizations', async () => {
      // User 1 tries to delete all leads (including other orgs)
      const { error } = await supabase1
        .from('leads')
        .delete()
        .gte('created_at', '2020-01-01') // Try to delete everything
      
      // Should either error or only delete own org's leads
      // Verify Org B's lead still exists
      const adminSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      const { data: checkLead } = await adminSupabase
        .from('leads')
        .select('id')
        .eq('id', testLeadOrg2.id)
        .single()
      
      expect(checkLead).toBeTruthy()
    })
  })

  describe('CREATE Operations', () => {
    it('should NOT allow creating leads in another organization', async () => {
      // User 1 tries to create a lead in Org B
      const { error } = await supabase1
        .from('leads')
        .insert({
          name: 'Fake Lead in Org B',
          email: 'fake@test.com',
          phone: '1111111111',
          organization_id: testOrg2.id // Try to insert into Org B
        })
      
      expect(error).toBeTruthy()
    })
  })

  describe('API Endpoint Tests', () => {
    it('DELETE /api/leads should only delete from own organization', async () => {
      const response = await fetch('/api/leads?id=' + testLeadOrg2.id, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${supabase1.auth.session()?.access_token}`
        }
      })
      
      // Should get 404 (not found) rather than successful deletion
      expect(response.status).toBe(404)
      
      // Verify lead still exists
      const adminSupabase = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!)
      const { data: checkLead } = await adminSupabase
        .from('leads')
        .select('id')
        .eq('id', testLeadOrg2.id)
        .single()
      
      expect(checkLead).toBeTruthy()
    })

    it('PATCH /api/leads should only update own organization leads', async () => {
      const response = await fetch('/api/leads', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${supabase1.auth.session()?.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: testLeadOrg2.id,
          name: 'HACKED NAME'
        })
      })
      
      expect(response.status).toBe(404)
    })
  })
})

describe('SQL Injection Prevention Tests', () => {
  it('should sanitize malicious UUID inputs', async () => {
    const maliciousId = "'; DELETE FROM leads; --"
    
    const response = await fetch(`/api/leads/${maliciousId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${supabase1.auth.session()?.access_token}`
      }
    })
    
    // Should reject invalid UUID format
    expect(response.status).toBe(400)
    const data = await response.json()
    expect(data.error).toContain('Invalid')
  })

  it('should prevent organization_id injection in queries', async () => {
    const response = await fetch('/api/leads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabase1.auth.session()?.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Test Lead',
        email: 'test@test.com',
        phone: '1234567890',
        organization_id: "' OR '1'='1" // SQL injection attempt
      })
    })
    
    // Should either ignore the organization_id or error
    const data = await response.json()
    if (data.lead) {
      // If created, should use authenticated user's org, not the injected value
      expect(data.lead.organization_id).toBe(testOrg1.id)
    }
  })
})