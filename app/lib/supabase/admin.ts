import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

// Create a Supabase client with the service role key.
// During build (e.g. on Vercel) envs may be unavailable; fall back to anon key to avoid build failures.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const fallbackKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const keyToUse = serviceKey || fallbackKey

  return createClient<Database>(
    url,
    keyToUse,
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