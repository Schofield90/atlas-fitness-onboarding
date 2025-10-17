'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'

interface LazyBookingCalendarProps {
  organizationId: string
  customerId: string
  onBookClass?: (booking: any) => void
}

// Loading skeleton that matches the calendar height
const CalendarSkeleton = () => (
  <div className="h-[600px] bg-gray-900 rounded-lg animate-pulse">
    <div className="h-12 bg-gray-800 rounded-t-lg mb-2"></div>
    <div className="grid grid-cols-7 gap-1 p-2">
      {[...Array(35)].map((_, i) => (
        <div key={i} className="h-20 bg-gray-800 rounded"></div>
      ))}
    </div>
  </div>
)

// Dynamic import with no SSR
const BookingCalendar = dynamic(
  () => import('./BookingCalendar'),
  { 
    ssr: false,
    loading: () => <CalendarSkeleton />
  }
)

export default function LazyBookingCalendar(props: LazyBookingCalendarProps) {
  return (
    <Suspense fallback={<CalendarSkeleton />}>
      <BookingCalendar {...props} />
    </Suspense>
  )
}