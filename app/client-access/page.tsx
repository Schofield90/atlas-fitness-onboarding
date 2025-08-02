'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mail, Lock, User } from 'lucide-react'

export default function ClientAccessPage() {
  const router = useRouter()
  const [method, setMethod] = useState<'code' | 'email'>('code')
  const [accessCode, setAccessCode] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleCodeAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      // Direct API call to verify and get access
      const response = await fetch('/api/client-access/verify', {
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

      // Store client info in session storage
      sessionStorage.setItem('client_access', JSON.stringify({
        clientId: data.client.id,
        clientName: data.client.name || `${data.client.first_name} ${data.client.last_name}`,
        clientEmail: data.client.email,
        accessCode: accessCode.toUpperCase()
      }))

      // Redirect to client area
      window.location.href = '/client-area/dashboard'
    } catch (err) {
      console.error('Access error:', err)
      setError('Failed to verify access')
    } finally {
      setLoading(false)
    }
  }

  const handleEmailAccess = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/client-access/send-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to send link')
        return
      }

      setSuccess('Check your email for an access link!')
      setEmail('')
    } catch (err) {
      console.error('Email error:', err)
      setError('Failed to send access link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Client Access Portal
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Access your fitness journey
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
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
            <form onSubmit={handleCodeAccess}>
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
                  {loading ? 'Verifying...' : 'Access Portal'}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleEmailAccess}>
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
                  We'll send you a secure access link
                </p>
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Access Link'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}