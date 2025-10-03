'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageCircle, X, Send, Loader2, HelpCircle, Sparkles } from 'lucide-react'

interface Message {
  id: string
  role: 'assistant' | 'user'
  content: string
  timestamp: Date
}

interface PhoneSetupAssistantProps {
  isOpen: boolean
  onClose: () => void
  currentStep: string
  setupMethod: string
}

const PREDEFINED_QUESTIONS = [
  "What's the difference between the two setup methods?",
  "How much does a phone number cost?",
  "Can I port my existing number?",
  "What features are included?",
  "How long does setup take?"
]

const CONTEXT_RESPONSES: { [key: string]: string } = {
  "difference": `**Quick Setup** is perfect if you want to get started immediately. We handle everything - you just choose a number and it's ready to use in minutes. You'll pay a simple monthly fee (starting at £10) that includes the number and all features.

**Own Twilio Account** gives you more control but requires some technical setup. You'll need to create a Twilio account, add funds, and manage billing directly with Twilio. This is better if you want full ownership of your numbers or already have a Twilio account.`,
  
  "cost": `**Quick Setup**: Starting from £10/month, which includes:
• The phone number rental
• Unlimited incoming calls
• 1000 outgoing minutes
• 1000 SMS messages
• All CRM features (voicemail, call forwarding, etc.)

**Own Twilio**: You pay Twilio directly:
• Number rental: ~£1-3/month
• Calls: ~£0.01-0.02/minute
• SMS: ~£0.04 per message
• Total varies based on usage (typically £5-50/month)`,
  
  "port": `Yes, you can port your existing number! 

**For Quick Setup**: We'll handle the porting process for you. It typically takes 5-7 business days. There's a one-time £25 porting fee.

**For Own Twilio**: You'll initiate the port through Twilio's console. The process is the same timeline but you manage it directly.

Note: Your current provider must release the number, and it must be a standard mobile or landline number (not VoIP).`,
  
  "features": `Both setup methods include all these features in the CRM:
• Professional voicemail with custom greetings
• Call forwarding to any number
• Business hours routing
• Missed call text-back
• Call recording (optional)
• SMS/text messaging
• Auto-reply messages
• Call tracking & analytics
• Multiple staff extensions (coming soon)

The only difference is who manages the underlying phone service.`,
  
  "setup_time": `**Quick Setup**: 
• Choose number: 1 minute
• Automatic configuration: 1 minute
• Ready to use: Immediately
• Total: ~2 minutes

**Own Twilio Account**:
• Create Twilio account: 5 minutes
• Add payment method: 2 minutes
• Purchase number: 2 minutes
• Enter credentials in CRM: 2 minutes
• Configuration: 2-3 minutes
• Total: ~10-15 minutes`
}

export default function PhoneSetupAssistant({ 
  isOpen, 
  onClose, 
  currentStep, 
  setupMethod 
}: PhoneSetupAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm here to help you set up your gym's phone system. You can ask me anything about the setup process, costs, or features. What would you like to know?",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    // Add contextual message when step changes
    if (currentStep === 'complete') {
      addAssistantMessage("Great! Your phone is all set up. You can now configure settings like voicemail greetings, call forwarding, and auto-replies. Would you like help with any of these features?")
    } else if (setupMethod === 'provision') {
      addAssistantMessage("You've chosen Quick Setup - excellent choice! I'll help you find the perfect phone number for your gym. You can search by area code or city. What location would work best for you?")
    } else if (setupMethod === 'external') {
      addAssistantMessage("You're connecting your own Twilio account. I'll guide you through getting your credentials. Do you already have a Twilio account, or do you need help creating one?")
    }
  }, [currentStep, setupMethod])

  const addAssistantMessage = (content: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newMessage])
  }

  const handleSendMessage = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsTyping(true)

    // Simulate AI response with context-aware answers
    setTimeout(() => {
      let response = "I can help you with that! "
      
      const lowerInput = input.toLowerCase()
      
      if (lowerInput.includes('difference') || lowerInput.includes('which') || lowerInput.includes('better')) {
        response = CONTEXT_RESPONSES.difference
      } else if (lowerInput.includes('cost') || lowerInput.includes('price') || lowerInput.includes('how much')) {
        response = CONTEXT_RESPONSES.cost
      } else if (lowerInput.includes('port') || lowerInput.includes('existing') || lowerInput.includes('transfer')) {
        response = CONTEXT_RESPONSES.port
      } else if (lowerInput.includes('feature') || lowerInput.includes('included') || lowerInput.includes('what do')) {
        response = CONTEXT_RESPONSES.features
      } else if (lowerInput.includes('time') || lowerInput.includes('how long') || lowerInput.includes('quick')) {
        response = CONTEXT_RESPONSES.setup_time
      } else if (lowerInput.includes('twilio') && lowerInput.includes('account')) {
        response = `To create a Twilio account:
1. Go to www.twilio.com/try-twilio
2. Sign up with your email
3. Verify your phone number
4. You'll get free trial credits to start
5. Once logged in, find your Account SID and Auth Token in the Console Dashboard

These are the credentials you'll enter in the CRM. Need help finding them?`
      } else if (lowerInput.includes('help') || lowerInput.includes('stuck')) {
        response = `I'm here to help! Here are the most common questions:
• Setting up costs and pricing
• Time required for each method
• Which option is best for your gym
• Technical requirements
• Available features

What specific aspect would you like help with?`
      } else {
        response = `Based on your question about "${input}", I recommend checking our documentation or contacting support for detailed assistance. 

For now, you might find these topics helpful:
• Setup method comparison
• Pricing details
• Feature overview
• Setup timeline

What would you like to explore?`
      }

      addAssistantMessage(response)
      setIsTyping(false)
    }, 1500)
  }

  const handleQuickQuestion = (question: string) => {
    setInput(question)
    handleSendMessage()
  }

  if (!isOpen) return null

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 flex flex-col h-[600px]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg">
            <Sparkles className="h-4 w-4 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Setup Assistant</h3>
            <p className="text-xs text-gray-400">AI-powered help</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-700 rounded"
        >
          <X className="h-4 w-4 text-gray-400" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-200'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
              <p className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </p>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-700 p-3 rounded-lg">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Questions */}
      {messages.length === 1 && (
        <div className="p-3 border-t border-gray-700">
          <p className="text-xs text-gray-400 mb-2">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {PREDEFINED_QUESTIONS.map((question) => (
              <button
                key={question}
                onClick={() => handleQuickQuestion(question)}
                className="text-xs px-3 py-1.5 bg-gray-700 text-gray-300 rounded-full hover:bg-gray-600"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask me anything..."
            className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSendMessage}
            disabled={!input.trim() || isTyping}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isTyping ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}