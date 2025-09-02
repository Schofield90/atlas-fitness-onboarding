'use client'

import { useState, useEffect } from 'react'
import { Shield, X, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ImpersonationSession {
  sessionId: string
  adminEmail: string
  organizationId: string
  organizationName: string
  reason: string
  expiresAt: string
}

export default function ImpersonationBanner() {
  const [session, setSession] = useState<ImpersonationSession | null>(null)
  const [timeLeft, setTimeLeft] = useState<string>('')
  const router = useRouter()

  useEffect(() => {
    checkImpersonation()
    const interval = setInterval(checkImpersonation, 5000) // Check every 5 seconds
    return () => clearInterval(interval)
  }, [])

  const checkImpersonation = () => {
    // Check for impersonation cookie
    const cookies = document.cookie.split(';')
    const impersonationCookie = cookies.find(c => c.trim().startsWith('impersonation='))
    
    if (impersonationCookie) {
      try {
        const value = decodeURIComponent(impersonationCookie.split('=')[1])
        const sessionData = JSON.parse(value)
        setSession(sessionData)
        
        // Calculate time left
        const expiresAt = new Date(sessionData.expiresAt)
        const now = new Date()
        const msLeft = expiresAt.getTime() - now.getTime()
        
        if (msLeft > 0) {
          const minutesLeft = Math.floor(msLeft / 60000)
          const secondsLeft = Math.floor((msLeft % 60000) / 1000)
          setTimeLeft(`${minutesLeft}:${secondsLeft.toString().padStart(2, '0')}`)
        } else {
          // Session expired
          endImpersonation()
        }
      } catch (error) {
        console.error('Error parsing impersonation session:', error)
      }
    } else {
      setSession(null)
    }
  }

  const endImpersonation = async () => {
    if (!session) return

    try {
      const response = await fetch(`/api/admin/tenants/${session.organizationId}/impersonate`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Clear cookie
        document.cookie = 'impersonation=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
        setSession(null)
        
        // Redirect back to admin
        router.push('/saas-admin/tenants')
      }
    } catch (error) {
      console.error('Error ending impersonation:', error)
    }
  }

  if (!session) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-purple-600 text-white px-4 py-2">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5" />
          <span className="font-medium">Impersonating: {session.organizationName}</span>
          <span className="text-purple-200 text-sm">({session.reason})</span>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4" />
            <span>{timeLeft} remaining</span>
          </div>
          
          <button
            onClick={endImpersonation}
            className="flex items-center gap-2 px-3 py-1 bg-purple-700 hover:bg-purple-800 rounded-md transition-colors"
          >
            <X className="h-4 w-4" />
            End Session
          </button>
        </div>
      </div>
    </div>
  )
}