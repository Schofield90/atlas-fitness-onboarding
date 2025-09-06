import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './database.types'

export async function createClient() {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

  // During build time, return a mock client to prevent errors
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase environment variables missing, using mock client for build')
    return {
      auth: {
        getUser: () => Promise.resolve({ data: { user: null }, error: new Error('Mock client') })
      },
      from: () => ({
        select: () => ({ 
          eq: () => ({ 
            single: () => Promise.resolve({ data: null, error: new Error('Mock client') })
          }),
          in: () => Promise.resolve({ data: [], error: new Error('Mock client') })
        })
      })
    } as any
  }

  const cookieStore = await cookies()

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Handle error
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Handle error
          }
        }
      }
    }
  )
}

export async function getAuthenticatedClient() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    throw new Error('Not authenticated')
  }
  
  return { supabase, user }
}

// Export aliases for backwards compatibility
export { createClient as createServerClient }
export { createClient as createServerSupabaseClient }