'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Mail, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import SettingsHeader from '@/app/components/settings/SettingsHeader'
import EmailServiceSelector from '@/app/components/settings/integrations/email/EmailServiceSelector'
import SMTPConfiguration from '@/app/components/settings/integrations/email/SMTPConfiguration'
import SendgridConfiguration from '@/app/components/settings/integrations/email/SendgridConfiguration'
import MailgunConfiguration from '@/app/components/settings/integrations/email/MailgunConfiguration'
import EmailTestPanel from '@/app/components/settings/integrations/email/EmailTestPanel'
import { useOrganization } from '@/app/hooks/useOrganization'

export default function EmailIntegrationPage() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  const { organizationId } = useOrganization()

  useEffect(() => {
    if (organizationId) {
      fetchSettings()
    }
  }, [organizationId])

  const fetchSettings = async () => {
    try {
      if (!organizationId) return

      // Get email integration settings
      const { data: emailSettings } = await supabase
        .from('integration_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('integration_type', 'email')
        .single()

      if (emailSettings) {
        setSettings(emailSettings)
      } else {
        // Create default settings
        const defaultSettings = {
          organization_id: organizationId,
          integration_type: 'email',
          enabled: false,
          config: {
            provider: 'standard',
            from_name: '',
            from_email: '',
            reply_to_email: ''
          }
        }
        setSettings(defaultSettings)
      }
    } catch (error) {
      console.error('Error fetching email settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!organizationId) return

    setSaving(true)
    try {
      if (settings.id) {
        // Update existing settings
        const { data, error } = await supabase
          .from('integration_settings')
          .update({
            enabled: settings.enabled,
            config: settings.config,
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id)
          .eq('organization_id', organizationId) // Security: ensure we only update OUR org's settings
          .select()
          .single()

        if (error) {
          console.error('Error updating settings:', error)
          throw error
        }

        setSettings(data)
      } else {
        // Create new settings
        const { data, error } = await supabase
          .from('integration_settings')
          .insert({
            organization_id: organizationId,
            integration_type: 'email',
            enabled: settings.enabled,
            config: settings.config
          })
          .select()
          .single()

        if (error) {
          console.error('Error creating settings:', error)
          throw error
        }

        setSettings(data)
      }

      // Show success message
      alert('Email settings saved successfully!')
    } catch (error) {
      console.error('Error saving email settings:', error)
      alert('Failed to save email settings. Please try again.')
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
        title="Email Integration"
        description="Configure email delivery settings for sending transactional emails"
        icon={<Mail className="h-6 w-6" />}
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

      {/* Email Service Status */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Email Service Status</h3>
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
              Enable email integration to send automated emails to your customers
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

      {/* Email Service Provider Selection */}
      <EmailServiceSelector
        provider={settings?.config?.provider || 'smtp'}
        onChange={(provider) => setSettings({
          ...settings,
          config: { ...settings.config, provider }
        })}
      />

      {/* Provider-specific Configuration */}
      {settings?.config?.provider === 'smtp' && (
        <SMTPConfiguration
          config={settings.config}
          onChange={(config) => setSettings({ ...settings, config })}
        />
      )}
      
      {settings?.config?.provider === 'standard' && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Standard Server Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                From Name
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
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                From Email
              </label>
              <input
                type="email"
                value={settings.config.from_email || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  config: { ...settings.config, from_email: e.target.value }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="noreply@yourgym.com"
              />
            </div>
            <div className="bg-blue-900/20 border border-blue-900/50 rounded-lg p-3">
              <p className="text-blue-400 text-sm">
                Your emails will be delivered through our managed service. High deliverability and monitoring included.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {settings?.config?.provider === 'dedicated' && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Dedicated Server Configuration</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                From Name
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
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                From Email
              </label>
              <input
                type="email"
                value={settings.config.from_email || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  config: { ...settings.config, from_email: e.target.value }
                })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                placeholder="noreply@yourgym.com"
              />
            </div>
            <div className="bg-green-900/20 border border-green-900/50 rounded-lg p-3">
              <p className="text-green-400 text-sm">
                Premium dedicated IP address for maximum deliverability. Advanced analytics and priority support included.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Email Test Panel */}
      {settings?.enabled && <EmailTestPanel settings={settings} />}
    </div>
  )
}