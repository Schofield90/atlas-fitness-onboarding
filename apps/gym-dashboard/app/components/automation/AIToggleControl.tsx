'use client'

import { useState, useEffect } from 'react'
import { Bot, Users, Clock, Settings, MessageSquare, Phone, AlertTriangle } from 'lucide-react'

interface AIToggleControlProps {
  organizationId: string
  workflowId?: string
  phoneNumber?: string
  channel?: string
  onToggle?: (enabled: boolean, reason?: string) => void
  className?: string
  size?: 'small' | 'medium' | 'large'
}

interface AISettings {
  global_enabled: boolean
  business_hours_only: boolean
  business_hours?: {
    start: string
    end: string
    timezone: string
  }
  response_delay_seconds: number
  fallback_message: string
  auto_handoff_keywords: string[]
  max_ai_messages_per_conversation: number
}

interface ConversationState {
  ai_enabled: boolean
  handoff_to_human: boolean
  handoff_reason?: string
  handoff_timestamp?: string
  message_count?: number
}

export default function AIToggleControl({
  organizationId,
  workflowId,
  phoneNumber,
  channel,
  onToggle,
  className = '',
  size = 'medium'
}: AIToggleControlProps) {
  const [globalAIEnabled, setGlobalAIEnabled] = useState(true)
  const [conversationAIEnabled, setConversationAIEnabled] = useState(true)
  const [aiSettings, setAISettings] = useState<AISettings | null>(null)
  const [conversationState, setConversationState] = useState<ConversationState | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [loading, setLoading] = useState(true)
  const [handoffReason, setHandoffReason] = useState('')

  // Size classes
  const sizeClasses = {
    small: 'text-xs p-2',
    medium: 'text-sm p-3',
    large: 'text-base p-4'
  }

  const iconSizes = {
    small: 'w-3 h-3',
    medium: 'w-4 h-4', 
    large: 'w-5 h-5'
  }

  useEffect(() => {
    loadAISettings()
    if (phoneNumber && channel) {
      loadConversationState()
    }
  }, [organizationId, phoneNumber, channel])

  const loadAISettings = async () => {
    try {
      const response = await fetch(`/api/ai/settings?organizationId=${organizationId}`)
      if (response.ok) {
        const data = await response.json()
        setGlobalAIEnabled(data.ai_chatbot_enabled)
        setAISettings(data.ai_chatbot_settings)
      }
    } catch (error) {
      console.error('Error loading AI settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadConversationState = async () => {
    if (!phoneNumber || !channel) return

    try {
      const response = await fetch(
        `/api/ai/conversation-state?organizationId=${organizationId}&phoneNumber=${phoneNumber}&channel=${channel}`
      )
      if (response.ok) {
        const data = await response.json()
        setConversationState(data)
        setConversationAIEnabled(data?.ai_enabled ?? true)
      }
    } catch (error) {
      console.error('Error loading conversation state:', error)
    }
  }

  const toggleGlobalAI = async (enabled: boolean) => {
    try {
      const response = await fetch('/api/ai/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          ai_chatbot_enabled: enabled
        })
      })

      if (response.ok) {
        setGlobalAIEnabled(enabled)
        onToggle?.(enabled)
        
        // Log the toggle action
        await fetch('/api/ai/logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organizationId,
            workflowId,
            action_type: enabled ? 'enabled' : 'disabled',
            trigger_reason: 'Global toggle by user',
            triggered_by: 'user'
          })
        })
      }
    } catch (error) {
      console.error('Error toggling global AI:', error)
    }
  }

  const toggleConversationAI = async (enabled: boolean, reason?: string) => {
    if (!phoneNumber || !channel) return

    try {
      const response = await fetch('/api/ai/conversation-toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          phoneNumber,
          channel,
          ai_enabled: enabled,
          handoff_reason: reason || handoffReason
        })
      })

      if (response.ok) {
        setConversationAIEnabled(enabled)
        await loadConversationState()
        onToggle?.(enabled, reason)
        setHandoffReason('')
      }
    } catch (error) {
      console.error('Error toggling conversation AI:', error)
    }
  }

  const isWithinBusinessHours = () => {
    if (!aiSettings?.business_hours_only || !aiSettings.business_hours) return true

    const now = new Date()
    const timezone = aiSettings.business_hours.timezone || 'Europe/London'
    const currentTime = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(now)

    return currentTime >= aiSettings.business_hours.start && 
           currentTime <= aiSettings.business_hours.end
  }

  const getAIStatus = () => {
    if (!globalAIEnabled) return { status: 'disabled', reason: 'Globally disabled' }
    
    if (aiSettings?.business_hours_only && !isWithinBusinessHours()) {
      return { status: 'disabled', reason: 'Outside business hours' }
    }

    if (phoneNumber && !conversationAIEnabled) {
      return { 
        status: 'disabled', 
        reason: conversationState?.handoff_reason || 'Handed off to human' 
      }
    }

    return { status: 'enabled', reason: 'AI responding' }
  }

  if (loading) {
    return (
      <div className={`animate-pulse bg-gray-200 rounded ${sizeClasses[size]} ${className}`}>
        <div className="flex items-center gap-2">
          <div className={`bg-gray-300 rounded ${iconSizes[size]}`}></div>
          <div className="bg-gray-300 h-4 w-16 rounded"></div>
        </div>
      </div>
    )
  }

  const aiStatus = getAIStatus()
  const isEnabled = aiStatus.status === 'enabled'

  return (
    <div className={`relative ${className}`}>
      {/* Main Toggle Control */}
      <div className={`bg-white border rounded-lg ${sizeClasses[size]} ${
        isEnabled ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className={`${iconSizes[size]} ${
              isEnabled ? 'text-green-600' : 'text-red-600'
            }`} />
            <span className={`font-medium ${
              isEnabled ? 'text-green-800' : 'text-red-800'
            }`}>
              AI Chat
            </span>
            <div className={`px-2 py-1 rounded text-xs ${
              isEnabled 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {isEnabled ? 'ON' : 'OFF'}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            {phoneNumber && (
              <button
                onClick={() => toggleConversationAI(!conversationAIEnabled)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  conversationAIEnabled
                    ? 'bg-red-100 text-red-700 hover:bg-red-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
                title={conversationAIEnabled ? 'Hand off to human' : 'Resume AI chat'}
              >
                {conversationAIEnabled ? (
                  <>
                    <Users className="w-3 h-3 inline mr-1" />
                    Hand Off
                  </>
                ) : (
                  <>
                    <Bot className="w-3 h-3 inline mr-1" />
                    Resume AI
                  </>
                )}
              </button>
            )}
            
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
              title="AI Settings"
            >
              <Settings className={iconSizes[size]} />
            </button>
          </div>
        </div>

        {/* Status Information */}
        <div className="mt-2 text-xs text-gray-600">
          <div className="flex items-center gap-4">
            <span>Status: {aiStatus.reason}</span>
            {conversationState?.message_count && (
              <span>Messages: {conversationState.message_count}</span>
            )}
            {conversationState?.handoff_timestamp && (
              <span>
                Handed off: {new Date(conversationState.handoff_timestamp).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg p-4 z-10">
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Settings className="w-4 h-4" />
            AI Chatbot Settings
          </h4>
          
          {/* Global Toggle */}
          <div className="space-y-3">
            <label className="flex items-center justify-between">
              <span className="text-sm">Global AI Chat</span>
              <button
                onClick={() => toggleGlobalAI(!globalAIEnabled)}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  globalAIEnabled ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span className={`absolute w-4 h-4 bg-white rounded-full transition-transform ${
                  globalAIEnabled ? 'translate-x-5' : 'translate-x-0.5'
                } top-0.5`} />
              </button>
            </label>

            {/* Business Hours Info */}
            {aiSettings?.business_hours_only && (
              <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                <Clock className="w-3 h-3 inline mr-1" />
                Business hours: {aiSettings.business_hours?.start} - {aiSettings.business_hours?.end}
                {!isWithinBusinessHours() && (
                  <div className="text-orange-600 mt-1">
                    <AlertTriangle className="w-3 h-3 inline mr-1" />
                    Currently outside business hours
                  </div>
                )}
              </div>
            )}

            {/* Handoff Reason (for conversation-specific toggles) */}
            {phoneNumber && (
              <div>
                <label className="block text-xs text-gray-600 mb-1">
                  Handoff Reason (optional)
                </label>
                <input
                  type="text"
                  value={handoffReason}
                  onChange={(e) => setHandoffReason(e.target.value)}
                  placeholder="e.g., Complex query, pricing discussion..."
                  className="w-full text-xs p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            )}

            {/* Quick Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => toggleConversationAI(false, 'Complex query requiring human assistance')}
                className="flex-1 text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
              >
                <Users className="w-3 h-3 inline mr-1" />
                Complex Query
              </button>
              <button
                onClick={() => toggleConversationAI(false, 'Customer requested human agent')}
                className="flex-1 text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
              >
                <Phone className="w-3 h-3 inline mr-1" />
                Requested Human
              </button>
            </div>

            {/* Auto-handoff Keywords */}
            {aiSettings?.auto_handoff_keywords && aiSettings.auto_handoff_keywords.length > 0 && (
              <div className="text-xs text-gray-600">
                <strong>Auto-handoff keywords:</strong>
                <div className="flex flex-wrap gap-1 mt-1">
                  {aiSettings.auto_handoff_keywords.map((keyword, index) => (
                    <span key={index} className="px-1 py-0.5 bg-gray-100 rounded">
                      "{keyword}"
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}