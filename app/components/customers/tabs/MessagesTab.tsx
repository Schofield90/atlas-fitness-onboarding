'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { MessageSquare, Mail, Phone, Send, ChevronDown, ChevronUp } from 'lucide-react'
import { formatBritishDateTime } from '@/app/lib/utils/british-format'
import { MessageComposer } from '@/app/components/messaging/MessageComposer'

interface MessagesTabProps {
  customerId: string
  customer: any
}

interface Message {
  id: string
  type: 'email' | 'sms' | 'whatsapp' | 'call'
  direction: 'inbound' | 'outbound'
  status: string
  body: string
  subject?: string
  created_at: string
  from_number?: string
  to_number?: string
  metadata?: any
}

export default function MessagesTab({ customerId, customer }: MessagesTabProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())
  const [showComposer, setShowComposer] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchMessages()
  }, [customerId])

  const fetchMessages = async () => {
    try {
      setLoading(true)
      
      // First try to find a lead/contact record for this customer
      const { data: contact } = await supabase
        .from('contacts')
        .select('id')
        .or(`email.eq.${customer.email},phone.eq.${customer.phone}`)
        .single()

      const { data: lead } = await supabase
        .from('leads')
        .select('id')
        .or(`email.eq.${customer.email},phone.eq.${customer.phone}`)
        .single()

      const contactId = contact?.id || lead?.id

      if (contactId) {
        // Use the existing lead message history endpoint
        const response = await fetch(`/api/messages/history/${contactId}`)
        if (response.ok) {
          const data = await response.json()
          const allMessages = [
            ...data.messages.emails,
            ...data.messages.sms,
            ...data.messages.whatsapp,
            ...data.messages.calls
          ]
          setMessages(allMessages)
          return
        }
      }

      // If no lead/contact found, fetch messages directly from all tables
      // Normalize phone for queries
      let normalizedPhone = customer.phone || ''
      if (normalizedPhone && !normalizedPhone.startsWith('+')) {
        if (normalizedPhone.startsWith('0')) {
          normalizedPhone = `+44${normalizedPhone.substring(1)}`
        }
      }
      const phoneVariations = [customer.phone, normalizedPhone].filter(Boolean)
      const phoneConditions = phoneVariations.map(p => `to.eq.${p},from_number.eq.${p}`).join(',')

      // Fetch from all message tables
      const { data: smsMessages = [] } = await supabase
        .from('sms_logs')
        .select('*')
        .or(phoneConditions)
        .order('created_at', { ascending: false })

      const { data: whatsappMessages = [] } = await supabase
        .from('whatsapp_logs')
        .select('*')
        .or(phoneConditions)
        .order('created_at', { ascending: false })

      const { data: emailMessages = [] } = await supabase
        .from('email_logs')
        .select('*')
        .eq('to_email', customer.email)
        .order('created_at', { ascending: false })

      // Combine and format messages
      const allMessages = [
        ...smsMessages.map(msg => ({
          id: msg.id,
          type: 'sms' as const,
          direction: msg.from_number === customer.phone ? 'inbound' as const : 'outbound' as const,
          status: msg.status,
          body: msg.message,
          created_at: msg.created_at,
          from_number: msg.from_number,
          to_number: msg.to
        })),
        ...whatsappMessages.map(msg => ({
          id: msg.id,
          type: 'whatsapp' as const,
          direction: msg.from_number === customer.phone ? 'inbound' as const : 'outbound' as const,
          status: msg.status,
          body: msg.message,
          created_at: msg.created_at,
          from_number: msg.from_number,
          to_number: msg.to
        })),
        ...emailMessages.map(msg => ({
          id: msg.id,
          type: 'email' as const,
          direction: 'outbound' as const,
          status: msg.status,
          subject: msg.subject,
          body: msg.message,
          created_at: msg.created_at,
          to_number: msg.to_email
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setMessages(allMessages)
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-5 w-5" />
      case 'sms':
      case 'whatsapp':
        return <MessageSquare className="h-5 w-5" />
      case 'call':
        return <Phone className="h-5 w-5" />
      default:
        return <MessageSquare className="h-5 w-5" />
    }
  }

  const getMessageColor = (type: string) => {
    switch (type) {
      case 'email':
        return 'text-blue-400 bg-blue-400/10'
      case 'sms':
        return 'text-green-400 bg-green-400/10'
      case 'whatsapp':
        return 'text-green-500 bg-green-500/10'
      case 'call':
        return 'text-purple-400 bg-purple-400/10'
      default:
        return 'text-gray-400 bg-gray-400/10'
    }
  }

  const toggleExpanded = (messageId: string) => {
    const newExpanded = new Set(expandedMessages)
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId)
    } else {
      newExpanded.add(messageId)
    }
    setExpandedMessages(newExpanded)
  }

  const filteredMessages = filter === 'all' 
    ? messages 
    : messages.filter(msg => msg.type === filter)

  const messageTypes = [
    { value: 'all', label: 'All Messages' },
    { value: 'email', label: 'Emails' },
    { value: 'sms', label: 'SMS' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'call', label: 'Calls' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-400">Loading messages...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header with filter and compose button */}
      <div className="flex items-center justify-between mb-6">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
        >
          {messageTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <button
          onClick={() => setShowComposer(!showComposer)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
        >
          <Send className="h-4 w-4" />
          <span>Send Message</span>
        </button>
      </div>

      {/* Message Composer */}
      {showComposer && (
        <div className="mb-6 p-4 bg-gray-800 rounded-lg">
          <MessageComposer
            leadId={customerId}
            leadName={customer.name}
            leadEmail={customer.email}
            leadPhone={customer.phone}
            onMessageSent={() => {
              fetchMessages()
              setShowComposer(false)
            }}
          />
        </div>
      )}

      {/* Messages List */}
      {filteredMessages.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No messages yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMessages.map((message) => {
            const isExpanded = expandedMessages.has(message.id)
            const isEmail = message.type === 'email'
            const isLongMessage = message.body && message.body.length > 150

            return (
              <div 
                key={message.id} 
                className={`bg-gray-800 rounded-lg p-4 ${message.direction === 'inbound' ? 'border-l-4 border-green-500' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full ${getMessageColor(message.type)}`}>
                      {getMessageIcon(message.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-white capitalize">{message.type}</span>
                        <span className={`text-xs px-2 py-1 rounded ${
                          message.direction === 'inbound' 
                            ? 'bg-green-900 text-green-300' 
                            : 'bg-blue-900 text-blue-300'
                        }`}>
                          {message.direction}
                        </span>
                        <span className="text-sm text-gray-400">
                          {formatBritishDateTime(message.created_at)}
                        </span>
                      </div>
                      
                      {isEmail && message.subject && (
                        <p className="font-medium text-white mb-2">{message.subject}</p>
                      )}
                      
                      <div className="text-gray-300">
                        {isEmail && isLongMessage && !isExpanded ? (
                          <>
                            <p>{message.body.substring(0, 150)}...</p>
                            <button
                              onClick={() => toggleExpanded(message.id)}
                              className="text-blue-400 hover:text-blue-300 text-sm mt-2 flex items-center space-x-1"
                            >
                              <span>Show more</span>
                              <ChevronDown className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <p className="whitespace-pre-wrap">{message.body}</p>
                            {isEmail && isLongMessage && (
                              <button
                                onClick={() => toggleExpanded(message.id)}
                                className="text-blue-400 hover:text-blue-300 text-sm mt-2 flex items-center space-x-1"
                              >
                                <span>Show less</span>
                                <ChevronUp className="h-4 w-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      
                      {message.status && (
                        <p className="text-xs text-gray-500 mt-2">
                          Status: <span className="capitalize">{message.status}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}