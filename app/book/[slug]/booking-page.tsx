'use client'

import { useState } from 'react'
import { Calendar } from '@/app/components/calendar/Calendar'
import { BookingModal } from '@/app/components/calendar/BookingModal'
import { Clock, Calendar as CalendarIcon } from 'lucide-react'
import type { TimeSlot } from '@/app/lib/types/calendar'

interface BookingLinkData {
  id: string
  user_id: string
  organization_id: string
  slug: string
  title: string
  description: string | null
  duration: number
  is_active: boolean
}

interface Props {
  bookingLink: BookingLinkData
  settings: any
}

export default function BookingPage({ bookingLink, settings }: Props) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [showModal, setShowModal] = useState(false)

  const handleSlotSelect = (slot: TimeSlot) => {
    setSelectedSlot(slot)
    setShowModal(true)
  }

  const handleBookingComplete = () => {
    setShowModal(false)
    setSelectedSlot(null)
    // Show success message or redirect
    alert('Booking confirmed! Check your email for details.')
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container max-w-4xl py-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">{bookingLink.title}</h1>
          {bookingLink.description && (
            <p className="text-gray-400">{bookingLink.description}</p>
          )}
          <div className="flex items-center justify-center gap-4 mt-4 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              <span>{bookingLink.duration} minutes</span>
            </div>
            <div className="flex items-center gap-1">
              <CalendarIcon className="h-4 w-4" />
              <span>{settings?.timezone || 'America/New_York'}</span>
            </div>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">Select a Date & Time</h2>
          <p className="text-gray-400 text-sm mb-6">
            Choose an available time slot that works for you
          </p>
          
          <Calendar
            selectedDate={selectedDate}
            onDateSelect={setSelectedDate}
            onSlotSelect={handleSlotSelect}
            publicUserId={bookingLink.user_id}
            slotDuration={bookingLink.duration}
          />
        </div>

        {/* Booking Modal */}
        {selectedSlot && (
          <BookingModal
            open={showModal}
            onOpenChange={setShowModal}
            slot={selectedSlot}
            duration={bookingLink.duration}
            title={bookingLink.title}
            onBookingComplete={handleBookingComplete}
            isPublicBooking={true}
            hostUserId={bookingLink.user_id}
            organizationId={bookingLink.organization_id}
          />
        )}
      </div>
    </div>
  )
}