'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Button } from '@/app/components/ui/Button'
import { 
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Link,
  Settings
} from 'lucide-react'
import toast from '@/app/lib/toast'

export default function CalendarIntegrationPage() {
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState<any>(null)
  const [googleEvents, setGoogleEvents] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    checkIntegrationStatus()
    fetchSampleEvents()
  }, [])

  const checkIntegrationStatus = async () => {
    setLoading(true)
    try {
      // Check if we can fetch Google Calendar events (the same way the calendar page does)
      const response = await fetch('/api/calendar/google-events')
      const isConnected = response.ok
      
      // Get user info
      const { data: { user } } = await supabase.auth.getUser()
      
      // Try to get any calendar-related settings
      const { data: calendarSettings } = await supabase
        .from('calendar_settings')
        .select('*')
        .single()
      
      // Check google_calendar_tokens table
      const { data: googleTokens } = await supabase
        .from('google_calendar_tokens')
        .select('*')
        .eq('user_id', user?.id)
        .single()

      setStatus({
        user,
        isConnected,
        hasGoogleTokens: !!googleTokens,
        tokenData: googleTokens,
        hasCalendarSettings: !!calendarSettings,
        calendarSettings
      })
    } catch (error) {
      console.error('Error checking status:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSampleEvents = async () => {
    try {
      const response = await fetch('/api/calendar/google-events')
      if (response.ok) {
        const data = await response.json()
        setGoogleEvents(data.events?.slice(0, 5) || [])
      }
    } catch (error) {
      console.error('Error fetching events:', error)
    }
  }

  const connectGoogleCalendar = () => {
    // Redirect to Google OAuth
    window.location.href = '/api/auth/google'
  }

  const disconnectGoogleCalendar = async () => {
    try {
      // Clear Google Calendar tokens
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('google_calendar_tokens')
          .delete()
          .eq('user_id', user.id)
        
        toast.success('Google Calendar disconnected')
        checkIntegrationStatus()
      }
    } catch (error) {
      toast.error('Failed to disconnect Google Calendar')
    }
  }

  const updateBookingLink = async () => {
    try {
      const response = await fetch('/api/booking-links/update-user', {
        method: 'POST',
        credentials: 'include',
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update booking link')
      }
      
      toast.success('Booking link updated successfully!')
      checkIntegrationStatus()
    } catch (error: any) {
      toast.error(error.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const isFullyIntegrated = status?.isConnected && status?.hasGoogleTokens

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Calendar Integration</h1>
        <p className="text-gray-600">
          Manage your Google Calendar connection and booking settings
        </p>
      </div>

      {/* Main Status Card */}
      <div className={`rounded-lg p-6 mb-6 ${
        isFullyIntegrated 
          ? 'bg-green-50 border-2 border-green-200' 
          : 'bg-yellow-50 border-2 border-yellow-200'
      }`}>
        <div className="flex items-start gap-4">
          {isFullyIntegrated ? (
            <CheckCircle className="h-8 w-8 text-green-600 mt-1" />
          ) : (
            <AlertCircle className="h-8 w-8 text-yellow-600 mt-1" />
          )}
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-2">
              {isFullyIntegrated 
                ? '✅ Google Calendar Connected' 
                : '⚠️ Google Calendar Not Connected'}
            </h2>
            <p className="text-gray-700 mb-4">
              {isFullyIntegrated 
                ? 'Your calendar is syncing and booking conflict detection is active.'
                : 'Connect your Google Calendar to enable automatic conflict detection for bookings.'}
            </p>
            
            {!isFullyIntegrated && (
              <Button
                onClick={connectGoogleCalendar}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Connect Google Calendar
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Connection Status */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Connection Status
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-600">API Connection</span>
              <div className="flex items-center gap-2">
                {status?.isConnected ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span>{status?.isConnected ? 'Connected' : 'Not Connected'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-600">Google Tokens</span>
              <div className="flex items-center gap-2">
                {status?.hasGoogleTokens ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <span>{status?.hasGoogleTokens ? 'Present' : 'Missing'}</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-gray-600">User</span>
              <span className="text-sm font-mono">{status?.user?.email}</span>
            </div>

            {status?.tokenData && (
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">Sync Enabled</span>
                <span>{status.tokenData.sync_enabled ? 'Yes' : 'No'}</span>
              </div>
            )}
          </div>

          {isFullyIntegrated && (
            <button
              onClick={disconnectGoogleCalendar}
              className="mt-4 text-sm text-red-600 hover:text-red-700"
            >
              Disconnect Google Calendar
            </button>
          )}
        </div>

        {/* Recent Events */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Calendar Events
          </h3>
          
          {googleEvents.length > 0 ? (
            <div className="space-y-2">
              {googleEvents.map((event, idx) => (
                <div key={idx} className="py-2 border-b last:border-0">
                  <div className="font-medium text-sm">{event.title || 'Untitled'}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(event.start).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              {isFullyIntegrated 
                ? 'No upcoming events' 
                : 'Connect Google Calendar to see events'}
            </p>
          )}
        </div>
      </div>

      {/* Booking Integration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Link className="h-5 w-5" />
          Booking Link Integration
        </h3>
        
        <p className="text-gray-600 mb-4">
          Update your booking link to use your Google Calendar for conflict detection.
        </p>
        
        <div className="flex items-center gap-4">
          <Button
            onClick={updateBookingLink}
            disabled={!isFullyIntegrated}
            className={!isFullyIntegrated ? 'opacity-50 cursor-not-allowed' : ''}
          >
            Update Booking Link
          </Button>
          
          <a
            href="/book/test"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
          >
            <ExternalLink className="h-4 w-4" />
            Test Booking Page
          </a>
        </div>
        
        {!isFullyIntegrated && (
          <p className="mt-2 text-sm text-yellow-600">
            Connect Google Calendar first to enable booking conflict detection
          </p>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <a
          href="/calendar"
          className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
        >
          <Calendar className="h-5 w-5 text-gray-600" />
          <div>
            <div className="font-medium">View Calendar</div>
            <div className="text-sm text-gray-500">See your schedule</div>
          </div>
        </a>
        
        <a
          href="/settings/booking-links"
          className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
        >
          <Link className="h-5 w-5 text-gray-600" />
          <div>
            <div className="font-medium">Booking Links</div>
            <div className="text-sm text-gray-500">Manage booking pages</div>
          </div>
        </a>
        
        <a
          href="/book/test"
          target="_blank"
          className="flex items-center gap-3 p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 transition-colors"
        >
          <ExternalLink className="h-5 w-5 text-gray-600" />
          <div>
            <div className="font-medium">Test Booking</div>
            <div className="text-sm text-gray-500">Preview booking flow</div>
          </div>
        </a>
      </div>
    </div>
  )
}