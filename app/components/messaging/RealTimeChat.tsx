'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  SendIcon, PaperclipIcon, EmojiIcon, PhoneIcon, 
  VideoIcon, MoreVerticalIcon, CheckIcon, CheckCheckIcon,
  SearchIcon, MicIcon
} from 'lucide-react'

interface Message {
  id: string
  text: string
  sender: 'user' | 'contact'
  timestamp: string
  status: 'sending' | 'sent' | 'delivered' | 'read'
  attachments?: string[]
}

interface Contact {
  id: string
  name: string
  avatar?: string
  lastMessage: string
  lastSeen: string
  unreadCount: number
  online: boolean
  typing?: boolean
}

interface RealTimeChatProps {
  contactId?: string
  organizationId?: string
}

export default function RealTimeChat({ contactId, organizationId }: RealTimeChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messageText, setMessageText] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    // Initialize WebSocket connection
    initializeWebSocket()
    // Load mock data
    loadMockData()
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close()
      }
    }
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const initializeWebSocket = () => {
    // In production, connect to actual WebSocket server
    // For now, simulate connection
    setTimeout(() => {
      setConnectionStatus('connected')
      simulateIncomingMessages()
    }, 1000)
  }

  const simulateIncomingMessages = () => {
    // Simulate receiving messages
    const interval = setInterval(() => {
      if (Math.random() > 0.7 && selectedContact) {
        const newMessage: Message = {
          id: Date.now().toString(),
          text: getRandomMessage(),
          sender: 'contact',
          timestamp: new Date().toISOString(),
          status: 'delivered'
        }
        setMessages(prev => [...prev, newMessage])
      }
    }, 10000)

    return () => clearInterval(interval)
  }

  const getRandomMessage = () => {
    const messages = [
      "That sounds great!",
      "When can we schedule a session?",
      "I'm interested in the membership options",
      "Thank you for the information",
      "Can you tell me more about the classes?"
    ]
    return messages[Math.floor(Math.random() * messages.length)]
  }

  const loadMockData = () => {
    // Mock contacts
    setContacts([
      {
        id: '1',
        name: 'John Smith',
        lastMessage: 'Thanks for the info!',
        lastSeen: '2 min ago',
        unreadCount: 2,
        online: true
      },
      {
        id: '2',
        name: 'Sarah Johnson',
        lastMessage: 'See you at class tomorrow',
        lastSeen: '1 hour ago',
        unreadCount: 0,
        online: false
      },
      {
        id: '3',
        name: 'Mike Wilson',
        lastMessage: 'Can we reschedule?',
        lastSeen: '30 min ago',
        unreadCount: 1,
        online: true
      },
      {
        id: '4',
        name: 'Emma Davis',
        lastMessage: 'Perfect, thank you!',
        lastSeen: '2 hours ago',
        unreadCount: 0,
        online: false
      }
    ])

    // Mock messages for first contact
    setMessages([
      {
        id: '1',
        text: 'Hi, I saw your gym online and I\'m interested in joining',
        sender: 'contact',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        status: 'read'
      },
      {
        id: '2',
        text: 'Hello! Thanks for reaching out. We\'d love to have you. What type of membership are you interested in?',
        sender: 'user',
        timestamp: new Date(Date.now() - 3500000).toISOString(),
        status: 'read'
      },
      {
        id: '3',
        text: 'I\'m looking for something with access to classes and the gym',
        sender: 'contact',
        timestamp: new Date(Date.now() - 3400000).toISOString(),
        status: 'read'
      },
      {
        id: '4',
        text: 'Our unlimited membership would be perfect for you. It includes all classes and 24/7 gym access for £49/month',
        sender: 'user',
        timestamp: new Date(Date.now() - 3300000).toISOString(),
        status: 'delivered'
      },
      {
        id: '5',
        text: 'Thanks for the info!',
        sender: 'contact',
        timestamp: new Date(Date.now() - 60000).toISOString(),
        status: 'delivered'
      }
    ])
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = () => {
    if (!messageText.trim() || !selectedContact) return

    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'user',
      timestamp: new Date().toISOString(),
      status: 'sending'
    }

    setMessages(prev => [...prev, newMessage])
    setMessageText('')

    // Simulate message being sent
    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, status: 'sent' }
            : msg
        )
      )
    }, 500)

    setTimeout(() => {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id 
            ? { ...msg, status: 'delivered' }
            : msg
        )
      )
    }, 1000)
  }

  const handleTyping = (text: string) => {
    setMessageText(text)
    // Simulate typing indicator
    if (!isTyping && text.length > 0) {
      setIsTyping(true)
      setTimeout(() => setIsTyping(false), 1000)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckIcon className="h-3 w-3 text-gray-400" />
      case 'delivered':
        return <CheckCheckIcon className="h-3 w-3 text-gray-400" />
      case 'read':
        return <CheckCheckIcon className="h-3 w-3 text-blue-400" />
      default:
        return null
    }
  }

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex h-[600px] bg-gray-900 rounded-lg overflow-hidden">
      {/* Contacts Sidebar */}
      <div className="w-80 bg-gray-800 border-r border-gray-700">
        {/* Search */}
        <div className="p-4 border-b border-gray-700">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        {/* Connection Status */}
        <div className="px-4 py-2 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'connected' ? 'bg-green-500' : 
              connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
              'bg-red-500'
            }`} />
            <span className="text-xs text-gray-400">
              {connectionStatus === 'connected' ? 'Connected' :
               connectionStatus === 'connecting' ? 'Connecting...' :
               'Disconnected'}
            </span>
          </div>
        </div>

        {/* Contact List */}
        <div className="overflow-y-auto h-full">
          {filteredContacts.map(contact => (
            <button
              key={contact.id}
              onClick={() => setSelectedContact(contact)}
              className={`w-full p-4 flex items-center gap-3 hover:bg-gray-700 transition-colors ${
                selectedContact?.id === contact.id ? 'bg-gray-700' : ''
              }`}
            >
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                  <span className="text-white font-medium">
                    {contact.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                {contact.online && (
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800" />
                )}
              </div>
              <div className="flex-1 text-left">
                <div className="flex justify-between items-center">
                  <p className="font-medium text-white">{contact.name}</p>
                  <span className="text-xs text-gray-400">{contact.lastSeen}</span>
                </div>
                <p className="text-sm text-gray-400 truncate">{contact.lastMessage}</p>
              </div>
              {contact.unreadCount > 0 && (
                <div className="bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {contact.unreadCount}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      {selectedContact ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="bg-gray-800 px-4 py-3 border-b border-gray-700 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
                <span className="text-white font-medium">
                  {selectedContact.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
              <div>
                <p className="font-medium text-white">{selectedContact.name}</p>
                <p className="text-xs text-gray-400">
                  {selectedContact.online ? 'Active now' : `Last seen ${selectedContact.lastSeen}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-700 rounded-lg">
                <PhoneIcon className="h-5 w-5 text-gray-400" />
              </button>
              <button className="p-2 hover:bg-gray-700 rounded-lg">
                <VideoIcon className="h-5 w-5 text-gray-400" />
              </button>
              <button className="p-2 hover:bg-gray-700 rounded-lg">
                <MoreVerticalIcon className="h-5 w-5 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender === 'user' 
                    ? 'bg-orange-600 text-white' 
                    : 'bg-gray-700 text-white'
                }`}>
                  <p>{message.text}</p>
                  <div className={`flex items-center gap-1 mt-1 ${
                    message.sender === 'user' ? 'justify-end' : 'justify-start'
                  }`}>
                    <span className="text-xs opacity-70">
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {message.sender === 'user' && getStatusIcon(message.status)}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && selectedContact && (
              <div className="flex justify-start">
                <div className="bg-gray-700 px-4 py-2 rounded-lg">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <div className="bg-gray-800 px-4 py-3 border-t border-gray-700">
            <div className="flex items-center gap-2">
              <button className="p-2 hover:bg-gray-700 rounded-lg">
                <PaperclipIcon className="h-5 w-5 text-gray-400" />
              </button>
              <input
                type="text"
                value={messageText}
                onChange={(e) => handleTyping(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type a message..."
                className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button className="p-2 hover:bg-gray-700 rounded-lg">
                <EmojiIcon className="h-5 w-5 text-gray-400" />
              </button>
              <button className="p-2 hover:bg-gray-700 rounded-lg">
                <MicIcon className="h-5 w-5 text-gray-400" />
              </button>
              <button 
                onClick={sendMessage}
                className="p-2 bg-orange-600 hover:bg-orange-700 rounded-lg"
              >
                <SendIcon className="h-5 w-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <SendIcon className="h-10 w-10 text-gray-500" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">Select a conversation</h3>
            <p className="text-gray-400">Choose a contact to start messaging</p>
          </div>
        </div>
      )}
    </div>
  )
}