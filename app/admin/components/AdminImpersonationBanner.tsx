'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline'

export default function AdminImpersonationBanner() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkImpersonation()
  }, [])

  const checkImpersonation = async () => {
    try {
      const res = await fetch('/api/admin/impersonation/status')
      if (res.ok) {
        const data = await res.json()
        setSession(data.session)
      }
    } catch (error) {
      console.error('Failed to check impersonation status:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStop = async () => {
    try {
      const res = await fetch('/api/admin/impersonation/stop', {
        method: 'POST'
      })
      if (res.ok) {
        setSession(null)
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to stop impersonation:', error)
    }
  }

  if (loading || !session) return null

  const timeRemaining = Math.max(0, Math.floor((session.exp * 1000 - Date.now()) / 60000))

  return (
    <div className="bg-yellow-50 border-b border-yellow-200">
      <div className="px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between flex-wrap">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2" />
            <p className="text-sm font-medium text-yellow-800">
              Impersonating: <strong>{session.orgName}</strong>
              <span className="mx-2">•</span>
              Scope: <strong>{session.scope}</strong>
              <span className="mx-2">•</span>
              Expires in: <strong>{timeRemaining} minutes</strong>
              <span className="mx-2">•</span>
              Reason: {session.reason}
            </p>
          </div>
          <button
            onClick={handleStop}
            className="flex items-center text-sm font-medium text-yellow-800 hover:text-yellow-900"
          >
            <XMarkIcon className="h-4 w-4 mr-1" />
            Stop Impersonation
          </button>
        </div>
      </div>
    </div>
  )
}