'use client'

import { useParams } from 'next/navigation'
import { BookingWidget } from '@/app/components/booking/BookingWidget'
import { useEffect, useState } from 'react'

export default function PublicBookingPage() {
  const params = useParams()
  const organizationId = params?.organizationId as string
  const [hasError, setHasError] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    // Validate organization ID format
    if (organizationId && !/^[a-zA-Z0-9-_]+$/.test(organizationId)) {
      setHasError(true)
      setErrorMessage('Invalid booking link format.')
    }
  }, [organizationId])

  if (!organizationId || hasError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="mb-4">
            <svg className="w-16 h-16 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Booking Link</h1>
          <p className="text-gray-600 mb-4">{errorMessage || 'The booking link URL is invalid or has expired.'}</p>
          <p className="text-sm text-gray-500">Please contact the business for a valid booking link.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <BookingWidget slug={organizationId} />
    </div>
  )
}