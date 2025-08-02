'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import { Mail, Lock, User } from 'lucide-react'

export default function ClientPortalLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [method, setMethod] = useState<'code' | 'email'>('code')
  const [accessCode, setAccessCode] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleCodeLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Call API to verify access code
      const response = await fetch('/api/client-portal/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accessCode: accessCode.toUpperCase()
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid access code')
        return
      }

      if (data.portalAccess.is_claimed && data.portalAccess.user_id) {
        // Already claimed, try to sign in with the email
        // For first-time setup, they'll need to use magic link
        setError('This access has been claimed. Please use the Email Link option to sign in.')
        return
      } else {
        // First time, redirect to claim page
        router.push(`/client-portal/claim?token=${data.portalAccess.magic_link_token}`)
        return
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('Failed to login')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/client/dashboard`
        }
      })

      if (error) throw error

      setSuccess('Check your email for a login link!')
      setEmail('')
    } catch (err: any) {
      console.error('Email login error:', err)
      setError(err.message || 'Failed to send login link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Client Portal Login
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Access your fitness journey
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          {/* Method selector */}
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMethod('code')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  method === 'code'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Lock className="h-4 w-4 inline mr-2" />
                Access Code
              </button>
              <button
                type="button"
                onClick={() => setMethod('email')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  method === 'email'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Mail className="h-4 w-4 inline mr-2" />
                Email Link
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-600 px-4 py-3 rounded">
              {success}
            </div>
          )}

          {method === 'code' ? (
            <form onSubmit={handleCodeLogin}>
              <div>
                <label htmlFor="accessCode" className="block text-sm font-medium text-gray-700">
                  Access Code
                </label>
                <div className="mt-1 relative">
                  <input
                    id="accessCode"
                    name="accessCode"
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX-XXXX"
                    required
                    className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <User className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Enter the code provided by your gym
                </p>
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Logging in...' : 'Login with Code'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleEmailLogin}>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <div className="mt-1 relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="appearance-none block w-full px-3 py-2 pl-10 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                  <Mail className="h-5 w-5 text-gray-400 absolute left-3 top-2.5" />
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  We'll send you a secure login link
                </p>
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Login Link'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Need help?</span>
              </div>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Contact your gym for assistance
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}