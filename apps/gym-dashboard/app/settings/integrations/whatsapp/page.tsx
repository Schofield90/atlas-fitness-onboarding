'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { MessageSquare, Bot, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import SettingsHeader from '@/app/components/settings/SettingsHeader'
import WhatsAppConfiguration from '@/app/components/settings/integrations/whatsapp/WhatsAppConfiguration'
import AIResponseSettings from '@/app/components/settings/integrations/whatsapp/AIResponseSettings'
import WhatsAppTestPanel from '@/app/components/settings/integrations/whatsapp/WhatsAppTestPanel'

export default function WhatsAppIntegrationPage() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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

      // Get WhatsApp integration settings
      const { data: whatsappSettings } = await supabase
        .from('integration_settings')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .eq('integration_type', 'whatsapp')
        .single()

      if (whatsappSettings) {
        setSettings(whatsappSettings)
      } else {
        // Create default settings
        const defaultSettings = {
          organization_id: userOrg.organization_id,
          integration_type: 'whatsapp',
          enabled: false,
          config: {
            provider: 'twilio',
            ai_enabled: true,
            business_number: '',
            webhook_url: `${window.location.origin}/api/webhooks/twilio`,
            greeting_message: 'Hi! Welcome to Atlas Fitness. I\'m here to help you with class bookings, membership info, and any questions you have. How can I assist you today?',
            offline_message: 'Thanks for your message! Our team is currently offline but we\'ll get back to you as soon as possible. Our hours are Mon-Fri 6am-9pm, Sat-Sun 8am-6pm.',
            booking_prompt: 'Great! I can help you book a class. What day and time works best for you?'
          }
        }
        setSettings(defaultSettings)
      }
    } catch (error) {
      console.error('Error fetching WhatsApp settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('integration_settings')
          .update({
            enabled: settings.enabled,
            config: settings.config,
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id)

        if (error) throw error
      } else {
        // Create new settings
        const { error } = await supabase
          .from('integration_settings')
          .insert(settings)

        if (error) throw error
        
        // Refetch to get the created record with ID
        await fetchSettings()
      }
    } catch (error) {
      console.error('Error saving WhatsApp settings:', error)
    } finally {
      setSaving(false)
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
        title="WhatsApp Integration"
        description="Configure WhatsApp Business messaging with AI-powered responses"
        icon={<MessageSquare className="h-6 w-6" />}
        action={
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bot className="h-4 w-4" />
            )}
            Save Changes
          </button>
        }
      />

      {/* WhatsApp Service Status */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">WhatsApp Service Status</h3>
          <div className="flex items-center gap-2">
            {settings?.enabled ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-500">Active</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <span className="text-yellow-500">Not Configured</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">
              Enable WhatsApp integration for automated customer conversations
            </p>
            {settings?.config?.ai_enabled && (
              <p className="text-green-400 text-xs mt-1">
                ✓ AI Assistant enabled for automatic responses
              </p>
            )}
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings?.enabled || false}
              onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* WhatsApp Configuration */}
      <WhatsAppConfiguration
        config={settings?.config || {}}
        onChange={(config) => setSettings({ ...settings, config })}
      />

      {/* AI Response Settings */}
      <AIResponseSettings
        config={settings?.config || {}}
        onChange={(config) => setSettings({ ...settings, config })}
      />

      {/* WhatsApp Test Panel */}
      {settings?.enabled && settings?.config?.business_number && (
        <WhatsAppTestPanel settings={settings} />
      )}
    </div>
  )
}