'use client'

import { ReactFlowProvider } from 'reactflow'
import SimpleWorkflowBuilder from '@/app/components/automation/SimpleWorkflowBuilder'

export default function WorkflowBuilderPage() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Create New Workflow</h1>
            <p className="text-gray-400">Build your automation by dragging nodes onto the canvas</p>
          </div>
          <a href="/automations" className="text-gray-400 hover:text-white">
            ← Back to Automations
          </a>
        </div>
      </div>
      
      <div className="h-[calc(100vh-100px)]">
        <ReactFlowProvider>
          <SimpleWorkflowBuilder />
        </ReactFlowProvider>
      </div>
    </div>
  )
}