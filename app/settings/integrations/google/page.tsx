'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Calendar, CheckCircle, AlertCircle, Loader2, RefreshCw, Settings } from 'lucide-react'
import SettingsHeader from '@/app/components/settings/SettingsHeader'
import { useRouter } from 'next/navigation'

export default function GoogleCalendarIntegrationPage() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [calendars, setCalendars] = useState<any[]>([])
  const [connected, setConnected] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchSettings()
    checkConnection()
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

      // Get Google Calendar integration settings
      const { data: googleSettings } = await supabase
        .from('calendar_sync_settings')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .eq('user_id', user.id)
        .single()

      if (googleSettings) {
        setSettings(googleSettings)
      } else {
        // Create default settings
        const defaultSettings = {
          organization_id: userOrg.organization_id,
          user_id: user.id,
          sync_enabled: false,
          sync_direction: 'both',
          sync_bookings: true,
          sync_classes: true,
          calendar_id: null
        }
        setSettings(defaultSettings)
      }
    } catch (error) {
      console.error('Error fetching Google Calendar settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkConnection = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Check if we have Google tokens
      const { data: tokens } = await supabase
        .from('google_calendar_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (tokens && tokens.access_token) {
        setConnected(true)
        // Fetch calendars if connected
        fetchCalendars()
      }
    } catch (error) {
      console.error('Error checking connection:', error)
    }
  }

  const fetchCalendars = async () => {
    try {
      const response = await fetch('/api/calendar/list')
      if (response.ok) {
        const data = await response.json()
        setCalendars(data.calendars || [])
      }
    } catch (error) {
      console.error('Error fetching calendars:', error)
    }
  }

  const handleConnect = () => {
    // Redirect to Google OAuth
    window.location.href = '/api/auth/google'
  }

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect your Google Calendar?')) return

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Delete tokens
      await supabase
        .from('google_calendar_tokens')
        .delete()
        .eq('user_id', user.id)

      // Update settings
      await supabase
        .from('calendar_sync_settings')
        .update({ sync_enabled: false })
        .eq('user_id', user.id)

      setConnected(false)
      setCalendars([])
      await fetchSettings()
    } catch (error) {
      console.error('Error disconnecting:', error)
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
          .from('calendar_sync_settings')
          .update({
            sync_enabled: settings.sync_enabled,
            sync_direction: settings.sync_direction,
            sync_bookings: settings.sync_bookings,
            sync_classes: settings.sync_classes,
            calendar_id: settings.calendar_id,
            updated_at: new Date().toISOString()
          })
          .eq('id', settings.id)

        if (error) throw error
      } else {
        // Create new settings
        const { error } = await supabase
          .from('calendar_sync_settings')
          .insert(settings)

        if (error) throw error
        
        // Refetch to get the created record with ID
        await fetchSettings()
      }
    } catch (error) {
      console.error('Error saving Google Calendar settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSync = async () => {
    try {
      const response = await fetch('/api/calendar/sync', { method: 'POST' })
      if (response.ok) {
        alert('Calendar sync completed successfully!')
      } else {
        alert('Failed to sync calendar')
      }
    } catch (error) {
      console.error('Error syncing calendar:', error)
      alert('Failed to sync calendar')
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
        title="Google Calendar Integration"
        description="Sync your bookings and classes with Google Calendar"
        icon={<Calendar className="h-6 w-6" />}
        action={
          <button
            onClick={handleSave}
            disabled={saving || !connected}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Settings className="h-4 w-4" />
            )}
            Save Changes
          </button>
        }
      />

      {/* Connection Status */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Connection Status</h3>
          <div className="flex items-center gap-2">
            {connected ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-500">Connected</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <span className="text-yellow-500">Not Connected</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">
              {connected 
                ? 'Your Google Calendar is connected and ready to sync'
                : 'Connect your Google Calendar to enable two-way sync'
              }
            </p>
          </div>
          {connected ? (
            <button
              onClick={handleDisconnect}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={handleConnect}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Connect Google Calendar
            </button>
          )}
        </div>
      </div>

      {connected && (
        <>
          {/* Calendar Selection */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Calendar Selection</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Select Calendar to Sync
              </label>
              <select
                value={settings?.calendar_id || ''}
                onChange={(e) => setSettings({ ...settings, calendar_id: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="">Select a calendar...</option>
                {calendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.summary}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Sync Settings */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Sync Settings</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Enable Sync</p>
                  <p className="text-gray-400 text-sm">Automatically sync events between systems</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings?.sync_enabled || false}
                    onChange={(e) => setSettings({ ...settings, sync_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Sync Direction
                </label>
                <select
                  value={settings?.sync_direction || 'both'}
                  onChange={(e) => setSettings({ ...settings, sync_direction: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="to_google">Atlas to Google Calendar only</option>
                  <option value="from_google">Google Calendar to Atlas only</option>
                  <option value="both">Two-way sync</option>
                </select>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-gray-400">Sync Options</p>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings?.sync_bookings || false}
                    onChange={(e) => setSettings({ ...settings, sync_bookings: e.target.checked })}
                    className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-300">Sync customer bookings</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings?.sync_classes || false}
                    onChange={(e) => setSettings({ ...settings, sync_classes: e.target.checked })}
                    className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-gray-300">Sync class sessions</span>
                </label>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleSync}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Sync Now
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  Manually sync calendars. Automatic sync runs every 15 minutes.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Instructions */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-400 mb-2">How it Works</h4>
        <ul className="space-y-1 text-xs text-gray-500">
          <li>• Connect your Google Calendar account</li>
          <li>• Select which calendar to sync with</li>
          <li>• Choose what to sync (bookings, classes)</li>
          <li>• Events sync automatically every 15 minutes</li>
          <li>• Use "Sync Now" for immediate updates</li>
        </ul>
      </div>
    </div>
  )
}