'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function WorkflowBuilderPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to the dark builder with 'new' ID for creating new workflows
    router.replace('/automations/builder/new')
  }, [router])

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-gray-500">Redirecting...</div>
    </div>
  )
}