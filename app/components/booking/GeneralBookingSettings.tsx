'use client'

import { useState, useEffect } from 'react'
import { Save, Globe, Clock, Calendar, Bell } from 'lucide-react'
import Button from '@/app/components/ui/Button'
import { createClient } from '@/app/lib/supabase/client'

interface BookingSettings {
  timezone: string
  booking_buffer_hours: number
  max_advance_booking_days: number
  cancellation_hours: number
  reminder_hours: number
  allow_waitlist: boolean
  auto_confirm_bookings: boolean
  require_payment: boolean
  booking_instructions?: string
}

const TIMEZONES = [
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Dublin', label: 'Dublin' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'America/New_York', label: 'New York' },
  { value: 'America/Chicago', label: 'Chicago' },
  { value: 'America/Los_Angeles', label: 'Los Angeles' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Australia/Sydney', label: 'Sydney' }
]

export default function GeneralBookingSettings() {
  const [settings, setSettings] = useState<BookingSettings>({
    timezone: 'Europe/London',
    booking_buffer_hours: 2,
    max_advance_booking_days: 30,
    cancellation_hours: 24,
    reminder_hours: 24,
    allow_waitlist: true,
    auto_confirm_bookings: true,
    require_payment: false,
    booking_instructions: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      // For now, we'll use localStorage to store settings
      // In production, this would be stored in a database table
      const savedSettings = localStorage.getItem('booking_settings')
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings))
      }
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // For now, save to localStorage
      // In production, this would save to a database
      localStorage.setItem('booking_settings', JSON.stringify(settings))
      
      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white">General Settings</h3>
          <p className="text-sm text-gray-400 mt-1">
            Configure general booking system preferences
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <div className="space-y-6">
        {/* Timezone Settings */}
        <div className="bg-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-orange-500" />
            <h4 className="text-white font-medium">Timezone</h4>
          </div>
          
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Default Timezone
            </label>
            <select
              value={settings.timezone}
              onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              All appointment times will be displayed in this timezone
            </p>
          </div>
        </div>

        {/* Booking Rules */}
        <div className="bg-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-orange-500" />
            <h4 className="text-white font-medium">Booking Rules</h4>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Minimum Booking Notice (hours)
                </label>
                <input
                  type="number"
                  value={settings.booking_buffer_hours}
                  onChange={(e) => setSettings({ ...settings, booking_buffer_hours: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                  min="0"
                  step="1"
                />
                <p className="text-xs text-gray-400 mt-1">
                  How far in advance bookings must be made
                </p>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  Maximum Advance Booking (days)
                </label>
                <input
                  type="number"
                  value={settings.max_advance_booking_days}
                  onChange={(e) => setSettings({ ...settings, max_advance_booking_days: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                  min="1"
                  step="1"
                />
                <p className="text-xs text-gray-400 mt-1">
                  How far into the future bookings can be made
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-300 mb-2">
                Cancellation Policy (hours)
              </label>
              <input
                type="number"
                value={settings.cancellation_hours}
                onChange={(e) => setSettings({ ...settings, cancellation_hours: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                min="0"
                step="1"
              />
              <p className="text-xs text-gray-400 mt-1">
                Minimum notice required for cancellations (0 = no restriction)
              </p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="w-5 h-5 text-orange-500" />
            <h4 className="text-white font-medium">Notifications</h4>
          </div>
          
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Reminder Time (hours before appointment)
            </label>
            <input
              type="number"
              value={settings.reminder_hours}
              onChange={(e) => setSettings({ ...settings, reminder_hours: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
              min="0"
              step="1"
            />
            <p className="text-xs text-gray-400 mt-1">
              When to send appointment reminders (0 = no reminders)
            </p>
          </div>
        </div>

        {/* Options */}
        <div className="bg-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-orange-500" />
            <h4 className="text-white font-medium">Booking Options</h4>
          </div>
          
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.allow_waitlist}
                onChange={(e) => setSettings({ ...settings, allow_waitlist: e.target.checked })}
                className="mr-3"
              />
              <div>
                <span className="text-sm text-white">Allow Waitlist</span>
                <p className="text-xs text-gray-400">
                  Allow customers to join a waitlist for fully booked appointments
                </p>
              </div>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.auto_confirm_bookings}
                onChange={(e) => setSettings({ ...settings, auto_confirm_bookings: e.target.checked })}
                className="mr-3"
              />
              <div>
                <span className="text-sm text-white">Auto-Confirm Bookings</span>
                <p className="text-xs text-gray-400">
                  Automatically confirm bookings without manual approval
                </p>
              </div>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.require_payment}
                onChange={(e) => setSettings({ ...settings, require_payment: e.target.checked })}
                className="mr-3"
              />
              <div>
                <span className="text-sm text-white">Require Payment</span>
                <p className="text-xs text-gray-400">
                  Require payment at the time of booking
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gray-700 rounded-lg p-6">
          <h4 className="text-white font-medium mb-4">Booking Instructions</h4>
          
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Instructions for Customers (optional)
            </label>
            <textarea
              value={settings.booking_instructions}
              onChange={(e) => setSettings({ ...settings, booking_instructions: e.target.value })}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
              rows={4}
              placeholder="e.g., Please arrive 10 minutes early for your first appointment..."
            />
            <p className="text-xs text-gray-400 mt-1">
              These instructions will be shown to customers when booking
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}