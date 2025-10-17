'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { MessageSquare, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import SettingsHeader from '@/app/components/settings/SettingsHeader'
import SMSServiceSelector from '@/app/components/settings/integrations/sms/SMSServiceSelector'

export default function SMSIntegrationPage() {
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

      // Get SMS integration settings
      const { data: smsSettings } = await supabase
        .from('integration_settings')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .eq('integration_type', 'sms')
        .single()

      if (smsSettings) {
        setSettings(smsSettings)
      } else {
        // Create default settings
        const defaultSettings = {
          organization_id: userOrg.organization_id,
          integration_type: 'sms',
          enabled: false,
          config: {
            provider: 'standard',
            from_name: '',
            sender_id: ''
          }
        }
        setSettings(defaultSettings)
      }
    } catch (error) {
      console.error('Error fetching SMS settings:', error)
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
      console.error('Error saving SMS settings:', error)
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
        title="SMS Integration"
        description="Configure SMS messaging settings for customer communications"
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
              <Send className="h-4 w-4" />
            )}
            Save Changes
          </button>
        }
      />

      {/* SMS Service Status */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">SMS Service Status</h3>
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
              Enable SMS integration to send automated messages to your customers
            </p>
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

      {/* SMS Service Provider Selection */}
      <SMSServiceSelector
        provider={settings?.config?.provider || 'standard'}
        onChange={(provider) => setSettings({
          ...settings,
          config: { ...settings.config, provider }
        })}
      />

      {/* Provider-specific Configuration */}
      {settings?.config?.provider === 'standard' && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Standard Service Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Business Name
              </label>
              <input
                type="text"
                value={settings.config.from_name || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  config: { ...settings.config, from_name: e.target.value }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="Your Gym Name"
              />
            </div>
            <div className="bg-blue-900/20 border border-blue-900/50 rounded-lg p-3">
              <p className="text-blue-400 text-sm">
                Your SMS messages will be sent through our managed service with UK compliance included.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {settings?.config?.provider === 'dedicated' && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Dedicated Service Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Business Name
              </label>
              <input
                type="text"
                value={settings.config.from_name || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  config: { ...settings.config, from_name: e.target.value }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="Your Gym Name"
              />
            </div>
            <div className="bg-green-900/20 border border-green-900/50 rounded-lg p-3">
              <p className="text-green-400 text-sm">
                Premium dedicated number with enhanced delivery rates and priority support.
              </p>
            </div>
          </div>
        </div>
      )}

      {settings?.config?.provider === 'custom' && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Custom Integration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Provider Name
              </label>
              <input
                type="text"
                value={settings.config.provider_name || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  config: { ...settings.config, provider_name: e.target.value }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="e.g., Twilio, MessageBird"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                From Number/Sender ID
              </label>
              <input
                type="text"
                value={settings.config.sender_id || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  config: { ...settings.config, sender_id: e.target.value }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="+44XXXXXXXXXX or AlphaName"
              />
            </div>
            <div className="bg-yellow-900/20 border border-yellow-900/50 rounded-lg p-3">
              <p className="text-yellow-400 text-sm">
                You'll need to configure API credentials separately. Contact support for integration assistance.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}