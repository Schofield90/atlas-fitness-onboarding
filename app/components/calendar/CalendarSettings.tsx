'use client'

import { useState, useEffect } from 'react'
import { Calendar, Clock, Link, Settings } from 'lucide-react'

interface WorkingHours {
  [key: string]: {
    enabled: boolean
    start: string
    end: string
  }
}

interface CalendarSettingsData {
  workingHours: WorkingHours
  slotDuration: number
  bufferTime: number
  timezone: string
  googleCalendarConnected: boolean
  bookingConfirmationEnabled: boolean
  reminderEnabled: boolean
  reminderTime: number
  googleCalendarIntegration?: {
    isActive: boolean
    calendarEmail: string
    lastSyncedAt: string
  }
}

export function CalendarSettings() {
  const [settings, setSettings] = useState<CalendarSettingsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/calendar/settings')
      if (!response.ok) throw new Error('Failed to fetch settings')
      const data = await response.json()
      setSettings(data)
    } catch (error) {
      console.error('Error fetching calendar settings:', error)
      alert('Failed to load calendar settings')
    } finally {
      setLoading(false)
    }
  }

  const saveSettings = async () => {
    if (!settings) return
    
    setSaving(true)
    try {
      const response = await fetch('/api/calendar/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (!response.ok) throw new Error('Failed to save settings')
      
      alert('Calendar settings saved successfully')
    } catch (error) {
      console.error('Error saving calendar settings:', error)
      alert('Failed to save calendar settings')
    } finally {
      setSaving(false)
    }
  }

  const connectGoogleCalendar = () => {
    window.location.href = '/api/calendar/google/connect'
  }

  const disconnectGoogleCalendar = async () => {
    try {
      const response = await fetch('/api/calendar/settings', {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to disconnect')
      
      alert('Google Calendar disconnected')
      fetchSettings()
    } catch (error) {
      console.error('Error disconnecting Google Calendar:', error)
      alert('Failed to disconnect Google Calendar')
    }
  }

  const updateWorkingHours = (day: string, field: string, value: any) => {
    if (!settings) return
    
    setSettings({
      ...settings,
      workingHours: {
        ...settings.workingHours,
        [day]: {
          ...settings.workingHours[day],
          [field]: value
        }
      }
    })
  }

  if (loading) {
    return <div className="animate-pulse">Loading calendar settings...</div>
  }

  if (!settings) {
    return <div>Failed to load settings</div>
  }

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const timezones = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Asia/Tokyo',
    'Australia/Sydney'
  ]

  return (
    <div className="space-y-6">
      {/* Google Calendar Integration */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="h-5 w-5 text-orange-500" />
          <h3 className="text-lg font-bold">Google Calendar Integration</h3>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          Connect your Google Calendar to sync events and availability
        </p>
        
        {settings.googleCalendarIntegration ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{settings.googleCalendarIntegration.calendarEmail}</p>
                <p className="text-sm text-gray-400">
                  Last synced: {new Date(settings.googleCalendarIntegration.lastSyncedAt).toLocaleString()}
                </p>
              </div>
              <button
                onClick={disconnectGoogleCalendar}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={connectGoogleCalendar}
            className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Link className="h-4 w-4" />
            Connect Google Calendar
          </button>
        )}
      </div>

      {/* Working Hours */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-orange-500" />
          <h3 className="text-lg font-bold">Working Hours</h3>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          Set your availability for each day of the week
        </p>
        
        <div className="space-y-4">
          {daysOfWeek.map(day => (
            <div key={day} className="flex items-center gap-4">
              <div className="w-24">
                <label className="capitalize text-sm">{day}</label>
              </div>
              <input
                type="checkbox"
                checked={settings.workingHours[day]?.enabled || false}
                onChange={(e) => updateWorkingHours(day, 'enabled', e.target.checked)}
                className="w-4 h-4 text-orange-500 bg-gray-700 border-gray-600 rounded focus:ring-orange-500"
              />
              {settings.workingHours[day]?.enabled && (
                <>
                  <input
                    type="time"
                    value={settings.workingHours[day]?.start || '09:00'}
                    onChange={(e) => updateWorkingHours(day, 'start', e.target.value)}
                    className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="time"
                    value={settings.workingHours[day]?.end || '17:00'}
                    onChange={(e) => updateWorkingHours(day, 'end', e.target.value)}
                    className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-sm"
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Appointment Settings */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Settings className="h-5 w-5 text-orange-500" />
          <h3 className="text-lg font-bold">Appointment Settings</h3>
        </div>
        <p className="text-gray-400 text-sm mb-4">
          Configure default settings for appointments
        </p>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Slot Duration (minutes)
              </label>
              <input
                type="number"
                value={settings.slotDuration}
                onChange={(e) => setSettings({ ...settings, slotDuration: parseInt(e.target.value) || 30 })}
                min={15}
                max={120}
                step={15}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Buffer Time (minutes)
              </label>
              <input
                type="number"
                value={settings.bufferTime}
                onChange={(e) => setSettings({ ...settings, bufferTime: parseInt(e.target.value) || 0 })}
                min={0}
                max={60}
                step={5}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Timezone
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
            >
              {timezones.map(tz => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm">Booking Confirmation Emails</label>
              <input
                type="checkbox"
                checked={settings.bookingConfirmationEnabled}
                onChange={(e) => setSettings({ ...settings, bookingConfirmationEnabled: e.target.checked })}
                className="w-4 h-4 text-orange-500 bg-gray-700 border-gray-600 rounded focus:ring-orange-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm">Appointment Reminders</label>
              <input
                type="checkbox"
                checked={settings.reminderEnabled}
                onChange={(e) => setSettings({ ...settings, reminderEnabled: e.target.checked })}
                className="w-4 h-4 text-orange-500 bg-gray-700 border-gray-600 rounded focus:ring-orange-500"
              />
            </div>

            {settings.reminderEnabled && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Reminder Time (hours before)
                </label>
                <input
                  type="number"
                  value={settings.reminderTime}
                  onChange={(e) => setSettings({ ...settings, reminderTime: parseInt(e.target.value) || 24 })}
                  min={1}
                  max={72}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={saveSettings}
        disabled={saving}
        className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save Calendar Settings'}
      </button>
    </div>
  )
}