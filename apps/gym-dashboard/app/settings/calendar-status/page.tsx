'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/Button'
import { RefreshCw, AlertCircle, CheckCircle, XCircle, Calendar, ExternalLink } from 'lucide-react'

export default function CalendarStatus() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const checkStatus = async () => {
    setLoading(true)
    setError(null)
    setStatus(null)

    try {
      const response = await fetch('/api/calendar/integration-status', {
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check status')
      }

      setStatus(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkStatus()
  }, [])

  const StatusIcon = ({ status }: { status: boolean }) => {
    return status ? (
      <CheckCircle className="h-5 w-5 text-green-600" />
    ) : (
      <XCircle className="h-5 w-5 text-red-600" />
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Calendar Integration Status</h1>
        <p className="text-gray-600">
          Check your Google Calendar integration for booking conflict detection
        </p>
      </div>

      <div className="mb-6">
        <Button
          onClick={checkStatus}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Checking Status...' : 'Refresh Status'}
        </Button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm text-red-900 font-medium mb-1">Error</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {status && (
        <div className="space-y-6">
          {/* Overall Status */}
          <div className={`border rounded-lg p-6 ${
            status.booking_integration_ready 
              ? 'bg-green-50 border-green-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-start gap-3">
              {status.booking_integration_ready ? (
                <CheckCircle className="h-6 w-6 text-green-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-6 w-6 text-yellow-600 mt-0.5" />
              )}
              <div className="flex-1">
                <h2 className="text-lg font-semibold mb-1">
                  {status.booking_integration_ready 
                    ? '✅ Booking Integration Ready' 
                    : '⚠️ Setup Required'}
                </h2>
                <p className="text-sm">
                  {status.booking_integration_ready 
                    ? 'Google Calendar is connected and working. Your booking page will check for conflicts.'
                    : 'Google Calendar needs to be connected or refreshed for conflict detection to work.'}
                </p>
              </div>
            </div>
          </div>

          {/* User Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Account Information</h2>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-gray-600">Email:</dt>
                <dd className="font-medium">{status.user.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">User ID:</dt>
                <dd className="font-mono text-xs text-gray-500">{status.user.id}</dd>
              </div>
            </dl>
          </div>

          {/* Integration Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Google Calendar Integration</h2>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-600">Connection Status</span>
                <div className="flex items-center gap-2">
                  <StatusIcon status={status.integration.connected && !status.integration.expired} />
                  <span className="font-medium">
                    {!status.integration.connected 
                      ? 'Not Connected'
                      : status.integration.expired 
                      ? 'Token Expired' 
                      : 'Connected'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-600">Sync Enabled</span>
                <div className="flex items-center gap-2">
                  <StatusIcon status={status.integration.sync_enabled} />
                  <span>{status.integration.sync_enabled ? 'Yes' : 'No'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-600">Can Fetch Busy Times</span>
                <div className="flex items-center gap-2">
                  <StatusIcon status={status.integration.can_fetch_busy_times} />
                  <span>{status.integration.can_fetch_busy_times ? 'Yes' : 'No'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-600">Events Synced</span>
                <span className="font-medium">{status.integration.events_synced}</span>
              </div>

              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-gray-600">Busy Times Next Week</span>
                <span className="font-medium">{status.integration.busy_times_next_week}</span>
              </div>

              {status.integration.calendar_id && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-gray-600">Calendar ID</span>
                  <span className="font-mono text-xs">{status.integration.calendar_id}</span>
                </div>
              )}

              {status.integration.last_updated && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-600">Last Updated</span>
                  <span className="text-sm">
                    {new Date(status.integration.last_updated).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Required */}
          {status.integration.needs_reconnect && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Action Required: Connect Google Calendar
              </h3>
              <p className="text-sm mb-4">
                {!status.integration.connected 
                  ? 'You need to connect your Google Calendar to enable automatic conflict detection for bookings.'
                  : 'Your Google Calendar token has expired. Please reconnect to restore conflict detection.'}
              </p>
              
              <div className="flex gap-3">
                <a
                  href="/settings/calendar"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  <Calendar className="h-4 w-4" />
                  Go to Calendar Settings
                </a>
                <a
                  href="/calendar"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Calendar
                </a>
              </div>
            </div>
          )}

          {/* Success - Test Booking */}
          {status.booking_integration_ready && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-6">
              <h3 className="font-semibold mb-3">🎉 Ready to Test!</h3>
              <p className="text-sm mb-4">
                Your Google Calendar integration is working. Test it by:
              </p>
              <ol className="list-decimal list-inside space-y-2 text-sm mb-4">
                <li>Add an event to your Google Calendar (e.g., tomorrow at 10:00 AM)</li>
                <li>Visit your booking page</li>
                <li>Verify that the 10:00 AM slot is not available</li>
              </ol>
              <a
                href="/book/test"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <ExternalLink className="h-4 w-4" />
                Test Booking Page
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}