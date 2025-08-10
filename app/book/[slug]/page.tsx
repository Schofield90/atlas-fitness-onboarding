'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Calendar, Clock, MapPin, User } from 'lucide-react'
import Button from '@/app/components/ui/Button'
import { createClient } from '@/app/lib/supabase/client'

interface BookingLink {
  id: string
  name: string
  description?: string
  organization: {
    name: string
    slug: string
  }
  user?: {
    full_name: string
  }
}

interface AvailableSlot {
  start: string
  end: string
  staff_id: string
  staff_name: string
}

export default function PublicBookingPage() {
  const params = useParams()
  const slug = params?.slug as string
  
  const [loading, setLoading] = useState(true)
  const [bookingLink, setBookingLink] = useState<BookingLink | null>(null)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [bookingData, setBookingData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  })

  useEffect(() => {
    if (slug) {
      fetchBookingLink()
    }
  }, [slug])

  useEffect(() => {
    if (bookingLink) {
      fetchAvailability()
    }
  }, [bookingLink, selectedDate])

  const fetchBookingLink = async () => {
    try {
      const response = await fetch(`/api/booking/links/${slug}`)
      if (!response.ok) {
        throw new Error('Booking link not found')
      }
      const data = await response.json()
      setBookingLink(data.booking_link)
    } catch (error) {
      console.error('Error fetching booking link:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailability = async () => {
    try {
      const params = new URLSearchParams({
        link: slug,
        date: selectedDate.toISOString().split('T')[0]
      })
      
      const response = await fetch(`/api/booking/availability?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAvailableSlots(data.slots || [])
      }
    } catch (error) {
      console.error('Error fetching availability:', error)
    }
  }

  const handleBooking = async () => {
    if (!selectedSlot || !bookingLink) return

    try {
      const response = await fetch('/api/booking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          link_slug: slug,
          staff_id: selectedSlot.staff_id,
          start_time: selectedSlot.start,
          end_time: selectedSlot.end,
          attendee_name: bookingData.name,
          attendee_email: bookingData.email,
          attendee_phone: bookingData.phone,
          description: bookingData.notes
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create booking')
      }

      const data = await response.json()
      alert('Booking confirmed! You will receive a confirmation email shortly.')
      
      // Reset form
      setSelectedSlot(null)
      setShowBookingForm(false)
      setBookingData({ name: '', email: '', phone: '', notes: '' })
      fetchAvailability() // Refresh availability
    } catch (error) {
      console.error('Error creating booking:', error)
      alert('Failed to create booking. Please try again.')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!bookingLink) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Booking Link Not Found</h1>
          <p className="text-gray-600">This booking link may have been removed or is no longer available.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{bookingLink.name}</h1>
          {bookingLink.description && (
            <p className="text-gray-600 mb-4">{bookingLink.description}</p>
          )}
          <div className="flex items-center gap-6 text-sm text-gray-500">
            {bookingLink.user && (
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>{bookingLink.user.full_name}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              <span>{bookingLink.organization.name}</span>
            </div>
          </div>
        </div>

        {/* Date Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Select a Date</h2>
          <input
            type="date"
            value={selectedDate.toISOString().split('T')[0]}
            onChange={(e) => setSelectedDate(new Date(e.target.value))}
            min={new Date().toISOString().split('T')[0]}
            className="w-full px-4 py-2 border border-gray-300 rounded-md"
          />
        </div>

        {/* Available Slots */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Available Times</h2>
          {availableSlots.length === 0 ? (
            <p className="text-gray-500">No available times for this date.</p>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {availableSlots.map((slot, index) => {
                const startTime = new Date(slot.start).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })
                
                return (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedSlot(slot)
                      setShowBookingForm(true)
                    }}
                    className={`p-3 rounded-md border transition-colors ${
                      selectedSlot === slot
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{startTime}</span>
                    </div>
                    {slot.staff_name && (
                      <div className="text-xs text-gray-500 mt-1">
                        with {slot.staff_name}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Booking Form */}
        {showBookingForm && selectedSlot && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-semibold mb-4">Your Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={bookingData.name}
                  onChange={(e) => setBookingData({ ...bookingData, name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={bookingData.email}
                  onChange={(e) => setBookingData({ ...bookingData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={bookingData.phone}
                  onChange={(e) => setBookingData({ ...bookingData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={bookingData.notes}
                  onChange={(e) => setBookingData({ ...bookingData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={handleBooking}
                  disabled={!bookingData.name || !bookingData.email}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Confirm Booking
                </Button>
                <Button
                  onClick={() => {
                    setShowBookingForm(false)
                    setSelectedSlot(null)
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}