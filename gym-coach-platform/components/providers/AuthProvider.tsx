'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { getSupabaseClient } from '../../lib/supabase/client'
import toast from 'react-hot-toast'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  signOut: async () => {},
  refreshSession: async () => {}
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
  const [loading, setLoading] = useState(true)

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

  const value = {
    user,
    session,
    loading,
    signOut,
    refreshSession
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}