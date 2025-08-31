'use client'

import { useState } from 'react'
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

interface Conversation {
  id: string
  name: string
  avatar?: string
  lastMessage: string
  timestamp: string
  unread: number
  status: 'online' | 'offline' | 'away'
  type: 'lead' | 'client' | 'staff'
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
  const [messageInput, setMessageInput] = useState('')
  const [showNewConversation, setShowNewConversation] = useState(false)

  // Mock data - in production this would come from API
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])

  const handleStartConversation = () => {
    // Create a new mock conversation
    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      name: 'New Lead',
      lastMessage: 'Start your conversation...',
      timestamp: 'now',
      unread: 0,
      status: 'online',
      type: 'lead'
    }
    setConversations([newConversation, ...conversations])
    setSelectedConversation(newConversation.id)
    setShowNewConversation(false)
  }

  const handleSendMessage = () => {
    if (!messageInput.trim() || !selectedConversation) return

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      content: messageInput,
      sender: 'You',
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      isOwn: true
    }

    setMessages([...messages, newMessage])
    setMessageInput('')

    // Update conversation's last message
    setConversations(conversations.map(conv => 
      conv.id === selectedConversation 
        ? { ...conv, lastMessage: messageInput, timestamp: 'now' }
        : conv
    ))
  }

  const selectedConv = conversations.find(c => c.id === selectedConversation)

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
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
              <h3 className="text-sm font-medium text-gray-900 mb-2">No conversations yet</h3>
              <p className="text-sm text-gray-500 mb-4">
                Start a conversation with your leads or clients
              </p>
              <Button onClick={() => setShowNewConversation(true)} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Start Conversation
              </Button>
            </div>
          ) : (
            <div className="p-2">
              {conversations
                .filter(conv => 
                  conv.name.toLowerCase().includes(searchQuery.toLowerCase())
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
                          <AvatarImage src={conversation.avatar} />
                          <AvatarFallback>{conversation.name[0]}</AvatarFallback>
                        </Avatar>
                        <div className={cn(
                          "absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white",
                          conversation.status === 'online' && "bg-green-500",
                          conversation.status === 'away' && "bg-yellow-500",
                          conversation.status === 'offline' && "bg-gray-300"
                        )} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-sm">{conversation.name}</p>
                          <span className="text-xs text-gray-500">{conversation.timestamp}</span>
                        </div>
                        <p className="text-sm text-gray-600 truncate">{conversation.lastMessage}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            {conversation.type}
                          </Badge>
                          {conversation.unread > 0 && (
                            <Badge className="h-5 px-1.5 text-xs">
                              {conversation.unread}
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
      <div className="flex-1 flex flex-col">
        {selectedConv ? (
          <>
            {/* Conversation Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={selectedConv.avatar} />
                  <AvatarFallback>{selectedConv.name[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{selectedConv.name}</p>
                  <p className="text-sm text-gray-500">
                    {selectedConv.status === 'online' ? 'Active now' : 'Last seen recently'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Phone className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Video className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Star className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <Archive className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <MessageSquare className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-sm text-gray-500">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={cn(
                        "flex",
                        message.isOwn ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[70%] rounded-lg px-4 py-2",
                          message.isOwn
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-900"
                        )}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className={cn(
                          "text-xs mt-1",
                          message.isOwn ? "text-blue-100" : "text-gray-500"
                        )}>
                          {message.timestamp}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon">
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  placeholder="Type a message..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1"
                />
                <Button variant="ghost" size="icon">
                  <Smile className="h-4 w-4" />
                </Button>
                <Button onClick={handleSendMessage} disabled={!messageInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Select a conversation</h3>
              <p className="text-gray-500 mb-4">
                Choose a conversation from the list or start a new one
              </p>
              {conversations.length === 0 && (
                <Button onClick={() => setShowNewConversation(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Start New Conversation
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New Conversation Modal */}
      {showNewConversation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-semibold mb-4">Start New Conversation</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Recipient</label>
                <Input placeholder="Search for lead or client..." />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Message</label>
                <textarea
                  className="w-full border rounded-lg p-2 text-sm"
                  rows={4}
                  placeholder="Type your message..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <Button variant="outline" onClick={() => setShowNewConversation(false)}>
                Cancel
              </Button>
              <Button onClick={handleStartConversation}>
                Start Conversation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}