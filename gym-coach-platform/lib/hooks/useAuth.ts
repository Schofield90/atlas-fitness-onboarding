'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface Organization {
  id: string
  name: string
  email?: string
  subscription_plan?: string
  subscription_status?: string
}

interface UserProfile {
  id: string
  email: string
  organization_id: string
  role: 'owner' | 'admin' | 'staff' | 'viewer'
  organizations?: Organization
}

interface AuthState {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  error: string | null
  organizationId: string | null
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    userProfile: null,
    loading: true,
    error: null,
    organizationId: null
  })

  const supabase = getSupabaseClient()

  // Fetch user profile with organization details
  const fetchUserProfile = async (user: User): Promise<UserProfile | null> => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${user.access_token || ''}`
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch user profile: ${response.status}`)
      }

      const data = await response.json()
      return data.data || data
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return null
    }
  }

  // Initialize auth state
  useEffect(() => {
    if (!supabase) {
      setAuthState(prev => ({ ...prev, loading: false, error: 'Supabase client not available' }))
      return
    }

    const initializeAuth = async () => {
      try {
        // Get current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        if (session?.user) {
          // Fetch user profile with organization details
          const userProfile = await fetchUserProfile(session.user)

          if (userProfile) {
            setAuthState({
              user: session.user,
              userProfile,
              loading: false,
              error: null,
              organizationId: userProfile.organization_id
            })
          } else {
            setAuthState({
              user: session.user,
              userProfile: null,
              loading: false,
              error: 'Failed to load user profile',
              organizationId: null
            })
          }
        } else {
          setAuthState({
            user: null,
            userProfile: null,
            loading: false,
            error: null,
            organizationId: null
          })
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        setAuthState({
          user: null,
          userProfile: null,
          loading: false,
          error: error instanceof Error ? error.message : 'Authentication failed',
          organizationId: null
        })
      }
    }

    initializeAuth()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event, session?.user?.email)

      if (event === 'SIGNED_IN' && session?.user) {
        setAuthState(prev => ({ ...prev, loading: true }))

        const userProfile = await fetchUserProfile(session.user)

        setAuthState({
          user: session.user,
          userProfile,
          loading: false,
          error: userProfile ? null : 'Failed to load user profile',
          organizationId: userProfile?.organization_id || null
        })
      } else if (event === 'SIGNED_OUT') {
        setAuthState({
          user: null,
          userProfile: null,
          loading: false,
          error: null,
          organizationId: null
        })
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Update the user in state but keep profile unless it's null
        setAuthState(prev => ({
          ...prev,
          user: session.user,
          error: null
        }))
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase])

  const signOut = async () => {
    if (!supabase) return

    setAuthState(prev => ({ ...prev, loading: true }))

    try {
      await supabase.auth.signOut()
      // State will be updated by the auth state change listener
    } catch (error) {
      console.error('Sign out error:', error)
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Sign out failed'
      }))
    }
  }

  const refreshProfile = async () => {
    if (!authState.user || !supabase) return

    setAuthState(prev => ({ ...prev, loading: true }))

    try {
      const userProfile = await fetchUserProfile(authState.user)

      setAuthState(prev => ({
        ...prev,
        userProfile,
        loading: false,
        error: userProfile ? null : 'Failed to refresh user profile',
        organizationId: userProfile?.organization_id || null
      }))
    } catch (error) {
      console.error('Profile refresh error:', error)
      setAuthState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh profile'
      }))
    }
  }

  return {
    ...authState,
    signOut,
    refreshProfile,
    isAuthenticated: !!authState.user,
    hasOrganization: !!authState.organizationId
  }
}