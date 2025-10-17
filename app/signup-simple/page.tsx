'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function SimpleSignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [organizationName, setOrganizationName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const supabase = createClient()

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setDebugInfo(null)

    try {
      // Step 1: Create auth user
      console.log('Creating auth user...')
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            organization_name: organizationName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (authError) {
        console.error('Auth error:', authError)
        setError(`Authentication error: ${authError.message}`)
        setDebugInfo({ step: 'auth', error: authError })
        
        // If it's a 500 error, try alternative approach
        if (authError.message.includes('500') || authError.message.includes('Database')) {
          console.log('Trying alternative signup approach...')
          
          // Try to sign in instead (in case user already exists)
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
          })
          
          if (signInData?.user) {
            console.log('User already exists, signed in successfully')
            router.push('/dashboard')
            return
          }
        }
        return
      }

      if (authData?.user) {
        console.log('Auth user created:', authData.user.id)
        
        // Step 2: Create user record in database
        console.log('Creating database user record...')
        const { error: dbError } = await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: authData.user.email,
            full_name: name || email.split('@')[0]
          })
        
        if (dbError && dbError.code !== '23505') { // Ignore duplicate key errors
          console.error('Database error:', dbError)
          setDebugInfo({ step: 'database', error: dbError })
          // Continue anyway - user can still use the app
        }
        
        // Step 3: Create organization if provided
        if (organizationName) {
          console.log('Creating organization...')
          const { data: org, error: orgError } = await supabase
            .from('organizations')
            .insert({
              name: organizationName,
              owner_id: authData.user.id
            })
            .select()
            .single()
          
          if (orgError) {
            console.error('Organization error:', orgError)
            setDebugInfo(prev => ({ ...prev, orgError }))
            // Continue anyway
          } else if (org) {
            // Link user to organization
            await supabase
              .from('user_organizations')
              .insert({
                user_id: authData.user.id,
                organization_id: org.id,
                role: 'owner'
              })
          }
        }
        
        // Success!
        console.log('Signup successful, redirecting...')
        router.push('/dashboard')
      }
    } catch (err: any) {
      console.error('Unexpected error:', err)
      setError(`Unexpected error: ${err.message}`)
      setDebugInfo({ step: 'unexpected', error: err })
    } finally {
      setLoading(false)
    }
  }

  const handleManualSetup = async () => {
    // Manual setup for sam@gymleadhub.co.uk
    setLoading(true)
    setError(null)
    
    try {
      // Try to sign in first
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'sam@gymleadhub.co.uk',
        password
      })
      
      if (signInData?.user) {
        console.log('Signed in successfully')
        
        // Ensure user record exists
        await supabase.from('users').upsert({
          id: signInData.user.id,
          email: 'sam@gymleadhub.co.uk',
          full_name: 'Sam'
        })
        
        router.push('/dashboard')
      } else {
        setError('Could not sign in. Please check your password.')
      }
    } catch (err: any) {
      setError(`Manual setup failed: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }
  
  const handleEmergencySetup = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/auth/emergency-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'sam@gymleadhub.co.uk',
          password: password || 'TempPassword123!'
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setDebugInfo(data)
        setError(null)
        
        // Try to sign in with the created user
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: 'sam@gymleadhub.co.uk',
          password: password || 'TempPassword123!'
        })
        
        if (signInData?.user) {
          router.push('/dashboard')
        } else {
          setError('User created but could not sign in. Please try manual sign in.')
        }
      } else {
        setError(data.error || 'Emergency setup failed')
        setDebugInfo(data.details)
      }
    } catch (err: any) {
      setError(`Emergency setup error: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 py-12 px-4">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Simple Signup
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Alternative signup page with better error handling
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSignup}>
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {debugInfo && (
            <details className="bg-gray-800 p-4 rounded text-xs text-gray-400">
              <summary className="cursor-pointer">Debug Information</summary>
              <pre className="mt-2 overflow-x-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </details>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                placeholder="sam@gymleadhub.co.uk"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-300">
                Full name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                placeholder="Sam"
              />
            </div>

            <div>
              <label htmlFor="organization" className="block text-sm font-medium text-gray-300">
                Organization name (optional)
              </label>
              <input
                id="organization"
                name="organization"
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                placeholder="GymLeadHub"
              />
            </div>
          </div>

          <div className="space-y-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create account'}
            </button>
            
            {/* Emergency setup button - always visible */}
            <button
              type="button"
              onClick={() => {
                setEmail('sam@gymleadhub.co.uk')
                setName('Sam')
                setOrganizationName('GymLeadHub')
                handleEmergencySetup()
              }}
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-red-600 rounded-md shadow-sm text-sm font-medium text-red-300 bg-red-900 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
            >
              🚨 Emergency Setup for sam@gymleadhub.co.uk (Bypass Auth)
            </button>

            {(email === 'sam@gymleadhub.co.uk' || email.toLowerCase().includes('sam')) && (
              <>
                <button
                  type="button"
                  onClick={handleManualSetup}
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-300 bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  Manual Setup for Sam
                </button>
                
                <button
                  type="button"
                  onClick={() => {
                    setEmail('sam@gymleadhub.co.uk')
                    handleEmergencySetup()
                  }}
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-red-600 rounded-md shadow-sm text-sm font-medium text-red-300 bg-red-900 hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
                >
                  Emergency Setup for sam@gymleadhub.co.uk (Bypass Auth)
                </button>
              </>
            )}
          </div>

          <div className="text-center">
            <span className="text-sm text-gray-400">
              Already have an account?{' '}
              <Link href="/signin" className="font-medium text-orange-500 hover:text-orange-400">
                Sign in
              </Link>
            </span>
          </div>
        </form>
      </div>
    </div>
  )
}