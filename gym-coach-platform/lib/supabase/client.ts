'use client'

import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

let supabaseInstance: SupabaseClient | null = null

// Create singleton client function with standard cookie handling
function createSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or anon key is missing')
    return null
  }

  // Use standard createBrowserClient without custom cookie handlers
  // This ensures compatibility with server-side cookie handling
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

// Singleton instance getter - ONLY call from browser components
export function getSupabaseClient(): SupabaseClient | null {
  // Guard against SSR/build time
  if (typeof window === 'undefined') {
    return null
  }

  if (!supabaseInstance) {
    supabaseInstance = createSupabaseClient()
    if (supabaseInstance) {
      console.log('Supabase client initialized successfully')
    }
  }
  return supabaseInstance
}

// DEPRECATED: Do not use module-level export - causes SSR crashes
// Call getSupabaseClient() instead from within components
export const supabase = null

// DEPRECATED: Do not use default export
export default null