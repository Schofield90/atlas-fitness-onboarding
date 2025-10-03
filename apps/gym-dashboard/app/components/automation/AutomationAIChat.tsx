'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, Send, X, Sparkles, Plus, Trash2, Edit, MessageSquare, Mail, Phone, Users } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  action?: any
}

interface AutomationAIChatProps {
  onAddNode?: (nodeType: string, config: any) => void
  onModifyNode?: (nodeId: string, config: any) => void
  onDeleteNode?: (nodeId: string) => void
  existingNodes?: any[]
  organizationId: string
}

export default function AutomationAIChat({ 
  onAddNode, 
  onModifyNode, 
  onDeleteNode,
  existingNodes = [],
  organizationId 
}: AutomationAIChatProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your automation assistant. I can help you build and modify your workflows. Try asking me to:\n\n• Add a new trigger or action\n• Send messages to staff members\n• Create follow-up sequences\n• Set up conditional logic\n\nWhat would you like to automate?",
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const interpretCommand = (userInput: string) => {
    const lowerInput = userInput.toLowerCase()
    
    // Check for internal message/notification requests
    if (lowerInput.includes('message') && (lowerInput.includes('staff') || lowerInput.includes('team') || lowerInput.includes('internal'))) {
      return {
        type: 'add_node',
        nodeType: 'internal_message',
        config: {
          name: 'Internal Staff Notification',
          description: 'Send message to team member',
          channels: ['email', 'sms', 'whatsapp', 'telegram'],
          recipientType: 'staff'
        },
        response: "I'll add an internal message action to notify your staff. You can choose to send via email, SMS, WhatsApp, or Telegram. Configure the recipient and message in the node settings."
      }
    }

    // Check for email to staff
    if (lowerInput.includes('email') && lowerInput.includes('staff')) {
      return {
        type: 'add_node',
        nodeType: 'internal_message',
        config: {
          name: 'Email Staff Member',
          description: 'Send email notification to team',
          channels: ['email'],
          recipientType: 'staff'
        },
        response: "I'll add an email action to notify your staff members. You can select which staff member to notify and customize the message."
      }
    }

    // Check for WhatsApp message
    if (lowerInput.includes('whatsapp')) {
      if (lowerInput.includes('staff') || lowerInput.includes('team')) {
        return {
          type: 'add_node',
          nodeType: 'internal_message',
          config: {
            name: 'WhatsApp Staff Alert',
            description: 'Send WhatsApp to team member',
            channels: ['whatsapp'],
            recipientType: 'staff'
          },
          response: "I'll add a WhatsApp notification for your staff. Select the team member and craft your message in the node configuration."
        }
      } else {
        return {
          type: 'add_node',
          nodeType: 'whatsapp',
          config: {
            name: 'Send WhatsApp Message',
            description: 'Send WhatsApp to customer'
          },
          response: "I'll add a WhatsApp message action for customer communication."
        }
      }
    }

    // Check for SMS
    if (lowerInput.includes('sms') || lowerInput.includes('text')) {
      if (lowerInput.includes('staff') || lowerInput.includes('team')) {
        return {
          type: 'add_node',
          nodeType: 'internal_message',
          config: {
            name: 'SMS Staff Alert',
            description: 'Send SMS to team member',
            channels: ['sms'],
            recipientType: 'staff'
          },
          response: "I'll add an SMS notification for your staff. You can configure the recipient and message content."
        }
      } else {
        return {
          type: 'add_node',
          nodeType: 'sms',
          config: {
            name: 'Send SMS',
            description: 'Send SMS to customer'
          },
          response: "I'll add an SMS action to text your customers."
        }
      }
    }

    // Check for Telegram
    if (lowerInput.includes('telegram')) {
      return {
        type: 'add_node',
        nodeType: 'internal_message',
        config: {
          name: 'Telegram Staff Alert',
          description: 'Send Telegram message to team',
          channels: ['telegram'],
          recipientType: 'staff'
        },
        response: "I'll add a Telegram notification for your staff. Configure the recipient and message in the settings."
      }
    }

    // Check for triggers
    if (lowerInput.includes('when') || lowerInput.includes('trigger')) {
      if (lowerInput.includes('lead') || lowerInput.includes('new customer')) {
        return {
          type: 'add_node',
          nodeType: 'trigger',
          config: {
            triggerType: 'new_lead',
            name: 'New Lead Trigger'
          },
          response: "I'll add a trigger that fires when you get a new lead. This will start your automation whenever someone fills out a form or is added as a lead."
        }
      }
      if (lowerInput.includes('booking') || lowerInput.includes('appointment')) {
        return {
          type: 'add_node',
          nodeType: 'trigger',
          config: {
            triggerType: 'booking',
            name: 'Booking Trigger'
          },
          response: "I'll add a booking trigger that activates when someone books a class or appointment."
        }
      }
    }

    // Check for wait/delay
    if (lowerInput.includes('wait') || lowerInput.includes('delay')) {
      const timeMatch = lowerInput.match(/(\d+)\s*(minute|hour|day|week)/i)
      if (timeMatch) {
        return {
          type: 'add_node',
          nodeType: 'wait',
          config: {
            duration: parseInt(timeMatch[1]),
            unit: timeMatch[2],
            name: `Wait ${timeMatch[1]} ${timeMatch[2]}${parseInt(timeMatch[1]) > 1 ? 's' : ''}`
          },
          response: `I'll add a wait action for ${timeMatch[1]} ${timeMatch[2]}${parseInt(timeMatch[1]) > 1 ? 's' : ''}.`
        }
      }
    }

    // Check for condition/if statements
    if (lowerInput.includes('if') || lowerInput.includes('condition')) {
      return {
        type: 'add_node',
        nodeType: 'condition',
        config: {
          name: 'Conditional Branch',
          description: 'Split workflow based on conditions'
        },
        response: "I'll add a conditional branch to your workflow. You can set up the conditions to route leads differently based on their properties."
      }
    }

    // Default response
    return {
      type: 'suggestion',
      response: "I can help you with:\n• Adding triggers (new lead, booking, form submission)\n• Sending messages (email, SMS, WhatsApp to customers or staff)\n• Internal notifications (notify team via email/SMS/WhatsApp/Telegram)\n• Adding delays (wait 1 hour, wait 2 days)\n• Creating conditions (if/then logic)\n\nWhat would you like to add?"
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsProcessing(true)

    // Simulate AI processing
    setTimeout(() => {
      const interpretation = interpretCommand(input)
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: interpretation.response,
        timestamp: new Date(),
        action: interpretation
      }

      setMessages(prev => [...prev, assistantMessage])

      // Execute the action if it's an add_node type
      if (interpretation.type === 'add_node' && onAddNode) {
        setTimeout(() => {
          onAddNode(interpretation.nodeType, interpretation.config)
        }, 500)
      }

      setIsProcessing(false)
    }, 1000)
  }

  const suggestedActions = [
    { icon: Users, label: 'Notify Staff', action: 'Add internal message to notify staff when something important happens' },
    { icon: MessageSquare, label: 'WhatsApp Follow-up', action: 'Send a WhatsApp message 1 hour after lead signup' },
    { icon: Mail, label: 'Email Sequence', action: 'Create a 3-email welcome sequence for new members' },
    { icon: Phone, label: 'SMS Reminder', action: 'Send SMS reminder 24 hours before appointment' }
  ]

  return (
    <>
      {/* Floating AI Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all z-50 group"
      >
        <div className="relative">
          <Bot className="h-6 w-6" />
          <Sparkles className="h-3 w-3 absolute -top-1 -right-1 text-yellow-300 animate-pulse" />
        </div>
        <span className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-800 text-white px-3 py-1 rounded-lg text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
          AI Automation Assistant
        </span>
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] bg-gray-800 rounded-lg shadow-2xl flex flex-col z-50 border border-gray-700">
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-white" />
              <span className="font-semibold text-white">AI Automation Assistant</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
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
                  className={`max-w-[80%] rounded-lg p-3 ${
                    message.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-100'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                  <div className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-gray-700 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="animate-pulse flex gap-1">
                      <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animation-delay-200"></div>
                      <div className="w-2 h-2 bg-purple-400 rounded-full animation-delay-400"></div>
                    </div>
                    <span className="text-sm text-gray-400">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Actions */}
          {messages.length === 1 && (
            <div className="p-3 border-t border-gray-700">
              <div className="text-xs text-gray-400 mb-2">Quick Actions:</div>
              <div className="grid grid-cols-2 gap-2">
                {suggestedActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => setInput(action.action)}
                    className="flex items-center gap-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-xs text-gray-300 transition-colors"
                  >
                    <action.icon className="h-4 w-4" />
                    <span>{action.label}</span>
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
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask me to build an automation..."
                className="flex-1 bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isProcessing}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isProcessing}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white p-2 rounded-lg transition-colors"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .animation-delay-200 {
          animation-delay: 200ms;
        }
        .animation-delay-400 {
          animation-delay: 400ms;
        }
      `}</style>
    </>
  )
}