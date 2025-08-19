'use client'

import { useParams } from 'next/navigation'
import { BookingWidget } from '@/app/components/booking/BookingWidget'

export default function PublicBookingPage() {
  const params = useParams()
  const slug = params?.slug as string

  if (!slug) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Booking Link</h1>
          <p className="text-gray-600">The booking link URL is invalid.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <BookingWidget slug={slug} />
    </div>
  )
}