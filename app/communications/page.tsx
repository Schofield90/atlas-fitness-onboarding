'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function CommunicationsPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to automations which handles communications
    router.push('/automations')
  }, [router])
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-400">Redirecting to communications system...</p>
      </div>
    </div>
  )
}