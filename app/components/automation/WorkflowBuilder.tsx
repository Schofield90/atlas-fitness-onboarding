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
// ReactFlow styles are imported globally to avoid SSR issues
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
import DynamicConfigPanel from './config/DynamicConfigPanel'

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
    end: (draggedItem, monitor) => {
      const dropResult = monitor.getDropResult<{ nodeId?: string; success?: boolean }>()
      if (dropResult?.success) {
        console.log('Node created successfully:', { 
          draggedItem: draggedItem.name, 
          nodeId: dropResult.nodeId 
        })
      } else if (monitor.didDrop()) {
        console.warn('Drop failed:', draggedItem.name)
      }
    },
  }))

  return (
    <div
      ref={drag as any}
      className={`p-3 bg-gray-700 rounded-lg cursor-move transition-all hover:bg-gray-600 ${
        isDragging ? 'opacity-50 scale-95' : ''
      }`}
      onMouseDown={() => console.log('Starting drag for:', item.name)}
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
  onSave?: (workflow: Workflow) => void | Promise<void>
  onTest?: (workflow: Workflow) => void
  onCancel?: () => void
}

function WorkflowBuilderInner({ workflow, onSave, onTest, onCancel }: WorkflowBuilderProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState(workflow?.workflowData.nodes || [])
  const [edges, setEdges, onEdgesChange] = useEdgesState(workflow?.workflowData.edges || [])
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [showTestPanel, setShowTestPanel] = useState(false)
  const [isTestMode, setIsTestMode] = useState(false)
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['triggers']))
  const [showConfigPanel, setShowConfigPanel] = useState(false)
  const [configNode, setConfigNode] = useState<WorkflowNode | null>(null)

  // Drop handler for the canvas
  const [{ isOver }, drop] = useDrop(() => ({
    accept: 'node',
    drop: (item: NodePaletteItem, monitor) => {
      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect()
      const clientOffset = monitor.getClientOffset()
      
      console.log('Drop triggered:', { item, reactFlowBounds, clientOffset, hasInstance: !!reactFlowInstance })
      
      if (reactFlowBounds && clientOffset) {
        let position
        
        // If ReactFlow instance is available, use it for projection
        if (reactFlowInstance) {
          const projected = reactFlowInstance.project({
            x: clientOffset.x - reactFlowBounds.left,
            y: clientOffset.y - reactFlowBounds.top,
          })
          position = {
            x: projected.x + (Math.random() - 0.5) * 10,
            y: projected.y + (Math.random() - 0.5) * 10,
          }
        } else {
          // Fallback: use direct coordinates if instance not ready
          position = {
            x: clientOffset.x - reactFlowBounds.left + (Math.random() - 0.5) * 10,
            y: clientOffset.y - reactFlowBounds.top + (Math.random() - 0.5) * 10,
          }
        }

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

        console.log('Creating new node:', newNode)
        console.log('Node ID:', newNode.id)
        // FIXED: Use functional update to ensure proper state persistence
        setNodes((currentNodes) => {
          console.log('Current nodes before adding:', currentNodes.length, currentNodes.map(n => n.id))
          // Ensure we're working with the latest state and properly append the node
          const updatedNodes = currentNodes.concat(newNode)
          console.log('Updated nodes array:', updatedNodes.length, updatedNodes.map(n => n.id))
          return updatedNodes
        })
        
        // Return drop result to complete the drag operation
        return { nodeId: newNode.id, success: true }
      }
      
      // Return failure result if drop conditions not met
      return { success: false }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [reactFlowInstance, setNodes])

  // Combine refs
  const combinedRef = useCallback((node: HTMLDivElement | null) => {
    drop(node)
    reactFlowWrapper.current = node
  }, [drop])

  // Connection validation - prevent cycles and validate connection types
  const isValidConnection = useCallback((connection: Connection) => {
    // Don't allow self-connections
    if (connection.source === connection.target) {
      return false
    }
    
    // Check for cycles using DFS
    const checkCycle = (source: string, target: string): boolean => {
      const visited = new Set<string>()
      const stack = [target]
      
      while (stack.length > 0) {
        const current = stack.pop()!
        if (current === source) {
          return true // Cycle detected
        }
        
        if (!visited.has(current)) {
          visited.add(current)
          const outgoingEdges = edges.filter(e => e.source === current)
          outgoingEdges.forEach(e => {
            if (e.target) stack.push(e.target)
          })
        }
      }
      
      return false
    }
    
    if (connection.source && connection.target && checkCycle(connection.source, connection.target)) {
      console.warn('Connection would create a cycle')
      return false
    }
    
    // Validate node types can connect
    const sourceNode = nodes.find(n => n.id === connection.source)
    const targetNode = nodes.find(n => n.id === connection.target)
    
    if (sourceNode?.type === 'trigger' && targetNode?.type === 'trigger') {
      return false // Can't connect trigger to trigger
    }
    
    return true
  }, [nodes, edges])

  // Connection handler with validation
  const onConnect = useCallback(
    (params: Connection) => {
      if (!isValidConnection(params)) {
        console.warn('Invalid connection attempted')
        return
      }
      
      const newEdge: Edge = {
        ...params,
        id: uuidv4(),
        type: 'smoothstep',
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
        },
        style: {
          stroke: '#f97316',
          strokeWidth: 2,
        },
      }
      setEdges((eds) => addEdge(newEdge, eds))
    },
    [setEdges, isValidConnection]
  )

  // Node selection handler
  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    event.stopPropagation() // Prevent event from bubbling
    setSelectedNode(node.id)
    // Open config panel on single click for better UX
    setConfigNode(node as WorkflowNode)
    setShowConfigPanel(true)
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
  const handleSave = useCallback(async () => {
    if (onSave && workflow) {
      setIsSaving(true)
      setSaveMessage(null)
      
      try {
        const updatedWorkflow: Workflow = {
          ...workflow,
          workflowData: {
            nodes: nodes as WorkflowNode[],
            edges,
            variables: workflow.workflowData.variables || [],
            viewport: reactFlowInstance?.getViewport(),
          },
        }
        await onSave(updatedWorkflow)
        setSaveMessage({ type: 'success', text: 'Workflow saved successfully!' })
        setTimeout(() => setSaveMessage(null), 3000)
      } catch (error) {
        console.error('Failed to save workflow:', error)
        setSaveMessage({ type: 'error', text: 'Failed to save workflow. Please try again.' })
      } finally {
        setIsSaving(false)
      }
    }
  }, [workflow, nodes, edges, reactFlowInstance, onSave])

  // Test workflow
  const handleTest = useCallback(() => {
    setIsTestMode(true)
    setShowTestPanel(true)
    setExecutionSteps([])
    
    // Find trigger nodes
    const triggerNodes = nodes.filter(n => n.type === 'trigger')
    
    if (triggerNodes.length === 0) {
      setSaveMessage({ type: 'error', text: 'No trigger nodes found. Add a trigger to test the workflow.' })
      setTimeout(() => setSaveMessage(null), 3000)
      return
    }
    
    // Create execution steps
    const steps: ExecutionStep[] = []
    const visited = new Set<string>()
    
    const traverseWorkflow = (nodeId: string, depth: number = 0) => {
      if (visited.has(nodeId) || depth > 20) return // Prevent infinite loops
      visited.add(nodeId)
      
      const node = nodes.find(n => n.id === nodeId)
      if (!node) return
      
      steps.push({
        id: uuidv4(),
        nodeId,
        status: 'pending',
        timestamp: new Date().toISOString(),
      })
      
      // Find connected nodes
      const outgoingEdges = edges.filter(e => e.source === nodeId)
      outgoingEdges.forEach(edge => {
        traverseWorkflow(edge.target!, depth + 1)
      })
    }
    
    // Start from trigger nodes
    triggerNodes.forEach(trigger => traverseWorkflow(trigger.id))
    
    setExecutionSteps(steps)
    
    // Simulate execution
    steps.forEach((step, index) => {
      setTimeout(() => {
        setExecutionSteps(prev => 
          prev.map(s => {
            if (s.id === step.id) {
              return {
                ...s,
                status: index === 0 ? 'running' : 'completed',
                outputData: { 
                  result: 'Success', 
                  message: `Node executed successfully`,
                  timestamp: new Date().toISOString() 
                }
              }
            }
            return s
          })
        )
      }, (index + 1) * 500)
    })
    
    if (onTest && workflow) {
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
  
  // Run test execution with payload
  const runTestExecution = useCallback(async (payload: any) => {
    setIsTestMode(true)
    setExecutionSteps([])
    
    // Get trigger node
    const triggerNode = nodes.find(n => n.type === 'trigger')
    if (!triggerNode) {
      alert('No trigger node found in workflow')
      return
    }
    
    // Build execution path from trigger
    const executionPath: string[] = [triggerNode.id]
    const visited = new Set<string>([triggerNode.id])
    let currentNodes = [triggerNode.id]
    
    while (currentNodes.length > 0) {
      const nextNodes: string[] = []
      for (const nodeId of currentNodes) {
        const outgoingEdges = edges.filter(e => e.source === nodeId)
        for (const edge of outgoingEdges) {
          if (edge.target && !visited.has(edge.target)) {
            visited.add(edge.target)
            executionPath.push(edge.target)
            nextNodes.push(edge.target)
          }
        }
      }
      currentNodes = nextNodes
    }
    
    // Simulate execution for each node
    for (let i = 0; i < executionPath.length; i++) {
      const nodeId = executionPath[i]
      const node = nodes.find(n => n.id === nodeId)
      
      if (!node) continue
      
      // Add running step
      const stepId = uuidv4()
      setExecutionSteps(prev => [...prev, {
        id: stepId,
        nodeId,
        status: 'running',
        startTime: new Date().toISOString()
      }])
      
      // Simulate execution delay
      await new Promise(resolve => setTimeout(resolve, 800))
      
      // Update step to completed
      setExecutionSteps(prev => prev.map(s => 
        s.id === stepId 
          ? {
              ...s,
              status: 'completed' as const,
              endTime: new Date().toISOString(),
              outputData: {
                input: i === 0 ? payload : { previousStep: executionPath[i - 1] },
                output: {
                  success: true,
                  message: `${node.data?.label || 'Node'} executed successfully`,
                  data: node.type === 'trigger' ? payload : {}
                }
              }
            }
          : s
      ))
    }
    
    setIsTestMode(false)
  }, [nodes, edges])
  
  // Toggle workflow active state
  const handleToggleActive = useCallback(async () => {
    if (!workflow) return
    
    const newStatus = workflow.status === 'active' ? 'inactive' : 'active'
    
    // Update locally
    const updatedWorkflow = {
      ...workflow,
      status: newStatus
    }
    
    // Save if handler provided
    if (onSave) {
      setIsSaving(true)
      try {
        await onSave(updatedWorkflow)
        setSaveMessage({ 
          type: 'success', 
          text: `Workflow ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully` 
        })
      } catch (error) {
        setSaveMessage({ type: 'error', text: 'Failed to update workflow status' })
      } finally {
        setIsSaving(false)
        setTimeout(() => setSaveMessage(null), 3000)
      }
    }
  }, [workflow, onSave])

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

  // Handle node configuration save
  const handleNodeConfigSave = useCallback((nodeId: string, config: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              config,
              isValid: true,
            },
          }
        }
        return node
      })
    )
  }, [setNodes])

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
            {onCancel && (
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-white transition-colors"
                title="Back to Automations"
              >
                ← Back
              </button>
            )}
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">{workflow?.name || 'New Workflow'}</h2>
              {workflow?.description && (
                <span className="text-sm text-gray-400">- {workflow.description}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const newTestMode = !isTestMode
                setIsTestMode(newTestMode)
                setShowTestPanel(newTestMode)
                if (!newTestMode) {
                  setExecutionSteps([])
                }
              }}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                isTestMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'
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
              onClick={handleToggleActive}
              disabled={isSaving}
              className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                workflow?.status === 'active'
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-gray-700 hover:bg-gray-600'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
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
        <div 
          className={`flex-1 relative ${isOver ? 'ring-2 ring-orange-500 ring-opacity-50' : ''}`} 
          ref={combinedRef}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            onInit={setReactFlowInstance}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            connectionLineStyle={{ stroke: '#f97316', strokeWidth: 2 }}
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
                    onClick={() => {
                      const node = nodes.find(n => n.id === selectedNode)
                      if (node) {
                        setConfigNode(node as WorkflowNode)
                        setShowConfigPanel(true)
                      }
                    }}
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
            {/* Test Payload Editor */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Test Payload</label>
              <textarea
                id="test-payload"
                className="w-full h-32 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm font-mono"
                placeholder='{"lead": {"name": "John Doe", "email": "john@example.com", "phone": "+447901234567"}}'
                defaultValue={JSON.stringify({
                  lead: {
                    name: "Test Lead",
                    email: "test@example.com",
                    phone: "+447901234567"
                  }
                }, null, 2)}
              />
              <button
                onClick={() => {
                  const textarea = document.getElementById('test-payload') as HTMLTextAreaElement
                  try {
                    const payload = JSON.parse(textarea.value)
                    // Run test with payload
                    runTestExecution(payload)
                  } catch (error) {
                    alert('Invalid JSON payload')
                  }
                }}
                className="mt-2 w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <Play className="h-4 w-4" />
                Run Test
              </button>
            </div>

            {/* Execution Steps */}
            {executionSteps.length > 0 && (
              <div className="border-t border-gray-700 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium">Execution Log</h4>
                  <button
                    onClick={() => setExecutionSteps([])}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    Clear
                  </button>
                </div>
                <div className="space-y-3">
                  {executionSteps.map((step, index) => {
                    const node = nodes.find(n => n.id === step.nodeId)
                    return (
                      <div
                        key={step.id}
                        className={`p-3 rounded-lg border transition-all ${
                          step.status === 'completed'
                            ? 'bg-green-900/20 border-green-700'
                            : step.status === 'failed'
                            ? 'bg-red-900/20 border-red-700'
                            : step.status === 'running'
                            ? 'bg-blue-900/20 border-blue-700 animate-pulse'
                            : 'bg-gray-700 border-gray-600'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium">
                            Step {index + 1}: {node?.data?.label || step.nodeId}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded ${
                            step.status === 'completed'
                              ? 'bg-green-700 text-green-100'
                              : step.status === 'failed'
                              ? 'bg-red-700 text-red-100'
                              : step.status === 'running'
                              ? 'bg-blue-700 text-blue-100'
                              : 'bg-gray-600 text-gray-200'
                          }`}>
                            {step.status}
                          </span>
                        </div>
                        {step.error && (
                          <p className="text-xs text-red-400 mt-2">{step.error}</p>
                        )}
                        {step.outputData && (
                          <details className="mt-2">
                            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                              Output Data
                            </summary>
                            <pre className="text-xs bg-gray-900 p-2 rounded mt-1 overflow-x-auto">
                              {JSON.stringify(step.outputData, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Node Configuration Panel */}
      {showConfigPanel && configNode && (
        <DynamicConfigPanel
          node={configNode}
          organizationId={workflow?.organizationId || ''}
          onClose={() => {
            setShowConfigPanel(false)
            setConfigNode(null)
          }}
          onSave={handleNodeConfigSave}
        />
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