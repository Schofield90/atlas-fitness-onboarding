'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
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
  NodeProps,
  MiniMap,
  ReactFlowInstance
} from 'reactflow'
import { Plus, Settings, Play, Save, Trash2, Copy, Eye, EyeOff, Zap } from 'lucide-react'
import { AdvancedConditionNode } from './nodes/AdvancedConditionNode'
import { AdvancedActionNode } from './nodes/AdvancedActionNode'
import { AdvancedTriggerNode } from './nodes/AdvancedTriggerNode'
import LoopNode from './nodes/LoopNode'
import { ParallelNode } from './nodes/ParallelNode'
import { MergeNode } from './nodes/MergeNode'
import { DelayNode } from './nodes/DelayNode'
import { WorkflowTester } from './testing/WorkflowTester'
import { ConditionBuilder } from './conditions/ConditionBuilder'
import { WorkflowTemplates } from './templates/WorkflowTemplates'

// Node types for the advanced builder
const nodeTypes = {
  trigger: AdvancedTriggerNode,
  action: AdvancedActionNode,
  condition: AdvancedConditionNode,
  loop: LoopNode,
  parallel: ParallelNode,
  merge: MergeNode,
  delay: DelayNode
}

// Enhanced node templates with advanced conditions
const nodeTemplates = [
  // Triggers
  {
    type: 'trigger',
    label: 'New Lead',
    description: 'When a new lead is created',
    category: 'Triggers',
    icon: '👤',
    defaultConfig: {
      source: 'all',
      leadScore: { min: 0, max: 100 }
    }
  },
  {
    type: 'trigger',
    label: 'Form Submitted',
    description: 'When a form is submitted',
    category: 'Triggers',
    icon: '📝',
    defaultConfig: {
      formId: 'all',
      fields: []
    }
  },
  {
    type: 'trigger',
    label: 'Lead Score Change',
    description: 'When lead score changes',
    category: 'Triggers',
    icon: '📊',
    defaultConfig: {
      scoreThreshold: 50,
      direction: 'increase'
    }
  },
  {
    type: 'trigger',
    label: 'Email Activity',
    description: 'Email opened, clicked, or replied',
    category: 'Triggers',
    icon: '📧',
    defaultConfig: {
      activity: 'opened',
      templateId: 'any'
    }
  },
  
  // Advanced Conditions
  {
    type: 'condition',
    label: 'Lead Score Condition',
    description: 'Check lead score ranges',
    category: 'Conditions',
    icon: '📈',
    defaultConfig: {
      conditionType: 'lead_score',
      operator: 'greater_than',
      value: 50
    }
  },
  {
    type: 'condition',
    label: 'Tag Condition',
    description: 'Check if lead has specific tags',
    category: 'Conditions',
    icon: '🏷️',
    defaultConfig: {
      conditionType: 'tags',
      operator: 'has_tag',
      tags: [],
      logic: 'any'
    }
  },
  {
    type: 'condition',
    label: 'Time-Based Condition',
    description: 'Business hours, days, date ranges',
    category: 'Conditions',
    icon: '⏰',
    defaultConfig: {
      conditionType: 'time_based',
      timeType: 'business_hours',
      timezone: 'UTC',
      businessHours: { start: '09:00', end: '17:00' },
      workDays: [1, 2, 3, 4, 5]
    }
  },
  {
    type: 'condition',
    label: 'Field Comparison',
    description: 'Compare field values',
    category: 'Conditions',
    icon: '🔍',
    defaultConfig: {
      conditionType: 'field_comparison',
      field: 'email',
      operator: 'contains',
      value: '@gmail.com'
    }
  },
  {
    type: 'condition',
    label: 'Activity Condition',
    description: 'Based on lead activity',
    category: 'Conditions',
    icon: '🎯',
    defaultConfig: {
      conditionType: 'activity',
      activityType: 'email_opened',
      timeframe: { value: 7, unit: 'days' },
      operator: 'within'
    }
  },
  {
    type: 'condition',
    label: 'Multi-Condition',
    description: 'Complex AND/OR logic',
    category: 'Conditions',
    icon: '🧮',
    defaultConfig: {
      conditionType: 'multi_condition',
      logic: 'AND',
      conditions: []
    }
  },
  
  // Control Flow
  {
    type: 'loop',
    label: 'Loop',
    description: 'Repeat actions until condition met',
    category: 'Control Flow',
    icon: '🔄',
    defaultConfig: {
      maxIterations: 10,
      breakCondition: null
    }
  },
  {
    type: 'parallel',
    label: 'Parallel Execution',
    description: 'Execute multiple paths simultaneously',
    category: 'Control Flow',
    icon: '⚡',
    defaultConfig: {
      branches: 2,
      waitForAll: true
    }
  },
  {
    type: 'merge',
    label: 'Merge',
    description: 'Combine parallel execution paths',
    category: 'Control Flow',
    icon: '🔗',
    defaultConfig: {
      strategy: 'wait_all'
    }
  },
  {
    type: 'delay',
    label: 'Conditional Delay',
    description: 'Dynamic wait based on conditions',
    category: 'Control Flow',
    icon: '⏸️',
    defaultConfig: {
      baseDelay: { value: 1, unit: 'hours' },
      conditions: []
    }
  },
  
  // Actions (existing ones enhanced)
  {
    type: 'action',
    label: 'Send Email',
    description: 'Send personalized emails',
    category: 'Actions',
    icon: '📧'
  },
  {
    type: 'action',
    label: 'Send SMS',
    description: 'Send SMS messages',
    category: 'Actions',
    icon: '💬'
  },
  {
    type: 'action',
    label: 'Add/Remove Tags',
    description: 'Manage lead tags',
    category: 'Actions',
    icon: '🏷️'
  },
  {
    type: 'action',
    label: 'Update Lead Score',
    description: 'Modify lead score',
    category: 'Actions',
    icon: '📊'
  },
  {
    type: 'action',
    label: 'Create Task',
    description: 'Create follow-up tasks',
    category: 'Actions',
    icon: '✅'
  }
]

interface AdvancedWorkflowBuilderProps {
  initialWorkflow?: any
  onSave?: (workflow: any) => void
}

export default function AdvancedWorkflowBuilder({ initialWorkflow, onSave }: AdvancedWorkflowBuilderProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialWorkflow?.nodes || [])
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialWorkflow?.edges || [])
  const [selectedCategory, setSelectedCategory] = useState('Triggers')
  const [nodeIdCounter, setNodeIdCounter] = useState(1)
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showTester, setShowTester] = useState(false)
  const [showTemplates, setShowTemplates] = useState(false)
  const [isTestMode, setIsTestMode] = useState(false)
  const [executionPath, setExecutionPath] = useState<string[]>([])
  const [highlightedPath, setHighlightedPath] = useState<string[]>([])
  const [workflowMetadata, setWorkflowMetadata] = useState({
    name: initialWorkflow?.name || 'New Workflow',
    description: initialWorkflow?.description || '',
    version: initialWorkflow?.version || 1,
    tags: initialWorkflow?.tags || []
  })
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)

  const onConnect = useCallback(
    (params: Connection) => {
      const edge = {
        ...params,
        id: `edge_${Date.now()}`,
        type: 'smoothstep',
        animated: isTestMode,
        style: {
          stroke: highlightedPath.includes(params.source || '') ? '#10b981' : '#6b7280'
        }
      }
      setEdges((eds) => addEdge(edge, eds))
    },
    [setEdges, isTestMode, highlightedPath]
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

      if (!reactFlowInstance || !reactFlowWrapper.current) return

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect()
      const templateData = event.dataTransfer.getData('application/reactflow')

      if (templateData) {
        const template = JSON.parse(templateData)
        const position = reactFlowInstance.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top
        })

        const newNode: Node = {
          id: `node_${nodeIdCounter}`,
          type: template.type,
          position,
          data: { 
            label: template.label,
            description: template.description,
            icon: template.icon,
            config: template.defaultConfig || {},
            isValid: true
          }
        }

        setNodes((nds) => nds.concat(newNode))
        setNodeIdCounter((c) => c + 1)
      }
    },
    [nodeIdCounter, setNodes, reactFlowInstance]
  )

  const deleteSelectedElements = useCallback(() => {
    setNodes((nds) => nds.filter((node) => !node.selected))
    setEdges((eds) => eds.filter((edge) => !edge.selected))
  }, [setNodes, setEdges])

  const duplicateSelectedNode = useCallback(() => {
    const selectedNodes = nodes.filter(node => node.selected)
    if (selectedNodes.length === 1) {
      const node = selectedNodes[0]
      const newNode = {
        ...node,
        id: `node_${nodeIdCounter}`,
        position: {
          x: node.position.x + 50,
          y: node.position.y + 50
        },
        selected: false
      }
      setNodes((nds) => [...nds, newNode])
      setNodeIdCounter(c => c + 1)
    }
  }, [nodes, setNodes, nodeIdCounter])

  const saveWorkflow = async () => {
    const workflow = {
      ...workflowMetadata,
      nodes,
      edges,
      updatedAt: new Date().toISOString()
    }
    
    if (onSave) {
      onSave(workflow)
    } else {
      // Default save behavior
      console.log('Saving workflow:', workflow)
      // Here you would typically call an API to save the workflow
    }
  }

  const categories = [...new Set(nodeTemplates.map(t => t.category))]

  // Test mode functions
  const startTestMode = () => {
    setIsTestMode(true)
    setShowTester(true)
  }

  const exitTestMode = () => {
    setIsTestMode(false)
    setHighlightedPath([])
    setExecutionPath([])
    setShowTester(false)
  }

  const highlightExecutionPath = (path: string[]) => {
    setHighlightedPath(path)
    // Update edge styles to highlight the path
    setEdges(edges => edges.map(edge => ({
      ...edge,
      style: {
        ...edge.style,
        stroke: path.includes(edge.source) && path.includes(edge.target) ? '#10b981' : '#6b7280',
        strokeWidth: path.includes(edge.source) && path.includes(edge.target) ? 3 : 1
      },
      animated: path.includes(edge.source) && path.includes(edge.target)
    })))
  }

  return (
    <div className="h-full flex bg-gray-900">
      {/* Enhanced Sidebar */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        {/* Workflow Info */}
        <div className="p-4 border-b border-gray-700">
          <input
            type="text"
            value={workflowMetadata.name}
            onChange={(e) => setWorkflowMetadata(prev => ({ ...prev, name: e.target.value }))}
            className="w-full bg-gray-700 text-white text-lg font-medium px-3 py-2 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-orange-500"
            placeholder="Workflow name..."
          />
          <textarea
            value={workflowMetadata.description}
            onChange={(e) => setWorkflowMetadata(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Workflow description..."
            className="w-full mt-2 bg-gray-700 text-gray-300 text-sm px-3 py-2 rounded-lg border-0 resize-none focus:outline-none focus:ring-2 focus:ring-orange-500"
            rows={2}
          />
        </div>

        {/* Node Palette */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-white font-bold mb-4">Node Library</h3>
            
            {/* Category tabs */}
            <div className="flex flex-wrap gap-2 mb-4">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
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
                    className="bg-gray-700 p-3 rounded-lg cursor-move hover:bg-gray-600 transition-colors border border-gray-600 hover:border-gray-500"
                    draggable
                    onDragStart={(e) => onDragStart(e, template)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-xl">{template.icon}</div>
                      <div className="flex-1">
                        <div className="text-white font-medium text-sm">{template.label}</div>
                        <div className="text-gray-400 text-xs">{template.description}</div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="p-4 border-t border-gray-700">
          <div className="space-y-2">
            <button
              onClick={() => setShowTemplates(true)}
              className="w-full flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Copy className="w-4 h-4" />
              Load Template
            </button>
            <button
              onClick={startTestMode}
              disabled={nodes.length === 0}
              className="w-full flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Play className="w-4 h-4" />
              Test Workflow
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 relative">
        {/* Toolbar */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          {!isTestMode ? (
            <>
              <button
                onClick={saveWorkflow}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg shadow-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={duplicateSelectedNode}
                disabled={nodes.filter(n => n.selected).length !== 1}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg shadow-lg transition-colors"
              >
                <Copy className="w-4 h-4" />
                Duplicate
              </button>
              <button
                onClick={deleteSelectedElements}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </>
          ) : (
            <button
              onClick={exitTestMode}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg shadow-lg transition-colors"
            >
              <EyeOff className="w-4 h-4" />
              Exit Test Mode
            </button>
          )}
        </div>

        {/* Canvas Status */}
        {isTestMode && (
          <div className="absolute top-4 right-4 z-10 bg-green-900/80 border border-green-600 text-green-100 px-4 py-2 rounded-lg">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              Test Mode Active
            </div>
          </div>
        )}

        {/* ReactFlow Canvas */}
        <div ref={reactFlowWrapper} className="w-full h-full">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onInit={setReactFlowInstance}
            onNodeClick={(event, node) => {
              if (!isTestMode) {
                setSelectedNode(node)
                setShowSettings(true)
              }
            }}
            nodeTypes={nodeTypes}
            fitView
            className="bg-gray-900"
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
            minZoom={0.2}
            maxZoom={2}
            attributionPosition="bottom-left"
          >
            <Background pattern="dots" gap={20} size={1} />
            <Controls />
            <MiniMap 
              nodeColor={(node) => {
                switch (node.type) {
                  case 'trigger': return '#ea580c'
                  case 'condition': return '#7c3aed'
                  case 'action': return '#2563eb'
                  case 'loop': return '#059669'
                  case 'parallel': return '#dc2626'
                  case 'merge': return '#0891b2'
                  case 'delay': return '#ca8a04'
                  default: return '#6b7280'
                }
              }}
              nodeStrokeWidth={3}
              zoomable
              pannable
              className="bg-gray-800 border border-gray-600 rounded-lg"
            />
          </ReactFlow>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && selectedNode && (
        <div className="absolute right-0 top-0 w-96 h-full bg-gray-800 border-l border-gray-700 shadow-xl z-20 overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Node Settings
              </h3>
              <button
                onClick={() => {
                  setShowSettings(false)
                  setSelectedNode(null)
                }}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>

            {/* Dynamic settings based on node type */}
            {selectedNode.type === 'condition' && (
              <ConditionBuilder 
                node={selectedNode}
                onUpdate={(updatedNode) => {
                  setNodes(nodes => nodes.map(n => n.id === selectedNode.id ? updatedNode : n))
                  setSelectedNode(updatedNode)
                }}
              />
            )}
            
            {/* Add other node type settings here */}
          </div>
        </div>
      )}

      {/* Workflow Tester */}
      {showTester && (
        <div className="absolute inset-0 bg-black bg-opacity-50 z-30 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <WorkflowTester
              workflow={{ nodes, edges, metadata: workflowMetadata }}
              onClose={exitTestMode}
              onHighlightPath={highlightExecutionPath}
            />
          </div>
        </div>
      )}

      {/* Workflow Templates */}
      {showTemplates && (
        <div className="absolute inset-0 bg-black bg-opacity-50 z-30 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <WorkflowTemplates
              onClose={() => setShowTemplates(false)}
              onSelectTemplate={(template) => {
                setNodes(template.nodes || [])
                setEdges(template.edges || [])
                setWorkflowMetadata(prev => ({
                  ...prev,
                  name: template.name,
                  description: template.description
                }))
                setShowTemplates(false)
              }}
            />
          </div>
        </div>
      )}
    </div>
  )
}