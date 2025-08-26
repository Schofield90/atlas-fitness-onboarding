'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import type { Workflow } from '@/app/lib/types/automation'

interface DynamicWorkflowBuilderProps {
  simple?: boolean  // Deprecated - always uses main WorkflowBuilder
  workflow?: Workflow
  onSave?: (workflow: Workflow) => void | Promise<void>
  onCancel?: () => void
  onTest?: (workflow: Workflow) => void | Promise<void>
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

// Dynamic import with no SSR - CONSOLIDATED to use only main WorkflowBuilder
const WorkflowBuilder = dynamic(
  () => import('./WorkflowBuilder'),
  { 
    ssr: false,
    loading: () => <WorkflowBuilderLoading />
  }
)

// DEPRECATED: SimpleWorkflowBuilder is no longer used
// All workflow builder functionality is consolidated into the main WorkflowBuilder component

export { WorkflowBuilder }

// Wrapper component that ensures client-side only rendering
export default function DynamicWorkflowBuilder({ 
  simple = false,  // This prop is now ignored - always uses main WorkflowBuilder
  workflow,
  onSave,
  onCancel,
  onTest
}: DynamicWorkflowBuilderProps) {
  // CONSOLIDATED: Always use main WorkflowBuilder regardless of 'simple' prop
  return (
    <Suspense fallback={<WorkflowBuilderLoading />}>
      <WorkflowBuilder 
        workflow={workflow}
        onSave={onSave}
        onCancel={onCancel}
        onTest={onTest}
      />
    </Suspense>
  )
}