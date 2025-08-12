'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Calendar, Clock, MapPin, User, Check, AlertCircle } from 'lucide-react'
import { format, parseISO, addDays, startOfDay, endOfDay } from 'date-fns'

interface CalendarInfo {
  id: string
  name: string
  slug: string
  group_name?: string
  distribution: string
  auto_confirm: boolean
}

interface AvailableSlot {
  startTime: string
  endTime: string
  staffId?: string
  staffName?: string
}

interface DailySlots {
  date: string
  slots: AvailableSlot[]
}

export default function PublicBookingPage() {
  const params = useParams()
  const slug = params?.slug as string
  
  const [loading, setLoading] = useState(true)
  const [calendar, setCalendar] = useState<CalendarInfo | null>(null)
  const [selectedDate, setSelectedDate] = useState(startOfDay(new Date()))
  const [availability, setAvailability] = useState<DailySlots[]>([])
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)
  const [bookingData, setBookingData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: '',
    consent: false
  })

  useEffect(() => {
    if (slug) {
      fetchCalendarInfo()
    }
  }, [slug])

  useEffect(() => {
    if (calendar) {
      fetchAvailability()
    }
  }, [calendar, selectedDate])

  const fetchCalendarInfo = async () => {
    try {
      // Fetch calendar info by slug
      const response = await fetch(`/api/calendars/${slug}`)
      if (!response.ok) {
        throw new Error('Calendar not found')
      }
      const data = await response.json()
      setCalendar(data)
    } catch (error) {
      console.error('Error fetching calendar:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailability = async () => {
    try {
      const fromDate = selectedDate
      const toDate = addDays(selectedDate, 7) // Fetch a week at a time
      
      const params = new URLSearchParams({
        from: fromDate.toISOString(),
        to: toDate.toISOString(),
        tz: Intl.DateTimeFormat().resolvedOptions().timeZone
      })
      
      const response = await fetch(`/api/calendars/${slug}/availability?${params}`)
      if (response.ok) {
        const data = await response.json()
        setAvailability(data.availability || [])
      }
    } catch (error) {
      console.error('Error fetching availability:', error)
    }
  }

  const handleBooking = async () => {
    if (!selectedSlot || !calendar || !bookingData.consent) return

    setSubmitting(true)
    try {
      const response = await fetch(`/api/calendars/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot: selectedSlot.startTime,
          name: bookingData.name,
          email: bookingData.email,
          phone: bookingData.phone,
          notes: bookingData.notes,
          consent: bookingData.consent,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create booking')
      }

      const data = await response.json()
      setBookingSuccess(true)
      
      // Reset form after short delay
      setTimeout(() => {
        setSelectedSlot(null)
        setShowBookingForm(false)
        setBookingData({ name: '', email: '', phone: '', notes: '', consent: false })
        setBookingSuccess(false)
        fetchAvailability() // Refresh availability
      }, 3000)
    } catch (error) {
      console.error('Error creating booking:', error)
      alert(error instanceof Error ? error.message : 'Failed to create booking. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  if (!calendar) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Calendar Not Found</h1>
          <p className="text-gray-600">This booking calendar may have been removed or is no longer available.</p>
        </div>
      </div>
    )
  }

  // Get slots for selected date
  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd')
  const daySlots = availability.find(day => day.date === selectedDateStr)
  const availableSlots = daySlots?.slots || []

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Success Message */}
        {bookingSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-2">
            <Check className="w-5 h-5 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">
                {calendar.auto_confirm ? 'Booking Confirmed!' : 'Booking Request Received!'}
              </p>
              <p className="text-green-700 text-sm mt-1">
                {calendar.auto_confirm 
                  ? 'You will receive a confirmation email shortly with your booking details.'
                  : 'Your booking request has been received and is pending confirmation.'}
              </p>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{calendar.name}</h1>
          {calendar.group_name && (
            <p className="text-gray-600 mb-4">{calendar.group_name}</p>
          )}
          <div className="flex items-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>Select a time below</span>
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
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {availableSlots.map((slot, index) => {
                const startTime = format(parseISO(slot.startTime), 'h:mm a')
                
                return (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedSlot(slot)
                      setShowBookingForm(true)
                    }}
                    disabled={submitting}
                    className={`p-3 rounded-md border transition-colors ${
                      selectedSlot === slot
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-gray-300 hover:border-gray-400'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{startTime}</span>
                    </div>
                    {slot.staffName && (
                      <div className="text-xs text-gray-500 mt-1">
                        with {slot.staffName}
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
            <h2 className="text-lg font-semibold mb-4">Enter Your Details</h2>
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
              
              <div className="border-t pt-4">
                <label className="flex items-start gap-2 mb-4">
                  <input
                    type="checkbox"
                    checked={bookingData.consent}
                    onChange={(e) => setBookingData({ ...bookingData, consent: e.target.checked })}
                    className="mt-1"
                    required
                  />
                  <span className="text-sm text-gray-600">
                    I agree to receive communications about my booking and understand the cancellation policy.
                  </span>
                </label>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleBooking}
                  disabled={!bookingData.name || !bookingData.email || !bookingData.consent || submitting}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Booking...' : 'Confirm Booking'}
                </button>
                <button
                  onClick={() => {
                    setShowBookingForm(false)
                    setSelectedSlot(null)
                  }}
                  disabled={submitting}
                  className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}