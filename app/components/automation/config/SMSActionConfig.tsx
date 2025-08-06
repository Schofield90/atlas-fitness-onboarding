'use client'

import { useState } from 'react'
import { MessageSquare, Variable, Sparkles, Eye, Clock, Send, CheckCircle, XCircle, Loader2 } from 'lucide-react'

interface SMSActionConfigProps {
  config: any
  onChange: (config: any) => void
  organizationId?: string
}

export default function SMSActionConfig({ config, onChange, organizationId }: SMSActionConfigProps) {
  const [message, setMessage] = useState(config.message || '')
  const [showVariables, setShowVariables] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [sendingOptions, setSendingOptions] = useState(config.sendingOptions || {
    includeOptOut: true,
    trackDelivery: true,
    fallbackToEmail: false
  })
  const [testPhone, setTestPhone] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  const availableVariables = [
    { key: '[first_name]', label: 'First Name', example: 'John' },
    { key: '[last_name]', label: 'Last Name', example: 'Doe' },
    { key: '[name]', label: 'Full Name', example: 'John Doe' },
    { key: '[organization_name]', label: 'Gym Name', example: 'Atlas Fitness' },
    { key: '[phone]', label: 'Phone Number', example: '+447123456789' },
    { key: '[email]', label: 'Email', example: 'john@example.com' },
    { key: '[lead_source]', label: 'Lead Source', example: 'Facebook' },
    { key: '[interest]', label: 'Interest/Goal', example: 'weight loss' },
    { key: '[current_date]', label: 'Current Date', example: '31/01/2025' },
    { key: '[current_time]', label: 'Current Time', example: '14:30' }
  ]

  const handleMessageChange = (value: string) => {
    setMessage(value)
    onChange({
      ...config,
      message: value,
      sendingOptions
    })
  }

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('sms-message') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newText = message.substring(0, start) + variable + message.substring(end)
      handleMessageChange(newText)
      
      // Reset cursor position
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + variable.length, start + variable.length)
      }, 0)
    }
  }

  const generateWithAI = async () => {
    setAiGenerating(true)
    try {
      // Simulate AI generation
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const aiMessage = `Hi [first_name]! 👋 Ready to start your fitness journey at [organization_name]? 

I noticed you're interested in [interest] - we have a special program starting next week that's perfect for you!

Reply YES to claim your FREE trial session, or call us to chat.

[organization_name] Team`
      
      handleMessageChange(aiMessage)
    } catch (error) {
      console.error('AI generation error:', error)
    } finally {
      setAiGenerating(false)
    }
  }

  const handleSendingOptionChange = (option: string, value: boolean) => {
    const updated = { ...sendingOptions, [option]: value }
    setSendingOptions(updated)
    onChange({
      ...config,
      message,
      sendingOptions: updated
    })
  }

  const getCharacterCount = () => {
    return message.length
  }

  const getSMSCount = () => {
    const length = message.length
    if (length <= 160) return 1
    return Math.ceil(length / 153) // SMS are split at 153 chars for multi-part
  }

  const renderPreview = () => {
    let preview = message
    
    // Replace variables with example data
    availableVariables.forEach(variable => {
      preview = preview.replace(new RegExp(variable.key.replace('[', '\\[').replace(']', '\\]'), 'g'), variable.example)
    })

    return preview
  }

  const sendTestSMS = async () => {
    if (!testPhone || !organizationId) return
    
    setSendingTest(true)
    setTestResult(null)
    
    try {
      // Prepare test message with variable replacement
      let testMessage = message || 'Test SMS from [organization_name]. Your SMS integration is working correctly!'
      
      // Replace variables with sample data for test
      const sampleData = {
        '[first_name]': 'John',
        '[last_name]': 'Doe', 
        '[name]': 'John Doe',
        '[organization_name]': 'Atlas Fitness',
        '[phone]': testPhone,
        '[email]': 'john@example.com',
        '[lead_source]': 'Website',
        '[interest]': 'Personal Training',
        '[current_date]': new Date().toLocaleDateString('en-GB'),
        '[current_time]': new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      }
      
      Object.entries(sampleData).forEach(([key, value]) => {
        testMessage = testMessage.replace(new RegExp(key.replace('[', '\\[').replace(']', '\\]'), 'g'), value)
      })
      
      const response = await fetch('/api/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          testPhone,
          message: testMessage,
          includeOptOut: sendingOptions.includeOptOut
        })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setTestResult({
          success: true,
          message: 'Test SMS sent successfully! Check your phone.'
        })
      } else {
        setTestResult({
          success: false,
          message: data.error || 'Failed to send test SMS'
        })
      }
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'An error occurred while sending the test SMS'
      })
    } finally {
      setSendingTest(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Message Input */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            SMS Message
          </label>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowVariables(!showVariables)}
              className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
            >
              <Variable className="w-4 h-4 mr-1" />
              Variables
            </button>
            <button
              type="button"
              onClick={generateWithAI}
              disabled={aiGenerating}
              className="text-sm text-purple-600 hover:text-purple-700 flex items-center"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              {aiGenerating ? 'Generating...' : 'AI Write'}
            </button>
          </div>
        </div>
        
        <textarea
          id="sms-message"
          value={message}
          onChange={(e) => handleMessageChange(e.target.value)}
          placeholder="Type your SMS message here... Use [first_name] to personalize"
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md"
        />
        
        <div className="mt-1 flex items-center justify-between text-sm">
          <span className={`${getCharacterCount() > 160 ? 'text-orange-600' : 'text-gray-500'}`}>
            {getCharacterCount()} characters
          </span>
          <span className="text-gray-500">
            {getSMSCount()} SMS {getSMSCount() > 1 ? 'messages' : 'message'}
          </span>
        </div>
      </div>

      {/* Variable Helper */}
      {showVariables && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Click to insert placeholders:</h4>
          <div className="grid grid-cols-2 gap-2">
            {availableVariables.map((variable) => (
              <button
                key={variable.key}
                type="button"
                onClick={() => insertVariable(variable.key)}
                className="text-left px-2 py-1 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50"
              >
                <code className="text-blue-600">{variable.key}</code>
                <span className="text-gray-600 ml-1">→ {variable.example}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sending Options */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Sending Options</h3>
        
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={sendingOptions.includeOptOut}
            onChange={(e) => handleSendingOptionChange('includeOptOut', e.target.checked)}
            className="rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm text-gray-700">
            Include opt-out message (Reply STOP to unsubscribe)
          </span>
        </label>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={sendingOptions.trackDelivery}
            onChange={(e) => handleSendingOptionChange('trackDelivery', e.target.checked)}
            className="rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm text-gray-700">
            Track delivery status
          </span>
        </label>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={sendingOptions.fallbackToEmail}
            onChange={(e) => handleSendingOptionChange('fallbackToEmail', e.target.checked)}
            className="rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm text-gray-700">
            Fall back to email if SMS fails
          </span>
        </label>
      </div>

      {/* Character Limit Warning */}
      {getCharacterCount() > 160 && (
        <div className="p-3 bg-orange-50 rounded-lg">
          <div className="flex items-start">
            <Clock className="w-5 h-5 text-orange-600 mt-0.5 mr-2" />
            <div className="text-sm text-orange-800">
              <p className="font-medium">Message will be split</p>
              <p>Your message exceeds 160 characters and will be sent as {getSMSCount()} separate SMS messages, which may increase costs.</p>
            </div>
          </div>
        </div>
      )}

      {/* Test SMS Section */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Test SMS</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Send test SMS to
            </label>
            <div className="flex gap-2">
              <input
                type="tel"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="+447123456789"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={sendTestSMS}
                disabled={!testPhone || sendingTest || !message}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {sendingTest ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Send Test
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Include country code (e.g., +44 for UK, +1 for US)
            </p>
          </div>
          
          {testResult && (
            <div className={`p-3 rounded-md ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-start">
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5" />
                )}
                <p className={`text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {testResult.message}
                </p>
              </div>
            </div>
          )}
          
          <div className="bg-gray-50 rounded-md p-3">
            <h5 className="text-sm font-medium text-gray-700 mb-1">What gets tested:</h5>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• SMS delivery and Twilio configuration</li>
              <li>• Message content with variables replaced</li>
              <li>• Character count and message splitting</li>
              <li>• Opt-out compliance (if enabled)</li>
              <li>• Phone number formatting</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center"
        >
          <Eye className="w-4 h-4 mr-2" />
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </button>
        
        {showPreview && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Preview with Sample Data</h4>
            <div className="bg-white p-3 rounded border">
              <div className="flex items-start">
                <MessageSquare className="w-5 h-5 text-gray-400 mt-0.5 mr-2" />
                <div className="flex-1">
                  <p className="text-sm whitespace-pre-wrap">{renderPreview()}</p>
                  {sendingOptions.includeOptOut && (
                    <p className="text-xs text-gray-500 mt-2">Reply STOP to unsubscribe</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}