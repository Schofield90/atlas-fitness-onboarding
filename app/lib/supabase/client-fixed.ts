import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (browserClient) return browserClient

  // Trim to avoid stray newlines (e.g., %0A) breaking Realtime websocket auth
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim()
  const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim()

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase configuration. Please check your environment variables.')
    throw new Error('Missing Supabase configuration')
  }

  browserClient = createBrowserClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      // Enhanced configuration to fix WebSocket and cookie issues
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
        // Reduce reconnection attempts to avoid spam
        reconnect: {
          maxRetries: 5,
          delay: 1000,
        },
      },
      auth: {
        // Fix cookie parsing issues
        persistSession: true,
        autoRefreshToken: typeof window !== 'undefined', // Only auto-refresh in browser
        detectSessionInUrl: typeof window !== 'undefined', // Only detect session in browser
        // Use more robust storage
        storage: typeof window !== 'undefined' ? {
          getItem: (key: string) => {
            try {
              return localStorage.getItem(key)
            } catch (error) {
              console.warn('localStorage getItem error:', error)
              return null
            }
          },
          setItem: (key: string, value: string) => {
            try {
              localStorage.setItem(key, value)
            } catch (error) {
              console.warn('localStorage setItem error:', error)
            }
          },
          removeItem: (key: string) => {
            try {
              localStorage.removeItem(key)
            } catch (error) {
              console.warn('localStorage removeItem error:', error)
            }
          },
        } : undefined,
      },
      // Global configuration
      global: {
        headers: {
          'x-client-info': 'atlas-fitness-app@1.0.0',
        },
      },
    }
  )

  // Add error handling for WebSocket connection issues
  if (typeof window !== 'undefined') {
    browserClient.realtime.onError((error) => {
      console.warn('Supabase Realtime error:', error)
      // Don't spam the console with repeated errors
      if (!error.message?.includes('back/forward cache')) {
        console.warn('Realtime connection issue, will retry automatically')
      }
    })

    browserClient.realtime.onDisconnect(() => {
      console.info('Supabase Realtime disconnected, attempting reconnection...')
    })

    browserClient.realtime.onConnect(() => {
      console.info('Supabase Realtime connected successfully')
    })
  }

  return browserClient
}

// Helper function to safely create channels with error handling
export function createRealtimeChannel(channelName: string) {
  const client = createClient()
  
  const channel = client.channel(channelName, {
    config: {
      broadcast: { self: false },
      presence: { key: '' },
    },
  })

  // Add error handling to the channel
  channel.on('error', (error) => {
    console.warn(`Channel ${channelName} error:`, error)
  })

  return channel
}