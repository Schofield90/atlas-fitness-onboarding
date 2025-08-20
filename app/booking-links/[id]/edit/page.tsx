'use client'

import BookingLinkEditor from '@/app/components/booking/BookingLinkEditor'
import { useRouter, useParams } from 'next/navigation'

export default function EditBookingLinkPage() {
  const router = useRouter()
  const params = useParams()
  const bookingLinkId = params?.id as string

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <BookingLinkEditor
        bookingLinkId={bookingLinkId}
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