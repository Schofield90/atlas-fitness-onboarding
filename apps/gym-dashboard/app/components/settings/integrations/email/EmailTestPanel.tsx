'use client'

import { useState } from 'react'
import { Send, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/app/lib/supabase/client'

interface EmailTestPanelProps {
  settings: any
}

export default function EmailTestPanel({ settings }: EmailTestPanelProps) {
  const [testEmail, setTestEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const supabase = createClient()

  const sendTestEmail = async () => {
    if (!testEmail) return

    setSending(true)
    setResult(null)

    try {
      const response = await fetch('/api/email/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          settings
        })
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: 'Test email sent successfully! Check your inbox.'
        })
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to send test email'
        })
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'An error occurred while sending the test email'
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Test Email Configuration</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Send Test Email To
          </label>
          <div className="flex gap-3">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="test@example.com"
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={sendTestEmail}
              disabled={!testEmail || sending}
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
          <h4 className="text-sm font-medium text-gray-400 mb-2">Test Email Contents</h4>
          <ul className="space-y-1 text-xs text-gray-500">
            <li>• Subject: "Test Email from Atlas Fitness"</li>
            <li>• Includes your configured From Name and Email</li>
            <li>• Tests your email service connection</li>
            <li>• Verifies delivery to the recipient</li>
          </ul>
        </div>
      </div>
    </div>
  )
}