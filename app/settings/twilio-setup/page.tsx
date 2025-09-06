'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { 
  Phone, 
  CheckCircle, 
  Copy, 
  ExternalLink, 
  AlertTriangle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Shield,
  Settings,
  MessageSquare
} from 'lucide-react'
import SettingsHeader from '@/app/components/settings/SettingsHeader'
import TwilioSetupWizard from '@/app/components/settings/twilio-setup/TwilioSetupWizard'
import TwilioAIHelper from '@/app/components/settings/twilio-setup/TwilioAIHelper'

export default function TwilioSetupPage() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'untested' | 'success' | 'error' | 'testing'>('untested')
  const [connectionError, setConnectionError] = useState<string>('')
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

      // Get Twilio integration settings
      const { data: twilioSettings } = await supabase
        .from('integration_settings')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .eq('provider', 'twilio')
        .single()

      if (twilioSettings) {
        setSettings(twilioSettings)
        // Check if credentials are configured
        if (twilioSettings.config?.account_sid && twilioSettings.config?.auth_token) {
          setConnectionStatus('success')
        }
      } else {
        // Create default settings
        const defaultSettings = {
          organization_id: userOrg.organization_id,
          provider: 'twilio',
          is_active: false,
          config: {
            account_sid: '',
            auth_token: '',
            phone_number: '',
            webhook_url: '',
            status_callback_url: ''
          },
          credentials: {},
          sync_status: 'disconnected'
        }
        setSettings(defaultSettings)
      }
    } catch (error) {
      console.error('Error fetching Twilio settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const testConnection = async () => {
    if (!settings?.config?.account_sid || !settings?.config?.auth_token) {
      setConnectionError('Please provide both Account SID and Auth Token')
      setConnectionStatus('error')
      return
    }

    setTestingConnection(true)
    setConnectionStatus('testing')
    
    try {
      const response = await fetch('/api/integrations/twilio/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountSid: settings.config.account_sid,
          authToken: settings.config.auth_token,
          phoneNumber: settings.config.phone_number
        })
      })

      const result = await response.json()

      if (result.success) {
        setConnectionStatus('success')
        setConnectionError('')
        
        // If phone number wasn't provided, get available numbers
        if (!settings.config.phone_number && result.availableNumbers?.length > 0) {
          setSettings(prev => ({
            ...prev,
            config: {
              ...prev.config,
              available_numbers: result.availableNumbers
            }
          }))
        }
      } else {
        setConnectionStatus('error')
        setConnectionError(result.error || 'Failed to connect to Twilio')
      }
    } catch (error) {
      setConnectionStatus('error')
      setConnectionError('Network error occurred while testing connection')
      console.error('Error testing Twilio connection:', error)
    } finally {
      setTestingConnection(false)
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
            is_active: settings.is_active,
            config: settings.config,
            credentials: {
              account_sid: settings.config.account_sid,
              auth_token: settings.config.auth_token
            },
            sync_status: connectionStatus === 'success' ? 'connected' : 'disconnected',
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id)

        if (error) throw error
      } else {
        // Create new settings
        const { data, error } = await supabase
          .from('integration_settings')
          .insert(settings)
          .select()
          .single()

        if (error) throw error
        
        setSettings(data)
      }

      // Show success message (you can replace this with a toast notification)
      console.log('Twilio settings saved successfully!')
    } catch (error) {
      console.error('Error saving Twilio settings:', error)
      console.error('Failed to save Twilio settings. Please try again.')
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

  const hasValidCredentials = settings?.config?.account_sid && settings?.config?.auth_token

  return (
    <div className="space-y-6">
      <SettingsHeader 
        title="Twilio Phone Setup Wizard"
        description="Complete step-by-step setup for Twilio SMS and voice communication"
        icon={<Phone className="h-6 w-6" />}
        action={
          <div className="flex items-center gap-3">
            {hasValidCredentials && (
              <button
                onClick={testConnection}
                disabled={testingConnection}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50"
              >
                {testingConnection ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4" />
                )}
                Test Connection
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !hasValidCredentials}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Settings className="h-4 w-4" />
              )}
              Save Configuration
            </button>
          </div>
        }
      />

      {/* Connection Status */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Connection Status</h3>
          <div className="flex items-center gap-2">
            {connectionStatus === 'success' && (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-500">Connected</span>
              </>
            )}
            {connectionStatus === 'error' && (
              <>
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <span className="text-red-500">Connection Failed</span>
              </>
            )}
            {connectionStatus === 'testing' && (
              <>
                <Loader2 className="h-5 w-5 animate-spin text-yellow-500" />
                <span className="text-yellow-500">Testing...</span>
              </>
            )}
            {connectionStatus === 'untested' && (
              <>
                <AlertTriangle className="h-5 w-5 text-gray-500" />
                <span className="text-gray-500">Not Tested</span>
              </>
            )}
          </div>
        </div>
        
        {connectionError && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{connectionError}</p>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">
              {connectionStatus === 'success' 
                ? 'Your Twilio account is properly configured and connected'
                : 'Complete the setup wizard to test your Twilio connection'
              }
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings?.is_active || false}
              onChange={(e) => setSettings({ ...settings, is_active: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-orange-600"></div>
          </label>
        </div>
      </div>

      {/* Main Setup Wizard */}
      <TwilioSetupWizard
        settings={settings}
        onSettingsChange={setSettings}
        onTestConnection={testConnection}
        testingConnection={testingConnection}
        connectionStatus={connectionStatus}
      />

      {/* AI Helper Component */}
      <TwilioAIHelper />
    </div>
  )
}