'use client'

import BookingLinkEditor from '@/app/components/booking/BookingLinkEditor'
import { useRouter } from 'next/navigation'

export default function CreateBookingLinkPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <BookingLinkEditor
        onSave={(bookingLink) => {
          router.push('/booking-links')
        }}
        onCancel={() => {
          router.push('/booking-links')
        }}
      />
    </div>
  )
}