'use client'

import { useEffect, useState } from 'react'
import DashboardLayout from '@/app/components/DashboardLayout'
import { AIDashboard } from '@/app/components/ai/AIDashboard'
import { getCurrentUserOrganization } from '@/app/lib/organization-client'
import { Loader2 } from 'lucide-react'

export default function AIPage() {
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    initializeAI()
  }, [])
  
  const initializeAI = async () => {
    try {
      // Get organization
      const { organizationId: orgId, error: orgError } = await getCurrentUserOrganization()
      if (orgError || !orgId) {
        setError('Failed to get organization')
        return
      }
      
      setOrganizationId(orgId)
      
      // Initialize AI brain
      const response = await fetch('/api/ai/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: orgId,
          processHistorical: true // Process historical data on first load
        })
      })
      
      if (!response.ok) {
        throw new Error('Failed to initialize AI')
      }
      
      const data = await response.json()
      console.log('AI initialized:', data)
      
    } catch (error) {
      console.error('AI initialization error:', error)
      setError('Failed to initialize AI system')
    } finally {
      setIsInitializing(false)
    }
  }
  
  if (isInitializing) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[600px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-orange-600 mx-auto mb-4" />
            <p className="text-gray-600">Initializing AI Brain...</p>
            <p className="text-sm text-gray-500 mt-2">
              Processing your data for intelligent insights
            </p>
          </div>
        </div>
      </DashboardLayout>
    )
  }
  
  if (error) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[600px]">
          <div className="text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700"
            >
              Retry
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }
  
  if (!organizationId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[600px]">
          <p className="text-gray-600">No organization found</p>
        </div>
      </DashboardLayout>
    )
  }
  
  return (
    <DashboardLayout>
      <AIDashboard organizationId={organizationId} />
    </DashboardLayout>
  )
}