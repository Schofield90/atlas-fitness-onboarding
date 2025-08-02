'use client'

import { useState, useEffect } from 'react'
import { Phone, AlertCircle, CheckCircle, Info } from 'lucide-react'

export default function ConfigurePhonePage() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [currentConfig, setCurrentConfig] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkCurrentConfig()
  }, [])

  const checkCurrentConfig = async () => {
    try {
      const response = await fetch('/api/debug/check-phone-config')
      const data = await response.json()
      setCurrentConfig(data)
    } catch (error) {
      console.error('Error checking config:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    
    // Format as UK number
    if (digits.startsWith('44')) {
      return `+${digits}`
    } else if (digits.startsWith('0')) {
      return `+44${digits.substring(1)}`
    } else if (digits.length === 10) {
      return `+44${digits}`
    }
    
    return value
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b">
            <h1 className="text-2xl font-bold text-gray-900">Configure Phone for Calls</h1>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Current Configuration */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h2 className="font-semibold mb-3">Current Configuration</h2>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">USER_PHONE_NUMBER:</span>
                  <span className={`font-mono ${currentConfig?.userPhone ? 'text-green-600' : 'text-red-600'}`}>
                    {currentConfig?.userPhone || 'Not configured'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">TWILIO_SMS_FROM:</span>
                  <span className={`font-mono ${currentConfig?.twilioFrom ? 'text-green-600' : 'text-gray-900'}`}>
                    {currentConfig?.twilioFrom || 'Not configured'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Twilio Account:</span>
                  <span className={`${currentConfig?.twilioConfigured ? 'text-green-600' : 'text-red-600'}`}>
                    {currentConfig?.twilioConfigured ? 'Configured' : 'Not configured'}
                  </span>
                </div>
              </div>
            </div>

            {/* Information */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex">
                <Info className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-semibold mb-1">How the Call Feature Works</p>
                  <p>When you click "Call" on a lead:</p>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>The system calls the lead's phone number</li>
                    <li>When they answer, it then calls YOUR phone number</li>
                    <li>Once you answer, it connects both calls together</li>
                  </ol>
                  <p className="mt-2">
                    The USER_PHONE_NUMBER is YOUR phone that will receive the call.
                  </p>
                </div>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-4">
              <h3 className="font-semibold">To Enable Calling:</h3>
              
              <div className="border rounded-lg p-4 space-y-3">
                <p className="text-sm text-gray-600">
                  Add this to your Vercel environment variables:
                </p>
                
                <div className="bg-gray-900 text-gray-100 rounded p-4 font-mono text-sm">
                  USER_PHONE_NUMBER=+447777777777
                </div>
                
                <p className="text-sm text-gray-600">
                  Replace with your actual phone number in international format.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-medium text-sm">Steps:</p>
                <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
                  <li>Go to your Vercel dashboard</li>
                  <li>Navigate to Settings → Environment Variables</li>
                  <li>Add USER_PHONE_NUMBER with your phone number</li>
                  <li>Redeploy your application</li>
                </ol>
              </div>
            </div>

            {/* Phone Number Helper */}
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3">Phone Number Format Helper</h3>
              <div className="space-y-3">
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="Enter your phone number"
                  className="w-full px-3 py-2 border rounded-md"
                />
                {phoneNumber && (
                  <div className="bg-gray-50 rounded p-3">
                    <p className="text-sm text-gray-600">Formatted for environment variable:</p>
                    <p className="font-mono text-lg mt-1">{formatPhoneNumber(phoneNumber)}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Test Call Section */}
            {currentConfig?.userPhone && (
              <div className="border-t pt-6">
                <h3 className="font-semibold mb-3">Test Your Configuration</h3>
                <a
                  href="/call-test"
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  Go to Call Test Page
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}