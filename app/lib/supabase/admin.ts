import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Create a Supabase client with the service role key
// This bypasses Row Level Security (RLS) policies
export function createAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
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