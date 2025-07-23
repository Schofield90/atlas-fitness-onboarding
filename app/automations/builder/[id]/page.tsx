'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import DashboardLayout from '@/app/components/DashboardLayout'
import WorkflowBuilder from '@/app/components/automation/WorkflowBuilder'
import type { Workflow } from '@/app/lib/types/automation'

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
        organizationId: userData?.id || 'mock-org-id',
        name: `Workflow ${id}`,
        description: 'Edit this workflow',
        status: 'active',
        version: 1,
        workflowData: {
          nodes: [],
          edges: [],
          variables: []
        },
        triggerType: 'manual',
        settings: {
          errorHandling: 'stop',
          maxExecutionTime: 300,
          timezone: 'UTC',
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
      console.error('Error loading workflow:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (updatedWorkflow: Workflow) => {
    // TODO: Implement save to database
    console.log('Saving workflow:', updatedWorkflow)
    // For now, just show success message
    alert('Workflow saved successfully!')
    router.push('/automations')
  }

  const handleTest = async (testWorkflow: Workflow) => {
    // TODO: Implement test execution
    console.log('Testing workflow:', testWorkflow)
    alert('Workflow test executed! Check the execution logs for results.')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Restricted</h1>
          <p className="text-gray-300 mb-8">Please sign up to access the workflow builder.</p>
          <button 
            onClick={() => router.push('/signup')}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Start Free Trial
          </button>
        </div>
      </div>
    )
  }

  if (!workflow) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Workflow Not Found</h1>
          <p className="text-gray-300 mb-8">The workflow you're looking for doesn't exist.</p>
          <button 
            onClick={() => router.push('/automations')}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            Back to Automations
          </button>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout userData={userData}>
      <div className="h-full">
        <WorkflowBuilder 
          workflow={workflow}
          onSave={handleSave}
          onTest={handleTest}
        />
      </div>
    </DashboardLayout>
  )
}