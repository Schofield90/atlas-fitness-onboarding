'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import type { Workflow } from '@/app/lib/types/automation'

interface DynamicWorkflowBuilderProps {
  simple?: boolean
  workflow?: Workflow
  onSave?: (workflow: Workflow) => void | Promise<void>
  onCancel?: () => void
}

// Loading component
const WorkflowBuilderLoading = () => (
  <div className="flex items-center justify-center h-full text-white">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
      <p className="text-xl">Loading Workflow Builder...</p>
    </div>
  </div>
)

// Dynamic import with no SSR
const WorkflowBuilder = dynamic(
  () => import('./WorkflowBuilder'),
  { 
    ssr: false,
    loading: () => <WorkflowBuilderLoading />
  }
)

const SimpleWorkflowBuilder = dynamic(
  () => import('./SimpleWorkflowBuilder'),
  { 
    ssr: false,
    loading: () => <WorkflowBuilderLoading />
  }
)

export { WorkflowBuilder, SimpleWorkflowBuilder }

// Wrapper component that ensures client-side only rendering
export default function DynamicWorkflowBuilder({ 
  simple = false, 
  workflow,
  onSave,
  onCancel
}: DynamicWorkflowBuilderProps) {
  return (
    <Suspense fallback={<WorkflowBuilderLoading />}>
      {simple ? (
        <SimpleWorkflowBuilder />
      ) : (
        <WorkflowBuilder 
          workflow={workflow}
          onSave={onSave}
          onCancel={onCancel}
        />
      )}
    </Suspense>
  )
}