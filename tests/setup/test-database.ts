import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load test environment
dotenv.config({ path: '.env.test' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const testDb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  db: { schema: 'public' },
  auth: { persistSession: false }
})

// Test organization and user data
export const testOrganization = {
  id: 'test-org-123',
  name: 'Test Gym',
  slug: 'test-gym'
}

export const testUser = {
  id: 'test-user-123',
  email: 'test@example.com',
  organization_id: testOrganization.id
}

export const testUser2 = {
  id: 'test-user-456',
  email: 'test2@example.com',
  organization_id: 'different-org-456'
}

// Setup test data
export async function setupTestData() {
  try {
    // Create test organizations
    await testDb.from('organizations').upsert([
      testOrganization,
      { id: 'different-org-456', name: 'Different Gym', slug: 'different-gym' }
    ])
    
    // Create test users
    await testDb.from('users').upsert([
      testUser,
      testUser2
    ])
    
    console.log('✅ Test data setup complete')
  } catch (error) {
    console.error('❌ Failed to setup test data:', error)
    throw error
  }
}

// Cleanup test data
export async function cleanupTestData() {
  try {
    // Delete in reverse order of creation
    await testDb.from('users').delete().in('id', [testUser.id, testUser2.id])
    await testDb.from('organizations').delete().in('id', [testOrganization.id, 'different-org-456'])
    
    console.log('✅ Test data cleanup complete')
  } catch (error) {
    console.error('❌ Failed to cleanup test data:', error)
    throw error
  }
}

// Test utilities
export async function createTestLead(organizationId: string) {
  const { data, error } = await testDb
    .from('leads')
    .insert({
      organization_id: organizationId,
      name: 'Test Lead',
      email: `lead-${Date.now()}@example.com`,
      phone: '+447777777777',
      status: 'new'
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function createTestTask(organizationId: string) {
  const { data, error } = await testDb
    .from('tasks')
    .insert({
      organization_id: organizationId,
      title: 'Test Task',
      description: 'Test task description',
      status: 'pending'
    })
    .select()
    .single()
  
  if (error) throw error
  return data
}