import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Create a Supabase client with the service role key
// This bypasses Row Level Security (RLS) policies
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    return null
  }
  return createClient<Database>(
    url,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

// Helper to get user with organization using admin client
export async function getUserWithOrgAdmin(userId: string) {
  const admin = createAdminClient()
  if (!admin) {
    return { data: null, error: new Error('Service unavailable') }
  }
  
  const { data, error } = await admin
    .from('users')
    .select('*, organizations(*)')
    .eq('id', userId)
    .single()
  
  return { data, error }
}