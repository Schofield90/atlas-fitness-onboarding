'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import SettingsHeader from '@/app/components/settings/SettingsHeader'
import { 
  Phone,
  Voicemail,
  MessageSquare,
  Settings,
  Volume2,
  Clock,
  Calendar,
  Save,
  AlertCircle,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed
} from 'lucide-react'

interface PhoneSettings {
  id?: string
  organization_id: string
  primary_number: string
  display_name: string
  voicemail_enabled: boolean
  voicemail_greeting: string
  voicemail_transcription: boolean
  business_hours_only: boolean
  after_hours_message: string
  call_recording: boolean
  call_forwarding: boolean
  forward_to_number?: string
  text_enabled: boolean
  auto_reply_enabled: boolean
  auto_reply_message: string
  missed_call_text: boolean
  missed_call_message: string
  call_tracking: boolean
  whisper_message?: string
  ring_duration: number
}

export default function PhoneSettingsPage() {
  const [settings, setSettings] = useState<PhoneSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingVoicemail, setTestingVoicemail] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchSettings()
  }, [])

  // Loading timeout to prevent infinite spinners
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Loading timeout - forcing loading to stop')
        setLoading(false)
      }
    }, 5000) // 5 second timeout
    
    return () => clearTimeout(timeout)
  }, [loading])

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

      // Fetch phone settings
      const { data: phoneSettings } = await supabase
        .from('phone_settings')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .single()

      if (phoneSettings) {
        setSettings(phoneSettings)
      } else {
        // Create default settings
        const defaultSettings: PhoneSettings = {
          organization_id: userOrg.organization_id,
          primary_number: '',
          display_name: 'Atlas Fitness',
          voicemail_enabled: true,
          voicemail_greeting: "Hi, you've reached Atlas Fitness. We're currently unavailable but your call is important to us. Please leave your name, number, and reason for calling, and we'll get back to you within 24 hours. For urgent matters, please text this number. Thank you!",
          voicemail_transcription: true,
          business_hours_only: true,
          after_hours_message: "Thank you for calling Atlas Fitness. We're currently closed. Our business hours are Monday to Friday 6am-9pm, Saturday 7am-6pm, and Sunday 8am-4pm. Please call back during these hours or leave a voicemail.",
          call_recording: false,
          call_forwarding: false,
          text_enabled: true,
          auto_reply_enabled: true,
          auto_reply_message: "Thanks for texting Atlas Fitness! We'll respond within 30 minutes during business hours. For immediate assistance, call us or visit our website.",
          missed_call_text: true,
          missed_call_message: "Hi, we missed your call! How can Atlas Fitness help you today? Reply to this text or call us back.",
          call_tracking: true,
          whisper_message: "Call from Atlas Fitness lead",
          ring_duration: 20
        }
        setSettings(defaultSettings)
      }
    } catch (error) {
      setLoading(false)
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    if (!settings) return
    setSaving(true)

    try {
      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('phone_settings')
          .update(settings)
          .eq('id', settings.id)

        if (error) throw error
      } else {
        // Insert new settings
        const { data, error } = await supabase
          .from('phone_settings')
          .insert(settings)
          .select()
          .single()

        if (error) throw error
        setSettings({ ...settings, id: data.id })
      }

      alert('Phone settings saved successfully!')
    } catch (error) {
      setLoading(false)
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTestVoicemail = () => {
    setTestingVoicemail(true)
    // Simulate playing voicemail
    setTimeout(() => {
      alert(`Voicemail greeting: "${settings?.voicemail_greeting}"`)
      setTestingVoicemail(false)
    }, 1000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading phone settings...</p>
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">No settings found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsHeader 
        title="Phone System Settings"
        description="Configure your gym's phone system and voicemail"
      />

      {/* Info Banner */}
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
          <div>
            <p className="text-sm text-blue-300 font-medium">Simplified Phone System</p>
            <p className="text-xs text-blue-200 mt-1">
              One primary number for all gym communications. Easily manage voicemail, text messages, 
              and call forwarding from this single dashboard.
            </p>
          </div>
        </div>
      </div>

      {/* Primary Number Configuration */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Phone className="h-5 w-5 text-blue-500" />
          Primary Phone Number
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              value={settings.primary_number}
              onChange={(e) => setSettings({ ...settings, primary_number: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="+44 7XXX XXXXXX"
            />
            <p className="text-xs text-gray-500 mt-1">
              Your gym's main contact number
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Display Name
            </label>
            <input
              type="text"
              value={settings.display_name}
              onChange={(e) => setSettings({ ...settings, display_name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              placeholder="Atlas Fitness"
            />
            <p className="text-xs text-gray-500 mt-1">
              Shown on caller ID
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <PhoneIncoming className="h-4 w-4 text-green-400" />
              <span className="text-sm text-gray-300">Incoming Calls</span>
            </div>
            <p className="text-2xl font-bold text-white">247</p>
            <p className="text-xs text-gray-500">This month</p>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <PhoneMissed className="h-4 w-4 text-red-400" />
              <span className="text-sm text-gray-300">Missed Calls</span>
            </div>
            <p className="text-2xl font-bold text-white">23</p>
            <p className="text-xs text-gray-500">This month</p>
          </div>
          
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center gap-3 mb-2">
              <MessageSquare className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-gray-300">Text Messages</span>
            </div>
            <p className="text-2xl font-bold text-white">412</p>
            <p className="text-xs text-gray-500">This month</p>
          </div>
        </div>
      </div>

      {/* Voicemail Settings */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Voicemail className="h-5 w-5 text-purple-500" />
          Voicemail Configuration
        </h2>
        
        <div className="space-y-6">
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.voicemail_enabled}
                onChange={(e) => setSettings({ ...settings, voicemail_enabled: e.target.checked })}
                className="rounded border-gray-600 bg-gray-700 text-blue-500"
              />
              <div>
                <span className="text-white">Enable Voicemail</span>
                <p className="text-xs text-gray-400">
                  Allow callers to leave messages when unavailable
                </p>
              </div>
            </label>
          </div>

          {settings.voicemail_enabled && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Voicemail Greeting
                </label>
                <textarea
                  value={settings.voicemail_greeting}
                  onChange={(e) => setSettings({ ...settings, voicemail_greeting: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  rows={4}
                  placeholder="Your voicemail greeting message..."
                />
                <div className="mt-2 flex items-center gap-3">
                  <button
                    onClick={handleTestVoicemail}
                    disabled={testingVoicemail}
                    className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
                  >
                    <Volume2 className="h-4 w-4 inline mr-2" />
                    {testingVoicemail ? 'Playing...' : 'Test Greeting'}
                  </button>
                  <span className="text-xs text-gray-500">
                    {settings.voicemail_greeting.length} characters
                  </span>
                </div>
              </div>

              <div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.voicemail_transcription}
                    onChange={(e) => setSettings({ ...settings, voicemail_transcription: e.target.checked })}
                    className="rounded border-gray-600 bg-gray-700 text-blue-500"
                  />
                  <div>
                    <span className="text-white">Voicemail Transcription</span>
                    <p className="text-xs text-gray-400">
                      Automatically transcribe voicemails to text and email them to staff
                    </p>
                  </div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Ring Duration Before Voicemail
                </label>
                <select
                  value={settings.ring_duration}
                  onChange={(e) => setSettings({ ...settings, ring_duration: parseInt(e.target.value) })}
                  className="w-full max-w-xs px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="15">15 seconds</option>
                  <option value="20">20 seconds</option>
                  <option value="25">25 seconds</option>
                  <option value="30">30 seconds</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Business Hours & After Hours */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-500" />
          Business Hours Handling
        </h2>
        
        <div className="space-y-6">
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.business_hours_only}
                onChange={(e) => setSettings({ ...settings, business_hours_only: e.target.checked })}
                className="rounded border-gray-600 bg-gray-700 text-blue-500"
              />
              <div>
                <span className="text-white">Different After-Hours Behavior</span>
                <p className="text-xs text-gray-400">
                  Play a different message outside business hours
                </p>
              </div>
            </label>
          </div>

          {settings.business_hours_only && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                After Hours Message
              </label>
              <textarea
                value={settings.after_hours_message}
                onChange={(e) => setSettings({ ...settings, after_hours_message: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                rows={3}
                placeholder="Message played outside business hours..."
              />
            </div>
          )}
        </div>
      </div>

      {/* Text Message Settings */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-green-500" />
          Text Message Settings
        </h2>
        
        <div className="space-y-6">
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.text_enabled}
                onChange={(e) => setSettings({ ...settings, text_enabled: e.target.checked })}
                className="rounded border-gray-600 bg-gray-700 text-blue-500"
              />
              <div>
                <span className="text-white">Enable Text Messaging</span>
                <p className="text-xs text-gray-400">
                  Receive and send text messages on this number
                </p>
              </div>
            </label>
          </div>

          {settings.text_enabled && (
            <>
              <div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.auto_reply_enabled}
                    onChange={(e) => setSettings({ ...settings, auto_reply_enabled: e.target.checked })}
                    className="rounded border-gray-600 bg-gray-700 text-blue-500"
                  />
                  <div>
                    <span className="text-white">Auto-Reply to Texts</span>
                    <p className="text-xs text-gray-400">
                      Send automatic response to incoming texts
                    </p>
                  </div>
                </label>
              </div>

              {settings.auto_reply_enabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Auto-Reply Message
                  </label>
                  <textarea
                    value={settings.auto_reply_message}
                    onChange={(e) => setSettings({ ...settings, auto_reply_message: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    rows={2}
                    placeholder="Automatic reply message..."
                  />
                </div>
              )}

              <div>
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.missed_call_text}
                    onChange={(e) => setSettings({ ...settings, missed_call_text: e.target.checked })}
                    className="rounded border-gray-600 bg-gray-700 text-blue-500"
                  />
                  <div>
                    <span className="text-white">Text on Missed Call</span>
                    <p className="text-xs text-gray-400">
                      Automatically text callers when you miss their call
                    </p>
                  </div>
                </label>
              </div>

              {settings.missed_call_text && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Missed Call Text Message
                  </label>
                  <textarea
                    value={settings.missed_call_message}
                    onChange={(e) => setSettings({ ...settings, missed_call_message: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    rows={2}
                    placeholder="Message sent when call is missed..."
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Call Forwarding */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <PhoneOutgoing className="h-5 w-5 text-yellow-500" />
          Call Forwarding
        </h2>
        
        <div className="space-y-6">
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.call_forwarding}
                onChange={(e) => setSettings({ ...settings, call_forwarding: e.target.checked })}
                className="rounded border-gray-600 bg-gray-700 text-blue-500"
              />
              <div>
                <span className="text-white">Enable Call Forwarding</span>
                <p className="text-xs text-gray-400">
                  Forward calls to another number when needed
                </p>
              </div>
            </label>
          </div>

          {settings.call_forwarding && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Forward To Number
              </label>
              <input
                type="tel"
                value={settings.forward_to_number || ''}
                onChange={(e) => setSettings({ ...settings, forward_to_number: e.target.value })}
                className="w-full max-w-xs px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="+44 7XXX XXXXXX"
              />
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Phone Settings'}
        </button>
      </div>
    </div>
  )
}