'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Mail, MessageSquare, Phone, Send, ChevronDown } from 'lucide-react'
import { formatBritishDateTime } from '@/app/lib/utils/british-format'

interface Message {
  id: string
  type: 'email' | 'sms' | 'whatsapp' | 'call'
  direction: 'inbound' | 'outbound'
  body: string
  subject?: string
  created_at: string
  from_number?: string
  to_number?: string
  from_email?: string
  to_email?: string
  status: string
  metadata?: any
}

interface UnifiedTimelineProps {
  leadId: string
  leadPhone?: string
  leadEmail?: string
}

export function UnifiedTimeline({ leadId, leadPhone, leadEmail }: UnifiedTimelineProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [replyMode, setReplyMode] = useState<'sms' | 'whatsapp' | 'email'>('sms')
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    fetchMessages()
    
    // Set up real-time subscription
    const supabase = createClient()
    const channel = supabase
      .channel(`messages-${leadId}`)
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'messages',
          filter: `lead_id=eq.${leadId}`
        }, 
        () => {
          fetchMessages()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [leadId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/messages/history/${leadId}`)
      const data = await response.json()
      
      if (data.messages) {
        // Combine all message types into unified timeline
        const allMessages = [
          ...data.messages.emails.map((m: any) => ({ ...m, type: 'email' })),
          ...data.messages.sms.map((m: any) => ({ ...m, type: 'sms' })),
          ...data.messages.whatsapp.map((m: any) => ({ ...m, type: 'whatsapp' })),
          ...data.messages.calls.map((m: any) => ({ 
            ...m, 
            type: 'call',
            body: `Phone call (${m.metadata?.call_duration || 0} seconds)`
          }))
        ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        
        setMessages(allMessages)
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const sendReply = async () => {
    if (!replyText.trim() || sending) return

    setSending(true)
    try {
      let endpoint = ''
      let body: any = { leadId }

      switch (replyMode) {
        case 'sms':
          endpoint = '/api/sms/send'
          body = { ...body, to: leadPhone, message: replyText }
          break
        case 'whatsapp':
          endpoint = '/api/whatsapp/send'
          body = { ...body, to: leadPhone, message: replyText }
          break
        case 'email':
          endpoint = '/api/messages/send'
          body = { 
            ...body, 
            type: 'email',
            to: leadEmail,
            subject: 'Message from Atlas Fitness',
            body: replyText
          }
          break
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      setReplyText('')
      // Messages will update via real-time subscription
    } catch (error) {
      console.error('Failed to send message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setSending(false)
    }
  }

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4" />
      case 'sms': return <MessageSquare className="w-4 h-4" />
      case 'whatsapp': return <MessageSquare className="w-4 h-4 text-green-500" />
      case 'call': return <Phone className="w-4 h-4" />
      default: return null
    }
  }

  const getMessageSide = (message: Message) => {
    return message.direction === 'outbound' ? 'right' : 'left'
  }

  if (loading) {
    return <div className="flex justify-center p-8">Loading messages...</div>
  }

  return (
    <div className="flex flex-col h-[600px] bg-gray-900 rounded-lg">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            No messages yet. Start a conversation!
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${getMessageSide(message) === 'right' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[70%] rounded-lg p-3 ${
                  getMessageSide(message) === 'right'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-800 text-gray-100'
                }`}
              >
                {/* Message Header */}
                <div className="flex items-center gap-2 mb-1 text-xs opacity-75">
                  {getMessageIcon(message.type)}
                  <span>{message.type.toUpperCase()}</span>
                  <span>•</span>
                  <span>{formatBritishDateTime(message.created_at)}</span>
                </div>

                {/* Message Content */}
                {message.subject && (
                  <div className="font-semibold mb-1">{message.subject}</div>
                )}
                <div className="whitespace-pre-wrap break-words">
                  {message.body}
                </div>

                {/* Status for outbound messages */}
                {message.direction === 'outbound' && (
                  <div className="text-xs mt-1 opacity-75">
                    {message.status === 'delivered' ? '✓✓' : '✓'} {message.status}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Area */}
      <div className="border-t border-gray-700 p-4">
        <div className="flex gap-2">
          {/* Channel Selector */}
          <div className="relative">
            <button
              className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
              onClick={() => {
                // Cycle through modes
                const modes: ('sms' | 'whatsapp' | 'email')[] = ['sms', 'whatsapp', 'email']
                const currentIndex = modes.indexOf(replyMode)
                const nextIndex = (currentIndex + 1) % modes.length
                setReplyMode(modes[nextIndex])
              }}
            >
              {replyMode === 'sms' && <MessageSquare className="w-4 h-4" />}
              {replyMode === 'whatsapp' && <MessageSquare className="w-4 h-4 text-green-500" />}
              {replyMode === 'email' && <Mail className="w-4 h-4" />}
              <span className="text-sm">{replyMode.toUpperCase()}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Message Input */}
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendReply()}
            placeholder={`Send ${replyMode} message...`}
            className="flex-1 px-4 py-2 bg-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sending}
          />

          {/* Send Button */}
          <button
            onClick={sendReply}
            disabled={!replyText.trim() || sending}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        {/* Channel Info */}
        <div className="text-xs text-gray-500 mt-2">
          {replyMode === 'email' && leadEmail && `Sending to: ${leadEmail}`}
          {(replyMode === 'sms' || replyMode === 'whatsapp') && leadPhone && `Sending to: ${leadPhone}`}
          {((replyMode === 'email' && !leadEmail) || ((replyMode === 'sms' || replyMode === 'whatsapp') && !leadPhone)) && 
            <span className="text-red-400">No {replyMode === 'email' ? 'email' : 'phone number'} available</span>
          }
        </div>
      </div>
    </div>
  )
}