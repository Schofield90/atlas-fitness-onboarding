'use client'

import BookingLinkEditor from '@/app/components/booking/BookingLinkEditor'
import { useRouter } from 'next/navigation'
import { useToast } from '@/app/lib/hooks/useToast'

export default function CreateBookingLinkPage() {
  const router = useRouter()
  const toast = useToast()

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <BookingLinkEditor
        onSave={(bookingLink) => {
          toast.success('Booking link created successfully!')
          router.push('/booking-links')
        }}
        onCancel={() => {
          router.push('/booking-links')
        }}
      />
    </div>
  )
}