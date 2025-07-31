'use client'

import { useOrganization } from '@/app/hooks/useOrganization'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'

export function RequireOrganization({ children }: { children: React.ReactNode }) {
  const { organizationId, isLoading, error, user } = useOrganization()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      // If no user, redirect to login
      if (!user) {
        router.push('/login')
        return
      }
      
      // If user but no organization, redirect to onboarding
      if (!organizationId && !error) {
        router.push('/onboarding/create-organization')
      }
    }
  }, [isLoading, organizationId, error, user, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500 mx-auto" />
          <p className="text-gray-400 mt-4">Loading organization...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-500">Error</h2>
          <p className="text-gray-400 mt-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!user) {
    return null // Will redirect in useEffect
  }

  if (!organizationId) {
    return null // Will redirect in useEffect
  }

  return <>{children}</>
}