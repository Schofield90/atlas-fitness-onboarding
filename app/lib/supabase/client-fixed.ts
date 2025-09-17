import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'
import { isBrowser, safeStorage } from '../utils/is-browser'

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  // Don't create client during SSR/build
  if (!isBrowser()) {
    return null as any;
  }

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
        autoRefreshToken: false, // Disable auto-refresh completely
        detectSessionInUrl: false, // Disable session detection
        // Use safe storage that checks for browser
        storage: safeStorage,
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