'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { 
  MessageCircle, 
  Send, 
  Loader2, 
  User, 
  Bell, 
  CheckCheck, 
  Bot,
  Clock,
  Search
} from 'lucide-react'
import toast from '@/app/lib/toast'

interface ChatMessage {
  id: string
  content: string
  sender_type: 'member' | 'coach' | 'ai'
  sender_id: string
  sender_name?: string
  created_at: string
  read: boolean
  member_id: string
}

interface MemberConversation {
  member_id: string
  member_name: string
  member_email: string
  last_message: string
  last_message_time: string
  unread_count: number
  sender_type: 'member' | 'coach' | 'ai'
}

export default function CoachMessaging({ coachData }: { coachData: any }) {
  const [conversations, setConversations] = useState<MemberConversation[]>([])
  const [selectedMember, setSelectedMember] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    loadConversations()
    // Set up real-time subscription for new messages
    const subscription = supabase
      .channel('coach-messages')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'member_coach_messages',
        filter: `coach_id=eq.${coachData.id}`
      }, () => {
        loadConversations()
        if (selectedMember) {
          loadMessages(selectedMember)
        }
      })
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [coachData.id])

  useEffect(() => {
    if (selectedMember) {
      loadMessages(selectedMember)
      markMessagesAsRead(selectedMember)
    }
  }, [selectedMember])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadConversations = async () => {
    try {
      const { data } = await supabase
        .rpc('get_coach_conversations', {
          coach_user_id: coachData.id
        })

      if (data) {
        setConversations(data)
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
    }
  }

  const loadMessages = async (memberId: string) => {
    try {
      const { data } = await supabase
        .from('member_coach_messages')
        .select('*')
        .eq('member_id', memberId)
        .eq('coach_id', coachData.id)
        .order('created_at', { ascending: true })
        .limit(100)

      if (data) {
        setMessages(data)
      }
    } catch (error) {
      console.error('Error loading messages:', error)
    }
  }

  const markMessagesAsRead = async (memberId: string) => {
    try {
      await supabase
        .from('member_coach_messages')
        .update({ read: true })
        .eq('member_id', memberId)
        .eq('coach_id', coachData.id)
        .eq('sender_type', 'member')
        .eq('read', false)
      
      // Update conversations list
      setConversations(prev => 
        prev.map(conv => 
          conv.member_id === memberId 
            ? { ...conv, unread_count: 0 }
            : conv
        )
      )
    } catch (error) {
      console.error('Error marking messages as read:', error)
    }
  }

  const sendMessage = async () => {
    if (!inputMessage.trim() || !selectedMember || isLoading) return

    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      content: inputMessage.trim(),
      sender_type: 'coach',
      sender_id: coachData.id,
      sender_name: coachData.full_name || 'Coach',
      created_at: new Date().toISOString(),
      read: false,
      member_id: selectedMember
    }

    setMessages(prev => [...prev, newMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      await supabase
        .from('member_coach_messages')
        .insert({
          member_id: selectedMember,
          coach_id: coachData.id,
          organization_id: coachData.organization_id,
          ...newMessage
        })

      // Create notification for member
      const { data: member } = await supabase
        .from('clients')
        .select('first_name, email')
        .eq('id', selectedMember)
        .single()

      if (member) {
        await supabase
          .from('notifications')
          .insert({
            user_id: selectedMember,
            type: 'coach_message',
            title: 'Message from your coach',
            message: `${coachData.full_name} sent you a message`,
            data: {
              coach_id: coachData.id,
              message: newMessage.content
            }
          })
      }

      toast.success('Message sent!')
      loadConversations() // Refresh conversations
    } catch (error) {
      console.error('Error sending message:', error)
      toast.error('Failed to send message')
    } finally {
      setIsLoading(false)
    }
  }

  const filteredConversations = conversations.filter(conv =>
    conv.member_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.member_email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const selectedConversation = conversations.find(conv => conv.member_id === selectedMember)

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-[600px] flex">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            Member Messages
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredConversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No conversations yet</p>
              <p className="text-sm">Members will appear here when they send messages</p>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.member_id}
                  onClick={() => setSelectedMember(conversation.member_id)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    selectedMember === conversation.member_id
                      ? 'bg-blue-50 border border-blue-200'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-gray-900 truncate">
                      {conversation.member_name}
                    </span>
                    {conversation.unread_count > 0 && (
                      <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                        {conversation.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mb-1">
                    {conversation.sender_type === 'ai' ? (
                      <Bot className="h-3 w-3 text-purple-500" />
                    ) : conversation.sender_type === 'coach' ? (
                      <User className="h-3 w-3 text-blue-500" />
                    ) : (
                      <User className="h-3 w-3 text-green-500" />
                    )}
                    <p className="text-sm text-gray-600 truncate">
                      {conversation.last_message}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-gray-400" />
                    <span className="text-xs text-gray-400">
                      {new Date(conversation.last_message_time).toLocaleDateString('en-GB', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {selectedMember ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-medium text-gray-900">
                    {selectedConversation?.member_name}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {selectedConversation?.member_email}
                  </p>
                </div>
                <button
                  onClick={() => {
                    // Navigate to member profile
                    window.open(`/clients/${selectedMember}`, '_blank')
                  }}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  View Profile
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.sender_type === 'coach' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div className="flex items-start gap-2 max-w-[80%]">
                    {message.sender_type !== 'coach' && (
                      <div className={`p-2 rounded-full ${
                        message.sender_type === 'ai' ? 'bg-purple-600' : 'bg-green-600'
                      }`}>
                        {message.sender_type === 'ai' ? (
                          <Bot className="h-4 w-4 text-white" />
                        ) : (
                          <User className="h-4 w-4 text-white" />
                        )}
                      </div>
                    )}
                    <div
                      className={`px-4 py-2 rounded-lg ${
                        message.sender_type === 'coach'
                          ? 'bg-blue-600 text-white'
                          : message.sender_type === 'ai'
                          ? 'bg-purple-100 text-purple-900'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      {message.sender_type !== 'coach' && (
                        <p className="text-xs font-semibold mb-1 opacity-75">
                          {message.sender_name || (message.sender_type === 'ai' ? 'AI Assistant' : 'Member')}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap">{message.content}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs opacity-75">
                          {new Date(message.created_at).toLocaleTimeString('en-GB', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {message.sender_type === 'coach' && message.read && (
                          <CheckCheck className="h-3 w-3 opacity-75" />
                        )}
                      </div>
                    </div>
                    {message.sender_type === 'coach' && (
                      <div className="p-2 rounded-full bg-blue-600">
                        <User className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-end">
                  <div className="bg-blue-600 text-white px-4 py-2 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  sendMessage()
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a member to start chatting</p>
              <p className="text-sm mt-1">Messages from members will appear in the left panel</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}