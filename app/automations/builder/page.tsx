'use client'

import dynamic from 'next/dynamic'

// Dynamic import to avoid SSR issues with ReactFlow
// Temporarily disable ReactFlow to debug build issue
const ReactFlowProvider = ({ children }: { children: React.ReactNode }) => <>{children}</>

const SimpleWorkflowBuilder = () => {
  return (
    <div className="flex items-center justify-center h-full text-white">
      <div className="text-center">
        <p className="text-xl mb-4">Workflow Builder Temporarily Disabled</p>
        <p className="text-gray-400">We're fixing a build issue. Check back soon!</p>
      </div>
    </div>
  )
}

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