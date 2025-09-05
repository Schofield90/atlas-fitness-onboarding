'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import { 
  MessageSquare, 
  Mail, 
  Phone, 
  Clock, 
  User, 
  Search, 
  Bot, 
  Send, 
  Paperclip, 
  Smile,
  MoreVertical,
  Calendar,
  MapPin,
  Star,
  Tag,
  Archive,
  Trash2,
  Filter,
  SortAsc,
  Zap,
  Sparkles,
  BookOpen,
  Camera,
  Plus,
  Users
} from 'lucide-react'
import { formatBritishDateTime } from '@/app/lib/utils/british-format'

interface Conversation {
  id: string
  customer_id: string
  customer_name: string
  customer_email: string
  customer_phone: string
  last_message: string
  last_message_type: 'email' | 'sms' | 'whatsapp' | 'call'
  last_message_time: string
  unread_count: number
  total_messages: number
  tags?: string[]
  priority?: 'high' | 'medium' | 'low'
  status?: 'active' | 'waiting' | 'resolved'
}

interface Message {
  id: string
  content: string
  type: 'email' | 'sms' | 'whatsapp' | 'call'
  direction: 'inbound' | 'outbound'
  timestamp: string
  read: boolean
  ai_generated?: boolean
  attachments?: any[]
}

interface Contact {
  id: string
  name: string
  email: string
  phone: string
  avatar?: string
  membership_status?: string
  last_visit?: string
  total_visits?: number
  tags?: string[]
  notes?: string
  emergency_contact?: {
    name: string
    phone: string
  }
  preferences?: {
    contact_method: string
    communication_frequency: string
  }
}

interface AIResponse {
  suggestions: string[]
  summary: string
  next_actions: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  urgency: 'high' | 'medium' | 'low'
}

export default function EnhancedChatInterface() {
  const searchParams = useSearchParams()
  const contactParam = searchParams.get('contact')
  
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [messageType, setMessageType] = useState<'sms' | 'email' | 'whatsapp'>('sms')
  const [aiSuggestions, setAiSuggestions] = useState<AIResponse | null>(null)
  const [showAISuggestions, setShowAISuggestions] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [showNewConversationModal, setShowNewConversationModal] = useState(false)
  const [availableContacts, setAvailableContacts] = useState<any[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    fetchConversations()
  }, [])

  // Handle contact parameter from URL
  useEffect(() => {
    if (contactParam && conversations.length > 0) {
      handleContactParameter(contactParam)
    }
  }, [contactParam, conversations])

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.id)
      fetchContact(selectedConversation.customer_id)
      generateAIInsights(selectedConversation)
    }
  }, [selectedConversation])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleContactParameter = async (contactId: string) => {
    try {
      // First check if we already have a conversation with this contact
      const existingConversation = conversations.find(conv => 
        conv.customer_id === contactId || 
        conv.customer_id === contactId.replace('lead-', '') // Handle lead prefix from contacts page
      )

      if (existingConversation) {
        setSelectedConversation(existingConversation)
        return
      }

      // If no existing conversation, fetch contact details and create new conversation
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Try to fetch contact from contacts table first
      let contact = null
      let { data: contactData } = await supabase
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single()

      if (contactData) {
        contact = contactData
      } else {
        // If not found in contacts, try leads table (handle lead- prefix)
        const leadId = contactId.replace('lead-', '')
        let { data: leadData } = await supabase
          .from('leads')
          .select('*')
          .eq('id', leadId)
          .single()

        if (leadData) {
          // Convert lead to contact format
          contact = {
            id: contactId, // Keep original ID with prefix
            first_name: leadData.name?.split(' ')[0] || '',
            last_name: leadData.name?.split(' ').slice(1).join(' ') || '',
            email: leadData.email || '',
            phone: leadData.phone || '',
            lead_id: leadData.id
          }
        }
      }

      if (contact) {
        // Create a new conversation
        const newConversation: Conversation = {
          id: `new-${Date.now()}`,
          customer_id: contact.id,
          customer_name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim() || contact.name || 'Unknown Contact',
          customer_email: contact.email || '',
          customer_phone: contact.phone || '',
          last_message: 'Start a new conversation...',
          last_message_type: 'sms',
          last_message_time: new Date().toISOString(),
          unread_count: 0,
          total_messages: 0,
          status: 'active',
          tags: [],
          priority: 'medium'
        }

        // Add to conversations list and select it
        setConversations(prev => [newConversation, ...prev])
        setSelectedConversation(newConversation)
      }
    } catch (error) {
      console.error('Error handling contact parameter:', error)
    }
  }

  const handleNewConversation = async () => {
    try {
      // Fetch available leads and customers - use org_id not organization_id
      const { data: leads } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, phone')
        .eq('org_id', organizationId)
        .limit(20)

      const { data: customers } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email, phone')
        .eq('org_id', organizationId)
        .limit(20)

      const contacts = [
        ...(leads || []).map(l => ({ 
          ...l, 
          name: `${l.first_name || ''} ${l.last_name || ''}`.trim() || 'Unknown',
          type: 'lead' 
        })),
        ...(customers || []).map(c => ({ 
          ...c, 
          name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
          type: 'customer' 
        }))
      ]

      console.log('Found contacts:', contacts.length)
      setAvailableContacts(contacts)
      setShowNewConversationModal(true)
    } catch (error) {
      console.error('Error fetching contacts:', error)
      // Still show modal even if no contacts found
      setAvailableContacts([])
      setShowNewConversationModal(true)
    }
  }

  const startNewConversation = (contact: any) => {
    const newConv: Conversation = {
      id: Date.now().toString(),
      customer_id: contact.id,
      customer_name: contact.name,
      customer_email: contact.email,
      customer_phone: contact.phone,
      last_message: 'Start conversation...',
      last_message_type: 'sms',
      last_message_time: new Date().toISOString(),
      unread_count: 0,
      total_messages: 0,
      status: 'active'
    }

    setConversations([newConv, ...conversations])
    setSelectedConversation(newConv)
    setShowNewConversationModal(false)
    setMessages([])
  }

  const fetchConversations = async () => {
    try {
      setLoading(true)

      // Get current user's organization
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) return

      setOrganizationId(userOrg.organization_id)

      // Fetch recent leads and clients for name/email/phone mapping
      const [leadsResult, clientsResult] = await Promise.all([
        supabase
          .from('leads')
          .select('id, first_name, last_name, email, phone')
          .eq('org_id', userOrg.organization_id)
          .order('updated_at', { ascending: false })
          .limit(200),
        supabase
          .from('clients')
          .select('id, first_name, last_name, email, phone')
          .eq('org_id', userOrg.organization_id)
          .order('updated_at', { ascending: false })
          .limit(200)
      ])

      const customerMap = new Map<string, { id: string; name: string; email: string; phone: string }>()
      for (const l of leadsResult.data || []) {
        customerMap.set(l.id, {
          id: l.id,
          name: `${l.first_name || ''} ${l.last_name || ''}`.trim() || 'Unknown',
          email: l.email || '',
          phone: l.phone || ''
        })
      }
      for (const c of clientsResult.data || []) {
        customerMap.set(c.id, {
          id: c.id,
          name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
          email: c.email || '',
          phone: c.phone || ''
        })
      }

      // Fetch latest messages for org and group by lead_id
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .order('created_at', { ascending: false })
        .limit(500)

      const grouped = new Map<string, any[]>()
      for (const m of msgs || []) {
        if (!m.lead_id) continue
        if (!grouped.has(m.lead_id)) grouped.set(m.lead_id, [])
        grouped.get(m.lead_id)!.push(m)
      }

      const convs: Conversation[] = []
      for (const [leadId, arr] of grouped) {
        const customer = customerMap.get(leadId)
        if (!customer) continue
        arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        const latest = arr[0]
        convs.push({
          id: leadId,
          customer_id: leadId,
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
          last_message: latest.subject || latest.body || 'No content',
          last_message_type: latest.type,
          last_message_time: latest.created_at,
          unread_count: 0,
          total_messages: arr.length,
          status: 'active'
        })
      }

      convs.sort((a, b) => new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime())
      setConversations(convs)
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (conversationId: string) => {
    try {
      // conversationId is the lead_id
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('lead_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(500)

      const mapped: Message[] = (data || []).map((m: any) => ({
        id: m.id,
        content: m.body || m.subject || '',
        type: m.type,
        direction: m.direction,
        timestamp: m.created_at,
        read: m.status === 'read'
      }))

      setMessages(mapped)
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const fetchContact = async (contactId: string) => {
    try {
      // Try leads first
      const { data: lead } = await supabase
        .from('leads')
        .select('id, first_name, last_name, email, phone')
        .eq('id', contactId)
        .single()

      if (lead) {
        setSelectedContact({
          id: lead.id,
          name: `${lead.first_name || ''} ${lead.last_name || ''}`.trim() || 'Unknown',
          email: lead.email || '',
          phone: lead.phone || '',
          membership_status: 'Lead'
        })
        return
      }

      // Then clients
      const { data: client } = await supabase
        .from('clients')
        .select('id, first_name, last_name, email, phone')
        .eq('id', contactId)
        .single()

      if (client) {
        setSelectedContact({
          id: client.id,
          name: `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Unknown',
          email: client.email || '',
          phone: client.phone || '',
          membership_status: 'Customer'
        })
      }
    } catch (error) {
      console.error('Error fetching contact:', error)
    }
  }

  const generateAIInsights = async (conversation: Conversation) => {
    try {
      // Placeholder until AI suggestions API is wired
      setAiSuggestions(null)
    } catch (error) {
      console.error('Error generating AI insights:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    try {
      setIsTyping(true)

      const toTarget = messageType === 'email' 
        ? selectedConversation.customer_email 
        : selectedConversation.customer_phone

      const res = await fetch('/api/messages/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: selectedConversation.customer_id,
          type: messageType,
          to: toTarget,
          subject: messageType === 'email' ? 'Message from Atlas Fitness' : undefined,
          body: newMessage.trim()
        })
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to send message')
      }

      // Optimistically append to UI
      const newMsg: Message = {
        id: Date.now().toString(),
        content: newMessage.trim(),
        type: messageType,
        direction: 'outbound',
        timestamp: new Date().toISOString(),
        read: false
      }

      setMessages(prev => [...prev, newMsg])
      setNewMessage('')

      // Refresh conversations list to reflect latest message
      fetchConversations()
    } catch (error) {
      console.error('Error sending message:', error)
    } finally {
      setIsTyping(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getMessageIcon = (type: string) => {
    switch (type) {
      case 'email':
        return <Mail className="h-4 w-4" />
      case 'sms':
      case 'whatsapp':
        return <MessageSquare className="h-4 w-4" />
      case 'call':
        return <Phone className="h-4 w-4" />
      default:
        return <MessageSquare className="h-4 w-4" />
    }
  }

  const getMessageColor = (type: string) => {
    switch (type) {
      case 'email':
        return 'text-blue-400'
      case 'sms':
        return 'text-green-400'
      case 'whatsapp':
        return 'text-green-500'
      case 'call':
        return 'text-purple-400'
      default:
        return 'text-gray-400'
    }
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500'
      case 'medium':
        return 'bg-yellow-500'
      case 'low':
        return 'bg-green-500'
      default:
        return 'bg-gray-500'
    }
  }

  const filteredConversations = conversations.filter(conv => {
    const search = searchTerm.toLowerCase()
    return conv.customer_name.toLowerCase().includes(search) ||
           conv.customer_email.toLowerCase().includes(search) ||
           conv.customer_phone.includes(search) ||
           conv.last_message.toLowerCase().includes(search)
  })

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Left Panel - Conversations List */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Conversations</h2>
            <div className="flex gap-2">
              <button 
                onClick={() => handleNewConversation()}
                className="px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center gap-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New
              </button>
              <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg">
                <Filter className="h-4 w-4" />
              </button>
              <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg">
                <SortAsc className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4">
              <div className="text-center text-gray-400">Loading conversations...</div>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-8 flex flex-col items-center justify-center">
              <MessageSquare className="h-12 w-12 text-gray-600 mb-4" />
              <div className="text-center">
                <p className="text-gray-400 mb-4">
                  {searchTerm ? 'No conversations found' : 'No conversations yet'}
                </p>
                {!searchTerm && (
                  <button
                    onClick={() => handleNewConversation()}
                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg flex items-center gap-2 mx-auto transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Start New Conversation
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {filteredConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedConversation?.id === conversation.id
                      ? 'bg-blue-600'
                      : 'hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="bg-gray-600 rounded-full p-2">
                          <User className="h-5 w-5 text-gray-400" />
                        </div>
                        {conversation.priority && (
                          <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${getPriorityColor(conversation.priority)}`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-white truncate">
                          {conversation.customer_name}
                        </h3>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          <div className={getMessageColor(conversation.last_message_type)}>
                            {getMessageIcon(conversation.last_message_type)}
                          </div>
                          <span>{formatBritishDateTime(conversation.last_message_time)}</span>
                        </div>
                      </div>
                    </div>
                    {conversation.unread_count > 0 && (
                      <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                        {conversation.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-300 truncate mb-2">
                    {conversation.last_message}
                  </p>
                  {conversation.tags && conversation.tags.length > 0 && (
                    <div className="flex gap-1">
                      {conversation.tags.slice(0, 2).map((tag, index) => (
                        <span key={index} className="text-xs bg-gray-600 px-2 py-1 rounded text-gray-300">
                          {tag}
                        </span>
                      ))}
                      {conversation.tags.length > 2 && (
                        <span className="text-xs text-gray-400">+{conversation.tags.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Center Panel - Messages */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Message Header */}
            <div className="p-4 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-600 rounded-full p-2">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">{selectedConversation.customer_name}</h3>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <span>{selectedConversation.customer_email}</span>
                      <span>•</span>
                      <span>{selectedConversation.customer_phone}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg">
                    <Phone className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg">
                    <Calendar className="h-4 w-4" />
                  </button>
                  <button 
                    onClick={() => setShowAISuggestions(!showAISuggestions)}
                    className={`p-2 rounded-lg transition-colors ${
                      showAISuggestions 
                        ? 'bg-purple-600 text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-700'
                    }`}
                  >
                    <Sparkles className="h-4 w-4" />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg">
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* AI Suggestions Panel */}
            {showAISuggestions && aiSuggestions && (
              <div className="p-4 bg-purple-900 border-b border-purple-700">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-400">AI Suggestions</span>
                </div>
                <div className="space-y-2">
                  {aiSuggestions.suggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => setNewMessage(suggestion)}
                      className="w-full text-left p-2 bg-purple-800 hover:bg-purple-700 rounded text-sm text-white transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                <div className="mt-3 p-2 bg-purple-800 rounded">
                  <p className="text-xs text-purple-200">
                    <strong>Summary:</strong> {aiSuggestions.summary}
                  </p>
                </div>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs lg:max-w-md ${
                    message.direction === 'outbound'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-white'
                  } rounded-lg p-3`}>
                    <div className="flex items-start gap-2 mb-1">
                      <div className={getMessageColor(message.type)}>
                        {getMessageIcon(message.type)}
                      </div>
                      {message.ai_generated && (
                        <Bot className="h-4 w-4 text-purple-400" />
                      )}
                    </div>
                    <p className="text-sm">{message.content}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs opacity-75">
                        {formatBritishDateTime(message.timestamp)}
                      </span>
                      {message.direction === 'outbound' && (
                        <span className="text-xs opacity-75">
                          {message.read ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 bg-gray-800 border-t border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <select
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value as 'sms' | 'email' | 'whatsapp')}
                  className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                >
                  <option value="sms">SMS</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={`Type your ${messageType} message...`}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none resize-none"
                    rows={1}
                    style={{ minHeight: '38px', maxHeight: '150px' }}
                  />
                </div>
                <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg">
                  <Paperclip className="h-4 w-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg">
                  <Camera className="h-4 w-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg">
                  <Smile className="h-4 w-4" />
                </button>
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || isTyping}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-800">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">Select a conversation</h3>
              <p className="text-gray-500">Choose a conversation from the left to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Contact Card */}
      {selectedContact && (
        <div className="w-80 bg-gray-800 border-l border-gray-700 overflow-y-auto">
          <div className="p-4">
            {/* Contact Header */}
            <div className="text-center mb-6">
              <div className="bg-gray-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-3">
                <User className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-white">{selectedContact.name}</h3>
              <p className="text-sm text-gray-400">{selectedContact.membership_status}</p>
            </div>

            {/* Contact Details */}
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Contact Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span className="text-white">{selectedContact.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <span className="text-white">{selectedContact.phone}</span>
                  </div>
                </div>
              </div>

              {/* Membership Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-400 mb-2">Membership</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Status:</span>
                    <span className="text-white">{selectedContact.membership_status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Visits:</span>
                    <span className="text-white">{selectedContact.total_visits || 0}</span>
                  </div>
                  {selectedContact.last_visit && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Last Visit:</span>
                      <span className="text-white">{formatBritishDateTime(selectedContact.last_visit)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Tags */}
              {selectedContact.tags && selectedContact.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedContact.tags.map((tag, index) => (
                      <span key={index} className="bg-gray-600 px-2 py-1 rounded text-xs text-gray-300">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedContact.notes && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Notes</h4>
                  <p className="text-sm text-gray-300 bg-gray-700 p-3 rounded">
                    {selectedContact.notes}
                  </p>
                </div>
              )}

              {/* Emergency Contact */}
              {selectedContact.emergency_contact && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Emergency Contact</h4>
                  <div className="space-y-1 text-sm">
                    <div className="text-white">{selectedContact.emergency_contact.name}</div>
                    <div className="text-gray-300">{selectedContact.emergency_contact.phone}</div>
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="space-y-2 pt-4 border-t border-gray-700">
                <button className="w-full flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white text-sm">
                  <Calendar className="h-4 w-4" />
                  Book Class
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm">
                  <BookOpen className="h-4 w-4" />
                  View Profile
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm">
                  <Tag className="h-4 w-4" />
                  Add Tag
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Conversation Modal */}
      {showNewConversationModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">Start New Conversation</h3>
              <button
                onClick={() => setShowNewConversationModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            
            <p className="text-gray-400 mb-4">Select a contact to start a conversation with:</p>
            
            <div className="overflow-y-auto max-h-[50vh]">
              {availableContacts.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No contacts available</p>
                  <p className="text-gray-500 text-sm mt-2">Add leads or customers first</p>
                  <div className="mt-4 space-y-2">
                    <a
                      href="/leads"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add Lead
                    </a>
                    <span className="mx-2 text-gray-500">or</span>
                    <a
                      href="/customers/new"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                    >
                      <User className="h-4 w-4" />
                      Add Customer
                    </a>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {availableContacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => startNewConversation(contact)}
                      className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-left transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-medium">{contact.name}</p>
                          <p className="text-gray-400 text-sm">{contact.email || contact.phone}</p>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          contact.type === 'lead' 
                            ? 'bg-blue-600 text-blue-100' 
                            : 'bg-green-600 text-green-100'
                        }`}>
                          {contact.type}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}