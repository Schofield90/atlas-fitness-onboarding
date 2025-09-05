'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  MessageSquare, 
  Search, 
  Plus, 
  Send, 
  Phone, 
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Star,
  Archive,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import MessageThread from '@/components/messaging/MessageThread'

interface Conversation {
  id: string
  title: string
  status: string
  last_message_at: string
  created_at: string
  last_message: string
  unread_count: number
  clients: {
    id: string
    name: string
    email: string
  }
  users: {
    id: string
    name: string
    email: string
  }
}

interface Message {
  id: string
  content: string
  sender: string
  timestamp: string
  isOwn: boolean
}

export default function MessagesPage() {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [showNewConversation, setShowNewConversation] = useState(false)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/conversations')
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
      } else {
        toast.error('Failed to load conversations')
      }
    } catch (error) {
      console.error('Error loading conversations:', error)
      toast.error('Error loading conversations')
    } finally {
      setLoading(false)
    }
  }

  const selectedConv = conversations.find(c => c.id === selectedConversation)

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    
    return date.toLocaleDateString()
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Conversations List */}
      <div className="w-80 border-r border-gray-200 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Messages</h2>
            <Button
              size="sm"
              onClick={() => setShowNewConversation(true)}
              className="h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="text-sm text-gray-500">Loading conversations...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-sm font-medium text-gray-900 mb-2">No conversations yet</h3>
              <p className="text-sm text-gray-500 mb-4">
                Conversations will appear here when you start messaging with clients
              </p>
            </div>
          ) : (
            <div className="p-2">
              {conversations
                .filter(conv => 
                  conv.clients?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  conv.title?.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => setSelectedConversation(conversation.id)}
                    className={cn(
                      "w-full p-3 rounded-lg hover:bg-gray-50 transition-colors mb-1 text-left",
                      selectedConversation === conversation.id && "bg-blue-50"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>{conversation.clients?.name?.[0] || 'C'}</AvatarFallback>
                        </Avatar>
                        <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{conversation.clients?.name || conversation.title}</p>
                          <span className="text-xs text-gray-500">{formatTime(conversation.last_message_at)}</span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {conversation.last_message || 'No messages yet'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            client
                          </Badge>
                          {conversation.unread_count > 0 && (
                            <Badge className="h-5 px-1.5 text-xs">
                              {conversation.unread_count}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Conversation View */}
      <div className="flex-1">
        {selectedConv ? (
          <MessageThread
            conversationId={selectedConv.id}
            clientName={selectedConv.clients?.name || selectedConv.title}
            clientAvatar={undefined}
            className="h-full"
          />
        ) : (
          <div className="flex-1 flex items-center justify-center h-full">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-500 mb-4">
                Choose a conversation from the list to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}