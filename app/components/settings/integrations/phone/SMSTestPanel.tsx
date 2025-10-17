'use client'

import { useState } from 'react'
import { Send, CheckCircle, XCircle, Loader2, Phone } from 'lucide-react'

interface SMSTestPanelProps {
  settings: any
}

export default function SMSTestPanel({ settings }: SMSTestPanelProps) {
  const [testPhone, setTestPhone] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const sendTestSMS = async () => {
    if (!testPhone) return

    setSending(true)
    setResult(null)

    try {
      const response = await fetch('/api/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testPhone,
          settings
        })
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: 'Test SMS sent successfully! Check your phone.'
        })
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to send test SMS'
        })
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'An error occurred while sending the test SMS'
      })
    } finally {
      setSending(false)
    }
  }

  const primaryNumber = settings?.config?.phone_numbers?.find((p: any) => p.is_primary)

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Test SMS Configuration</h3>
      
      <div className="space-y-4">
        {primaryNumber && (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Phone className="h-4 w-4" />
            <span>Sending from: {primaryNumber.number}</span>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Send Test SMS To
          </label>
          <div className="flex gap-3">
            <input
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+447123456789"
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={sendTestSMS}
              disabled={!testPhone || sending || !primaryNumber}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send Test
            </button>
          </div>
          {!primaryNumber && (
            <p className="text-xs text-red-400 mt-1">
              Please add a phone number above before sending test messages
            </p>
          )}
        </div>

        {result && (
          <div className={`p-4 rounded-lg ${result.success ? 'bg-green-600/20 border border-green-600' : 'bg-red-600/20 border border-red-600'}`}>
            <div className="flex items-start gap-3">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={`text-sm ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                  {result.message}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-900 rounded-lg p-4">
          <h4 className="text-sm font-medium text-gray-400 mb-2">Test SMS Contents</h4>
          <ul className="space-y-1 text-xs text-gray-500">
            <li>• Message: "Test SMS from Atlas Fitness. Your SMS integration is working correctly!"</li>
            <li>• Tests your Twilio credentials</li>
            <li>• Verifies phone number configuration</li>
            <li>• Confirms delivery to the recipient</li>
          </ul>
        </div>
      </div>
    </div>
  )
}