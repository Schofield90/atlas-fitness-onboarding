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

export default function EmailIntegrationPage() {
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

      // Get email integration settings
      const { data: emailSettings } = await supabase
        .from('integration_settings')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .eq('integration_type', 'email')
        .single()

      if (emailSettings) {
        setSettings(emailSettings)
      } else {
        // Create default settings
        const defaultSettings = {
          organization_id: userOrg.organization_id,
          integration_type: 'email',
          enabled: false,
          config: {
            provider: 'smtp',
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
      console.error('Error saving email settings:', error)
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
      
      {settings?.config?.provider === 'sendgrid' && (
        <SendgridConfiguration
          config={settings.config}
          onChange={(config) => setSettings({ ...settings, config })}
        />
      )}
      
      {settings?.config?.provider === 'mailgun' && (
        <MailgunConfiguration
          config={settings.config}
          onChange={(config) => setSettings({ ...settings, config })}
        />
      )}

      {/* Email Test Panel */}
      {settings?.enabled && <EmailTestPanel settings={settings} />}
    </div>
  )
}