'use client'

import { useState, useEffect } from 'react'
import { X, Key, Loader2, ExternalLink, Check, AlertCircle, Phone } from 'lucide-react'
import { createClient } from '@/app/lib/supabase/client'

interface TwilioCredentialsModalProps {
  isOpen: boolean
  onClose: () => void
  onCredentialsSaved: (credentials: any) => void
}

interface TwilioNumber {
  phoneNumber: string
  friendlyName: string
  capabilities: {
    voice: boolean
    sms: boolean
  }
  sid: string
}

export default function TwilioCredentialsModal({ 
  isOpen, 
  onClose, 
  onCredentialsSaved 
}: TwilioCredentialsModalProps) {
  const [accountSid, setAccountSid] = useState('')
  const [authToken, setAuthToken] = useState('')
  const [validating, setValidating] = useState(false)
  const [fetchingNumbers, setFetchingNumbers] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [twilioNumbers, setTwilioNumbers] = useState<TwilioNumber[]>([])
  const [selectedNumber, setSelectedNumber] = useState<TwilioNumber | null>(null)
  const [step, setStep] = useState<'credentials' | 'selectNumber'>('credentials')
  const supabase = createClient()

  const validateCredentials = async () => {
    if (!accountSid.trim() || !authToken.trim()) {
      setError('Please enter both Account SID and Auth Token')
      return
    }

    setValidating(true)
    setError('')

    try {
      const response = await fetch('/api/phone/validate-twilio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountSid, authToken })
      })

      const data = await response.json()

      if (!response.ok || !data.valid) {
        throw new Error(data.error || 'Invalid credentials')
      }

      setSuccess(true)
      
      // Fetch available numbers from this account
      setFetchingNumbers(true)
      const numbersResponse = await fetch('/api/phone/list-twilio-numbers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountSid, authToken })
      })

      const numbersData = await numbersResponse.json()
      
      if (numbersData.numbers && numbersData.numbers.length > 0) {
        setTwilioNumbers(numbersData.numbers)
        setStep('selectNumber')
      } else {
        setError('No phone numbers found in this Twilio account. Please purchase a number in Twilio first.')
        setSuccess(false)
      }
    } catch (error: any) {
      console.error('Validation error:', error)
      setError(error.message || 'Failed to validate credentials')
      setSuccess(false)
    } finally {
      setValidating(false)
      setFetchingNumbers(false)
    }
  }

  const handleSaveConfiguration = async () => {
    if (!selectedNumber) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) throw new Error('No organization found')

      // Save configuration
      await supabase.from('phone_configurations').insert({
        organization_id: userOrg.organization_id,
        twilio_account_sid: accountSid,
        twilio_auth_token: authToken,
        phone_number: selectedNumber.phoneNumber,
        phone_sid: selectedNumber.sid,
        is_external_account: true,
        capabilities: ['voice', 'sms'],
        status: 'active'
      })

      // Configure webhooks for this number
      await fetch('/api/phone/configure-webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountSid,
          authToken,
          phoneSid: selectedNumber.sid,
          organizationId: userOrg.organization_id
        })
      })

      onCredentialsSaved({
        accountSid,
        authToken,
        selectedNumber: selectedNumber.phoneNumber,
        phoneSid: selectedNumber.sid
      })
    } catch (error) {
      console.error('Error saving configuration:', error)
      setError('Failed to save configuration')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Connect Your Twilio Account
            </h2>
            <p className="text-sm text-gray-400 mt-1">
              {step === 'credentials' 
                ? 'Enter your Twilio credentials to connect your account'
                : 'Select a phone number from your Twilio account'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg"
          >
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'credentials' ? (
            <>
              {/* Instructions */}
              <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4 mb-6">
                <div className="flex gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-300">
                    <p className="font-medium mb-2">How to find your Twilio credentials:</p>
                    <ol className="list-decimal list-inside space-y-1 text-blue-200">
                      <li>Log in to your Twilio Console</li>
                      <li>Find your Account SID and Auth Token on the dashboard</li>
                      <li>Copy and paste them below</li>
                    </ol>
                    <a
                      href="https://console.twilio.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-blue-400 hover:text-blue-300"
                    >
                      Open Twilio Console
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Credentials Form */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Account SID
                  </label>
                  <input
                    type="text"
                    value={accountSid}
                    onChange={(e) => setAccountSid(e.target.value)}
                    placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Starts with "AC" followed by 32 characters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Auth Token
                  </label>
                  <input
                    type="password"
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    placeholder="••••••••••••••••••••••••••••••••"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 font-mono"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    32 character authentication token
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-900/20 border border-red-800 rounded-lg">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-green-900/20 border border-green-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-400" />
                      <p className="text-sm text-green-400">
                        Credentials validated successfully!
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* No Account Section */}
              <div className="mt-6 pt-6 border-t border-gray-700">
                <p className="text-sm text-gray-400 mb-3">
                  Don't have a Twilio account yet?
                </p>
                <a
                  href="https://www.twilio.com/try-twilio"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                >
                  Create Free Twilio Account
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </>
          ) : (
            <>
              {/* Number Selection */}
              <div className="space-y-3">
                <p className="text-sm text-gray-400 mb-4">
                  Select which phone number to use with your CRM:
                </p>
                
                {twilioNumbers.map((number) => (
                  <button
                    key={number.sid}
                    onClick={() => setSelectedNumber(number)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      selectedNumber?.sid === number.sid
                        ? 'bg-orange-900/20 border-orange-500'
                        : 'bg-gray-700 border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Phone className="h-5 w-5 text-orange-500" />
                        <div>
                          <p className="font-mono text-white">
                            {number.phoneNumber}
                          </p>
                          {number.friendlyName && (
                            <p className="text-xs text-gray-400 mt-1">
                              {number.friendlyName}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {selectedNumber?.sid === number.sid && (
                        <div className="p-1 bg-orange-600 rounded-full">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2 mt-2">
                      {number.capabilities.voice && (
                        <span className="px-2 py-0.5 bg-gray-600 rounded text-xs text-gray-300">
                          Voice
                        </span>
                      )}
                      {number.capabilities.sms && (
                        <span className="px-2 py-0.5 bg-gray-600 rounded text-xs text-gray-300">
                          SMS
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-800 rounded-lg">
                <p className="text-xs text-yellow-300">
                  Don't see the number you want? Purchase additional numbers in your Twilio Console first.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-700">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
            
            {step === 'credentials' ? (
              <button
                onClick={validateCredentials}
                disabled={validating || !accountSid || !authToken}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {validating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Key className="h-4 w-4" />
                    Validate & Continue
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleSaveConfiguration}
                disabled={!selectedNumber}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Connect Number
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}