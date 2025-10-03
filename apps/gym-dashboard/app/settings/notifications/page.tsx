'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Bell, Mail, MessageSquare, Phone, Calendar, Users, CreditCard, AlertCircle, Loader2 } from 'lucide-react'
import SettingsHeader from '@/app/components/settings/SettingsHeader'

interface NotificationSetting {
  category: string
  email: boolean
  sms: boolean
  whatsapp: boolean
  push: boolean
}

export default function NotificationsPage() {
  const [settings, setSettings] = useState<Record<string, NotificationSetting>>({});
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  const notificationCategories = [
    {
      id: 'bookings',
      name: 'Bookings & Classes',
      description: 'Notifications about class bookings, cancellations, and reminders',
      icon: <Calendar className="h-5 w-5" />
    },
    {
      id: 'leads',
      name: 'New Leads',
      description: 'Get notified when new leads come in from forms or campaigns',
      icon: <Users className="h-5 w-5" />
    },
    {
      id: 'payments',
      name: 'Payments',
      description: 'Payment confirmations, failed payments, and subscription updates',
      icon: <CreditCard className="h-5 w-5" />
    },
    {
      id: 'messages',
      name: 'Customer Messages',
      description: 'When customers send messages via WhatsApp, SMS, or email',
      icon: <MessageSquare className="h-5 w-5" />
    },
    {
      id: 'staff',
      name: 'Staff Updates',
      description: 'Staff schedule changes, time-off requests, and announcements',
      icon: <Users className="h-5 w-5" />
    },
    {
      id: 'system',
      name: 'System Alerts',
      description: 'Important system updates, maintenance, and security alerts',
      icon: <AlertCircle className="h-5 w-5" />
    }
  ]

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

      const { data: notificationSettings } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .eq('user_id', user.id)

      if (notificationSettings && notificationSettings.length > 0) {
        const settingsMap: Record<string, NotificationSetting> = {}
        notificationSettings.forEach(setting => {
          settingsMap[setting.category] = {
            category: setting.category,
            email: setting.channels?.email || false,
            sms: setting.channels?.sms || false,
            whatsapp: setting.channels?.whatsapp || false,
            push: setting.channels?.push || false
          }
        })
        setSettings(settingsMap)
      } else {
        // Initialize with default settings
        const defaultSettings: Record<string, NotificationSetting> = {}
        notificationCategories.forEach(cat => {
          defaultSettings[cat.id] = {
            category: cat.id,
            email: true,
            sms: false,
            whatsapp: false,
            push: false
          }
        })
        setSettings(defaultSettings)
      }
    } catch (error) {
      console.error('Error fetching notification settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = (category: string, channel: 'email' | 'sms' | 'whatsapp' | 'push') => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [channel]: !prev[category][channel]
      }
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) return

      // Save each category setting
      for (const [category, setting] of Object.entries(settings)) {
        const { error } = await supabase
          .from('notification_settings')
          .upsert({
            organization_id: userOrg.organization_id,
            user_id: user.id,
            category,
            channels: {
              email: setting.email,
              sms: setting.sms,
              whatsapp: setting.whatsapp,
              push: setting.push
            },
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'organization_id,user_id,category'
          })

        if (error) throw error
      }

      alert('Notification settings saved successfully!')
    } catch (error) {
      console.error('Error saving notification settings:', error)
      alert('Failed to save notification settings')
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
        title="Notifications"
        description="Choose how you want to receive notifications"
        icon={<Bell className="h-6 w-6" />}
        action={
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Bell className="h-4 w-4" />
            )}
            Save Preferences
          </button>
        }
      />

      {/* Notification Categories */}
      <div className="space-y-4">
        {notificationCategories.map((category) => (
          <div key={category.id} className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 bg-gray-700 rounded-lg text-gray-400">
                {category.icon}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-white">{category.name}</h3>
                <p className="text-sm text-gray-400">{category.description}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-300">Email</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings[category.id]?.email || false}
                  onChange={() => handleToggle(category.id, 'email')}
                  className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-300">SMS</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings[category.id]?.sms || false}
                  onChange={() => handleToggle(category.id, 'sms')}
                  className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-300">WhatsApp</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings[category.id]?.whatsapp || false}
                  onChange={() => handleToggle(category.id, 'whatsapp')}
                  className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg cursor-pointer hover:bg-gray-700">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-300">Push</span>
                </div>
                <input
                  type="checkbox"
                  checked={settings[category.id]?.push || false}
                  onChange={() => handleToggle(category.id, 'push')}
                  className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      {/* Additional Settings */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-medium text-white mb-4">Notification Schedule</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white">Quiet Hours</p>
              <p className="text-xs text-gray-400">Pause non-urgent notifications during these hours</p>
            </div>
            <input
              type="checkbox"
              className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
            />
          </label>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400">From</label>
              <input
                type="time"
                defaultValue="22:00"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400">To</label>
              <input
                type="time"
                defaultValue="08:00"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notification Tips */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Notification Tips</h4>
        <ul className="space-y-1 text-xs text-gray-500">
          <li>• Email notifications are best for non-urgent updates and summaries</li>
          <li>• SMS notifications have higher open rates but may incur costs</li>
          <li>• WhatsApp notifications require customers to opt-in first</li>
          <li>• Push notifications work only when you have the app open</li>
        </ul>
      </div>
    </div>
  )
}