import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (browserClient) return browserClient

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

  browserClient = createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey
  )
  return browserClient
}