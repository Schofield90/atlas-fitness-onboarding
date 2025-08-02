'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import { CheckCircle, Mail } from 'lucide-react'

export default function ClaimPortalAccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState(false)
  const [error, setError] = useState('')
  const [portalAccess, setPortalAccess] = useState<any>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    verifyToken()
  }, [])

  const verifyToken = async () => {
    const token = searchParams.get('token')
    
    if (!token) {
      setError('Invalid access link')
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('client_portal_access')
        .select('*, clients(*)')
        .eq('magic_link_token', token)
        .single()

      if (error || !data) {
        setError('Invalid or expired link')
        return
      }

      if (data.is_claimed) {
        setError('This access has already been claimed')
        return
      }

      setPortalAccess(data)
    } catch (err) {
      console.error('Token verification error:', err)
      setError('Failed to verify access')
    } finally {
      setLoading(false)
    }
  }

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setClaiming(true)
    setError('')

    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: portalAccess.clients.email,
        password: password,
        options: {
          data: {
            client_id: portalAccess.client_id,
            name: portalAccess.clients.name || `${portalAccess.clients.first_name} ${portalAccess.clients.last_name}`
          }
        }
      })

      if (authError) throw authError

      if (authData.user) {
        // Update client with user_id
        const { error: updateClientError } = await supabase
          .from('clients')
          .update({ user_id: authData.user.id })
          .eq('id', portalAccess.client_id)

        if (updateClientError) throw updateClientError

        // Mark portal access as claimed
        const { error: claimError } = await supabase
          .from('client_portal_access')
          .update({
            is_claimed: true,
            claimed_at: new Date().toISOString(),
            user_id: authData.user.id
          })
          .eq('id', portalAccess.id)

        if (claimError) throw claimError

        // Sign in the user
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: portalAccess.clients.email,
          password: password
        })

        if (signInError) throw signInError

        router.push('/client/dashboard')
      }
    } catch (err: any) {
      console.error('Claim error:', err)
      setError(err.message || 'Failed to set up account')
    } finally {
      setClaiming(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (error && !portalAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-6 text-center">
          <div className="text-red-600 mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => router.push('/client-portal/login')}
            className="text-blue-600 hover:text-blue-800"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center mb-6">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900">Claim Your Portal Access</h2>
            <p className="mt-2 text-gray-600">
              Welcome {portalAccess?.clients.first_name}! Set up your password to access your client portal.
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="mb-6 bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Mail className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm text-gray-600">Email</span>
            </div>
            <p className="font-medium">{portalAccess?.clients.email}</p>
          </div>

          <form onSubmit={handleClaim}>
            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Choose Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <input
                  type="password"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-6">
              <button
                type="submit"
                disabled={claiming}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {claiming ? 'Setting up...' : 'Create Account'}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => router.push('/client-portal/login')}
                className="text-blue-600 hover:text-blue-800"
              >
                Login here
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}