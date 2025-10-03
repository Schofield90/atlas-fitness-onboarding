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
  response_delay: {
    enabled: boolean
    min_seconds: number
    max_seconds: number
    typing_indicator: boolean
  }
  fallback_to_human: boolean
  greeting_message: string
  away_message: string
  business_hours: {
    start: string
    end: string
    timezone: string
    days: string[]
  }
  features: {
    appointment_booking: boolean
    membership_info: boolean
    class_schedules: boolean
    pricing_info: boolean
    gym_policies: boolean
  }
  personality: {
    friendliness: 'low' | 'medium' | 'high'
    formality: 'casual' | 'professional' | 'formal'
    enthusiasm: 'low' | 'medium' | 'high'
    emoji_usage: boolean
    conversation_starters: string[]
  }
  response_patterns: {
    variable_responses: boolean
    context_memory: boolean
    follow_up_questions: boolean
    acknowledgments: boolean
  }
  read_receipts: {
    enabled: boolean
    delay_seconds: number
  }
}

export default function AIChatbotPage() {
  const [settings, setSettings] = useState<ChatbotSettings>({
    enabled: false,
    response_tone: 'friendly',
    auto_respond: true,
    business_hours_only: false,
    response_delay: {
      enabled: true,
      min_seconds: 1,
      max_seconds: 3,
      typing_indicator: true
    },
    fallback_to_human: true,
    greeting_message: "Hi! I'm your virtual assistant. How can I help you today?",
    away_message: "Thanks for your message! I'm currently away but will get back to you during business hours.",
    business_hours: {
      start: '08:00',
      end: '22:00',
      timezone: 'Europe/London',
      days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
    },
    features: {
      appointment_booking: true,
      membership_info: true,
      class_schedules: true,
      pricing_info: true,
      gym_policies: true
    },
    personality: {
      friendliness: 'high',
      formality: 'casual',
      enthusiasm: 'medium',
      emoji_usage: true,
      conversation_starters: [
        "How's your fitness journey going?",
        "Ready for another great workout?",
        "What can I help you achieve today?"
      ]
    },
    response_patterns: {
      variable_responses: true,
      context_memory: true,
      follow_up_questions: true,
      acknowledgments: true
    },
    read_receipts: {
      enabled: true,
      delay_seconds: 1
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
                Response Timing
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.response_delay.enabled}
                    onChange={(e) => setSettings({ 
                      ...settings, 
                      response_delay: { ...settings.response_delay, enabled: e.target.checked }
                    })}
                    className="w-4 h-4 text-blue-500 bg-gray-700 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-300">Enable random delays</span>
                </label>
                {settings.response_delay.enabled && (
                  <div className="ml-6 space-y-2">
                    <div className="flex gap-2">
                      <div>
                        <label className="text-xs text-gray-400">Min (seconds)</label>
                        <input
                          type="number"
                          min="0"
                          max="10"
                          value={settings.response_delay.min_seconds}
                          onChange={(e) => setSettings({ 
                            ...settings, 
                            response_delay: { 
                              ...settings.response_delay, 
                              min_seconds: Number(e.target.value) 
                            }
                          })}
                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Max (seconds)</label>
                        <input
                          type="number"
                          min="0"
                          max="30"
                          value={settings.response_delay.max_seconds}
                          onChange={(e) => setSettings({ 
                            ...settings, 
                            response_delay: { 
                              ...settings.response_delay, 
                              max_seconds: Number(e.target.value) 
                            }
                          })}
                          className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={settings.response_delay.typing_indicator}
                        onChange={(e) => setSettings({ 
                          ...settings, 
                          response_delay: { 
                            ...settings.response_delay, 
                            typing_indicator: e.target.checked 
                          }
                        })}
                        className="w-4 h-4 text-blue-500 bg-gray-700 rounded focus:ring-blue-500"
                      />
                      <span className="text-xs text-gray-300">Show typing indicator</span>
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
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
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Away Message
              </label>
              <textarea
                value={settings.away_message}
                onChange={(e) => setSettings({ ...settings, away_message: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white resize-none"
                rows={2}
                placeholder="Message shown when outside business hours..."
              />
            </div>
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
          
          <div className="grid md:grid-cols-3 gap-4 mb-4">
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

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Active Days
            </label>
            <div className="grid grid-cols-7 gap-2">
              {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                <label key={day} className="flex flex-col items-center gap-1">
                  <input
                    type="checkbox"
                    checked={settings.business_hours.days.includes(day)}
                    onChange={(e) => {
                      const updatedDays = e.target.checked
                        ? [...settings.business_hours.days, day]
                        : settings.business_hours.days.filter(d => d !== day)
                      setSettings({
                        ...settings,
                        business_hours: { ...settings.business_hours, days: updatedDays }
                      })
                    }}
                    className="w-4 h-4 text-blue-500 bg-gray-700 rounded focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-300 capitalize">
                    {day.slice(0, 3)}
                  </span>
                </label>
              ))}
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

      {/* Personality Settings */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <MessageCircle className="h-5 w-5 text-pink-400" />
          <h3 className="text-lg font-semibold text-white">Personality Settings</h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Friendliness Level
              </label>
              <select
                value={settings.personality.friendliness}
                onChange={(e) => setSettings({
                  ...settings,
                  personality: { ...settings.personality, friendliness: e.target.value as 'low' | 'medium' | 'high' }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="low">Low - Minimal small talk</option>
                <option value="medium">Medium - Balanced approach</option>
                <option value="high">High - Very friendly and chatty</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Formality Level
              </label>
              <select
                value={settings.personality.formality}
                onChange={(e) => setSettings({
                  ...settings,
                  personality: { ...settings.personality, formality: e.target.value as 'casual' | 'professional' | 'formal' }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="casual">Casual - Relaxed conversation</option>
                <option value="professional">Professional - Business appropriate</option>
                <option value="formal">Formal - Very polite and structured</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Enthusiasm Level
              </label>
              <select
                value={settings.personality.enthusiasm}
                onChange={(e) => setSettings({
                  ...settings,
                  personality: { ...settings.personality, enthusiasm: e.target.value as 'low' | 'medium' | 'high' }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="low">Low - Calm and reserved</option>
                <option value="medium">Medium - Moderately enthusiastic</option>
                <option value="high">High - Very energetic and excited</option>
              </select>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.personality.emoji_usage}
                onChange={(e) => setSettings({
                  ...settings,
                  personality: { ...settings.personality, emoji_usage: e.target.checked }
                })}
                className="w-4 h-4 text-blue-500 bg-gray-700 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">Use emojis in responses</span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Conversation Starters
            </label>
            <div className="space-y-2 mb-2">
              {settings.personality.conversation_starters.map((starter, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={starter}
                    onChange={(e) => {
                      const newStarters = [...settings.personality.conversation_starters]
                      newStarters[index] = e.target.value
                      setSettings({
                        ...settings,
                        personality: { ...settings.personality, conversation_starters: newStarters }
                      })
                    }}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                    placeholder="Enter conversation starter..."
                  />
                  <button
                    onClick={() => {
                      const newStarters = settings.personality.conversation_starters.filter((_, i) => i !== index)
                      setSettings({
                        ...settings,
                        personality: { ...settings.personality, conversation_starters: newStarters }
                      })
                    }}
                    className="text-red-400 hover:text-red-300 px-2"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => {
                const newStarters = [...settings.personality.conversation_starters, ""]
                setSettings({
                  ...settings,
                  personality: { ...settings.personality, conversation_starters: newStarters }
                })
              }}
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              + Add conversation starter
            </button>
          </div>
        </div>
      </div>

      {/* Response Patterns */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-orange-400" />
          <h3 className="text-lg font-semibold text-white">Response Patterns</h3>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.response_patterns.variable_responses}
                onChange={(e) => setSettings({
                  ...settings,
                  response_patterns: { ...settings.response_patterns, variable_responses: e.target.checked }
                })}
                className="w-4 h-4 text-blue-500 bg-gray-700 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm text-gray-300">Variable Responses</span>
                <p className="text-xs text-gray-500">Use different ways to say the same thing</p>
              </div>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.response_patterns.context_memory}
                onChange={(e) => setSettings({
                  ...settings,
                  response_patterns: { ...settings.response_patterns, context_memory: e.target.checked }
                })}
                className="w-4 h-4 text-blue-500 bg-gray-700 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm text-gray-300">Context Memory</span>
                <p className="text-xs text-gray-500">Remember previous conversation context</p>
              </div>
            </label>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.response_patterns.follow_up_questions}
                onChange={(e) => setSettings({
                  ...settings,
                  response_patterns: { ...settings.response_patterns, follow_up_questions: e.target.checked }
                })}
                className="w-4 h-4 text-blue-500 bg-gray-700 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm text-gray-300">Follow-up Questions</span>
                <p className="text-xs text-gray-500">Ask relevant follow-up questions</p>
              </div>
            </label>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.response_patterns.acknowledgments}
                onChange={(e) => setSettings({
                  ...settings,
                  response_patterns: { ...settings.response_patterns, acknowledgments: e.target.checked }
                })}
                className="w-4 h-4 text-blue-500 bg-gray-700 rounded focus:ring-blue-500"
              />
              <div>
                <span className="text-sm text-gray-300">Acknowledgments</span>
                <p className="text-xs text-gray-500">Show understanding and empathy</p>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* Read Receipts */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle className="h-5 w-5 text-green-400" />
          <h3 className="text-lg font-semibold text-white">Read Receipts</h3>
        </div>
        
        <div className="space-y-4">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.read_receipts.enabled}
              onChange={(e) => setSettings({
                ...settings,
                read_receipts: { ...settings.read_receipts, enabled: e.target.checked }
              })}
              className="w-4 h-4 text-blue-500 bg-gray-700 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-300">Simulate read receipts</span>
          </label>

          {settings.read_receipts.enabled && (
            <div className="ml-6">
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Read delay (seconds)
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={settings.read_receipts.delay_seconds}
                onChange={(e) => setSettings({
                  ...settings,
                  read_receipts: { ...settings.read_receipts, delay_seconds: Number(e.target.value) }
                })}
                className="w-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
              <p className="text-xs text-gray-500 mt-1">
                Time before showing message as read
              </p>
            </div>
          )}
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