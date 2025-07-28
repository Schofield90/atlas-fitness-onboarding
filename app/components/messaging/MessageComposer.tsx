'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { Toast } from '@/app/components/ui/Toast'

interface MessageComposerProps {
  isOpen: boolean
  onClose: () => void
  lead: {
    id: string
    name: string
    email: string
    phone: string
  }
  onMessageSent?: () => void
}

type MessageType = 'sms' | 'whatsapp' | 'email'

export function MessageComposer({ isOpen, onClose, lead, onMessageSent }: MessageComposerProps) {
  const [messageType, setMessageType] = useState<MessageType>('email')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)

  const handleSend = async () => {
    if (!message.trim()) {
      setError('Message cannot be empty')
      return
    }

    if (messageType === 'email' && !subject.trim()) {
      setError('Email subject is required')
      return
    }

    setSending(true)
    setError('')

    try {
      const response = await fetch('/api/messages/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId: lead.id,
          type: messageType,
          to: messageType === 'email' ? lead.email : lead.phone,
          subject: messageType === 'email' ? subject : undefined,
          body: message,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      // Clear form
      setSubject('')
      setMessage('')
      
      // Show success
      setShowSuccess(true)
      
      // Notify parent and close after a short delay
      setTimeout(() => {
        onMessageSent?.()
        onClose()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-700">
          <div>
            <h2 className="text-xl font-bold">Send Message to {lead.name}</h2>
            <p className="text-sm text-gray-400 mt-1">{lead.email} • {lead.phone}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Message Type Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setMessageType('email')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              messageType === 'email'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Email
          </button>
          <button
            onClick={() => setMessageType('sms')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              messageType === 'sms'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            SMS
          </button>
          <button
            onClick={() => setMessageType('whatsapp')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              messageType === 'whatsapp'
                ? 'text-orange-500 border-b-2 border-orange-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            WhatsApp
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-900/50 border border-red-600 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {messageType === 'email' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Subject
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500"
                placeholder="Enter email subject..."
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={messageType === 'email' ? 10 : 5}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-orange-500 resize-none"
              placeholder={
                messageType === 'email'
                  ? 'Type your email message...'
                  : messageType === 'sms'
                  ? 'Type your SMS message (160 characters recommended)...'
                  : 'Type your WhatsApp message...'
              }
            />
            {messageType === 'sms' && (
              <p className="text-xs text-gray-400 mt-1">
                {message.length}/160 characters (longer messages may be split)
              </p>
            )}
          </div>

          {/* Templates suggestion */}
          <div className="mt-4 p-4 bg-gray-700 rounded-lg">
            <p className="text-sm text-gray-300 mb-2">Quick Templates:</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => {
                  if (messageType === 'email') {
                    setSubject('Welcome to Atlas Fitness!')
                    setMessage(`Hi ${lead.name.split(' ')[0]},\n\nThank you for your interest in Atlas Fitness! I wanted to reach out personally to welcome you and see if you have any questions about our programs.\n\nWe have some great introductory offers available right now that I'd love to tell you about.\n\nLooking forward to hearing from you!\n\nBest regards,\nThe Atlas Fitness Team`)
                  } else {
                    setMessage(`Hi ${lead.name.split(' ')[0]}! Thanks for your interest in Atlas Fitness. We have some great intro offers available. When would be a good time to chat about your fitness goals?`)
                  }
                }}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm transition-colors"
              >
                Welcome
              </button>
              <button
                onClick={() => {
                  if (messageType === 'email') {
                    setSubject('Following up on your inquiry')
                    setMessage(`Hi ${lead.name.split(' ')[0]},\n\nI wanted to follow up on your recent inquiry about Atlas Fitness. Have you had a chance to think about which of our programs might work best for you?\n\nI'm here to answer any questions you might have.\n\nBest regards,\nThe Atlas Fitness Team`)
                  } else {
                    setMessage(`Hi ${lead.name.split(' ')[0]}, just following up on your interest in Atlas Fitness. Do you have any questions I can help answer?`)
                  }
                }}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm transition-colors"
              >
                Follow Up
              </button>
              <button
                onClick={() => {
                  if (messageType === 'email') {
                    setSubject('Special offer just for you!')
                    setMessage(`Hi ${lead.name.split(' ')[0]},\n\nI have an exclusive offer for you! For this week only, we're offering 50% off your first month when you sign up for any of our programs.\n\nThis is a limited time offer, so don't miss out!\n\nLet me know if you'd like to take advantage of this deal.\n\nBest regards,\nThe Atlas Fitness Team`)
                  } else {
                    setMessage(`Hi ${lead.name.split(' ')[0]}! Quick heads up - we have a special 50% off your first month ending this week. Interested?`)
                  }
                }}
                className="px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded text-sm transition-colors"
              >
                Special Offer
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-700">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={sending}
            className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending...' : `Send ${messageType.toUpperCase()}`}
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {showSuccess && (
        <Toast
          message={`${messageType.toUpperCase()} sent successfully!`}
          type="success"
          onClose={() => setShowSuccess(false)}
        />
      )}
    </div>
  )
}