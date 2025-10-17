'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Calendar as CalendarIcon, Settings, RefreshCw, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function CalendarSyncPage() {
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [calendars, setCalendars] = useState<any[]>([])
  const [selectedCalendar, setSelectedCalendar] = useState('')
  const [syncSettings, setSyncSettings] = useState({
    sync_bookings: true,
    sync_classes: true,
    sync_staff_schedules: false,
    sync_direction: 'both'
  })
  const [processingAuth, setProcessingAuth] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    // Check for OAuth callback
    const params = new URLSearchParams(window.location.search)
    console.log('Calendar sync page loaded with params:', Object.fromEntries(params))
    
    if (params.get('success') === 'true') {
      console.log('OAuth success detected, processing...')
      setProcessingAuth(true)
      // Clear URL parameters
      window.history.replaceState({}, '', '/calendar-sync')
      // Give the database a moment to settle, then check connection
      setTimeout(() => {
        console.log('Checking connection after OAuth success...')
        checkConnection()
        setProcessingAuth(false)
      }, 1500)
    } else if (params.get('error')) {
      const error = params.get('error')
      const details = params.get('details')
      console.error('OAuth error:', error, details)
      alert(`Connection failed: ${error}${details ? ` - ${details}` : ''}`)
      // Clear URL parameters
      window.history.replaceState({}, '', '/calendar-sync')
      checkConnection()
    } else {
      // Normal page load
      console.log('Normal page load, checking connection...')
      checkConnection()
    }
  }, [])

  const checkConnection = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('Error getting user:', userError)
        setLoading(false)
        return
      }
      
      console.log('Checking tokens for user:', user.id)
      
      const { data, error } = await supabase
        .from('google_calendar_tokens')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      console.log('Token check result:', { data, error })
      
      // Don't treat "no rows" as an error for connection status
      if (error && error.code !== 'PGRST116') {
        console.error('Error checking connection:', error)
      }
      
      const connected = !!data
      console.log('Connection status:', connected)
      setIsConnected(connected)
      
      if (data) {
        console.log('Token found, loading settings and calendars...')
        await loadSyncSettings()
        // If connected, also load calendars
        await loadCalendars()
      }
    } catch (error) {
      console.error('Error in checkConnection:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCalendars = async () => {
    try {
      const response = await fetch('/api/calendar/list')
      const data = await response.json()
      if (data.calendars) {
        setCalendars(data.calendars)
      }
    } catch (error) {
      console.error('Error loading calendars:', error)
    }
  }

  const loadSyncSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return
      
      const { data, error } = await supabase
        .from('calendar_sync_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      // Don't treat "no rows" as an error
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading sync settings:', error)
      }
      
      if (data) {
        setSyncSettings({
          sync_bookings: data.sync_bookings,
          sync_classes: data.sync_classes,
          sync_staff_schedules: data.sync_staff_schedules,
          sync_direction: data.sync_direction
        })
        setSelectedCalendar(data.google_calendar_id)
      }
    } catch (error) {
      console.error('Error in loadSyncSettings:', error)
    }
  }

  const connectCalendar = () => {
    window.location.href = '/api/auth/google'
  }

  const disconnectCalendar = async () => {
    if (!confirm('Are you sure you want to disconnect your Google Calendar?')) return
    
    const { data: { user } } = await supabase.auth.getUser()
    
    if (user) {
      await supabase
        .from('google_calendar_tokens')
        .delete()
        .eq('user_id', user.id)
      
      await supabase.from('calendar_sync_settings').delete()
      await supabase.from('calendar_sync_events').delete()
      
      setIsConnected(false)
      setCalendars([])
    }
  }

  const saveSyncSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      alert('Please sign in to save settings')
      return
    }
    
    const { error } = await supabase
      .from('calendar_sync_settings')
      .upsert({
        user_id: user.id,
        google_calendar_id: selectedCalendar,
        google_calendar_name: calendars.find(c => c.id === selectedCalendar)?.summary,
        ...syncSettings
      })
    
    if (!error) {
      alert('Settings saved!')
    } else {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    }
  }

  const syncNow = async () => {
    setSyncing(true)
    try {
      const response = await fetch('/api/calendar/sync', { method: 'POST' })
      const data = await response.json()
      
      if (data.success) {
        alert(`Sync complete! ${data.synced} events synced.`)
      } else {
        alert('Sync failed. Please try again.')
      }
    } catch (error) {
      console.error('Sync error:', error)
      alert('Sync failed. Please try again.')
    } finally {
      setSyncing(false)
    }
  }

  if (loading || processingAuth) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
          {processingAuth && (
            <p className="text-gray-400">Completing Google Calendar connection...</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
          <Link href="/dashboard" className="hover:text-white transition-colors">
            Dashboard
          </Link>
          <span>/</span>
          <span>Calendar Integration</span>
        </div>
        
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Google Calendar Integration</h1>
          <Link 
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
        
        {!isConnected ? (
          <div className="bg-gray-800 rounded-lg p-8 text-center">
            <CalendarIcon className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-4">Connect Your Google Calendar</h2>
            <p className="text-gray-400 mb-6">
              Sync your bookings, classes, and schedules with Google Calendar for seamless management.
            </p>
            <button
              onClick={connectCalendar}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Connect Google Calendar
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Connection Status */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-6 h-6 text-green-500" />
                  <h2 className="text-xl font-semibold">Google Calendar Connected</h2>
                </div>
                <button
                  onClick={disconnectCalendar}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Disconnect
                </button>
              </div>
              
              {/* Calendar Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Select Calendar</label>
                <select
                  value={selectedCalendar}
                  onChange={(e) => setSelectedCalendar(e.target.value)}
                  className="w-full p-3 bg-gray-700 rounded-lg"
                >
                  <option value="">Select a calendar...</option>
                  {calendars.map((calendar) => (
                    <option key={calendar.id} value={calendar.id}>
                      {calendar.summary}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Sync Settings */}
              <div className="space-y-4">
                <h3 className="font-medium">Sync Settings</h3>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={syncSettings.sync_bookings}
                      onChange={(e) => setSyncSettings({...syncSettings, sync_bookings: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span>Sync member bookings</span>
                  </label>
                  
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={syncSettings.sync_classes}
                      onChange={(e) => setSyncSettings({...syncSettings, sync_classes: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span>Sync class schedules</span>
                  </label>
                  
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={syncSettings.sync_staff_schedules}
                      onChange={(e) => setSyncSettings({...syncSettings, sync_staff_schedules: e.target.checked})}
                      className="w-4 h-4"
                    />
                    <span>Sync staff schedules</span>
                  </label>
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">Sync Direction</label>
                  <select
                    value={syncSettings.sync_direction}
                    onChange={(e) => setSyncSettings({...syncSettings, sync_direction: e.target.value})}
                    className="w-full p-3 bg-gray-700 rounded-lg"
                  >
                    <option value="both">Two-way sync</option>
                    <option value="to_google">One-way to Google Calendar</option>
                    <option value="from_google">One-way from Google Calendar</option>
                  </select>
                </div>
              </div>
              
              {/* Action Buttons */}
              <div className="flex gap-4 mt-6">
                <button
                  onClick={saveSyncSettings}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Save Settings
                </button>
                <button
                  onClick={syncNow}
                  disabled={syncing || !selectedCalendar}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                  {syncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
            </div>
            
            {/* Sync Info */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="font-medium mb-3">How Calendar Sync Works</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>• Bookings appear as events with member name and class details</li>
                <li>• Class schedules show instructor and capacity information</li>
                <li>• Changes in Google Calendar can update your gym schedule (if enabled)</li>
                <li>• Events are color-coded by type for easy identification</li>
                <li>• Automatic sync runs every 15 minutes</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}