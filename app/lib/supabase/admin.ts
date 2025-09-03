import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Create a Supabase client with the service role key
// This bypasses Row Level Security (RLS) policies
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration')
  }

  return createClient<Database>(
    supabaseUrl,
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
  
  const { data, error } = await admin
    .from('users')
    .select('*, organizations(*)')
    .eq('id', userId)
    .single()
  
  return { data, error }
}