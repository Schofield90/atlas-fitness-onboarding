'use client'

import { useState, useEffect } from 'react'
import { Calendar, Phone, AlertCircle, Loader2 } from 'lucide-react'

interface CallBookingTriggerConfigProps {
  config: any
  onChange: (config: any) => void
  organizationId: string
}

interface BookingLink {
  id: string
  name: string
  slug: string
  is_active: boolean
}

export default function CallBookingTriggerConfig({
  config,
  onChange,
  organizationId
}: CallBookingTriggerConfigProps) {
  const [localConfig, setLocalConfig] = useState(config || {
    booking_link_id: '',
    booking_link_name: ''
  })
  const [bookingLinks, setBookingLinks] = useState<BookingLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    setLocalConfig(config || { booking_link_id: '', booking_link_name: '' })
  }, [config])

  // Fetch booking links
  useEffect(() => {
    async function fetchBookingLinks() {
      try {
        setLoading(true)
        const response = await fetch(`/api/booking-links?organizationId=${organizationId}`)
        if (!response.ok) throw new Error('Failed to fetch booking links')

        const data = await response.json()
        setBookingLinks(data.bookingLinks || [])
        setError('')
      } catch (err) {
        console.error('Error fetching booking links:', err)
        setError('Failed to load booking links')
      } finally {
        setLoading(false)
      }
    }

    if (organizationId) {
      fetchBookingLinks()
    }
  }, [organizationId])

  const handleBookingLinkChange = (bookingLinkId: string) => {
    const selectedLink = bookingLinks.find(link => link.id === bookingLinkId)
    const updated = {
      ...localConfig,
      booking_link_id: bookingLinkId,
      booking_link_name: selectedLink?.name || ''
    }
    setLocalConfig(updated)
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <Phone className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div>
          <h3 className="font-medium text-blue-400 mb-1">Call Booking Trigger</h3>
          <p className="text-sm text-gray-400">
            This automation will trigger when someone books a call through your booking widget.
            Select which booking link should trigger this workflow.
          </p>
        </div>
      </div>

      {/* Booking Link Selector */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Booking Link <span className="text-red-400">*</span>
        </label>

        {loading ? (
          <div className="flex items-center gap-2 p-3 bg-gray-800 border border-gray-700 rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            <span className="text-sm text-gray-400">Loading booking links...</span>
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <span className="text-sm text-red-400">{error}</span>
          </div>
        ) : bookingLinks.length === 0 ? (
          <div className="flex items-center gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-yellow-400" />
            <div className="text-sm text-yellow-400">
              <p className="font-medium">No booking links found</p>
              <p className="text-xs mt-1">
                Create a booking link first in Calendar & Booking Links
              </p>
            </div>
          </div>
        ) : (
          <select
            value={localConfig.booking_link_id || ''}
            onChange={(e) => handleBookingLinkChange(e.target.value)}
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a booking link...</option>
            {bookingLinks.map((link) => (
              <option key={link.id} value={link.id}>
                {link.name} ({link.slug}) {!link.is_active && '(Inactive)'}
              </option>
            ))}
          </select>
        )}

        <p className="text-xs text-gray-500 mt-1">
          The workflow will only trigger for bookings made through the selected link
        </p>
      </div>

      {/* Selected Booking Link Info */}
      {localConfig.booking_link_id && (
        <div className="p-3 bg-gray-800 border border-gray-700 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Calendar className="h-4 w-4 text-blue-400" />
            <span className="font-medium">Selected:</span>
            <span>{localConfig.booking_link_name}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            This workflow will trigger whenever someone books a call through "{localConfig.booking_link_name}"
          </p>
        </div>
      )}

      {/* Validation Warning */}
      {!localConfig.booking_link_id && (
        <div className="flex items-start gap-2 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
          <AlertCircle className="h-4 w-4 text-orange-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-orange-400">
            <p className="font-medium">Configuration Required</p>
            <p className="text-xs mt-1">
              Please select a booking link to complete the trigger configuration
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
