'use client'

import { useState } from 'react'
import { Send, Save, Eye, X, AlertCircle, CheckCircle } from 'lucide-react'

interface EmailComposerProps {
  onClose?: () => void
  onSend?: (emailData: any) => void
}

export default function EmailComposer({ onClose, onSend }: EmailComposerProps) {
  const [emailContent, setEmailContent] = useState({
    subject: '',
    preheader: '',
    body: '',
    recipients: [] as string[],
    recipientType: 'test', // 'test', 'segment', 'all'
    testEmail: '',
    template: 'custom'
  })
  
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ success?: boolean; message?: string } | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  // Email templates
  const templates = [
    {
      id: 'custom',
      name: 'Custom Email',
      subject: '',
      body: ''
    },
    {
      id: 'welcome',
      name: 'Welcome Email',
      subject: 'Welcome to Atlas Fitness!',
      body: `Hi {firstName},

Welcome to Atlas Fitness! We're thrilled to have you join our community.

Here's what you can expect:
• Access to all our facilities and equipment
• Expert guidance from our certified trainers
• A supportive community to help you reach your goals

Your fitness journey starts now. Let's make it amazing!

Best regards,
The Atlas Fitness Team`
    },
    {
      id: 'promotion',
      name: 'Promotion',
      subject: 'Special Offer: 20% Off This Month!',
      body: `Hi {firstName},

Great news! We're offering an exclusive 20% discount on all memberships this month.

This is the perfect time to:
• Upgrade your membership
• Add personal training sessions
• Bring a friend (they get the discount too!)

Use code: FIT2025 at checkout

This offer expires at the end of the month, so don't miss out!

See you at the gym,
Atlas Fitness Team`
    },
    {
      id: 'reminder',
      name: 'Class Reminder',
      subject: "Don't forget your class tomorrow!",
      body: `Hi {firstName},

Just a friendly reminder that you're booked for:

📅 {className}
⏰ {classTime}
📍 {location}

Remember to bring:
• Water bottle
• Towel
• Your energy and enthusiasm!

Can\\'t make it? Please cancel at least 24 hours in advance to avoid charges.

See you there!
Atlas Fitness Team`
    }
  ]

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setEmailContent({
        ...emailContent,
        template: templateId,
        subject: template.subject,
        body: template.body
      })
    }
  }

  const handleSendTest = async () => {
    if (!emailContent.testEmail || !emailContent.subject || !emailContent.body) {
      setSendResult({ success: false, message: 'Please fill in all required fields' })
      return
    }

    setSending(true)
    setSendResult(null)

    try {
      const response = await fetch('/api/campaigns/send-test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailContent.testEmail,
          subject: emailContent.subject,
          body: emailContent.body,
          preheader: emailContent.preheader
        })
      })

      const data = await response.json()
      
      if (response.ok) {
        setSendResult({ success: true, message: `Test email sent to ${emailContent.testEmail}` })
      } else {
        setSendResult({ success: false, message: data.error || 'Failed to send email' })
      }
    } catch (error: any) {
      setSendResult({ success: false, message: error.message || 'Failed to send email' })
    } finally {
      setSending(false)
    }
  }

  const handleSendCampaign = async () => {
    if (!emailContent.subject || !emailContent.body) {
      setSendResult({ success: false, message: 'Please fill in subject and body' })
      return
    }

    if (onSend) {
      onSend(emailContent)
    } else {
      // Default send behavior
      setSending(true)
      setSendResult(null)

      try {
        const response = await fetch('/api/campaigns/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(emailContent)
        })

        const data = await response.json()
        
        if (response.ok) {
          setSendResult({ success: true, message: 'Campaign sent successfully!' })
        } else {
          setSendResult({ success: false, message: data.error || 'Failed to send campaign' })
        }
      } catch (error: any) {
        setSendResult({ success: false, message: error.message || 'Failed to send campaign' })
      } finally {
        setSending(false)
      }
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-white">Email Campaign Composer</h2>
        {onClose && (
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Template Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-400 mb-2">Email Template</label>
        <select
          value={emailContent.template}
          onChange={(e) => handleTemplateChange(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
        >
          {templates.map(template => (
            <option key={template.id} value={template.id}>{template.name}</option>
          ))}
        </select>
      </div>

      {/* Subject Line */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Subject Line <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={emailContent.subject}
          onChange={(e) => setEmailContent({ ...emailContent, subject: e.target.value })}
          placeholder="Enter your email subject..."
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
        />
      </div>

      {/* Preheader Text */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Preheader Text
          <span className="text-xs text-gray-500 ml-2">(Preview text shown in inbox)</span>
        </label>
        <input
          type="text"
          value={emailContent.preheader}
          onChange={(e) => setEmailContent({ ...emailContent, preheader: e.target.value })}
          placeholder="Short preview text..."
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
        />
      </div>

      {/* Email Body */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Email Content <span className="text-red-500">*</span>
        </label>
        <textarea
          value={emailContent.body}
          onChange={(e) => setEmailContent({ ...emailContent, body: e.target.value })}
          placeholder="Write your email content here...

You can use variables like:
{firstName} - Recipient's first name
{lastName} - Recipient's last name
{email} - Recipient's email"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white h-64 font-mono text-sm"
        />
      </div>

      {/* Recipients Section */}
      <div className="mb-6 p-4 bg-gray-900 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-4">Recipients</h3>
        
        <div className="space-y-4">
          {/* Recipient Type */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Send To</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="recipientType"
                  value="test"
                  checked={emailContent.recipientType === 'test'}
                  onChange={(e) => setEmailContent({ ...emailContent, recipientType: e.target.value })}
                  className="mr-2"
                />
                <span className="text-gray-300">Send Test Email</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="recipientType"
                  value="segment"
                  checked={emailContent.recipientType === 'segment'}
                  onChange={(e) => setEmailContent({ ...emailContent, recipientType: e.target.value })}
                  className="mr-2"
                />
                <span className="text-gray-300">Specific Segment</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="recipientType"
                  value="all"
                  checked={emailContent.recipientType === 'all'}
                  onChange={(e) => setEmailContent({ ...emailContent, recipientType: e.target.value })}
                  className="mr-2"
                />
                <span className="text-gray-300">All Contacts</span>
              </label>
            </div>
          </div>

          {/* Test Email Input */}
          {emailContent.recipientType === 'test' && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Test Email Address</label>
              <input
                type="email"
                value={emailContent.testEmail}
                onChange={(e) => setEmailContent({ ...emailContent, testEmail: e.target.value })}
                placeholder="test@example.com"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          )}

          {/* Segment Selection */}
          {emailContent.recipientType === 'segment' && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Select Segments</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-gray-300">Active Members (234 contacts)</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-gray-300">Inactive Members (89 contacts)</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-gray-300">Leads (156 contacts)</span>
                </label>
                <label className="flex items-center">
                  <input type="checkbox" className="mr-2" />
                  <span className="text-gray-300">Trial Members (45 contacts)</span>
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Send Result */}
      {sendResult && (
        <div className={`mb-4 p-4 rounded-lg flex items-start gap-2 ${
          sendResult.success ? 'bg-green-900/30 border border-green-600' : 'bg-red-900/30 border border-red-600'
        }`}>
          {sendResult.success ? (
            <CheckCircle className="w-5 h-5 text-green-500 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
          )}
          <div className={sendResult.success ? 'text-green-400' : 'text-red-400'}>
            {sendResult.message}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-4">
        {emailContent.recipientType === 'test' ? (
          <button
            onClick={handleSendTest}
            disabled={sending || !emailContent.testEmail}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg flex items-center gap-2"
          >
            {sending ? (
              <>Sending...</>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Test Email
              </>
            )}
          </button>
        ) : (
          <button
            onClick={handleSendCampaign}
            disabled={sending}
            className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-6 py-2 rounded-lg flex items-center gap-2"
          >
            {sending ? (
              <>Sending...</>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Campaign
              </>
            )}
          </button>
        )}

        <button
          onClick={() => setShowPreview(!showPreview)}
          className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
        >
          <Eye className="w-4 h-4" />
          Preview
        </button>

        <button
          className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save Draft
        </button>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Email Preview</h3>
                <button onClick={() => setShowPreview(false)} className="text-gray-500 hover:text-gray-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="border-b pb-4 mb-4">
                <div className="text-sm text-gray-600">Subject:</div>
                <div className="font-semibold text-gray-900">{emailContent.subject || '(No subject)'}</div>
              </div>
              
              {emailContent.preheader && (
                <div className="text-sm text-gray-500 mb-4">{emailContent.preheader}</div>
              )}
              
              <div className="whitespace-pre-wrap text-gray-800">
                {emailContent.body || '(No content)'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}