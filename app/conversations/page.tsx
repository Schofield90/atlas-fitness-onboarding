'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import DashboardLayout from '@/app/components/DashboardLayout'
import EnhancedChatInterface from '@/app/components/chat/EnhancedChatInterface'
import { MessageSquare, Mail, Phone, Clock, User, Search, Bot } from 'lucide-react'
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

  if (useEnhanced) {
    return (
      <DashboardLayout>
        <EnhancedChatInterface />
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
  const supabase = createClient()

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
      // First get all customers
      const { data: customers } = await supabase
        .from('contacts')
        .select('id, name, email, phone')
        .eq('organization_id', userOrg.organization_id)
        .order('updated_at', { ascending: false })
        .limit(50)

      if (!customers) {
        setContactsCount(0)
        return
      }

      setContactsCount(customers.length)

      // For each customer, get their latest message
      const conversationsData: Conversation[] = []
      
      for (const customer of customers) {
        // Skip if no contact info
        if (!customer.email && !customer.phone) continue

        // Build query conditions
        const conditions = []
        if (customer.phone) {
          const normalizedPhone = customer.phone.startsWith('+') ? customer.phone : `+44${customer.phone.substring(1)}`
          conditions.push(`to.eq.${customer.phone}`, `from_number.eq.${customer.phone}`)
          conditions.push(`to.eq.${normalizedPhone}`, `from_number.eq.${normalizedPhone}`)
        }

        // Get latest SMS
        let latestMessage: any = null
        let messageType: 'email' | 'sms' | 'whatsapp' | 'call' = 'sms'

        if (conditions.length > 0) {
          const { data: smsMessages } = await supabase
            .from('sms_logs')
            .select('*')
            .or(conditions.join(','))
            .order('created_at', { ascending: false })
            .limit(1)

          const { data: whatsappMessages } = await supabase
            .from('whatsapp_logs')
            .select('*')
            .or(conditions.join(','))
            .order('created_at', { ascending: false })
            .limit(1)

          // Compare timestamps to find the latest
          if (smsMessages?.[0] && whatsappMessages?.[0]) {
            if (new Date(smsMessages[0].created_at) > new Date(whatsappMessages[0].created_at)) {
              latestMessage = smsMessages[0]
              messageType = 'sms'
            } else {
              latestMessage = whatsappMessages[0]
              messageType = 'whatsapp'
            }
          } else if (smsMessages?.[0]) {
            latestMessage = smsMessages[0]
            messageType = 'sms'
          } else if (whatsappMessages?.[0]) {
            latestMessage = whatsappMessages[0]
            messageType = 'whatsapp'
          }
        }

        // Check email if we have it
        if (customer.email) {
          const { data: emailMessages } = await supabase
            .from('email_logs')
            .select('*')
            .eq('to_email', customer.email)
            .order('created_at', { ascending: false })
            .limit(1)

          if (emailMessages?.[0]) {
            if (!latestMessage || new Date(emailMessages[0].created_at) > new Date(latestMessage.created_at)) {
              latestMessage = emailMessages[0]
              messageType = 'email'
            }
          }
        }

        // If we found any messages, add to conversations
        if (latestMessage) {
          conversationsData.push({
            id: customer.id,
            customer_id: customer.id,
            customer_name: customer.name || 'Unknown',
            customer_email: customer.email || '',
            customer_phone: customer.phone || '',
            last_message: latestMessage.message || latestMessage.subject || 'No content',
            last_message_type: messageType,
            last_message_time: latestMessage.created_at,
            unread_count: 0, // TODO: Implement unread tracking
            total_messages: 1 // TODO: Get actual count
          })
        }
      }

      // Sort by most recent message
      conversationsData.sort((a, b) => 
        new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
      )

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