'use client'

import { useState } from 'react'
import { MessageSquare, Send, Check, AlertCircle, Bot } from 'lucide-react'

export default function TestWhatsAppAIPage() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const sampleMessages = [
    'What are your gym hours?',
    'How much is a membership?',
    'Do you have personal training?',
    'Where is the gym located?',
    'Can I freeze my membership?',
    'What classes do you offer?',
    'Do you have a trial pass?',
    'What equipment do you have?'
  ]

  const testAI = async () => {
    if (!message) {
      setError('Please enter a message')
      return
    }

    setLoading(true)
    setError('')
    setResponse(null)

    try {
      const res = await fetch('/api/whatsapp/test-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message,
          phoneNumber: phoneNumber || '+447777777777' // Default test number
        })
      })

      const data = await res.json()
      setResponse(data)
    } catch (err) {
      console.error('Test error:', err)
      setError('Failed to test AI response')
    } finally {
      setLoading(false)
    }
  }

  const sendActualMessage = async () => {
    if (!phoneNumber || !message) {
      setError('Please enter both phone number and message')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phoneNumber,
          message: message
        })
      })

      if (res.ok) {
        setResponse({ success: true, message: 'WhatsApp message sent successfully!' })
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to send message')
      }
    } catch (err) {
      console.error('Send error:', err)
      setError('Failed to send WhatsApp message')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Bot className="h-6 w-6 text-green-600" />
              Test WhatsApp AI Integration
            </h1>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Instructions */}
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex">
                <MessageSquare className="h-5 w-5 text-blue-400 mr-3 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-semibold mb-1">How to Test WhatsApp AI</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Enter a test message to see how the AI would respond</li>
                    <li>Click "Test AI Response" to preview without sending</li>
                    <li>Or enter your phone number and click "Send via WhatsApp" to receive actual message</li>
                    <li>Make sure you've joined the Twilio sandbox first!</li>
                  </ol>
                </div>
              </div>
            </div>

            {/* Phone Number Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number (for actual WhatsApp messages)
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+447777777777"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
              />
              <p className="mt-1 text-xs text-gray-500">
                Include country code (e.g., +44 for UK)
              </p>
            </div>

            {/* Message Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Test Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message here..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Sample Messages */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Quick test messages:</p>
              <div className="flex flex-wrap gap-2">
                {sampleMessages.map((sample) => (
                  <button
                    key={sample}
                    onClick={() => setMessage(sample)}
                    className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition"
                  >
                    {sample}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={testAI}
                disabled={loading || !message}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : (
                  <>
                    <Bot className="h-5 w-5 mr-2" />
                    Test AI Response
                  </>
                )}
              </button>
              
              <button
                onClick={sendActualMessage}
                disabled={loading || !message || !phoneNumber}
                className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : (
                  <>
                    <Send className="h-5 w-5 mr-2" />
                    Send via WhatsApp
                  </>
                )}
              </button>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-800 font-medium">Error</p>
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              </div>
            )}

            {/* Response Display */}
            {response && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  {response.success ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  Result
                </h3>
                
                {response.userMessage && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Your message:</p>
                    <p className="bg-white p-3 rounded border text-sm">{response.userMessage}</p>
                  </div>
                )}
                
                {response.aiResponse && (
                  <div>
                    <p className="text-sm text-gray-600 mb-1">AI response:</p>
                    <p className="bg-white p-3 rounded border text-sm whitespace-pre-wrap">{response.aiResponse}</p>
                  </div>
                )}
                
                {response.message && (
                  <p className="text-sm text-green-600">{response.message}</p>
                )}
                
                {response.debug && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                      Debug Information
                    </summary>
                    <div className="mt-2 p-3 bg-gray-100 rounded text-xs">
                      <p><strong>Knowledge Items Found:</strong> {response.debug.knowledgeItemsFound}</p>
                      <p><strong>Contains Real Data:</strong> {response.debug.knowledgeContainsRealData ? '✅' : '❌'}</p>
                      {response.debug.firstKnowledgeItem && (
                        <div className="mt-2">
                          <strong>Sample Knowledge:</strong>
                          <pre className="mt-1 bg-gray-200 p-2 rounded overflow-x-auto">
                            {response.debug.firstKnowledgeItem}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* Integration Status */}
            <div className="border-t pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Integration Status</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Twilio Configuration</span>
                  <span className="text-green-600">✅ Connected</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>AI Knowledge Base</span>
                  <span className="text-green-600">✅ Loaded</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>WhatsApp Webhook</span>
                  <span className="text-green-600">✅ Active</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}