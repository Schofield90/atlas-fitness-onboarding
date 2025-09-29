'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { Session, User } from '@supabase/supabase-js'

interface AuthSession {
  session: Session | null
  user: User | null
  loading: boolean
  error: string | null
}

export function useAuthSession(): AuthSession {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = getSupabaseClient()
    if (!supabase) {
      setError('Authentication not available')
      setLoading(false)
      return
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          console.error('Session error:', sessionError)
          setError(sessionError.message)
        } else {
          setSession(initialSession)
          setUser(initialSession?.user || null)
        }
      } catch (err) {
        console.error('Failed to get initial session:', err)
        setError('Failed to initialize session')
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log('Auth state changed:', event, newSession?.user?.email)

        setSession(newSession)
        setUser(newSession?.user || null)
        setLoading(false)

        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
            setError(null)
            break
          case 'SIGNED_OUT':
            setError(null)
            // Redirect to login page
            router.push('/auth/login')
            break
          case 'TOKEN_REFRESHED':
            console.log('Token refreshed successfully')
            setError(null)
            break
          case 'USER_UPDATED':
            console.log('User updated')
            break
          default:
            break
        }
      }
    )

    // Set up periodic session refresh
    const refreshInterval = setInterval(async () => {
      try {
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()

        if (refreshError) {
          console.error('Failed to refresh session:', refreshError)
          // Don't set error for refresh failures, just log them
        } else if (refreshedSession) {
          console.log('Session refreshed automatically')
          setSession(refreshedSession)
          setUser(refreshedSession.user)
        }
      } catch (err) {
        console.error('Session refresh error:', err)
      }
    }, 5 * 60 * 1000) // Refresh every 5 minutes

    // Cleanup
    return () => {
      subscription.unsubscribe()
      clearInterval(refreshInterval)
    }
  }, [router])

  return {
    session,
    user,
    loading,
    error
  }
}

// Hook for components that require authentication
export function useRequireAuth() {
  const { session, user, loading, error } = useAuthSession()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !session) {
      // Redirect to login if no session
      router.push('/auth/login')
    }
  }, [session, loading, router])

  return {
    session,
    user,
    loading,
    error,
    isAuthenticated: !!session
  }
}