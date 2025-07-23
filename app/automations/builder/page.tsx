'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/app/components/DashboardLayout'
import WorkflowBuilder from '@/app/components/automation/WorkflowBuilder'
import type { Workflow } from '@/app/lib/types/automation'

export default function WorkflowBuilderPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const storedData = localStorage.getItem('gymleadhub_trial_data')
    if (storedData) {
      setUserData(JSON.parse(storedData))
    }
    setLoading(false)
  }, [])

  const handleSave = async (workflow: Workflow) => {
    // TODO: Implement save to database
    console.log('Saving workflow:', workflow)
    // For now, just show success message
    alert('Workflow saved successfully!')
  }

  const handleTest = async (workflow: Workflow) => {
    // TODO: Implement test execution
    console.log('Testing workflow:', workflow)
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

  return (
    <DashboardLayout userData={userData}>
      <div className="h-full">
        <WorkflowBuilder 
          workflow={null}
          onSave={handleSave}
          onTest={handleTest}
        />
      </div>
    </DashboardLayout>
  )
}