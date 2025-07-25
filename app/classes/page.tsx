'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function ClassesPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to the booking page which has the class booking system
    router.push('/booking')
  }, [router])
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-400">Redirecting to booking system...</p>
      </div>
    </div>
  )
}