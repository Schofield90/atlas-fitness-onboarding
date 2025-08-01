'use client'

import { useState } from 'react'
import DashboardLayout from '../components/DashboardLayout'

export default function SendCustomerLoginPage() {
  const [email, setEmail] = useState('sam@schofield.com')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  const sendLoginLink = async () => {
    setLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/customers/send-login-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send login link')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Send Customer Login Link</h1>
          
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Customer Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
                placeholder="customer@example.com"
              />
            </div>

            <button
              onClick={sendLoginLink}
              disabled={loading || !email}
              className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 px-6 py-2 rounded-lg transition-colors"
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded-lg">
                <p className="text-red-300">{error}</p>
              </div>
            )}

            {result && (
              <div className="mt-4 p-4 bg-green-900/50 border border-green-700 rounded-lg">
                <p className="text-green-300 font-medium">{result.message}</p>
                <p className="text-sm text-gray-400 mt-1">
                  Sent to: {result.email}
                  {result.customer && ` (${result.customer})`}
                </p>
              </div>
            )}

            <div className="mt-6 p-4 bg-gray-700 rounded-lg">
              <h3 className="font-medium mb-2">How it works:</h3>
              <ul className="text-sm text-gray-400 space-y-1">
                <li>• Customer receives an email with a magic link</li>
                <li>• Clicking the link logs them in automatically</li>
                <li>• They'll be redirected to the booking page</li>
                <li>• Link expires in 1 hour for security</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}