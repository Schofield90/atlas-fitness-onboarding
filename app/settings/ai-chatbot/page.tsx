'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/app/components/DashboardLayout'
import AIToggleControl from '@/app/components/automation/AIToggleControl'
import { 
  Bot, 
  Clock, 
  MessageSquare, 
  Users, 
  Settings, 
  AlertTriangle, 
  CheckCircle,
  Phone,
  Save,
  RotateCcw,
  Activity,
  TrendingUp,
  MessageCircle
} from 'lucide-react'
import { getCurrentUserOrganization } from '@/app/lib/organization-client'

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

interface AILog {
  id: string
  action_type: string
  triggered_by: string
  trigger_reason: string
  phone_number?: string
  created_at: string
}

interface ConversationState {
  id: string
  phone_number: string
  channel: string
  ai_enabled: boolean
  handoff_to_human: boolean
  handoff_reason?: string
  handoff_timestamp?: string
}

export default function AIChatbotSettingsPage() {
  const router = useRouter()
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [aiEnabled, setAiEnabled] = useState(true)
  const [aiSettings, setAISettings] = useState<AISettings>({
    global_enabled: true,
    business_hours_only: false,
    business_hours: {
      start: '09:00',
      end: '18:00',
      timezone: 'Europe/London'
    },
    response_delay_seconds: 2,
    fallback_message: 'Thanks for your message! Our team will get back to you shortly.',
    auto_handoff_keywords: ['human', 'speak to someone', 'real person', 'agent', 'manager'],
    max_ai_messages_per_conversation: 20
  })
  const [logs, setLogs] = useState<AILog[]>([])
  const [activeConversations, setActiveConversations] = useState<ConversationState[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'settings' | 'conversations' | 'logs' | 'analytics'>('settings')

  useEffect(() => {
    loadOrganization()
  }, [])

  useEffect(() => {
    if (organizationId) {
      loadAISettings()
      loadLogs()
      loadActiveConversations()
    }
  }, [organizationId])

  const loadOrganization = async () => {
    const { organizationId, error } = await getCurrentUserOrganization()
    if (organizationId) {
      setOrganizationId(organizationId)
    } else {
      console.error('Auth error:', error)
      router.push('/login')
    }
  }

  const loadAISettings = async () => {
    try {
      const response = await fetch(`/api/ai/settings?organizationId=${organizationId}`)
      if (response.ok) {
        const data = await response.json()
        setAiEnabled(data.ai_chatbot_enabled)
        if (data.ai_chatbot_settings) {
          setAISettings(data.ai_chatbot_settings)
        }
      }
    } catch (error) {
      console.error('Error loading AI settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadLogs = async () => {
    try {
      const response = await fetch(`/api/ai/logs?organizationId=${organizationId}&limit=50`)
      if (response.ok) {
        const data = await response.json()
        setLogs(data.logs || [])
      }
    } catch (error) {
      console.error('Error loading AI logs:', error)
    }
  }

  const loadActiveConversations = async () => {
    try {
      const response = await fetch(`/api/ai/active-conversations?organizationId=${organizationId}`)
      if (response.ok) {
        const data = await response.json()
        setActiveConversations(data.conversations || [])
      }
    } catch (error) {
      console.error('Error loading active conversations:', error)
    }
  }

  const saveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/ai/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          ai_chatbot_enabled: aiEnabled,
          ai_chatbot_settings: aiSettings
        })
      })

      if (response.ok) {
        // Show success message
        console.log('Settings saved successfully')
      }
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = () => {
    setAISettings({
      global_enabled: true,
      business_hours_only: false,
      business_hours: {
        start: '09:00',
        end: '18:00',
        timezone: 'Europe/London'
      },
      response_delay_seconds: 2,
      fallback_message: 'Thanks for your message! Our team will get back to you shortly.',
      auto_handoff_keywords: ['human', 'speak to someone', 'real person', 'agent', 'manager'],
      max_ai_messages_per_conversation: 20
    })
    setAiEnabled(true)
  }

  const addKeyword = () => {
    const keyword = prompt('Enter a keyword that should hand off to human:')
    if (keyword && keyword.trim()) {
      setAISettings(prev => ({
        ...prev,
        auto_handoff_keywords: [...prev.auto_handoff_keywords, keyword.trim().toLowerCase()]
      }))
    }
  }

  const removeKeyword = (index: number) => {
    setAISettings(prev => ({
      ...prev,
      auto_handoff_keywords: prev.auto_handoff_keywords.filter((_, i) => i !== index)
    }))
  }

  const getLogIcon = (actionType: string) => {
    switch (actionType) {
      case 'enabled': return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'disabled': return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'fallback_to_human': return <Users className="w-4 h-4 text-orange-500" />
      default: return <Activity className="w-4 h-4 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto px-6 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-700 rounded w-64"></div>
            <div className="h-32 bg-gray-700 rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Bot className="w-8 h-8 text-blue-500" />
                AI Chatbot Settings
              </h1>
              <p className="text-gray-400">Manage your AI chatbot behavior and conversation settings</p>
            </div>
            
            <div className="flex items-center gap-4">
              {organizationId && (
                <AIToggleControl
                  organizationId={organizationId}
                  size="medium"
                  onToggle={loadAISettings}
                />
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 mb-8">
          {[
            { id: 'settings', label: 'Settings', icon: Settings },
            { id: 'conversations', label: 'Active Conversations', icon: MessageCircle },
            { id: 'logs', label: 'Activity Logs', icon: Activity },
            { id: 'analytics', label: 'Analytics', icon: TrendingUp }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === tab.id 
                  ? 'bg-orange-600 text-white' 
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-8">
            {/* Global Settings */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Global AI Settings
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Business Hours */}
                <div>
                  <label className="flex items-center mb-4">
                    <input
                      type="checkbox"
                      checked={aiSettings.business_hours_only}
                      onChange={(e) => setAISettings(prev => ({ ...prev, business_hours_only: e.target.checked }))}
                      className="mr-3"
                    />
                    <span className="font-medium">Restrict to Business Hours Only</span>
                  </label>
                  
                  {aiSettings.business_hours_only && (
                    <div className="ml-6 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">Start Time</label>
                          <input
                            type="time"
                            value={aiSettings.business_hours?.start || '09:00'}
                            onChange={(e) => setAISettings(prev => ({
                              ...prev,
                              business_hours: { ...prev.business_hours!, start: e.target.value }
                            }))}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm text-gray-400 mb-1">End Time</label>
                          <input
                            type="time"
                            value={aiSettings.business_hours?.end || '18:00'}
                            onChange={(e) => setAISettings(prev => ({
                              ...prev,
                              business_hours: { ...prev.business_hours!, end: e.target.value }
                            }))}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Response Delay */}
                <div>
                  <label className="block font-medium mb-2">Response Delay (seconds)</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    value={aiSettings.response_delay_seconds}
                    onChange={(e) => setAISettings(prev => ({ ...prev, response_delay_seconds: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Makes AI responses feel more natural</p>
                </div>

                {/* Message Limit */}
                <div>
                  <label className="block font-medium mb-2">Max AI Messages per Conversation</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={aiSettings.max_ai_messages_per_conversation}
                    onChange={(e) => setAISettings(prev => ({ ...prev, max_ai_messages_per_conversation: parseInt(e.target.value) || 20 }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-400 mt-1">Auto hand-off after this many AI messages</p>
                </div>
              </div>
            </div>

            {/* Fallback Message */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Fallback Message</h3>
              <textarea
                value={aiSettings.fallback_message}
                onChange={(e) => setAISettings(prev => ({ ...prev, fallback_message: e.target.value }))}
                placeholder="Message to send when AI is disabled..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:ring-2 focus:ring-blue-500 h-20"
              />
              <p className="text-xs text-gray-400 mt-2">Sent when AI is disabled or errors occur</p>
            </div>

            {/* Auto-handoff Keywords */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold">Auto-handoff Keywords</h3>
                <button
                  onClick={addKeyword}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
                >
                  Add Keyword
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {aiSettings.auto_handoff_keywords.map((keyword, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-gray-700 rounded-full text-sm flex items-center gap-2"
                  >
                    "{keyword}"
                    <button
                      onClick={() => removeKeyword(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                AI will automatically hand off to human when these words are detected
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-4">
              <button
                onClick={saveSettings}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-medium disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
              
              <button
                onClick={resetToDefaults}
                className="flex items-center gap-2 px-6 py-3 bg-gray-600 hover:bg-gray-700 rounded-lg font-medium"
              >
                <RotateCcw className="w-4 h-4" />
                Reset to Defaults
              </button>
            </div>
          </div>
        )}

        {/* Active Conversations Tab */}
        {activeTab === 'conversations' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-6">Active Conversations</h3>
            
            {activeConversations.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <MessageCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No active conversations</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeConversations.map((conv) => (
                  <div key={conv.id} className="bg-gray-700 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <div className="font-medium">{conv.phone_number}</div>
                      <div className="text-sm text-gray-400 capitalize">{conv.channel}</div>
                      {conv.handoff_reason && (
                        <div className="text-xs text-orange-400 mt-1">Handoff: {conv.handoff_reason}</div>
                      )}
                    </div>
                    
                    {organizationId && (
                      <AIToggleControl
                        organizationId={organizationId}
                        phoneNumber={conv.phone_number}
                        channel={conv.channel}
                        size="small"
                        onToggle={() => loadActiveConversations()}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Activity Logs Tab */}
        {activeTab === 'logs' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-6">AI Activity Logs</h3>
            
            {logs.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No activity logs</p>
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getLogIcon(log.action_type)}
                        <div>
                          <div className="font-medium">{log.trigger_reason}</div>
                          <div className="text-sm text-gray-400">
                            {log.phone_number && `Phone: ${log.phone_number} • `}
                            By: {log.triggered_by}
                          </div>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(log.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-6">AI Analytics</h3>
            
            <div className="text-center py-12">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-400 opacity-50" />
              <h4 className="text-lg font-medium mb-2">Analytics Coming Soon</h4>
              <p className="text-gray-400 max-w-md mx-auto">
                We're building comprehensive AI analytics including response rates, 
                handoff patterns, and conversation insights.
              </p>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}