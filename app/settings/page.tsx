'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function SettingsPage() {
  const router = useRouter()
  
  useEffect(() => {
    // Redirect to business profile as the default settings page
    router.push('/settings/business')
  }, [router])
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <p className="text-gray-400">Redirecting to settings...</p>
      </div>
    </div>
  )
}