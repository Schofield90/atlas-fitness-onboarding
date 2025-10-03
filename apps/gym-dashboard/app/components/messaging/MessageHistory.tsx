'use client'

import { useState, useEffect } from 'react'
import { formatBritishDateTime } from '@/app/lib/utils/british-format'

interface Message {
  id: string
  type: 'sms' | 'whatsapp' | 'email'
  direction: 'inbound' | 'outbound'
  status: string
  subject?: string
  body: string
  created_at: string
  sent_at?: string
  user?: {
    first_name: string
    last_name: string
  }
}

interface MessageHistoryProps {
  leadId: string
  onClose?: () => void
}

export function MessageHistory({ leadId, onClose }: MessageHistoryProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'email' | 'sms' | 'whatsapp'>('all')
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchMessages()
  }, [leadId])

  const fetchMessages = async () => {
    try {
      const response = await fetch(`/api/messages/history/${leadId}`)
      const data = await response.json()
      
      if (response.ok) {
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'email':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
      case 'sms':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )
      case 'whatsapp':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        )
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      sent: 'bg-green-500',
      delivered: 'bg-blue-500',
      failed: 'bg-red-500',
      pending: 'bg-yellow-500',
      read: 'bg-purple-500'
    }
    
    return (
      <span className={`px-2 py-0.5 text-xs rounded-full text-white ${colors[status] || 'bg-gray-500'}`}>
        {status}
      </span>
    )
  }

  const filteredMessages = filter === 'all' 
    ? messages 
    : messages.filter(m => m.type === filter)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Message History</h3>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              filter === 'all' 
                ? 'bg-orange-600 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            All ({messages.length})
          </button>
          <button
            onClick={() => setFilter('email')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              filter === 'email' 
                ? 'bg-orange-600 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            Email ({messages.filter(m => m.type === 'email').length})
          </button>
          <button
            onClick={() => setFilter('sms')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              filter === 'sms' 
                ? 'bg-orange-600 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            SMS ({messages.filter(m => m.type === 'sms').length})
          </button>
          <button
            onClick={() => setFilter('whatsapp')}
            className={`px-3 py-1 rounded text-sm transition-colors ${
              filter === 'whatsapp' 
                ? 'bg-orange-600 text-white' 
                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
            }`}
          >
            WhatsApp ({messages.filter(m => m.type === 'whatsapp').length})
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {filteredMessages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p>No messages yet</p>
          </div>
        ) : (
          filteredMessages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${
                message.direction === 'outbound' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-[70%] ${
                  message.direction === 'outbound'
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-700 text-white'
                } rounded-lg p-4`}
              >
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`${
                      message.direction === 'outbound' ? 'text-orange-200' : 'text-gray-400'
                    }`}>
                      {getTypeIcon(message.type)}
                    </div>
                    <span className="text-sm font-medium">
                      {message.direction === 'outbound' ? 'You' : 'Lead'}
                      {message.user && ` (${message.user.first_name} ${message.user.last_name})`}
                    </span>
                  </div>
                  {getStatusBadge(message.status)}
                </div>
                
                {message.subject && (
                  <div className="font-medium mb-1">{message.subject}</div>
                )}
                
                <div className="text-sm whitespace-pre-wrap">
                  {message.type === 'email' && message.body.length > 150 ? (
                    <>
                      <div>
                        {expandedMessages.has(message.id) 
                          ? message.body 
                          : message.body.slice(0, 150) + '...'}
                      </div>
                      <button
                        onClick={() => {
                          const newExpanded = new Set(expandedMessages)
                          if (expandedMessages.has(message.id)) {
                            newExpanded.delete(message.id)
                          } else {
                            newExpanded.add(message.id)
                          }
                          setExpandedMessages(newExpanded)
                        }}
                        className={`mt-2 text-xs ${message.direction === 'outbound' ? 'text-orange-200 hover:text-white' : 'text-gray-400 hover:text-white'} transition-colors`}
                      >
                        {expandedMessages.has(message.id) ? 'Show less' : 'Show more'}
                      </button>
                    </>
                  ) : (
                    message.body
                  )}
                </div>
                
                <div className={`text-xs mt-2 ${
                  message.direction === 'outbound' ? 'text-orange-200' : 'text-gray-400'
                }`}>
                  {formatBritishDateTime(message.sent_at || message.created_at)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}