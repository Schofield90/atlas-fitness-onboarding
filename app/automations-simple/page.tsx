'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getCurrentUserOrganization } from '@/lib/organization-client'

export default function SimpleAutomationsPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [error, setError] = useState<string>('')
  const supabase = createClient()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setIsAuthenticated(false)
        return
      }

      const { organizationId } = await getCurrentUserOrganization()
      if (!organizationId) {
        setError('No organization found')
        setIsAuthenticated(false)
        return
      }

      setIsAuthenticated(true)
    } catch (err) {
      console.error('Auth check failed:', err)
      setIsAuthenticated(false)
    }
  }

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Checking authentication...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Authentication Required</h1>
          {error && <p className="text-red-400 mb-4">{error}</p>}
          <p className="text-gray-300 mb-6">Please log in to access automations</p>
          <button
            onClick={() => router.push('/quick-login')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Workflow Automations</h1>
          <p className="text-gray-400">You are authenticated and can access automations</p>
        </div>
        
        <div className="grid gap-4">
          <button
            onClick={() => router.push('/automations/builder/new')}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-6 rounded-lg text-left"
          >
            <h2 className="text-xl mb-2">Create New Workflow</h2>
            <p className="text-orange-200">Build a custom automation workflow</p>
          </button>
          
          <button
            onClick={() => router.push('/dashboard')}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-4 px-6 rounded-lg text-left"
          >
            <h2 className="text-xl mb-2">Back to Dashboard</h2>
            <p className="text-gray-400">Return to main dashboard</p>
          </button>
        </div>
      </div>
    </div>
  )
}