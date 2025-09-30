'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { getSupabaseClient } from '../../lib/supabase/client'
import toast from 'react-hot-toast'

interface UserProfile {
  id: string
  email: string
  organization_id: string
  role: 'owner' | 'admin' | 'staff' | 'viewer'
  organizations?: {
    id: string
    name: string
    email?: string
    subscription_plan?: string
    subscription_status?: string
  }
}

interface AuthContextType {
  user: User | null
  session: Session | null
  userProfile: UserProfile | null
  organizationId: string | null
  loading: boolean
  error: string | null
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
  refreshProfile: () => Promise<void>
  isAuthenticated: boolean
  hasOrganization: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  userProfile: null,
  organizationId: null,
  loading: true,
  error: null,
  signOut: async () => {},
  refreshSession: async () => {},
  refreshProfile: async () => {},
  isAuthenticated: false,
  hasOrganization: false
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch user profile with organization details
  const fetchUserProfile = async (user: User, accessToken?: string): Promise<UserProfile | null> => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // Use cookies instead of Bearer token
        headers: {
          'Content-Type': 'application/json'
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

  useEffect(() => {
    const supabase = getSupabaseClient()
    if (!supabase) {
      console.error('Supabase client not available')
      setLoading(false)
      return
    }

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.error('Error getting initial session:', error)
          if (error.message.includes('Invalid token') || error.message.includes('corrupted')) {
            // Clean up corrupted session
            await supabase.auth.signOut()
            toast.error('Session expired. Please sign in again.')
          }
        } else {
          setSession(session)
          setUser(session?.user ?? null)

          // Fetch user profile if session exists
          if (session?.user && session?.access_token) {
            const profile = await fetchUserProfile(session.user, session.access_token)
            setUserProfile(profile)
            if (!profile) {
              setError('Failed to load user profile')
            }
          }
        }
      } catch (err) {
        console.error('Failed to get initial session:', err)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('Auth state changed:', event, session?.user?.id)
        
        setSession(session)
        setUser(session?.user ?? null)

        // Fetch user profile for authenticated sessions
        if (session?.user && session?.access_token) {
          fetchUserProfile(session.user, session.access_token).then(profile => {
            setUserProfile(profile)
            if (!profile) {
              setError('Failed to load user profile')
            } else {
              setError(null)
            }
          })
        } else {
          setUserProfile(null)
          setError(null)
        }

        // Handle different auth events
        switch (event) {
          case 'SIGNED_IN':
            console.log('User signed in successfully')
            break
          case 'SIGNED_OUT':
            console.log('User signed out')
            // Clear any remaining corrupted cookies
            try {
              const cookies = document.cookie.split(';')
              cookies.forEach(cookie => {
                const cookieName = cookie.split('=')[0].trim()
                if (cookieName.includes('auth') || cookieName.startsWith('sb-')) {
                  document.cookie = `${cookieName}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`
                }
              })
            } catch (e) {
              // Ignore cookie cleanup errors
            }
            break
          case 'TOKEN_REFRESHED':
            console.log('Auth token refreshed successfully')
            break
          case 'USER_UPDATED':
            console.log('User updated')
            break
          case 'PASSWORD_RECOVERY':
            console.log('Password recovery initiated')
            break
        }
        
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    const supabase = getSupabaseClient()
    if (!supabase) return

    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Sign out error:', error)
        toast.error('Failed to sign out')
      } else {
        // Clear additional session storage items
        try {
          const keysToRemove = []
          for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i)
            if (key && key.startsWith('supabase.')) {
              keysToRemove.push(key)
            }
          }
          keysToRemove.forEach(key => sessionStorage.removeItem(key))
        } catch (e) {
          // Ignore if sessionStorage is not available
        }
        
        toast.success('Signed out successfully')
      }
    } catch (err) {
      console.error('Unexpected sign out error:', err)
      toast.error('An error occurred during sign out')
    } finally {
      setLoading(false)
    }
  }

  const refreshSession = async () => {
    const supabase = getSupabaseClient()
    if (!supabase) return

    try {
      const { data: { session }, error } = await supabase.auth.refreshSession()
      
      if (error) {
        console.error('Refresh session error:', error)
        if (error.message.includes('Invalid token') || error.message.includes('expired')) {
          await signOut()
          toast.error('Session expired. Please sign in again.')
        }
      } else {
        setSession(session)
        setUser(session?.user ?? null)
        console.log('Session refreshed successfully')
      }
    } catch (err) {
      console.error('Failed to refresh session:', err)
      toast.error('Failed to refresh session')
    }
  }

  const refreshProfile = async () => {
    if (!user || !session?.access_token) return

    try {
      const profile = await fetchUserProfile(user, session.access_token)
      setUserProfile(profile)
      if (!profile) {
        setError('Failed to refresh user profile')
      } else {
        setError(null)
      }
    } catch (error) {
      console.error('Profile refresh error:', error)
      setError('Failed to refresh profile')
    }
  }

  const value = {
    user,
    session,
    userProfile,
    organizationId: userProfile?.organization_id || null,
    loading,
    error,
    signOut,
    refreshSession,
    refreshProfile,
    isAuthenticated: !!user,
    hasOrganization: !!userProfile?.organization_id
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}