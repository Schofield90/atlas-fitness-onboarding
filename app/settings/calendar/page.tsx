'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import SettingsHeader from '@/app/components/settings/SettingsHeader'
import { 
  Calendar,
  Clock,
  Globe,
  Users,
  Link,
  Settings,
  ChevronRight,
  Save,
  AlertCircle
} from 'lucide-react'

interface CalendarSettings {
  id?: string
  organization_id: string
  slot_duration: number // in minutes
  buffer_time: number // in minutes between appointments
  advance_booking_days: number
  min_notice_hours: number // minimum notice for bookings
  max_bookings_per_day?: number
  timezone: string
  working_hours: {
    [key: string]: {
      enabled: boolean
      start: string
      end: string
      breaks?: Array<{ start: string; end: string }>
    }
  }
  google_calendar_connected: boolean
  google_calendar_id?: string
  sync_enabled: boolean
  booking_confirmation_required: boolean
  allow_cancellations: boolean
  cancellation_notice_hours: number
}

export default function CalendarSettingsPage() {
  const [settings, setSettings] = useState<CalendarSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'availability' | 'integration' | 'booking'>('general')
  const supabase = createClient()

  const defaultWorkingHours = {
    monday: { enabled: true, start: '09:00', end: '18:00' },
    tuesday: { enabled: true, start: '09:00', end: '18:00' },
    wednesday: { enabled: true, start: '09:00', end: '18:00' },
    thursday: { enabled: true, start: '09:00', end: '18:00' },
    friday: { enabled: true, start: '09:00', end: '18:00' },
    saturday: { enabled: true, start: '09:00', end: '14:00' },
    sunday: { enabled: false, start: '10:00', end: '14:00' }
  }

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

      // Fetch calendar settings
      const { data: calendarSettings } = await supabase
        .from('calendar_settings')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .single()

      if (calendarSettings) {
        setSettings(calendarSettings)
      } else {
        // Create default settings
        const defaultSettings: CalendarSettings = {
          organization_id: userOrg.organization_id,
          slot_duration: 60,
          buffer_time: 15,
          advance_booking_days: 30,
          min_notice_hours: 24,
          max_bookings_per_day: 10,
          timezone: 'Europe/London',
          working_hours: defaultWorkingHours,
          google_calendar_connected: false,
          sync_enabled: false,
          booking_confirmation_required: false,
          allow_cancellations: true,
          cancellation_notice_hours: 24
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
          .from('calendar_settings')
          .update(settings)
          .eq('id', settings.id)

        if (error) throw error
      } else {
        // Insert new settings
        const { data, error } = await supabase
          .from('calendar_settings')
          .insert(settings)
          .select()
          .single()

        if (error) throw error
        setSettings({ ...settings, id: data.id })
      }

      alert('Calendar settings saved successfully!')
    } catch (error) {
      setLoading(false)
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const updateWorkingHours = (day: string, field: string, value: any) => {
    if (!settings) return
    
    setSettings({
      ...settings,
      working_hours: {
        ...settings.working_hours,
        [day]: {
          ...settings.working_hours[day],
          [field]: value
        }
      }
    })
  }

  const connectGoogleCalendar = async () => {
    // Simplified Google Calendar connection
    alert('Google Calendar integration will open in a new window')
    // In production, this would redirect to Google OAuth
    window.open('/api/calendar/google-auth', '_blank')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading calendar settings...</p>
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
        title="Calendar & Scheduling"
        description="Configure your booking calendar and availability"
      />

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          {[
            { id: 'general', label: 'General', icon: Settings },
            { id: 'availability', label: 'Availability', icon: Clock },
            { id: 'integration', label: 'Integration', icon: Link },
            { id: 'booking', label: 'Booking Rules', icon: Users }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-500'
                  : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-6">General Settings</h2>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Default Session Duration
                </label>
                <select
                  value={settings.slot_duration}
                  onChange={(e) => setSettings({ ...settings, slot_duration: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes (1 hour)</option>
                  <option value="90">90 minutes</option>
                  <option value="120">120 minutes (2 hours)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Default duration for PT sessions and consultations
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Buffer Time Between Sessions
                </label>
                <select
                  value={settings.buffer_time}
                  onChange={(e) => setSettings({ ...settings, buffer_time: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="0">No buffer</option>
                  <option value="5">5 minutes</option>
                  <option value="10">10 minutes</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Time between appointments for preparation
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Advance Booking Window
                </label>
                <select
                  value={settings.advance_booking_days}
                  onChange={(e) => setSettings({ ...settings, advance_booking_days: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="7">1 week</option>
                  <option value="14">2 weeks</option>
                  <option value="30">1 month</option>
                  <option value="60">2 months</option>
                  <option value="90">3 months</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  How far in advance can clients book
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Minimum Booking Notice
                </label>
                <select
                  value={settings.min_notice_hours}
                  onChange={(e) => setSettings({ ...settings, min_notice_hours: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="0">No minimum</option>
                  <option value="1">1 hour</option>
                  <option value="2">2 hours</option>
                  <option value="4">4 hours</option>
                  <option value="12">12 hours</option>
                  <option value="24">24 hours</option>
                  <option value="48">48 hours</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Minimum notice required for bookings
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Max Bookings Per Day (Per Coach)
                </label>
                <input
                  type="number"
                  value={settings.max_bookings_per_day || ''}
                  onChange={(e) => setSettings({ ...settings, max_bookings_per_day: parseInt(e.target.value) || undefined })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="No limit"
                  min="1"
                  max="50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty for no limit
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Timezone
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <select
                    value={settings.timezone}
                    onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="Europe/London">London (GMT/BST)</option>
                    <option value="Europe/Dublin">Dublin</option>
                    <option value="America/New_York">New York (EST)</option>
                    <option value="America/Los_Angeles">Los Angeles (PST)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Availability Settings */}
      {activeTab === 'availability' && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Working Hours</h2>
          
          <div className="space-y-3">
            {Object.entries(settings.working_hours).map(([day, hours]) => (
              <div key={day} className="flex items-center gap-4 p-4 bg-gray-700 rounded-lg">
                <input
                  type="checkbox"
                  checked={hours.enabled}
                  onChange={(e) => updateWorkingHours(day, 'enabled', e.target.checked)}
                  className="rounded border-gray-600 bg-gray-800 text-blue-500"
                />
                <span className="w-28 text-white capitalize">{day}</span>
                
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    value={hours.start}
                    onChange={(e) => updateWorkingHours(day, 'start', e.target.value)}
                    disabled={!hours.enabled}
                    className="px-3 py-1 bg-gray-600 border border-gray-500 rounded text-white disabled:opacity-50"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="time"
                    value={hours.end}
                    onChange={(e) => updateWorkingHours(day, 'end', e.target.value)}
                    disabled={!hours.enabled}
                    className="px-3 py-1 bg-gray-600 border border-gray-500 rounded text-white disabled:opacity-50"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm text-blue-300 font-medium">Coach Availability</p>
                <p className="text-xs text-blue-200 mt-1">
                  Individual coach availability can be set in Staff Management. These are your gym's general operating hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Integration Settings */}
      {activeTab === 'integration' && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Calendar Integration</h2>
          
          <div className="space-y-6">
            {/* Google Calendar */}
            <div className="p-6 bg-gray-700 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gray-600 rounded-lg">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-medium text-white">Google Calendar</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      Sync bookings with Google Calendar for real-time availability
                    </p>
                    {settings.google_calendar_connected && (
                      <p className="text-xs text-green-400 mt-2">
                        Connected to: {settings.google_calendar_id}
                      </p>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={connectGoogleCalendar}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    settings.google_calendar_connected
                      ? 'bg-gray-600 text-gray-300'
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  {settings.google_calendar_connected ? 'Reconnect' : 'Connect'}
                </button>
              </div>

              {settings.google_calendar_connected && (
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={settings.sync_enabled}
                      onChange={(e) => setSettings({ ...settings, sync_enabled: e.target.checked })}
                      className="rounded border-gray-500 bg-gray-600 text-blue-500"
                    />
                    <span className="text-sm text-gray-300">
                      Enable two-way sync (blocks time for external events)
                    </span>
                  </label>
                </div>
              )}
            </div>

            {/* Other integrations placeholder */}
            <div className="p-6 bg-gray-700/50 rounded-lg border border-gray-600">
              <h3 className="font-medium text-gray-400 mb-2">Coming Soon</h3>
              <ul className="space-y-2 text-sm text-gray-500">
                <li>• Outlook Calendar Integration</li>
                <li>• Apple Calendar Integration</li>
                <li>• Zoom Meeting Auto-creation</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Booking Rules */}
      {activeTab === 'booking' && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-white mb-6">Booking Rules</h2>
          
          <div className="space-y-6">
            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.booking_confirmation_required}
                  onChange={(e) => setSettings({ ...settings, booking_confirmation_required: e.target.checked })}
                  className="rounded border-gray-600 bg-gray-700 text-blue-500"
                />
                <div>
                  <span className="text-white">Require Manual Confirmation</span>
                  <p className="text-xs text-gray-400">
                    Staff must approve bookings before they're confirmed
                  </p>
                </div>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={settings.allow_cancellations}
                  onChange={(e) => setSettings({ ...settings, allow_cancellations: e.target.checked })}
                  className="rounded border-gray-600 bg-gray-700 text-blue-500"
                />
                <div>
                  <span className="text-white">Allow Client Cancellations</span>
                  <p className="text-xs text-gray-400">
                    Clients can cancel their own bookings
                  </p>
                </div>
              </label>
            </div>

            {settings.allow_cancellations && (
              <div className="ml-7">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Cancellation Notice Required
                </label>
                <select
                  value={settings.cancellation_notice_hours}
                  onChange={(e) => setSettings({ ...settings, cancellation_notice_hours: parseInt(e.target.value) })}
                  className="w-full max-w-xs px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="0">No notice required</option>
                  <option value="1">1 hour</option>
                  <option value="2">2 hours</option>
                  <option value="4">4 hours</option>
                  <option value="12">12 hours</option>
                  <option value="24">24 hours</option>
                  <option value="48">48 hours</option>
                </select>
              </div>
            )}

            <div className="pt-4 border-t border-gray-700">
              <h3 className="text-sm font-medium text-gray-300 mb-3">Booking Widget</h3>
              <div className="p-4 bg-gray-700 rounded-lg">
                <p className="text-sm text-gray-400 mb-2">Embed this booking widget on your website:</p>
                <code className="block p-3 bg-gray-900 rounded text-xs text-gray-300">
                  {`<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/book/public/[org-id]" width="100%" height="600"></iframe>`}
                </code>
                <button className="mt-3 text-sm text-blue-400 hover:text-blue-300">
                  Copy Widget Code →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}