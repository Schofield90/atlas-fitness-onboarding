'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import DashboardLayout from '@/app/components/DashboardLayout'
import type { Workflow } from '@/app/lib/types/automation'

// Temporarily disable ReactFlow to debug build issue
const WorkflowBuilder = (props: any) => {
  return (
    <div className="flex items-center justify-center h-full text-white">
      <div className="text-center">
        <p className="text-xl mb-4">Workflow Builder Temporarily Disabled</p>
        <p className="text-gray-400">We're fixing a build issue. Check back soon!</p>
      </div>
    </div>
  )
}

export default function EditWorkflowPage() {
  const router = useRouter()
  const params = useParams()
  const [userData, setUserData] = useState<any>(null)
  const [workflow, setWorkflow] = useState<Workflow | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedData = localStorage.getItem('gymleadhub_trial_data')
    if (storedData) {
      setUserData(JSON.parse(storedData))
    }
    
    // Load workflow data
    const workflowId = params.id as string
    loadWorkflow(workflowId)
  }, [params.id])

  const loadWorkflow = async (id: string) => {
    try {
      // TODO: Replace with actual API call
      // For now, use mock data
      const mockWorkflow: Workflow = {
        id,
        organizationId: 'mock-org-id',
        name: 'Welcome Series',
        description: 'Automated welcome sequence for new leads',
        status: 'active',
        version: 1,
        workflowData: {
          nodes: [],
          edges: [],
          variables: []
        },
        triggerType: 'lead_created',
        triggerConfig: {},
        settings: {
          errorHandling: 'continue',
          maxExecutionTime: 300,
          timezone: 'Europe/London',
          notifications: {
            onError: true,
            onComplete: false
          }
        },
        stats: {
          totalExecutions: 0,
          successfulExecutions: 0,
          failedExecutions: 0,
          avgExecutionTime: 0
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
      
      setWorkflow(mockWorkflow)
    } catch (error) {
      console.error('Failed to load workflow:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (updatedWorkflow: Workflow) => {
    try {
      // TODO: Replace with actual API call
      console.log('Saving workflow:', updatedWorkflow)
      
      // For now, just redirect back
      router.push('/automations')
    } catch (error) {
      console.error('Failed to save workflow:', error)
    }
  }

  if (loading) {
    return (
      <DashboardLayout userData={userData}>
        <div className="flex items-center justify-center h-full">
          <p className="text-white">Loading workflow...</p>
        </div>
      </DashboardLayout>
    )
  }

  if (!workflow) {
    return (
      <DashboardLayout userData={userData}>
        <div className="flex items-center justify-center h-full">
          <p className="text-white">Workflow not found</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userData={userData}>
      <div className="h-full flex flex-col">
        <div className="bg-gray-800 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Edit Workflow</h1>
              <p className="text-gray-400">{workflow.name}</p>
            </div>
            <button
              onClick={() => router.push('/automations')}
              className="text-gray-400 hover:text-white"
            >
              ← Back to Automations
            </button>
          </div>
        </div>
        
        <div className="flex-1">
          <WorkflowBuilder
            workflow={workflow}
            onSave={handleSave}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}