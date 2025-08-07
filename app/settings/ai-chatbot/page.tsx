'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Bot, Send, CheckCircle, AlertCircle, Loader2, MessageCircle, Settings, Brain } from 'lucide-react'
import SettingsHeader from '@/app/components/settings/SettingsHeader'

interface ChatbotSettings {
  id?: string
  enabled: boolean
  response_tone: 'professional' | 'friendly' | 'casual'
  auto_respond: boolean
  business_hours_only: boolean
  response_delay: number
  fallback_to_human: boolean
  greeting_message: string
  business_hours: {
    start: string
    end: string
    timezone: string
  }
  features: {
    appointment_booking: boolean
    membership_info: boolean
    class_schedules: boolean
    pricing_info: boolean
    gym_policies: boolean
  }
}

export default function AIChatbotPage() {
  const [settings, setSettings] = useState<ChatbotSettings>({
    enabled: false,
    response_tone: 'friendly',
    auto_respond: true,
    business_hours_only: false,
    response_delay: 2,
    fallback_to_human: true,
    greeting_message: "Hi! I'm your virtual assistant. How can I help you today?",
    business_hours: {
      start: '08:00',
      end: '22:00',
      timezone: 'Europe/London'
    },
    features: {
      appointment_booking: true,
      membership_info: true,
      class_schedules: true,
      pricing_info: true,
      gym_policies: true
    }
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testResponse, setTestResponse] = useState('')
  const [testLoading, setTestLoading] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) return

      // Get AI chatbot settings
      const { data: chatbotSettings } = await supabase
        .from('integration_settings')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .eq('integration_type', 'ai_chatbot')
        .single()

      if (chatbotSettings) {
        setSettings({ ...settings, ...chatbotSettings.config, id: chatbotSettings.id })
      }
    } catch (error) {
      console.error('Error fetching AI chatbot settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) return

      const configData = {
        organization_id: userOrg.organization_id,
        integration_type: 'ai_chatbot',
        enabled: settings.enabled,
        config: {
          response_tone: settings.response_tone,
          auto_respond: settings.auto_respond,
          business_hours_only: settings.business_hours_only,
          response_delay: settings.response_delay,
          fallback_to_human: settings.fallback_to_human,
          greeting_message: settings.greeting_message,
          business_hours: settings.business_hours,
          features: settings.features
        }
      }

      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('integration_settings')
          .update({
            enabled: configData.enabled,
            config: configData.config,
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id)

        if (error) throw error
      } else {
        // Create new settings
        const { error } = await supabase
          .from('integration_settings')
          .insert(configData)

        if (error) throw error
        
        // Refetch to get the created record with ID
        await fetchSettings()
      }

      alert('AI Chatbot settings saved successfully!')
    } catch (error) {
      console.error('Error saving AI chatbot settings:', error)
      alert('Failed to save settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const testChatbot = async () => {
    setTestLoading(true)
    try {
      const response = await fetch('/api/test-ai-knowledge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: 'What are your opening hours?' }),
      })

      const data = await response.json()
      setTestResponse(data.response || 'Test completed successfully!')
    } catch (error) {
      console.error('Error testing chatbot:', error)
      setTestResponse('Error testing chatbot. Please check your configuration.')
    } finally {
      setTestLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsHeader 
        title="AI Chatbot"
        description="Configure your WhatsApp and SMS AI assistant to handle customer inquiries automatically"
        icon={<Bot className="h-6 w-6" />}
        action={
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Save Settings
          </button>
        }
      />

      {/* Chatbot Status */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">AI Chatbot Status</h3>
          <div className="flex items-center gap-2">
            {settings.enabled ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-500">Active</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <span className="text-yellow-500">Disabled</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">
              When enabled, AI will automatically respond to WhatsApp and SMS messages using your gym's knowledge base
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Response Configuration */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="h-5 w-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Response Configuration</h3>
        </div>
        
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Response Tone
              </label>
              <select
                value={settings.response_tone}
                onChange={(e) => setSettings({ ...settings, response_tone: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="professional">Professional</option>
                <option value="friendly">Friendly</option>
                <option value="casual">Casual</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Response Delay (seconds)
              </label>
              <input
                type="number"
                min="0"
                max="30"
                value={settings.response_delay}
                onChange={(e) => setSettings({ ...settings, response_delay: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Greeting Message
            </label>
            <textarea
              value={settings.greeting_message}
              onChange={(e) => setSettings({ ...settings, greeting_message: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white resize-none"
              rows={2}
              placeholder="Enter the initial greeting message..."
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.auto_respond}
                onChange={(e) => setSettings({ ...settings, auto_respond: e.target.checked })}
                className="w-4 h-4 text-blue-500 bg-gray-700 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">Enable automatic responses</span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.business_hours_only}
                onChange={(e) => setSettings({ ...settings, business_hours_only: e.target.checked })}
                className="w-4 h-4 text-blue-500 bg-gray-700 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">Only respond during business hours</span>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.fallback_to_human}
                onChange={(e) => setSettings({ ...settings, fallback_to_human: e.target.checked })}
                className="w-4 h-4 text-blue-500 bg-gray-700 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">Fallback to human when uncertain</span>
            </label>
          </div>
        </div>
      </div>

      {/* Business Hours */}
      {settings.business_hours_only && (
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="h-5 w-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Business Hours</h3>
          </div>
          
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={settings.business_hours.start}
                onChange={(e) => setSettings({
                  ...settings,
                  business_hours: { ...settings.business_hours, start: e.target.value }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={settings.business_hours.end}
                onChange={(e) => setSettings({
                  ...settings,
                  business_hours: { ...settings.business_hours, end: e.target.value }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Timezone
              </label>
              <select
                value={settings.business_hours.timezone}
                onChange={(e) => setSettings({
                  ...settings,
                  business_hours: { ...settings.business_hours, timezone: e.target.value }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="Europe/London">London (GMT)</option>
                <option value="America/New_York">New York (EST)</option>
                <option value="America/Los_Angeles">Los Angeles (PST)</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* AI Features */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="h-5 w-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">AI Features</h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(settings.features).map(([feature, enabled]) => (
            <label key={feature} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setSettings({
                  ...settings,
                  features: { ...settings.features, [feature]: e.target.checked }
                })}
                className="w-4 h-4 text-blue-500 bg-gray-700 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300 capitalize">
                {feature.replace(/_/g, ' ')}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Test Chatbot */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Test Chatbot</h3>
          <button
            onClick={testChatbot}
            disabled={testLoading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {testLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bot className="h-4 w-4" />
            )}
            Test Response
          </button>
        </div>
        
        <p className="text-gray-400 text-sm mb-4">
          Test how your AI chatbot responds to common queries
        </p>
        
        {testResponse && (
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="font-medium text-white mb-2">AI Response:</h4>
            <p className="text-gray-300 text-sm">{testResponse}</p>
          </div>
        )}
      </div>
    </div>
  )
}