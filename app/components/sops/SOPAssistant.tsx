'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/app/components/ui/Card'
import { Button } from '@/app/components/ui/Button'
import { Badge } from '@/app/components/ui/Badge'
import { SOPWithDetails, SOPChatResponse } from '@/app/lib/types/sop'

interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  confidence?: number
  sources?: Array<{ title: string; section: string }>
  followUpQuestions?: string[]
  timestamp: Date
}

interface SOPAssistantProps {
  sop?: SOPWithDetails
  onNavigateToSOP?: (sopId: string) => void
}

export function SOPAssistant({ sop, onNavigateToSOP }: SOPAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [chatHistory, setChatHistory] = useState<any[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (sop) {
      fetchChatHistory()
      // Add welcome message
      setMessages([{
        id: 'welcome',
        type: 'assistant',
        content: `Hi! I'm here to help you understand "${sop.title}". You can ask me questions about the procedures, requirements, or any specific details you need clarification on.`,
        timestamp: new Date()
      }])
    }
  }, [sop?.id])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchChatHistory = async () => {
    if (!sop) return

    try {
      const response = await fetch(`/api/sops/chat?sopId=${sop.id}&limit=5`)
      if (response.ok) {
        const data = await response.json()
        setChatHistory(data.chatHistory || [])
      }
    } catch (error) {
      console.error('Error fetching chat history:', error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const sendMessage = async (question?: string) => {
    const messageText = question || input.trim()
    if (!messageText || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: messageText,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/sops/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: messageText,
          sopId: sop?.id,
          contextSopIds: [],
          conversationHistory: messages.slice(-5) // Last 5 messages for context
        })
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
      }

      const data: SOPChatResponse & { mainSop?: any; relatedSops?: any[] } = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.answer,
        confidence: data.confidence,
        sources: data.sources,
        followUpQuestions: data.followUpQuestions,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'I apologize, but I encountered an error processing your question. Please try again or rephrase your question.',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-100 text-green-800'
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const formatTimestamp = (timestamp: Date) => {
    return timestamp.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="flex flex-col h-full max-h-[800px]">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 p-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">SOP Assistant</h3>
            <p className="text-sm text-gray-600">
              {sop ? `Ask questions about "${sop.title}"` : 'General SOP assistance'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-3 ${
                message.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <p className="whitespace-pre-wrap">{message.content}</p>
              
              {message.type === 'assistant' && (
                <div className="mt-3 space-y-2">
                  {/* Confidence Score */}
                  {message.confidence && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600">Confidence:</span>
                      <Badge className={getConfidenceColor(message.confidence)}>
                        {Math.round(message.confidence * 100)}%
                      </Badge>
                    </div>
                  )}

                  {/* Sources */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Sources:</span>
                      <div className="mt-1 space-y-1">
                        {message.sources.map((source, index) => (
                          <div key={index} className="flex items-center gap-1">
                            <span>•</span>
                            <span>{source.title} - {source.section}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Follow-up Questions */}
                  {message.followUpQuestions && message.followUpQuestions.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-gray-600 mb-2 font-medium">
                        You might also want to ask:
                      </p>
                      <div className="space-y-1">
                        {message.followUpQuestions.map((question, index) => (
                          <button
                            key={index}
                            onClick={() => sendMessage(question)}
                            className="block w-full text-left text-xs bg-white border border-gray-200 rounded px-2 py-1 hover:bg-gray-50 text-gray-700"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <div className={`text-xs mt-2 ${
                message.type === 'user' ? 'text-blue-200' : 'text-gray-500'
              }`}>
                {formatTimestamp(message.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                <span className="text-gray-600">Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 border-t border-gray-200 p-4">
        <div className="flex gap-3">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={sop ? "Ask a question about this SOP..." : "Ask a question about SOPs..."}
            className="flex-1 min-h-[44px] max-h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            disabled={loading}
            rows={1}
          />
          <Button
            onClick={() => sendMessage()}
            disabled={!input.trim() || loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </Button>
        </div>

        {/* Suggested Questions */}
        {messages.length <= 1 && !loading && (
          <div className="mt-3">
            <p className="text-xs text-gray-600 mb-2">Try asking:</p>
            <div className="flex flex-wrap gap-2">
              {[
                "What are the main steps?",
                "What safety requirements are mentioned?",
                "Who is responsible for this?",
                "When should this be done?",
                "Are there any prerequisites?"
              ].map((question, index) => (
                <button
                  key={index}
                  onClick={() => sendMessage(question)}
                  className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-full text-gray-700 transition-colors"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Recent Chat History */}
      {chatHistory.length > 0 && messages.length <= 1 && (
        <Card className="m-4 p-4 bg-blue-50 border-blue-200">
          <h4 className="text-sm font-medium text-blue-900 mb-2">
            Recent Questions
          </h4>
          <div className="space-y-2">
            {chatHistory.slice(0, 3).map((chat, index) => (
              <div key={index} className="text-sm">
                <p className="text-blue-800 font-medium">{chat.question}</p>
                <p className="text-blue-700 text-xs mt-1 line-clamp-2">
                  {chat.answer.substring(0, 100)}...
                </p>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-blue-600 text-xs">
                    {Math.round(chat.confidence * 100)}% confidence
                  </span>
                  <button
                    onClick={() => sendMessage(chat.question)}
                    className="text-blue-600 hover:text-blue-700 text-xs"
                  >
                    Ask again
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}