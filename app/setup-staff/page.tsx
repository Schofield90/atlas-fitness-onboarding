'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/app/components/DashboardLayout'
import { Phone, Mail, Check } from 'lucide-react'

export default function SetupStaffPage() {
  const [phoneNumber, setPhoneNumber] = useState('+447490253471') // Your number as default
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/setup/add-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, email })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to setup staff')
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/leads')
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto mt-20">
          <div className="bg-green-900/50 border border-green-600 rounded-lg p-8 text-center">
            <Check className="w-16 h-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Setup Complete!</h2>
            <p className="text-gray-300">You can now make and receive calls.</p>
            <p className="text-sm text-gray-400 mt-2">Redirecting...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-md mx-auto mt-20">
        <div className="bg-gray-800 rounded-lg p-8">
          <h1 className="text-2xl font-bold mb-6">Setup Your Staff Profile</h1>
          
          <p className="text-gray-400 mb-6">
            To use the calling features, you need to be registered as a staff member 
            with your phone number.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                <Phone className="inline w-4 h-4 mr-2" />
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="+447777777777"
                required
              />
              <p className="text-xs text-gray-400 mt-1">
                Include country code (e.g., +44 for UK)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                <Mail className="inline w-4 h-4 mr-2" />
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="you@example.com"
                required
              />
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-600 rounded-lg p-3">
                <p className="text-sm text-red-200">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {loading ? 'Setting up...' : 'Complete Setup'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-300">
              <strong>Note:</strong> This will register you as a staff member who can:
            </p>
            <ul className="text-sm text-gray-400 mt-2 space-y-1">
              <li>• Receive incoming calls</li>
              <li>• Make outbound calls to leads</li>
              <li>• Receive SMS and WhatsApp messages</li>
              <li>• Access all communication features</li>
            </ul>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}