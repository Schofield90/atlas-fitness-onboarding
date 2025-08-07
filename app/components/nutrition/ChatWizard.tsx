'use client'

import { useState, useRef, useEffect } from 'react'
import Button from '@/app/components/ui/Button'
import { MessageCircle, Send, Bot, User, RefreshCw, Sparkles, CheckCircle, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ChatWizardProps {
  profile?: any
  onProfileComplete?: (profile: any) => void
  onCancel?: () => void
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ApiResponse {
  success: boolean
  data?: {
    message: string
    isComplete: boolean
    extractedData?: any
  }
  error?: string
}

const INITIAL_SUGGESTIONS = [
  "I'm ready to set up my nutrition profile",
  "I want to lose weight and build muscle",
  "I'm a vegetarian looking for a meal plan",
  "Help me understand my macro needs"
]

export default function ChatWizard({ profile, onProfileComplete, onCancel }: ChatWizardProps) {
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your nutrition coach. I'll help you set up your personalized nutrition profile by asking a few questions about your goals, lifestyle, and preferences. Ready to get started?",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isComplete, setIsComplete] = useState(false)
  const [extractedProfile, setExtractedProfile] = useState<any>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading || isComplete) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    const newMessages = [...messages, userMessage]
    setMessages(newMessages)
    setInput('')
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/nutrition/chat/wizard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          conversation: newMessages.filter(msg => msg.role === 'user' || msg.role === 'assistant').map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      })

      const data: ApiResponse = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      if (data.success && data.data) {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.data.message,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])

        if (data.data.isComplete) {
          setIsComplete(true)
          setExtractedProfile(data.data.extractedData)
          
          // If we have a callback, call it with the extracted profile
          if (onProfileComplete && data.data.extractedData) {
            setTimeout(() => {
              onProfileComplete(data.data.extractedData)
            }, 2000) // Give user time to see the success message
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      setError(error instanceof Error ? error.message : 'Failed to send message. Please try again.')
      
      // Remove the user message if there was an error
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id))
    } finally {
      setIsLoading(false)
    }
  }

  const handleRefresh = async () => {
    if (onProfileComplete && extractedProfile) {
      onProfileComplete(extractedProfile)
    } else {
      router.refresh()
    }
  }

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion)
  }

  const clearChat = () => {
    if (isComplete) return // Don't allow clearing if profile is complete
    
    setMessages([{
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your nutrition coach. I'll help you set up your personalized nutrition profile by asking a few questions about your goals, lifestyle, and preferences. Ready to get started?",
      timestamp: new Date()
    }])
    setError(null)
    setIsComplete(false)
    setExtractedProfile(null)
  }

  return (
    <div className="flex flex-col h-[600px]">
      {/* Header */}
      <div className="border-b border-gray-200 p-4 flex justify-between items-center">
        <div className="flex items-center">
          <Bot className="h-6 w-6 text-blue-600 mr-2" />
          <div>
            <h3 className="font-semibold">Nutrition Profile Setup</h3>
            <p className="text-xs text-gray-500">AI-powered profile wizard</p>
          </div>
        </div>
        <div className="flex gap-2">
          {onCancel && !isComplete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              title="Use form instead"
            >
              Use Form
            </Button>
          )}
          {!isComplete && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              title="Clear chat"
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`flex max-w-[80%] ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`flex-shrink-0 ${message.role === 'user' ? 'ml-2' : 'mr-2'}`}>
                {message.role === 'user' ? (
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="h-4 w-4 text-white" />
                  </div>
                ) : (
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <Bot className="h-4 w-4 text-gray-600" />
                  </div>
                )}
              </div>
              <div
                className={`rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <p className="text-sm">{message.content}</p>
                <p className={`text-xs mt-1 ${
                  message.role === 'user' ? 'text-blue-200' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center mr-2">
                <Bot className="h-4 w-4 text-gray-600" />
              </div>
              <div className="bg-gray-100 rounded-lg p-3">
                <div className="flex space-x-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="flex justify-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {isComplete && (
          <div className="flex justify-center">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-md text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h4 className="font-semibold text-green-900 mb-2">Profile Setup Complete!</h4>
              <p className="text-sm text-green-700 mb-4">
                Your nutrition profile has been created successfully. 
                {onProfileComplete ? "Redirecting to your dashboard..." : "You can now access your personalized meal plans and nutrition recommendations."}
              </p>
              {!onProfileComplete && (
                <Button
                  onClick={handleRefresh}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Go to Dashboard
                </Button>
              )}
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {messages.length === 1 && !isComplete && (
        <div className="border-t border-gray-200 p-4">
          <p className="text-sm text-gray-500 mb-2 flex items-center">
            <Sparkles className="h-4 w-4 mr-1" />
            Quick starts:
          </p>
          <div className="flex flex-wrap gap-2">
            {INITIAL_SUGGESTIONS.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => handleSuggestion(suggestion)}
                className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      {!isComplete && (
        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Type your answer..."
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-4"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}