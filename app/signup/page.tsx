'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabase/client'
import { TRIAL_CTA_TEXT } from '@/app/lib/constants'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      // Sign up the user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            organization_name: organizationName,
          }
        }
      })

      if (authError) {
        console.error('Signup auth error:', authError)
        
        // If Supabase auth fails with 500, try direct signup
        if (authError.message.includes('Database error') || authError.message.includes('500')) {
          console.log('Attempting direct signup fallback...')
          
          const response = await fetch('/api/auth/direct-signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              password,
              name,
              organizationName
            })
          })
          
          const result = await response.json()
          
          if (result.success) {
            setSuccess(true)
            setError(null)
            
            // Show success and redirect to login
            setTimeout(() => {
              router.push('/login')
            }, 2000)
            return
          } else {
            // Show user-friendly error message
            if (result.details?.message?.includes('Supabase Auth')) {
              setError('The authentication service is temporarily unavailable. Please contact support or try again later.')
            } else {
              setError(result.error || 'Failed to create account')
            }
            return
          }
        }
        
        setError(authError.message)
        return
      }

      if (authData?.user) {
        // Call API to properly set up user record
        const response = await fetch('/api/auth/fix-signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: authData.user.email,
            name,
            organizationName
          })
        })
        
        const result = await response.json()
        
        if (!response.ok) {
          console.error('Error setting up user:', result)
          // Try alternative approach - direct database insert
          try {
            const { error: userError } = await supabase
              .from('users')
              .insert({
                id: authData.user.id,
                email: authData.user.email,
                full_name: name
              })
            
            if (userError && userError.code !== '23505') { // Ignore duplicate key errors
              console.error('Direct insert error:', userError)
              setError('Database error saving new user')
              return
            }
          } catch (e) {
            console.error('Fallback error:', e)
          }
        }

        // Show success message
        setSuccess(true)
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          router.push('/dashboard')
          router.refresh()
        }, 2000)
      }
    } catch (err: any) {
      console.error('Signup error:', err)
      setError(err.message || 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    // Store organization name in session storage for after OAuth callback
    if (organizationName) {
      sessionStorage.setItem('pending_organization', organizationName)
    }
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `https://atlas-fitness-onboarding.vercel.app/auth/callback?signup=true`
        }
      })
      
      if (error) {
        setError(error.message)
      }
    } catch (err: any) {
      console.error('Google signup error:', err)
      setError('Failed to sign up with Google')
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-white">
              🎉 Welcome to Gymleadhub!
            </h2>
            <p className="mt-2 text-sm text-gray-300">
              Your account has been created successfully.
            </p>
            <p className="mt-2 text-sm text-gray-300">
              Redirecting to your dashboard...
            </p>
            <div className="mt-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <Link 
            href="/landing"
            className="flex justify-center text-2xl font-bold text-orange-500 mb-8"
          >
            Gymleadhub
          </Link>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Start Your 14-Day Free Trial
          </h2>
          <p className="mt-2 text-center text-sm text-gray-300">
            No credit card required • 14-day free trial
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          {error && (
            <div className="rounded-md bg-red-900 border border-red-600 p-4">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-200">
                    Error creating account
                  </h3>
                  <div className="mt-2 text-sm text-red-300">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-800 placeholder-gray-400 text-white rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-gray-300 mb-1">
                Gym/Organization Name
              </label>
              <input
                id="organization"
                name="organization"
                type="text"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-800 placeholder-gray-400 text-white rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Enter your gym name"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-gray-300 mb-1">
                Email Address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-800 placeholder-gray-400 text-white rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-800 placeholder-gray-400 text-white rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300 mb-1">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                className="appearance-none relative block w-full px-3 py-2 border border-gray-600 bg-gray-800 placeholder-gray-400 text-white rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 focus:z-10 sm:text-sm"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm">
              <p className="text-gray-400">
                Password must be at least 6 characters
              </p>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating your account...' : TRIAL_CTA_TEXT}
            </button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-900 text-gray-400">Or continue with</span>
            </div>
          </div>

          <div>
            <button
              type="button"
              onClick={handleGoogleSignup}
              disabled={!organizationName}
              className="group relative w-full flex justify-center py-3 px-4 border border-gray-600 text-sm font-medium rounded-md text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign up with Google
            </button>
            {!organizationName && (
              <p className="text-xs text-gray-400 mt-2 text-center">
                Please enter your gym name first
              </p>
            )}
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-400">
              Already have an account?{' '}
              <Link href="/login" className="font-medium text-orange-500 hover:text-orange-400">
                Sign in
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}