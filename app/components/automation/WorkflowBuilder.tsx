'use client'

import { useCallback, useState, useRef, useEffect } from 'react'
import ReactFlow, {
  ReactFlowProvider,
  addEdge,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  Panel,
  NodeToolbar,
  MarkerType,
  Connection,
  Edge,
  Node,
  ReactFlowInstance,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from 'reactflow'
import 'reactflow/dist/style.css'
import { 
  Save, 
  Play, 
  Pause, 
  RotateCcw, 
  Copy, 
  Trash2, 
  Settings,
  Bug,
  Plus,
  Folder,
  ChevronRight,
  Search,
  Zap,
  GitBranch,
  Clock,
  Code,
  Filter,
  Repeat
} from 'lucide-react'
import { DndProvider, useDrag, useDrop } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { v4 as uuidv4 } from 'uuid'

import type { 
  Workflow, 
  WorkflowNode, 
  NodeType,
  NodePaletteItem,
  ActionDefinition,
  TriggerDefinition,
  BuilderState,
  ExecutionStep
} from '@/app/lib/types/automation'

// Import custom nodes
import TriggerNode from './nodes/TriggerNode'
import ActionNode from './nodes/ActionNode'
import ConditionNode from './nodes/ConditionNode'
import WaitNode from './nodes/WaitNode'
import LoopNode from './nodes/LoopNode'
import TransformNode from './nodes/TransformNode'
import FilterNode from './nodes/FilterNode'

// Node types mapping
const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  wait: WaitNode,
  loop: LoopNode,
  transform: TransformNode,
  filter: FilterNode,
}

// Node palette categories
const nodePalette: Record<string, NodePaletteItem[]> = {
  triggers: [
    {
      type: 'trigger',
      category: 'triggers',
      name: 'New Lead',
      description: 'Triggers when a new lead is created',
      icon: 'UserPlus',
      actionType: 'new_lead',
    },
    {
      type: 'trigger',
      category: 'triggers',
      name: 'Form Submitted',
      description: 'Triggers when a form is submitted',
      icon: 'FileText',
      actionType: 'form_submitted',
    },
    {
      type: 'trigger',
      category: 'triggers',
      name: 'Schedule',
      description: 'Triggers at scheduled times',
      icon: 'Clock',
      actionType: 'scheduled',
    },
    {
      type: 'trigger',
      category: 'triggers',
      name: 'Webhook',
      description: 'Triggers on webhook calls',
      icon: 'Globe',
      actionType: 'webhook',
    },
  ],
  communication: [
    {
      type: 'action',
      category: 'communication',
      name: 'Send Email',
      description: 'Send an email to a contact',
      icon: 'Mail',
      actionType: 'send_email',
    },
    {
      type: 'action',
      category: 'communication',
      name: 'Send SMS',
      description: 'Send an SMS message',
      icon: 'MessageSquare',
      actionType: 'send_sms',
    },
    {
      type: 'action',
      category: 'communication',
      name: 'Send WhatsApp',
      description: 'Send a WhatsApp message',
      icon: 'MessageCircle',
      actionType: 'send_whatsapp',
    },
  ],
  crm: [
    {
      type: 'action',
      category: 'crm',
      name: 'Update Lead',
      description: 'Update lead information',
      icon: 'UserCheck',
      actionType: 'update_lead',
    },
    {
      type: 'action',
      category: 'crm',
      name: 'Add Tag',
      description: 'Add a tag to a lead or client',
      icon: 'Tag',
      actionType: 'add_tag',
    },
    {
      type: 'action',
      category: 'crm',
      name: 'Change Stage',
      description: 'Change lead pipeline stage',
      icon: 'GitBranch',
      actionType: 'change_stage',
    },
  ],
  logic: [
    {
      type: 'condition',
      category: 'logic',
      name: 'If/Else',
      description: 'Conditional branching',
      icon: 'GitBranch',
    },
    {
      type: 'wait',
      category: 'logic',
      name: 'Wait',
      description: 'Wait for specified time',
      icon: 'Clock',
    },
    {
      type: 'loop',
      category: 'logic',
      name: 'Loop',
      description: 'Loop through items',
      icon: 'Repeat',
    },
    {
      type: 'filter',
      category: 'logic',
      name: 'Filter',
      description: 'Filter data based on conditions',
      icon: 'Filter',
    },
  ],
  data: [
    {
      type: 'transform',
      category: 'data',
      name: 'Transform Data',
      description: 'Transform data using JavaScript',
      icon: 'Code',
    },
    {
      type: 'action',
      category: 'data',
      name: 'HTTP Request',
      description: 'Make an HTTP request',
      icon: 'Globe',
      actionType: 'http_request',
    },
  ],
}

// Draggable palette item
function PaletteItem({ item }: { item: NodePaletteItem }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'node',
    item: { ...item },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }))

  return (
    <div
      ref={drag as any}
      className={`p-3 bg-gray-700 rounded-lg cursor-move transition-all hover:bg-gray-600 ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-center gap-2 mb-1">
        <Zap className="h-4 w-4 text-orange-500" />
        <span className="text-sm font-medium">{item.name}</span>
      </div>
      <p className="text-xs text-gray-400">{item.description}</p>
    </div>
  )
}

// Main workflow builder component
interface WorkflowBuilderProps {
  workflow?: Workflow
  onSave?: (workflow: Workflow) => void
  onTest?: (workflow: Workflow) => void
}

function WorkflowBuilderInner({ workflow, onSave, onTest }: WorkflowBuilderProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState(workflow?.workflowData.nodes || [])
  const [edges, setEdges, onEdgesChange] = useEdgesState(workflow?.workflowData.edges || [])
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [showTestPanel, setShowTestPanel] = useState(false)
  const [isTestMode, setIsTestMode] = useState(false)
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['triggers']))

  const { getNode, getEdges, getNodes } = useReactFlow()

  // Drop handler for the canvas
  const [, drop] = useDrop(() => ({
    accept: 'node',
    drop: (item: NodePaletteItem, monitor) => {
      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect()
      const clientOffset = monitor.getClientOffset()
      
      if (reactFlowInstance && reactFlowBounds && clientOffset) {
        const position = reactFlowInstance.project({
          x: clientOffset.x - reactFlowBounds.left,
          y: clientOffset.y - reactFlowBounds.top,
        })

        const newNode: WorkflowNode = {
          id: uuidv4(),
          type: item.type,
          position,
          data: {
            label: item.name,
            icon: item.icon,
            actionType: item.actionType,
            config: {},
            description: item.description,
            isValid: item.type === 'trigger', // Triggers are valid by default
          },
        }

        setNodes((nds) => nds.concat(newNode))
      }
    },
  }))

  // Combine refs
  const combinedRef = useCallback((node: HTMLDivElement | null) => {
    drop(node)
    reactFlowWrapper.current = node
  }, [drop])

  // Connection handler
  const onConnect = useCallback(
    (params: Connection) => {
      const newEdge: Edge = {
        ...params,
        id: uuidv4(),
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
      }
      setEdges((eds) => addEdge(newEdge, eds))
    },
    [setEdges]
  )

  // Node selection handler
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id)
  }, [])

  // Delete selected elements
  const deleteSelected = useCallback(() => {
    const selectedNodes = nodes.filter((node) => node.selected)
    const selectedEdges = edges.filter((edge) => edge.selected)
    
    if (selectedNodes.length > 0) {
      setNodes((nds) => nds.filter((node) => !node.selected))
    }
    
    if (selectedEdges.length > 0) {
      setEdges((eds) => eds.filter((edge) => !edge.selected))
    }
  }, [nodes, edges, setNodes, setEdges])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        deleteSelected()
      }
      if (event.metaKey || event.ctrlKey) {
        switch (event.key) {
          case 's':
            event.preventDefault()
            handleSave()
            break
          case 'z':
            event.preventDefault()
            // TODO: Implement undo
            break
          case 'y':
            event.preventDefault()
            // TODO: Implement redo
            break
          case 'c':
            event.preventDefault()
            // TODO: Implement copy
            break
          case 'v':
            event.preventDefault()
            // TODO: Implement paste
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [deleteSelected])

  // Save workflow
  const handleSave = useCallback(() => {
    if (onSave && workflow) {
      const updatedWorkflow: Workflow = {
        ...workflow,
        workflowData: {
          nodes: nodes as WorkflowNode[],
          edges,
          variables: workflow.workflowData.variables || [],
          viewport: reactFlowInstance?.getViewport(),
        },
      }
      onSave(updatedWorkflow)
    }
  }, [workflow, nodes, edges, reactFlowInstance, onSave])

  // Test workflow
  const handleTest = useCallback(() => {
    if (onTest && workflow) {
      setIsTestMode(true)
      setShowTestPanel(true)
      const updatedWorkflow: Workflow = {
        ...workflow,
        workflowData: {
          nodes: nodes as WorkflowNode[],
          edges,
          variables: workflow.workflowData.variables || [],
        },
      }
      onTest(updatedWorkflow)
    }
  }, [workflow, nodes, edges, onTest])

  // Toggle category expansion
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories)
    if (newExpanded.has(category)) {
      newExpanded.delete(category)
    } else {
      newExpanded.add(category)
    }
    setExpandedCategories(newExpanded)
  }

  // Filter palette items
  const filteredPalette = Object.entries(nodePalette).reduce((acc, [category, items]) => {
    const filtered = items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
    if (filtered.length > 0) {
      acc[category] = filtered
    }
    return acc
  }, {} as Record<string, NodePaletteItem[]>)

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      {/* Left Sidebar - Node Palette */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold mb-3">Workflow Nodes</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm focus:outline-none focus:border-orange-500"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {Object.entries(filteredPalette).map(([category, items]) => (
            <div key={category}>
              <button
                onClick={() => toggleCategory(category)}
                className="flex items-center gap-2 w-full text-left mb-2 hover:text-orange-500 transition-colors"
              >
                <ChevronRight 
                  className={`h-4 w-4 transition-transform ${
                    expandedCategories.has(category) ? 'rotate-90' : ''
                  }`} 
                />
                <span className="text-sm font-medium capitalize">{category}</span>
                <span className="text-xs text-gray-400">({items.length})</span>
              </button>
              
              {expandedCategories.has(category) && (
                <div className="space-y-2 ml-6">
                  {items.map((item, index) => (
                    <PaletteItem key={`${category}-${index}`} item={item} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold">{workflow?.name || 'New Workflow'}</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSave}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Save (Cmd+S)"
              >
                <Save className="h-4 w-4" />
              </button>
              <button
                onClick={() => {/* TODO: Implement undo */}}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Undo (Cmd+Z)"
              >
                <RotateCcw className="h-4 w-4" />
              </button>
              <button
                onClick={deleteSelected}
                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                title="Delete (Delete)"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTestPanel(!showTestPanel)}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                showTestPanel ? 'bg-orange-600 hover:bg-orange-700' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              <Bug className="h-4 w-4" />
              Test Mode
            </button>
            <button
              onClick={handleTest}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition-colors flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Run Test
            </button>
            <button
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                workflow?.status === 'active'
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {workflow?.status === 'active' ? (
                <>
                  <Pause className="h-4 w-4" />
                  Active
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Inactive
                </>
              )}
            </button>
          </div>
        </div>

        {/* React Flow Canvas */}
        <div className="flex-1" ref={combinedRef}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            defaultEdgeOptions={{
              type: 'smoothstep',
              animated: true,
              markerEnd: {
                type: MarkerType.ArrowClosed,
              },
            }}
          >
            <Controls />
            <MiniMap 
              nodeColor={(node) => {
                switch (node.type) {
                  case 'trigger': return '#f97316'
                  case 'action': return '#3b82f6'
                  case 'condition': return '#8b5cf6'
                  case 'wait': return '#10b981'
                  default: return '#6b7280'
                }
              }}
              className="bg-gray-800"
            />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            
            {/* Node Toolbar */}
            {selectedNode && (
              <NodeToolbar nodeId={selectedNode} isVisible={true}>
                <div className="bg-gray-800 rounded-lg shadow-lg p-2 flex items-center gap-2">
                  <button
                    className="p-1 hover:bg-gray-700 rounded"
                    onClick={() => {/* TODO: Duplicate node */}}
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                  <button
                    className="p-1 hover:bg-gray-700 rounded"
                    onClick={() => {/* TODO: Open node settings */}}
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  <button
                    className="p-1 hover:bg-gray-700 rounded text-red-500"
                    onClick={deleteSelected}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </NodeToolbar>
            )}
          </ReactFlow>
        </div>
      </div>

      {/* Right Sidebar - Test Panel */}
      {showTestPanel && (
        <div className="w-80 bg-gray-800 border-l border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <h3 className="text-lg font-bold">Test Mode</h3>
            <button
              onClick={() => setShowTestPanel(false)}
              className="text-gray-400 hover:text-white"
            >
              ×
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            {isTestMode && executionSteps.length > 0 ? (
              <div className="space-y-3">
                {executionSteps.map((step) => (
                  <div
                    key={step.id}
                    className={`p-3 rounded-lg border ${
                      step.status === 'completed'
                        ? 'bg-green-900/20 border-green-700'
                        : step.status === 'failed'
                        ? 'bg-red-900/20 border-red-700'
                        : 'bg-gray-700 border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{step.nodeId}</span>
                      <span className={`text-xs px-2 py-1 rounded ${
                        step.status === 'completed'
                          ? 'bg-green-700 text-green-100'
                          : step.status === 'failed'
                          ? 'bg-red-700 text-red-100'
                          : 'bg-gray-600 text-gray-200'
                      }`}>
                        {step.status}
                      </span>
                    </div>
                    {step.error && (
                      <p className="text-xs text-red-400">{step.error}</p>
                    )}
                    {step.outputData && (
                      <pre className="text-xs bg-gray-900 p-2 rounded mt-2 overflow-x-auto">
                        {JSON.stringify(step.outputData, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400">
                <p className="mb-4">Click "Run Test" to execute the workflow with test data</p>
                <div className="space-y-3">
                  <div className="text-left">
                    <label className="block text-sm font-medium mb-2">Test Data</label>
                    <textarea
                      className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm"
                      placeholder='{"lead": {"name": "John Doe", "email": "john@example.com"}}'
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function WorkflowBuilder(props: WorkflowBuilderProps) {
  return (
    <DndProvider backend={HTML5Backend}>
      <ReactFlowProvider>
        <WorkflowBuilderInner {...props} />
      </ReactFlowProvider>
    </DndProvider>
  )
}