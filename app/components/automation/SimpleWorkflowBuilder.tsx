'use client'

import { useCallback, useState, useRef } from 'react'
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  Connection,
  Edge,
  Node,
  Handle,
  Position,
  NodeProps
} from 'reactflow'
// Import styles conditionally to avoid SSR issues
if (typeof window !== 'undefined') {
  import('./reactflow-styles.css')
}

// Simple trigger node component
const TriggerNode = ({ data }: NodeProps) => {
  return (
    <div className="bg-orange-600 text-white p-4 rounded-lg shadow-lg min-w-[200px]">
      <div className="font-bold mb-2">{data.label}</div>
      <div className="text-sm opacity-80">{data.description}</div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  )
}

// Simple action node component  
const ActionNode = ({ data }: NodeProps) => {
  return (
    <div className="bg-blue-600 text-white p-4 rounded-lg shadow-lg min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="font-bold mb-2">{data.label}</div>
      <div className="text-sm opacity-80">{data.description}</div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  )
}

// Simple condition node component
const ConditionNode = ({ data }: NodeProps) => {
  return (
    <div className="bg-purple-600 text-white p-4 rounded-lg shadow-lg min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="font-bold mb-2">{data.label}</div>
      <div className="text-sm opacity-80">{data.description}</div>
      <Handle type="source" position={Position.Right} className="w-3 h-3" id="yes" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" id="no" />
    </div>
  )
}

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode
}

// Available node templates
const nodeTemplates = [
  {
    type: 'trigger',
    label: 'New Lead',
    description: 'When a new lead is created',
    category: 'Triggers'
  },
  {
    type: 'trigger',
    label: 'Form Submitted',
    description: 'When a form is submitted',
    category: 'Triggers'
  },
  {
    type: 'action',
    label: 'Send Email',
    description: 'Send an email to the lead',
    category: 'Actions'
  },
  {
    type: 'action',
    label: 'Send SMS',
    description: 'Send an SMS message',
    category: 'Actions'
  },
  {
    type: 'action',
    label: 'Send WhatsApp',
    description: 'Send a WhatsApp message',
    category: 'Actions'
  },
  {
    type: 'action',
    label: 'Add Tag',
    description: 'Add a tag to the lead',
    category: 'Actions'
  },
  {
    type: 'condition',
    label: 'If/Else',
    description: 'Conditional branching',
    category: 'Logic'
  },
  {
    type: 'action',
    label: 'Wait',
    description: 'Wait for a specified time',
    category: 'Actions'
  }
]

export default function SimpleWorkflowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedCategory, setSelectedCategory] = useState('Triggers')
  const [nodeIdCounter, setNodeIdCounter] = useState(1)

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const onDragStart = (event: React.DragEvent, nodeTemplate: any) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(nodeTemplate))
    event.dataTransfer.effectAllowed = 'move'
  }

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const reactFlowBounds = event.currentTarget.getBoundingClientRect()
      const templateData = event.dataTransfer.getData('application/reactflow')

      if (templateData) {
        const template = JSON.parse(templateData)
        const position = {
          x: event.clientX - reactFlowBounds.left - 100,
          y: event.clientY - reactFlowBounds.top - 40
        }

        const newNode: Node = {
          id: `node_${nodeIdCounter}`,
          type: template.type,
          position,
          data: { 
            label: template.label,
            description: template.description 
          }
        }

        setNodes((nds) => nds.concat(newNode))
        setNodeIdCounter((c) => c + 1)
      }
    },
    [nodeIdCounter, setNodes]
  )

  const deleteSelectedElements = useCallback(() => {
    setNodes((nds) => nds.filter((node) => !node.selected))
    setEdges((eds) => eds.filter((edge) => !edge.selected))
  }, [setNodes, setEdges])

  const categories = [...new Set(nodeTemplates.map(t => t.category))]

  return (
    <div className="h-full flex bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 p-4 overflow-y-auto">
        <h3 className="text-white font-bold mb-4">Workflow Nodes</h3>
        
        {/* Category tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded text-sm ${
                selectedCategory === cat 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Node templates */}
        <div className="space-y-2">
          {nodeTemplates
            .filter(t => t.category === selectedCategory)
            .map((template, index) => (
              <div
                key={index}
                className="bg-gray-700 p-3 rounded cursor-move hover:bg-gray-600 transition-colors"
                draggable
                onDragStart={(e) => onDragStart(e, template)}
              >
                <div className="text-white font-medium">{template.label}</div>
                <div className="text-gray-400 text-sm">{template.description}</div>
              </div>
            ))}
        </div>

        <div className="mt-6 text-gray-400 text-sm">
          <p className="mb-2">💡 Tips:</p>
          <ul className="space-y-1 text-xs">
            <li>• Drag nodes to the canvas</li>
            <li>• Connect nodes by dragging handles</li>
            <li>• Select and press Delete to remove</li>
            <li>• Click a node to select it</li>
          </ul>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <button
            onClick={async () => {
              const workflowName = prompt('Enter workflow name:')
              if (!workflowName) return
              
              try {
                const response = await fetch('/api/workflows', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    name: workflowName,
                    description: 'Created with workflow builder',
                    nodes,
                    edges,
                    status: 'draft'
                  })
                })
                
                if (response.ok) {
                  const saved = await response.json()
                  alert(`Workflow "${workflowName}" saved successfully!`)
                  window.location.href = '/automations'
                } else {
                  alert('Failed to save workflow')
                }
              } catch (error) {
                console.error('Save error:', error)
                alert('Error saving workflow')
              }
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
          >
            Save Workflow
          </button>
          <button
            onClick={deleteSelectedElements}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
          >
            Delete Selected
          </button>
        </div>

        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gray-900"
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  )
}