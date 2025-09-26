'use client'

import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

let supabaseInstance: SupabaseClient | null = null

// Custom cookie storage that prevents chunking by compressing large values
const createCustomCookieHandler = () => {
  return {
    get(name: string) {
      if (typeof document === 'undefined') return undefined
      
      // Handle both chunked and normal cookies
      const cookies = document.cookie.split(';').reduce((acc, cookie) => {
        const [key, value] = cookie.trim().split('=')
        if (key && value) {
          acc[key] = decodeURIComponent(value)
        }
        return acc
      }, {} as Record<string, string>)
      
      // Check for chunked cookies (atlas-fitness-auth.0, atlas-fitness-auth.1, etc.)
      const chunkPrefix = `${name}.`
      const chunks = Object.entries(cookies)
        .filter(([key]) => key.startsWith(chunkPrefix))
        .sort(([a], [b]) => {
          const aIndex = parseInt(a.split('.').pop() || '0')
          const bIndex = parseInt(b.split('.').pop() || '0')
          return aIndex - bIndex
        })
        .map(([, value]) => value)
      
      if (chunks.length > 0) {
        // Clear chunked cookies immediately to prevent corruption
        chunks.forEach((_, index) => {
          document.cookie = `${name}.${index}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
        })
        return chunks.join('')
      }
      
      return cookies[name]
    },
    set(name: string, value: string, options: any) {
      if (typeof document === 'undefined') return
      
      // Use sessionStorage for large auth tokens to prevent cookie size limits
      if (name.includes('auth') && value.length > 3500) {
        try {
          sessionStorage.setItem(`supabase.${name}`, value)
          // Set a small marker cookie
          const marker = 'sessionStorage'
          const cookieString = `${name}=${encodeURIComponent(marker)}; path=/; ${options?.httpOnly ? 'HttpOnly; ' : ''}${options?.secure ? 'Secure; ' : ''}SameSite=Lax`
          document.cookie = cookieString
          return
        } catch (e) {
          console.warn('SessionStorage not available, falling back to cookie')
        }
      }
      
      // Normal cookie handling for smaller values
      const cookieString = `${name}=${encodeURIComponent(value)}; path=/; ${options?.httpOnly ? 'HttpOnly; ' : ''}${options?.secure ? 'Secure; ' : ''}SameSite=Lax`
      document.cookie = cookieString
    },
    remove(name: string, options: any) {
      if (typeof document === 'undefined') return
      
      // Remove from sessionStorage if it exists
      try {
        sessionStorage.removeItem(`supabase.${name}`)
      } catch (e) {
        // Ignore if sessionStorage is not available
      }
      
      // Remove cookie
      document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
      
      // Also remove any chunked cookies
      for (let i = 0; i < 10; i++) {
        document.cookie = `${name}.${i}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
      }
    }
  }
}

// Enhanced get method that checks sessionStorage first
const enhancedGet = (name: string) => {
  if (typeof window === 'undefined') return undefined
  
  // First check sessionStorage for large auth tokens
  try {
    const sessionValue = sessionStorage.getItem(`supabase.${name}`)
    if (sessionValue) {
      return sessionValue
    }
  } catch (e) {
    // Ignore if sessionStorage is not available
  }
  
  // Then check cookies
  return createCustomCookieHandler().get(name)
}

// Create singleton client function
function createSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase URL or anon key is missing')
    return null
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get: enhancedGet,
      set: createCustomCookieHandler().set,
      remove: createCustomCookieHandler().remove
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true, // Enable to prevent session expiration issues
      detectSessionInUrl: false, // Disable to prevent SSR issues
      storageKey: 'atlas-fitness-auth',
      storage: typeof window !== 'undefined' ? {
        getItem: (key: string) => enhancedGet(key),
        setItem: (key: string, value: string) => createCustomCookieHandler().set(key, value, {}),
        removeItem: (key: string) => createCustomCookieHandler().remove(key, {})
      } : undefined
    }
  })
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