'use client'

import { useState } from 'react'
import { Send, CheckCircle, XCircle, Loader2, MessageSquare } from 'lucide-react'

interface WhatsAppTestPanelProps {
  settings: any
}

export default function WhatsAppTestPanel({ settings }: WhatsAppTestPanelProps) {
  const [testPhone, setTestPhone] = useState('')
  const [testMessage, setTestMessage] = useState('Hi, I\'d like to know more about your gym memberships')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)

  const sendTestMessage = async () => {
    if (!testPhone || !testMessage) return

    setSending(true)
    setResult(null)

    try {
      const response = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testPhone,
          message: testMessage,
          settings
        })
      })

      const data = await response.json()

      if (response.ok) {
        setResult({
          success: true,
          message: 'Test message sent successfully! Check WhatsApp.'
        })
      } else {
        setResult({
          success: false,
          message: data.error || 'Failed to send test message'
        })
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'An error occurred while sending the test message'
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Test WhatsApp Configuration</h3>
      
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <MessageSquare className="h-4 w-4" />
          <span>Sending from: {settings?.config?.business_number || 'Not configured'}</span>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Recipient Phone Number
          </label>
          <input
            type="tel"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="+447123456789"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            Must have joined the Twilio Sandbox first
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Test Message
          </label>
          <textarea
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Type your test message..."
          />
        </div>

        <button
          onClick={sendTestMessage}
          disabled={!testPhone || !testMessage || sending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          Send Test Message
        </button>

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
          <h4 className="text-sm font-medium text-gray-400 mb-2">Testing Notes</h4>
          <ul className="space-y-1 text-xs text-gray-500">
            <li>• Recipient must join Twilio Sandbox first</li>
            <li>• Send "join [your-sandbox-word]" to +14155238886</li>
            <li>• AI responses will be enabled if configured</li>
            <li>• Check webhook logs for debugging</li>
          </ul>
        </div>
      </div>
    </div>
  )
}