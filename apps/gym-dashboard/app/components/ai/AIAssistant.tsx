'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Sparkles, X, Maximize2, Minimize2, ChevronDown } from 'lucide-react'
import { cn } from '@/app/lib/utils'

interface Message {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  confidence?: number
  reasoning?: string
  evidence?: any[]
  recommendations?: string[]
  visualizations?: any[]
  actions?: any[]
}

interface AIAssistantProps {
  organizationId: string
  initialMessages?: Message[]
  className?: string
  embedded?: boolean
}

export function AIAssistant({ 
  organizationId, 
  initialMessages = [], 
  className,
  embedded = false 
}: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [showDetails, setShowDetails] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  
  useEffect(() => {
    scrollToBottom()
  }, [messages])
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!input.trim() || isLoading) return
    
    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      role: 'user',
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)
    
    try {
      const response = await fetch('/api/ai/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: userMessage.content,
          organizationId
        })
      })
      
      if (!response.ok) throw new Error('Failed to get AI response')
      
      const data = await response.json()
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.answer,
        role: 'assistant',
        timestamp: new Date(),
        confidence: data.confidence,
        reasoning: data.reasoning,
        evidence: data.evidence,
        recommendations: data.recommendations,
        visualizations: data.visualizations,
        actions: data.actions
      }
      
      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error getting AI response:', error)
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        role: 'assistant',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }
  
  const renderVisualization = (viz: any) => {
    // Simple visualization rendering - expand based on needs
    switch (viz.type) {
      case 'line_chart':
        return (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mt-2">
            <h4 className="text-sm font-medium mb-2">{viz.title}</h4>
            <div className="text-xs text-gray-500">
              [Line chart visualization would go here]
            </div>
          </div>
        )
      case 'bar_chart':
        return (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mt-2">
            <h4 className="text-sm font-medium mb-2">{viz.title}</h4>
            <div className="text-xs text-gray-500">
              [Bar chart visualization would go here]
            </div>
          </div>
        )
      default:
        return null
    }
  }
  
  const renderAction = (action: any, index: number) => {
    return (
      <div
        key={index}
        className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg mt-2"
      >
        <div className="flex-1">
          <p className="text-sm font-medium">{action.action}</p>
          {action.automatable && (
            <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
              Can be automated
            </p>
          )}
        </div>
        <button className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700">
          Execute
        </button>
      </div>
    )
  }
  
  if (embedded && isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 bg-orange-600 text-white p-3 rounded-full shadow-lg hover:bg-orange-700 transition-colors"
      >
        <Sparkles className="h-6 w-6" />
      </button>
    )
  }
  
  return (
    <div className={cn(
      "flex flex-col bg-white dark:bg-gray-900 rounded-lg shadow-lg",
      embedded && "fixed bottom-4 right-4 w-96 h-[600px] z-50",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-orange-600" />
          <h3 className="font-semibold">AI Assistant</h3>
        </div>
        {embedded && (
          <button
            onClick={() => setIsMinimized(true)}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <Minimize2 className="h-4 w-4" />
          </button>
        )}
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.role === 'user' ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-lg p-3",
                message.role === 'user'
                  ? "bg-orange-600 text-white"
                  : "bg-gray-100 dark:bg-gray-800"
              )}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              
              {/* Confidence indicator */}
              {message.confidence !== undefined && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="text-xs opacity-70">
                    Confidence: {Math.round(message.confidence * 100)}%
                  </div>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                    <div
                      className="bg-green-500 h-1 rounded-full"
                      style={{ width: `${message.confidence * 100}%` }}
                    />
                  </div>
                </div>
              )}
              
              {/* Show details toggle */}
              {(message.reasoning || message.evidence?.length || message.recommendations?.length) && (
                <button
                  onClick={() => setShowDetails(showDetails === message.id ? null : message.id)}
                  className="mt-2 text-xs underline opacity-70 hover:opacity-100"
                >
                  {showDetails === message.id ? 'Hide' : 'Show'} details
                </button>
              )}
              
              {/* Details section */}
              {showDetails === message.id && (
                <div className="mt-3 space-y-3 text-xs">
                  {message.reasoning && (
                    <div>
                      <p className="font-semibold mb-1">Reasoning:</p>
                      <p className="opacity-80 whitespace-pre-wrap">{message.reasoning}</p>
                    </div>
                  )}
                  
                  {message.evidence && message.evidence.length > 0 && (
                    <div>
                      <p className="font-semibold mb-1">Based on:</p>
                      <ul className="list-disc list-inside opacity-80">
                        {message.evidence.slice(0, 3).map((e, i) => (
                          <li key={i}>{JSON.stringify(e).slice(0, 100)}...</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {message.recommendations && message.recommendations.length > 0 && (
                    <div>
                      <p className="font-semibold mb-1">Recommendations:</p>
                      <ul className="list-disc list-inside opacity-80">
                        {message.recommendations.map((rec, i) => (
                          <li key={i}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              
              {/* Visualizations */}
              {message.visualizations?.map((viz, i) => (
                <div key={i}>{renderVisualization(viz)}</div>
              ))}
              
              {/* Actions */}
              {message.actions && message.actions.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs font-semibold mb-2">Suggested Actions:</p>
                  {message.actions.map((action, i) => renderAction(action, i))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3">
              <Loader2 className="h-4 w-4 animate-spin" />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t dark:border-gray-700">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask me anything about your business..."
            className="flex-1 resize-none rounded-lg border dark:border-gray-600 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-600"
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="bg-orange-600 text-white p-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </form>
    </div>
  )
}