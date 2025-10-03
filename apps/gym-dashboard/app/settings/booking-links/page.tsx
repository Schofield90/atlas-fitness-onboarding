'use client'

import { useState } from 'react'
import { Button } from '@/app/components/ui/Button'
import { Check, AlertCircle, Calendar, Link } from 'lucide-react'

export default function BookingLinksSettings() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const updateBookingLink = async () => {
    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await fetch('/api/booking-links/update-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update booking link')
      }

      setResult(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Booking Links Settings</h1>
        <p className="text-gray-600">
          Manage your booking links and Google Calendar integration
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Google Calendar Integration
          </h2>
          <p className="text-gray-600 mb-4">
            Connect your booking link to your Google Calendar to automatically check for conflicts
            and prevent double-bookings.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 font-medium mb-1">
                Update Required
              </p>
              <p className="text-sm text-blue-700">
                Your test booking link needs to be associated with your user account to enable
                Google Calendar integration. Click the button below to update it.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={updateBookingLink}
          disabled={loading}
          className="mb-6"
        >
          {loading ? 'Updating...' : 'Update Test Booking Link'}
        </Button>

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

        {result && (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Check className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm text-green-900 font-medium mb-1">
                    Success!
                  </p>
                  <p className="text-sm text-green-700">
                    Booking link has been updated with your user account.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium mb-2">User Information</h3>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Email:</dt>
                    <dd className="font-mono">{result.user.email}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">User ID:</dt>
                    <dd className="font-mono text-xs">{result.user.id}</dd>
                  </div>
                </dl>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium mb-2">Google Calendar Status</h3>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Connected:</dt>
                    <dd>
                      {result.google_calendar.connected ? (
                        <span className="text-green-600 font-medium">✓ Yes</span>
                      ) : (
                        <span className="text-red-600 font-medium">✗ No</span>
                      )}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Sync Enabled:</dt>
                    <dd>{result.google_calendar.sync_enabled ? 'Yes' : 'No'}</dd>
                  </div>
                  {result.google_calendar.calendar_id && (
                    <div className="flex justify-between">
                      <dt className="text-gray-600">Calendar ID:</dt>
                      <dd className="font-mono text-xs">{result.google_calendar.calendar_id}</dd>
                    </div>
                  )}
                </dl>
              </div>

              <div className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium mb-2">Booking Link</h3>
                <div className="flex items-center gap-2 mb-3">
                  <Link className="h-4 w-4 text-gray-500" />
                  <a
                    href={result.booking_link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline text-sm"
                  >
                    {result.booking_link.url}
                  </a>
                </div>
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Slug:</dt>
                    <dd className="font-mono">{result.booking_link.slug}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-600">Organization ID:</dt>
                    <dd className="font-mono text-xs">{result.booking_link.organization_id}</dd>
                  </div>
                </dl>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium mb-2">Next Steps</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                <li>Add some events to your Google Calendar</li>
                <li>
                  Visit your{' '}
                  <a
                    href={result.booking_link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 underline"
                  >
                    booking page
                  </a>
                </li>
                <li>Verify that time slots conflicting with your calendar are hidden</li>
                <li>Test booking an available slot</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}