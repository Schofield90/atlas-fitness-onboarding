'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { 
  Send, 
  Paperclip, 
  Clock,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react'
import { formatBritishDateTime } from '@/app/lib/utils/british-format'
import MessengerBadge from './MessengerBadge'

interface MessengerMessage {
  id: string
  text: string
  direction: 'in' | 'out'
  status: 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
  sent_at: string
  delivered_at?: string
  read_at?: string
  attachments?: any[]
  message_type: string
}

interface MessengerConversation {
  id: string
  contact_id: string
  external_thread_id: string
  last_inbound_at?: string
  last_outbound_at?: string
  unread_count: number
  contact?: {
    name: string
    email?: string
    metadata?: any
  }
}

interface MessengerChatInterfaceProps {
  conversationId: string
  organizationId: string
}

export default function MessengerChatInterface({ 
  conversationId, 
  organizationId 
}: MessengerChatInterfaceProps) {
  const [conversation, setConversation] = useState<MessengerConversation | null>(null)
  const [messages, setMessages] = useState<MessengerMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [isWithinWindow, setIsWithinWindow] = useState(true)
  const [windowExpiresIn, setWindowExpiresIn] = useState<string>('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    loadConversation()
    loadMessages()
    
    // Subscribe to new messages
    const subscription = supabase
      .channel(`messenger_${conversationId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'messenger_messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setMessages(prev => [...prev, payload.new as MessengerMessage])
          scrollToBottom()
        } else if (payload.eventType === 'UPDATE') {
          setMessages(prev => prev.map(msg => 
            msg.id === payload.new.id ? payload.new as MessengerMessage : msg
          ))
        }
      })
      .subscribe()

    // Update window timer
    const interval = setInterval(updateWindowStatus, 60000) // Check every minute

    return () => {
      subscription.unsubscribe()
      clearInterval(interval)
    }
  }, [conversationId])

  const loadConversation = async () => {
    const { data } = await supabase
      .from('messenger_conversations')
      .select(`
        *,
        contact:leads(*)
      `)
      .eq('id', conversationId)
      .single()

    if (data) {
      setConversation(data)
      updateWindowStatus(data.last_inbound_at)
    }
  }

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messenger_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })

    if (data) {
      setMessages(data)
      scrollToBottom()
    }
  }

  const updateWindowStatus = (lastInboundAt?: string) => {
    if (!lastInboundAt) {
      setIsWithinWindow(false)
      setWindowExpiresIn('No messages received from customer')
      return
    }

    const lastInbound = new Date(lastInboundAt)
    const now = new Date()
    const hoursElapsed = (now.getTime() - lastInbound.getTime()) / (1000 * 60 * 60)
    
    if (hoursElapsed >= 24) {
      setIsWithinWindow(false)
      setWindowExpiresIn(`Window expired ${Math.floor(hoursElapsed - 24)} hours ago`)
    } else {
      setIsWithinWindow(true)
      const hoursRemaining = Math.floor(24 - hoursElapsed)
      const minutesRemaining = Math.floor((24 - hoursElapsed - hoursRemaining) * 60)
      setWindowExpiresIn(`${hoursRemaining}h ${minutesRemaining}m remaining`)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sending || !isWithinWindow) return

    setSending(true)
    try {
      const response = await fetch('/api/messages/messenger/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          text: newMessage
        })
      })

      const result = await response.json()

      if (!response.ok) {
        if (result.error === 'OUTSIDE_WINDOW') {
          setIsWithinWindow(false)
          alert(result.message)
        } else {
          throw new Error(result.error)
        }
        return
      }

      setNewMessage('')
      
      // Mark conversation as read
      await supabase
        .from('messenger_conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId)

    } catch (error) {
      console.error('Send error:', error)
      alert('Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-3 h-3 text-gray-400" />
      case 'delivered':
        return <CheckCircle className="w-3 h-3 text-blue-400" />
      case 'read':
        return <CheckCircle className="w-3 h-3 text-blue-600" />
      case 'failed':
        return <AlertCircle className="w-3 h-3 text-red-500" />
      default:
        return null
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessengerBadge size="lg" />
            <div>
              <h3 className="font-semibold text-gray-900">
                {conversation?.contact?.name || 'Messenger User'}
              </h3>
              <p className="text-sm text-gray-500">Facebook Messenger</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className={isWithinWindow ? 'text-green-600' : 'text-red-600'}>
                {windowExpiresIn}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.direction === 'out' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg px-4 py-2 ${
                message.direction === 'out'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              {message.message_type === 'postback' && (
                <div className="text-xs opacity-75 mb-1">Button clicked</div>
              )}
              <p className="whitespace-pre-wrap">{message.text}</p>
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-2 space-y-1">
                  {message.attachments.map((att: any, idx: number) => (
                    <div key={idx} className="text-xs opacity-75">
                      📎 {att.type}
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-1 flex items-center gap-2 justify-end">
                <span className="text-xs opacity-75">
                  {formatBritishDateTime(new Date(message.sent_at))}
                </span>
                {message.direction === 'out' && getStatusIcon(message.status)}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 24-hour policy warning */}
      {!isWithinWindow && (
        <div className="bg-yellow-50 border-t border-yellow-200 p-3">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">24-hour messaging window expired</p>
              <p className="text-xs mt-1">
                You can only send messages within 24 hours of the customer's last message. 
                Wait for the customer to message again to reopen the window.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="border-t p-4">
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-lg">
            <Paperclip className="w-5 h-5 text-gray-500" />
          </button>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={isWithinWindow ? "Type a message..." : "Messaging window expired"}
            disabled={!isWithinWindow || sending}
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          />
          <button
            onClick={sendMessage}
            disabled={!isWithinWindow || sending || !newMessage.trim()}
            className="p-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}