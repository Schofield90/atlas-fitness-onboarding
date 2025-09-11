import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (browserClient) return browserClient

  // Trim to avoid stray newlines (e.g., %0A) breaking Realtime websocket auth
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

  browserClient = createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(key) {
          try {
            if (typeof document === 'undefined') return undefined
            
            const cookie = document.cookie
              .split('; ')
              .find(row => row.startsWith(`${key}=`))
            
            if (!cookie) return undefined
            
            const value = cookie.split('=')[1]
            
            // Handle base64 encoded values
            if (value?.startsWith('base64-')) {
              try {
                const base64String = value.substring(7) // Remove 'base64-' prefix
                const decoded = atob(base64String)
                return decoded
              } catch (e) {
                // If decoding fails, return the original value
                return value
              }
            }
            
            return decodeURIComponent(value)
          } catch (error) {
            return undefined
          }
        }
      }
    }
  )
  return browserClient
}