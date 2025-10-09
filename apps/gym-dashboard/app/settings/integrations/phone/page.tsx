'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Phone, MessageSquare, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import SettingsHeader from '@/app/components/settings/SettingsHeader'
import TwilioConfiguration from '@/app/components/settings/integrations/phone/TwilioConfiguration'
import PhoneNumberSettings from '@/app/components/settings/integrations/phone/PhoneNumberSettings'
import SMSTestPanel from '@/app/components/settings/integrations/phone/SMSTestPanel'
import { useOrganization } from '@/app/hooks/useOrganization'

export default function PhoneIntegrationPage() {
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

      // Get phone/SMS integration settings
      const { data: phoneSettings } = await supabase
        .from('integration_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('integration_type', 'phone')
        .single()

      if (phoneSettings) {
        setSettings(phoneSettings)
      } else {
        // Create default settings
        const defaultSettings = {
          organization_id: organizationId,
          integration_type: 'phone',
          enabled: false,
          config: {
            provider: 'twilio',
            phone_numbers: [],
            default_country_code: '+44',
            auto_responses: {
              opt_out: 'You have been unsubscribed. Reply START to resubscribe.',
              opt_in: 'Welcome back! You are now subscribed to receive messages.',
              help: 'Atlas Fitness: Reply STOP to unsubscribe. For help, call us at {phone_number}.'
            }
          }
        }
        setSettings(defaultSettings)
      }
    } catch (error) {
      console.error('Error fetching phone settings:', error)
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
        const { error } = await supabase
          .from('integration_settings')
          .update({
            enabled: settings.enabled,
            config: settings.config,
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id)
          .eq('organization_id', organizationId) // Security: ensure we only update OUR org's settings

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
      console.error('Error saving phone settings:', error)
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
        title="Phone & SMS Integration"
        description="Configure SMS messaging for notifications and customer communications"
        icon={<Phone className="h-6 w-6" />}
        action={
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MessageSquare className="h-4 w-4" />
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
              Enable SMS integration to send text messages to your customers
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

      {/* Twilio Configuration */}
      <TwilioConfiguration
        config={settings?.config || {}}
        onChange={(config) => setSettings({ ...settings, config })}
      />

      {/* Phone Number Settings */}
      <PhoneNumberSettings
        config={settings?.config || {}}
        onChange={(config) => setSettings({ ...settings, config })}
      />

      {/* SMS Test Panel */}
      {settings?.enabled && settings?.config?.twilio_account_sid && (
        <SMSTestPanel settings={settings} />
      )}
    </div>
  )
}