'use client'

import { EnhancedWorkflowBuilderWrapper } from '@/app/components/automation/EnhancedWorkflowBuilder'
import { getCurrentUserOrganization } from '@/app/lib/organization-client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function WorkflowBuilderPage() {
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function loadOrganization() {
      try {
        const { organizationId, error } = await getCurrentUserOrganization()
        if (organizationId) {
          setOrganizationId(organizationId)
        } else {
          // Use the default Atlas Fitness organization ID as fallback
          console.log('Using default organization ID')
          setOrganizationId('63589490-8f55-4157-bd3a-e141594b748e')
        }
      } catch (err) {
        console.error('Error loading organization:', err)
        // Use the default Atlas Fitness organization ID as fallback
        setOrganizationId('63589490-8f55-4157-bd3a-e141594b748e')
      }
    }
    loadOrganization()
  }, [router])

  if (!organizationId) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  const handleSave = async (workflow: any) => {
    try {
      const response = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workflow)
      })

      if (response.ok) {
        router.push('/automations')
      }
    } catch (error) {
      console.error('Error saving workflow:', error)
    }
  }

  return (
    <div className="h-screen bg-gray-900">
      <EnhancedWorkflowBuilderWrapper 
        organizationId={organizationId}
        onSave={handleSave}
      />
    </div>
  )
}