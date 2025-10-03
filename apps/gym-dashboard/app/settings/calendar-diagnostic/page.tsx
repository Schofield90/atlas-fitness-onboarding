'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/app/components/ui/Button'
import { RefreshCw, AlertCircle, CheckCircle, XCircle, Calendar } from 'lucide-react'

export default function CalendarDiagnostic() {
  const [loading, setLoading] = useState(false)
  const [diagnostics, setDiagnostics] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const runDiagnostics = async () => {
    setLoading(true)
    setError(null)
    setDiagnostics(null)

    try {
      const response = await fetch('/api/calendar/integration-status', {
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run diagnostics')
      }

      setDiagnostics(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    runDiagnostics()
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
        <h1 className="text-3xl font-bold mb-2">Calendar Integration Diagnostics</h1>
        <p className="text-gray-600">
          Debug and diagnose Google Calendar integration issues
        </p>
      </div>

      <div className="mb-6">
        <Button
          onClick={runDiagnostics}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Running Diagnostics...' : 'Refresh Diagnostics'}
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

      {diagnostics && (
        <div className="space-y-6">
          {/* User Info */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">User Information</h2>
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-gray-600">Email:</dt>
                <dd className="font-mono">{diagnostics.user.email}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">User ID:</dt>
                <dd className="font-mono text-xs">{diagnostics.user.id}</dd>
              </div>
            </dl>
          </div>

          {/* Google Calendar Tokens */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              Google Calendar Tokens
              <StatusIcon status={diagnostics.google_calendar_tokens.exists} />
            </h2>
            
            {diagnostics.google_calendar_tokens.exists ? (
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Has Access Token:</dt>
                  <dd className="flex items-center gap-2">
                    <StatusIcon status={diagnostics.google_calendar_tokens.data.has_access_token} />
                    {diagnostics.google_calendar_tokens.data.has_access_token ? 'Yes' : 'No'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Has Refresh Token:</dt>
                  <dd className="flex items-center gap-2">
                    <StatusIcon status={diagnostics.google_calendar_tokens.data.has_refresh_token} />
                    {diagnostics.google_calendar_tokens.data.has_refresh_token ? 'Yes' : 'No'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Token Expired:</dt>
                  <dd className="flex items-center gap-2">
                    {diagnostics.google_calendar_tokens.data.is_expired !== null && (
                      <>
                        <StatusIcon status={!diagnostics.google_calendar_tokens.data.is_expired} />
                        {diagnostics.google_calendar_tokens.data.is_expired ? 'Yes (Needs Refresh)' : 'No'}
                      </>
                    )}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Sync Enabled:</dt>
                  <dd className="flex items-center gap-2">
                    <StatusIcon status={diagnostics.google_calendar_tokens.data.sync_enabled} />
                    {diagnostics.google_calendar_tokens.data.sync_enabled ? 'Yes' : 'No'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Calendar ID:</dt>
                  <dd className="font-mono text-xs">
                    {diagnostics.google_calendar_tokens.data.calendar_id || 'Not Set'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Auto Create Events:</dt>
                  <dd>{diagnostics.google_calendar_tokens.data.auto_create_events ? 'Yes' : 'No'}</dd>
                </div>
              </dl>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  No Google Calendar tokens found. You need to connect Google Calendar.
                </p>
              </div>
            )}

            {diagnostics.google_calendar_tokens.error && (
              <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">
                  Error: {diagnostics.google_calendar_tokens.error}
                </p>
              </div>
            )}
          </div>

          {/* Busy Times Test */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              Busy Times API Test
              <StatusIcon status={diagnostics.busy_times_test.success} />
            </h2>
            
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-600">API Working:</dt>
                <dd className="flex items-center gap-2">
                  <StatusIcon status={diagnostics.busy_times_test.success} />
                  {diagnostics.busy_times_test.success ? 'Yes' : 'No'}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-600">Busy Times Found:</dt>
                <dd>{diagnostics.busy_times_test.busy_times_count}</dd>
              </div>
              {diagnostics.busy_times_test.error && (
                <div className="mt-2 bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-700">
                    Error: {diagnostics.busy_times_test.error}
                  </p>
                </div>
              )}
            </dl>
          </div>

          {/* Calendar Events */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Calendar Events</h2>
            <p className="text-sm text-gray-600 mb-2">
              Total synced events: {diagnostics.calendar_events.count}
            </p>
            {diagnostics.calendar_events.recent && diagnostics.calendar_events.recent.length > 0 && (
              <div className="border border-gray-200 rounded-lg p-3 mt-3">
                <p className="text-xs text-gray-500 mb-2">Recent Events:</p>
                {diagnostics.calendar_events.recent.map((event: any, idx: number) => (
                  <div key={idx} className="text-xs py-1 border-b last:border-0">
                    {event.title || 'Untitled'} - {new Date(event.start_time).toLocaleString()}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Solution */}
          {!diagnostics.google_calendar_tokens.exists && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Solution: Connect Google Calendar
              </h3>
              <p className="text-sm mb-4">
                You need to connect your Google Calendar to enable conflict checking for bookings.
              </p>
              <a
                href="/settings/calendar"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Go to Calendar Settings
              </a>
            </div>
          )}

          {diagnostics.google_calendar_tokens.exists && 
           diagnostics.google_calendar_tokens.data.is_expired && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                Solution: Refresh Token
              </h3>
              <p className="text-sm mb-4">
                Your Google Calendar token has expired. Reconnect to refresh it.
              </p>
              <a
                href="/settings/calendar"
                className="inline-flex items-center px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
              >
                Reconnect Google Calendar
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )
}