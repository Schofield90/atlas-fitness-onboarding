'use client'

import { useState } from 'react'
import { Send, MessageSquare, Phone, CheckCircle, XCircle } from 'lucide-react'

export default function TestWhatsAppPage() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [testType, setTestType] = useState<'whatsapp' | 'sms'>('whatsapp')

  const handleSend = async () => {
    if (!phoneNumber || !message) {
      alert('Please enter both phone number and message')
      return
    }

    setSending(true)
    setResult(null)

    try {
      const endpoint = testType === 'whatsapp' ? '/api/whatsapp/send' : '/api/sms/send'
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: phoneNumber,
          message: message
        })
      })

      const data = await response.json()
      setResult({
        success: response.ok,
        data: data,
        status: response.status
      })
    } catch (error: any) {
      setResult({
        success: false,
        error: error.message
      })
    } finally {
      setSending(false)
    }
  }

  const testMessages = {
    whatsapp: [
      {
        label: 'Welcome Message',
        message: `🎉 Welcome to Atlas Fitness! We're excited to have you join our fitness community. 

Here's what happens next:
📅 Your trial is now active
🏋️ You can book classes through our app
💪 Our trainers are here to help

Need help? Just reply to this message!`
      },
      {
        label: 'Class Reminder',
        message: `Hi there! 🏃‍♀️ 

Just a reminder about your Spin Class today at 6:00 PM.

See you there! 💪`
      },
      {
        label: 'Payment Reminder',
        message: `Hi! This is a friendly reminder that your membership payment of $99 is due on March 1st.

To keep your membership active, please ensure payment is made by the due date.`
      }
    ],
    sms: [
      {
        label: 'Quick Reminder',
        message: 'Atlas Fitness: Your class starts in 1 hour. See you there!'
      },
      {
        label: 'Membership Alert',
        message: 'Atlas Fitness: Your membership expires in 3 days. Renew now to keep your rate!'
      }
    ]
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8">Test WhatsApp/SMS Integration</h1>
        
        <div className="bg-gray-800 rounded-lg p-6 mb-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Message Type</label>
            <div className="flex gap-4">
              <button
                onClick={() => setTestType('whatsapp')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  testType === 'whatsapp'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <MessageSquare className="inline h-4 w-4 mr-2" />
                WhatsApp
              </button>
              <button
                onClick={() => setTestType('sms')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  testType === 'sms'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Phone className="inline h-4 w-4 mr-2" />
                SMS
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Phone Number (with country code)
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1234567890"
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              Include country code (e.g., +1 for US, +44 for UK)
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message..."
              rows={6}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="mb-6">
            <p className="text-sm font-medium text-gray-300 mb-2">Quick Templates:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {testMessages[testType].map((template, index) => (
                <button
                  key={index}
                  onClick={() => setMessage(template.message)}
                  className="text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                >
                  <p className="text-sm font-medium text-white">{template.label}</p>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">{template.message}</p>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSend}
            disabled={sending || !phoneNumber || !message}
            className={`w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center ${
              sending || !phoneNumber || !message
                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600 text-white'
            }`}
          >
            {sending ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
                Send {testType === 'whatsapp' ? 'WhatsApp' : 'SMS'} Message
              </>
            )}
          </button>
        </div>

        {/* Result Display */}
        {result && (
          <div className={`rounded-lg p-6 ${
            result.success ? 'bg-green-900/20 border border-green-600' : 'bg-red-900/20 border border-red-600'
          }`}>
            <div className="flex items-center mb-3">
              {result.success ? (
                <>
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
                  <h3 className="text-lg font-semibold text-green-400">Message Sent Successfully!</h3>
                </>
              ) : (
                <>
                  <XCircle className="h-6 w-6 text-red-500 mr-2" />
                  <h3 className="text-lg font-semibold text-red-400">Failed to Send Message</h3>
                </>
              )}
            </div>
            
            <div className="bg-gray-800 rounded p-4">
              <pre className="text-sm text-gray-300 overflow-auto">
                {JSON.stringify(result.data || result.error, null, 2)}
              </pre>
            </div>

            {result.success && result.data?.messageId && (
              <p className="text-sm text-gray-400 mt-3">
                Message ID: <span className="text-white font-mono">{result.data.messageId}</span>
              </p>
            )}
          </div>
        )}

        {/* WhatsApp Sandbox Notice */}
        <div className="mt-8 bg-yellow-900/20 border border-yellow-600 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-yellow-400 mb-4">⚠️ Important: WhatsApp Sandbox Setup</h2>
          <div className="space-y-3 text-gray-300">
            <p className="font-semibold">Before sending WhatsApp messages, you must:</p>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>Send <code className="bg-gray-700 px-2 py-1 rounded text-sm">join [sandbox-keyword]</code> to <code className="bg-gray-700 px-2 py-1 rounded text-sm">+14155238886</code></li>
              <li>You'll receive a confirmation message</li>
              <li>Then you can send test messages to your number</li>
            </ol>
            <p className="text-sm text-gray-400 mt-3">
              Note: The sandbox keyword is unique to your Twilio account. Check your Twilio Console → Messaging → Try it out → Send a WhatsApp message.
            </p>
          </div>
        </div>

        {/* Setup Instructions */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Setup Instructions</h2>
          <ol className="space-y-3 text-gray-300">
            <li>
              <span className="font-semibold text-orange-400">1.</span> Create a Twilio account at{' '}
              <a href="https://www.twilio.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                twilio.com
              </a>
            </li>
            <li>
              <span className="font-semibold text-orange-400">2.</span> Get your Account SID and Auth Token from the Twilio Console
            </li>
            <li>
              <span className="font-semibold text-orange-400">3.</span> For WhatsApp: Set up a WhatsApp sender in the Twilio Sandbox
            </li>
            <li>
              <span className="font-semibold text-orange-400">4.</span> Add these to your <code className="bg-gray-700 px-2 py-1 rounded text-sm">.env.local</code>:
              <pre className="mt-2 bg-gray-700 p-3 rounded text-sm overflow-auto">
{`TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
TWILIO_SMS_FROM=+your_twilio_phone_number`}
              </pre>
            </li>
            <li>
              <span className="font-semibold text-orange-400">5.</span> Configure webhook URL in Twilio:{' '}
              <code className="bg-gray-700 px-2 py-1 rounded text-sm">
                {process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.vercel.app'}/api/webhooks/twilio
              </code>
            </li>
          </ol>
        </div>
      </div>
    </div>
  )
}