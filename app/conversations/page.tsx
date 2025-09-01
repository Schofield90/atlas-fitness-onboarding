'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import DashboardLayout from '@/app/components/DashboardLayout'
import EnhancedChatInterface from '@/app/components/chat/EnhancedChatInterface'
import CoachMessaging from '@/app/components/CoachMessaging'
import { MessageSquare, Mail, Phone, Clock, User, Search, Bot, MessageCircle } from 'lucide-react'
import { formatBritishDateTime } from '@/app/lib/utils/british-format'
import AIToggleControl from '@/app/components/automation/AIToggleControl'
import { isFeatureEnabled } from '@/app/lib/feature-flags'

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
}

function ConversationsContent() {
  const [useEnhanced, setUseEnhanced] = useState(true)
  const [activeTab, setActiveTab] = useState<'conversations' | 'coaching'>('conversations')
  const [userData, setUserData] = useState<any>(null)
  const supabase = createClient()

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      
      if (userData) {
        // Get organization data too
        const { data: userOrg } = await supabase
          .from('user_organizations')
          .select('organization_id')
          .eq('user_id', user.id)
          .single()
        
        setUserData({
          ...userData,
          organization_id: userOrg?.organization_id
        })
      }
    }
  }

  if (useEnhanced && activeTab === 'conversations') {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('conversations')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'conversations'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  General Conversations
                </div>
              </button>
              <button
                onClick={() => setActiveTab('coaching')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'coaching'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Member Coaching
                </div>
              </button>
            </nav>
          </div>
        </div>
        <EnhancedChatInterface />
      </DashboardLayout>
    )
  }

  if (activeTab === 'coaching') {
    return (
      <DashboardLayout>
        <div className="mb-6">
          <div className="border-b border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('conversations')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'conversations'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  General Conversations
                </div>
              </button>
              <button
                onClick={() => setActiveTab('coaching')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'coaching'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="h-4 w-4" />
                  Member Coaching
                </div>
              </button>
            </nav>
          </div>
        </div>
        {userData && <CoachMessaging coachData={userData} />}
      </DashboardLayout>
    )
  }

  // Keep the old implementation as fallback
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [contactsCount, setContactsCount] = useState(0)
  const router = useRouter()

  useEffect(() => {
    fetchConversations()
  }, [])

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

      // Fetch all recent messages grouped by customer
      // Get leads and clients instead of contacts (which doesn't have org_id)
      const [leadsResult, clientsResult] = await Promise.all([
        supabase
          .from('leads')
          .select('id, first_name, last_name, email, phone')
          .eq('org_id', userOrg.organization_id)
          .order('updated_at', { ascending: false })
          .limit(50),
        supabase
          .from('clients')
          .select('id, first_name, last_name, email, phone')
          .eq('org_id', userOrg.organization_id)
          .order('updated_at', { ascending: false })
          .limit(50)
      ])
      
      // Combine leads and clients into customers list
      const customers = [
        ...(leadsResult.data || []).map(l => ({
          id: l.id,
          name: `${l.first_name || ''} ${l.last_name || ''}`.trim() || 'Unknown',
          email: l.email,
          phone: l.phone
        })),
        ...(clientsResult.data || []).map(c => ({
          id: c.id,
          name: `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Unknown',
          email: c.email,
          phone: c.phone
        }))
      ]

      if (!customers) {
        setContactsCount(0)
        return
      }

      setContactsCount(customers.length)

      // Create maps for customer lookup
      const customerById = new Map(customers.map(c => [c.id, c]))
      const customerByPhone = new Map<string, typeof customers[0]>()
      const customerByEmail = new Map<string, typeof customers[0]>()
      
      // Build phone and email maps
      const phoneNumbers: string[] = []
      const emailAddresses: string[] = []
      
      for (const customer of customers) {
        if (customer.phone) {
          const normalizedPhone = customer.phone.startsWith('+') ? customer.phone : `+44${customer.phone.substring(1)}`
          phoneNumbers.push(customer.phone, normalizedPhone)
          customerByPhone.set(customer.phone, customer)
          customerByPhone.set(normalizedPhone, customer)
        }
        if (customer.email) {
          emailAddresses.push(customer.email)
          customerByEmail.set(customer.email, customer)
        }
      }

      // Fetch messages from the unified messages table
      const { data: messages } = await supabase
        .from('messages')
        .select(`
          *,
          lead:leads!messages_lead_id_fkey(id, first_name, last_name, email, phone),
          user:users!messages_user_id_fkey(id, full_name, email)
        `)
        .eq('organization_id', userOrg.organization_id)
        .order('created_at', { ascending: false })
        .limit(500)
      
      // Also fetch from log tables for backwards compatibility
      const [smsResults, whatsappResults, emailResults] = await Promise.all([
        phoneNumbers.length > 0 
          ? supabase
              .from('sms_logs')
              .select('*')
              .or(phoneNumbers.map(p => `to.eq.${p}`).concat(phoneNumbers.map(p => `from_number.eq.${p}`)).join(','))
              .order('created_at', { ascending: false })
              .limit(100)
          : Promise.resolve({ data: [] }),
        
        phoneNumbers.length > 0
          ? supabase
              .from('whatsapp_logs')
              .select('*')
              .or(phoneNumbers.map(p => `to.eq.${p}`).concat(phoneNumbers.map(p => `from_number.eq.${p}`)).join(','))
              .order('created_at', { ascending: false })
              .limit(100)
          : Promise.resolve({ data: [] }),
        
        emailAddresses.length > 0
          ? supabase
              .from('email_logs')
              .select('*')
              .in('to_email', emailAddresses)
              .order('created_at', { ascending: false })
              .limit(100)
          : Promise.resolve({ data: [] })
      ])

      // Group messages by customer
      const messagesByCustomer = new Map<string, Array<{message: any, type: 'sms' | 'whatsapp' | 'email'}>>()
      
      // Process messages from unified messages table first
      if (messages && messages.length > 0) {
        for (const msg of messages) {
          const customerId = msg.lead_id
          if (customerId) {
            if (!messagesByCustomer.has(customerId)) {
              messagesByCustomer.set(customerId, [])
            }
            messagesByCustomer.get(customerId)!.push({ 
              message: {
                ...msg,
                message: msg.content || msg.message,
                from_number: msg.direction === 'inbound' ? msg.phone_number : null,
                to: msg.direction === 'outbound' ? msg.phone_number : null
              }, 
              type: msg.type as 'sms' | 'whatsapp' | 'email' 
            })
          }
        }
      }
      
      // Process SMS messages from logs
      for (const msg of smsResults.data || []) {
        const customer = customerByPhone.get(msg.to) || customerByPhone.get(msg.from_number)
        if (customer) {
          if (!messagesByCustomer.has(customer.id)) {
            messagesByCustomer.set(customer.id, [])
          }
          messagesByCustomer.get(customer.id)!.push({ message: msg, type: 'sms' })
        }
      }
      
      // Process WhatsApp messages  
      for (const msg of whatsappResults.data || []) {
        const customer = customerByPhone.get(msg.to) || customerByPhone.get(msg.from_number)
        if (customer) {
          if (!messagesByCustomer.has(customer.id)) {
            messagesByCustomer.set(customer.id, [])
          }
          messagesByCustomer.get(customer.id)!.push({ message: msg, type: 'whatsapp' })
        }
      }
      
      // Process email messages
      for (const msg of emailResults.data || []) {
        const customer = customerByEmail.get(msg.to_email)
        if (customer) {
          if (!messagesByCustomer.has(customer.id)) {
            messagesByCustomer.set(customer.id, [])
          }
          messagesByCustomer.get(customer.id)!.push({ message: msg, type: 'email' })
        }
      }
      
      // Build conversations from grouped messages
      const conversationsData: Conversation[] = []
      
      for (const [customerId, messages] of messagesByCustomer) {
        const customer = customerById.get(customerId)
        if (!customer) continue
        
        // Sort messages by date and get the latest
        messages.sort((a, b) => 
          new Date(b.message.created_at).getTime() - new Date(a.message.created_at).getTime()
        )
        
        const latest = messages[0]
        if (latest) {
          conversationsData.push({
            id: customer.id,
            customer_id: customer.id,
            customer_name: customer.name || 'Unknown',
            customer_email: customer.email || '',
            customer_phone: customer.phone || '',
            last_message: latest.message.message || latest.message.subject || 'No content',
            last_message_type: latest.type,
            last_message_time: latest.message.created_at,
            unread_count: 0, // TODO: Implement unread tracking
            total_messages: messages.length
          })
        }
      }

      // Sort by most recent message
      conversationsData.sort((a, b) => 
        new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
      )

      console.log('Found conversations:', conversationsData.length)
      console.log('Messages from unified table:', messages?.length || 0)
      console.log('Messages from SMS logs:', smsResults.data?.length || 0)
      console.log('Messages from WhatsApp logs:', whatsappResults.data?.length || 0)
      console.log('Messages from Email logs:', emailResults.data?.length || 0)
      
      setConversations(conversationsData)
    } catch (error) {
      console.error('Error fetching conversations:', error)
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

  const filteredConversations = conversations.filter(conv => {
    const search = searchTerm.toLowerCase()
    return conv.customer_name.toLowerCase().includes(search) ||
           conv.customer_email.toLowerCase().includes(search) ||
           conv.customer_phone.includes(search) ||
           conv.last_message.toLowerCase().includes(search)
  })

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Conversations</h1>
            <p className="text-gray-400">Recent messages with your customers</p>
          </div>
          <div className="flex gap-2">
            {isFeatureEnabled('conversationsNewButton') && contactsCount > 0 ? (
              <button
                onClick={() => {
                  // Toggle to enhanced view which has the new conversation button
                  setUseEnhanced(true)
                }}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center gap-2"
              >
                <MessageSquare className="h-4 w-4" />
                New Conversation
              </button>
            ) : (
              <div className="relative">
                <button
                  disabled
                  className="px-4 py-2 bg-gray-600 text-gray-400 rounded-lg flex items-center gap-2 cursor-not-allowed opacity-60"
                  title={contactsCount === 0 ? "Add contacts first to start conversations" : "Feature not available"}
                >
                  <MessageSquare className="h-4 w-4" />
                  New Conversation
                </button>
                {contactsCount === 0 && (
                  <div className="absolute top-full left-0 mt-1 bg-yellow-600 text-yellow-100 text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                    Add contacts first to start conversations
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setUseEnhanced(!useEnhanced)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
            >
              Switch to {useEnhanced ? 'Classic' : 'Enhanced'} View
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Conversations List */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400">Loading conversations...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">
              {searchTerm ? 'No conversations found matching your search' : 'No conversations yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => router.push(`/customers/${conversation.customer_id}`)}
                className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="bg-gray-700 rounded-full p-3">
                      <User className="h-6 w-6 text-gray-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-medium text-white truncate">
                          {conversation.customer_name}
                        </h3>
                        <div className="flex items-center space-x-2 text-sm text-gray-400">
                          <Clock className="h-4 w-4" />
                          <span>{formatBritishDateTime(conversation.last_message_time)}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-400 mb-2">
                        {conversation.customer_email && (
                          <span className="truncate">{conversation.customer_email}</span>
                        )}
                        {conversation.customer_email && conversation.customer_phone && (
                          <span>•</span>
                        )}
                        {conversation.customer_phone && (
                          <span>{conversation.customer_phone}</span>
                        )}
                      </div>
                      <div className="flex items-start space-x-2">
                        <div className={getMessageColor(conversation.last_message_type)}>
                          {getMessageIcon(conversation.last_message_type)}
                        </div>
                        <p className="text-gray-300 line-clamp-2">
                          {conversation.last_message}
                        </p>
                      </div>
                    </div>
                  </div>
                  {conversation.unread_count > 0 && (
                    <div className="ml-4">
                      <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded-full">
                        {conversation.unread_count}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default function ConversationsPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-gray-400">Loading conversations...</div>
        </div>
      </DashboardLayout>
    }>
      <ConversationsContent />
    </Suspense>
  )
}