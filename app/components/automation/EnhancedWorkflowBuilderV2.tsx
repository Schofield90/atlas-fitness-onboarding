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
  MiniMap,
  useReactFlow,
  Panel
} from 'reactflow'
import { WorkflowNode } from '@/app/lib/types/automation'
import { 
  Save, 
  Download, 
  Upload, 
  Play,
  Pause,
  Square,
  RotateCcw,
  Maximize2,
  Minimize2,
  Settings,
  Layers,
  Zap,
  Eye,
  EyeOff,
  Grid,
  Navigation,
  Sparkles,
  Clock,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Bot,
  X,
  ChevronLeft,
  ChevronRight,
  Code,
  FileText,
  Workflow
} from 'lucide-react'

import { enhancedNodeTypes } from './nodes/EnhancedNodes'
import NodePalette from './NodePalette'
import DynamicConfigPanel from './config/DynamicConfigPanel'
import WorkflowValidator, { useWorkflowValidation } from './WorkflowValidator'
import VariableEditor from './VariableEditor'
import { WorkflowTemplates } from './templates/WorkflowTemplates'
import AIToggleControl from './AIToggleControl'
import { safeAlert } from '@/app/lib/utils/safe-alert'

// Execution status overlay component
const ExecutionStatusOverlay = ({ 
  isRunning, 
  executionStats,
  onStop,
  onPause,
  onResume 
}: {
  isRunning: boolean
  executionStats?: {
    totalNodes: number
    completedNodes: number
    currentNode?: string
    startTime?: Date
    errors: number
  }
  onStop: () => void
  onPause: () => void
  onResume: () => void
}) => {
  if (!isRunning || !executionStats) return null

  const progress = (executionStats.completedNodes / executionStats.totalNodes) * 100
  const elapsedTime = executionStats.startTime 
    ? Math.round((Date.now() - executionStats.startTime.getTime()) / 1000)
    : 0

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-10 min-w-80">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
          <span className="font-medium text-gray-900">Workflow Executing</span>
        </div>
        <div className="flex space-x-1">
          <button
            onClick={onPause}
            className="p-1 text-gray-500 hover:text-gray-700"
            title="Pause execution"
          >
            <Pause className="w-4 h-4" />
          </button>
          <button
            onClick={onStop}
            className="p-1 text-gray-500 hover:text-gray-700"
            title="Stop execution"
          >
            <Square className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="mb-2">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress: {executionStats.completedNodes}/{executionStats.totalNodes} nodes</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between text-xs text-gray-500">
        <span>Time: {elapsedTime}s</span>
        {executionStats.errors > 0 && (
          <span className="text-red-600">
            Errors: {executionStats.errors}
          </span>
        )}
      </div>

      {executionStats.currentNode && (
        <div className="mt-2 text-sm text-gray-700">
          Current: <span className="font-mono">{executionStats.currentNode}</span>
        </div>
      )}
    </div>
  )
}

interface EnhancedWorkflowBuilderProps {
  organizationId: string
  workflowId?: string
  onSave?: (workflow: any) => void
  initialWorkflow?: any
  className?: string
}

function EnhancedWorkflowBuilderInner({
  organizationId,
  workflowId,
  onSave,
  initialWorkflow,
  className = ''
}: EnhancedWorkflowBuilderProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState(initialWorkflow?.nodes || [])
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialWorkflow?.edges || [])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showConfigPanel, setShowConfigPanel] = useState(false)
  const [showValidator, setShowValidator] = useState(true)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showMinimap, setShowMinimap] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [workflowName, setWorkflowName] = useState(initialWorkflow?.name || 'New Workflow')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  // Execution state
  const [isExecuting, setIsExecuting] = useState(false)
  const [executionStats, setExecutionStats] = useState<any>(null)
  const [nodeExecutionStatus, setNodeExecutionStatus] = useState<Record<string, 'running' | 'completed' | 'failed' | 'idle'>>({})

  const { fitView } = useReactFlow()
  const validation = useWorkflowValidation(nodes, edges)

  // Initialize with a trigger node if empty
  useEffect(() => {
    if (nodes.length === 0 && !initialWorkflow) {
      const triggerNode = {
        id: 'trigger-1',
        type: 'trigger',
        position: { x: 300, y: 100 },
        data: { 
          label: 'New Lead', 
          description: 'When a lead is created',
          config: { subtype: 'lead_trigger' },
          onDelete: deleteNode
        }
      }
      setNodes([triggerNode])
    }
  }, [])

  // Add delete handlers to existing nodes
  useEffect(() => {
    setNodes(prevNodes => 
      prevNodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          onDelete: deleteNode,
          executionStatus: nodeExecutionStatus[node.id] || 'idle'
        }
      }))
    )
  }, [nodeExecutionStatus])

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  )

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault()

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect()
      const templateData = event.dataTransfer.getData('application/reactflow')

      if (!templateData || !reactFlowBounds) return

      const template = JSON.parse(templateData)
      const position = {
        x: event.clientX - reactFlowBounds.left - 110,
        y: event.clientY - reactFlowBounds.top - 50
      }

      const newNode: WorkflowNode = {
        id: `${template.type}-${Date.now()}`,
        type: template.type,
        position,
        data: {
          label: template.name,
          description: template.description,
          actionType: template.actionType,
          config: { 
            subtype: template.subtype,
            ...template.defaultConfig 
          },
          onDelete: deleteNode
        }
      }

      setNodes((nds) => nds.concat(newNode))
    },
    [reactFlowWrapper, setNodes]
  )

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
    setShowConfigPanel(true)
  }, [])

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((node) => node.id !== nodeId))
    setEdges((eds) => eds.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
    if (selectedNode?.id === nodeId) {
      setSelectedNode(null)
      setShowConfigPanel(false)
    }
  }, [selectedNode, setNodes, setEdges])

  const onDragStart = (event: React.DragEvent, template: any) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(template))
    event.dataTransfer.effectAllowed = 'move'
  }

  const updateNodeConfig = (nodeId: string, config: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          // Update label if provided
          let label = node.data.label
          let description = node.data.description

          // Update description based on config
          if (node.type === 'trigger' && config.subtype) {
            const subtypeLabels: Record<string, string> = {
              lead_trigger: 'When a lead is created',
              birthday_trigger: 'On contact birthday',
              contact_tagged: 'When contact is tagged',
              webhook_received: 'When webhook is received',
              email_event: 'On email event',
              appointment_status: 'On appointment change'
            }
            description = subtypeLabels[config.subtype] || description
          } else if (node.type === 'action') {
            if (config.mode === 'template' && config.templateId) {
              description = `Using template: ${config.templateId}`
            } else if (config.mode === 'custom' && config.subject) {
              description = `Subject: ${config.subject.substring(0, 30)}...`
            } else if (config.message) {
              description = `${config.message.substring(0, 30)}...`
            }
          } else if (node.type === 'wait' && config.duration) {
            description = `Wait ${config.duration.value} ${config.duration.unit}`
          }

          // Update label from config if provided
          if (config.label) {
            label = config.label
          }

          return {
            ...node,
            data: {
              ...node.data,
              label,
              description,
              config,
              isValid: validateNodeConfig(node.type, config)
            }
          }
        }
        return node
      })
    )
  }

  const validateNodeConfig = (nodeType: string, config: any): boolean => {
    // Basic validation logic - extend as needed
    switch (nodeType) {
      case 'trigger':
        return config.subtype !== undefined
      case 'action':
        if (config.actionType === 'send_email') {
          return (config.mode === 'template' && config.templateId) || 
                 (config.mode === 'custom' && config.subject && config.body)
        }
        return true
      case 'condition':
        return config.conditionType !== undefined
      case 'wait':
        return config.waitType !== undefined && 
               (config.waitType !== 'duration' || config.duration)
      default:
        return true
    }
  }

  const saveWorkflow = async () => {
    const workflowData = {
      id: workflowId,
      name: workflowName,
      nodes: nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          config: node.data.config || {},
          // Remove functions before saving
          onDelete: undefined
        }
      })),
      edges,
      organizationId,
      status: validation.isValid ? 'active' : 'draft',
      version: 1,
      workflowData: {
        nodes,
        edges,
        variables: [],
        viewport: { x: 0, y: 0, zoom: 1 }
      },
      settings: {
        errorHandling: 'continue',
        maxExecutionTime: 300,
        timezone: 'UTC',
        notifications: {
          onError: true,
          onComplete: false
        }
      },
      stats: {
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        avgExecutionTime: 0
      }
    }

    if (onSave) {
      onSave(workflowData)
    } else {
      try {
        const response = await fetch('/api/workflows', {
          method: workflowId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workflowData)
        })

        if (response.ok) {
          safeAlert('Workflow saved successfully!')
        } else {
          const error = await response.text()
          safeAlert(`Failed to save workflow: ${error}`)
        }
      } catch (error) {
        console.error('Save error:', error)
        safeAlert('Error saving workflow')
      }
    }
  }

  const executeWorkflow = async () => {
    if (!validation.isValid) {
      safeAlert('Cannot execute workflow with validation errors')
      return
    }

    setIsExecuting(true)
    setExecutionStats({
      totalNodes: nodes.length,
      completedNodes: 0,
      startTime: new Date(),
      errors: 0
    })

    // Simulate workflow execution
    for (const node of nodes) {
      setNodeExecutionStatus(prev => ({ ...prev, [node.id]: 'running' }))
      setExecutionStats(prev => ({ ...prev, currentNode: node.data.label }))
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))
      
      // Random chance of error for demo
      const hasError = Math.random() < 0.1
      
      setNodeExecutionStatus(prev => ({ 
        ...prev, 
        [node.id]: hasError ? 'failed' : 'completed' 
      }))
      
      setExecutionStats(prev => ({
        ...prev,
        completedNodes: prev.completedNodes + 1,
        errors: prev.errors + (hasError ? 1 : 0)
      }))

      if (hasError) {
        safeAlert(`Error executing node: ${node.data.label}`)
        break
      }
    }

    setIsExecuting(false)
    setExecutionStats(null)
    
    // Reset status after a delay
    setTimeout(() => {
      setNodeExecutionStatus({})
    }, 3000)
  }

  const stopExecution = () => {
    setIsExecuting(false)
    setExecutionStats(null)
    setNodeExecutionStatus({})
  }

  const selectTemplate = (template: any) => {
    setNodes(template.nodes.map((node: any) => ({
      ...node,
      data: {
        ...node.data,
        onDelete: deleteNode
      }
    })))
    setEdges(template.edges)
    setWorkflowName(template.name)
    setShowTemplates(false)
    
    setTimeout(() => {
      fitView({ padding: 0.2 })
    }, 100)
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  return (
    <div className={`flex h-full ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : ''} ${className}`}>
      {/* Left Sidebar - Node Palette */}
      <div className={`transition-all duration-300 ${
        sidebarCollapsed ? 'w-12' : 'w-80'
      } flex flex-col bg-gray-50 border-r border-gray-200`}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {!sidebarCollapsed && (
            <h3 className="font-semibold text-gray-900">Workflow Builder</h3>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-1 text-gray-500 hover:text-gray-700"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {!sidebarCollapsed && (
          <>
            <NodePalette onDragStart={onDragStart} className="flex-1" />
            
            {/* Workflow Validator */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => setShowValidator(!showValidator)}
                className="w-full flex items-center justify-between text-sm font-medium text-gray-700 mb-2"
              >
                <span className="flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-1" />
                  Validation
                </span>
                <ChevronRight className={`w-4 h-4 transform transition-transform ${showValidator ? 'rotate-90' : ''}`} />
              </button>
              {showValidator && (
                <WorkflowValidator
                  nodes={nodes}
                  edges={edges}
                  onNodeSelect={(nodeId) => {
                    const node = nodes.find(n => n.id === nodeId)
                    if (node) {
                      setSelectedNode(node)
                      setShowConfigPanel(true)
                    }
                  }}
                  className="max-h-48"
                />
              )}
            </div>
          </>
        )}
      </div>

      {/* Main Canvas */}
      <div className="flex-1 relative">
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
                placeholder="Workflow Name"
              />
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span className={`inline-block w-2 h-2 rounded-full ${
                  validation.isValid ? 'bg-green-500' : 'bg-red-500'
                }`}></span>
                <span>{validation.isValid ? 'Valid' : 'Invalid'}</span>
                <span>•</span>
                <span>{nodes.length} nodes</span>
                <span>•</span>
                <span>Score: {validation.score}/100</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Execution Controls */}
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={executeWorkflow}
                  disabled={!validation.isValid || isExecuting}
                  className="p-2 text-green-600 hover:bg-green-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Execute workflow"
                >
                  <Play className="w-4 h-4" />
                </button>
                <button
                  onClick={stopExecution}
                  disabled={!isExecuting}
                  className="p-2 text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Stop execution"
                >
                  <Square className="w-4 h-4" />
                </button>
              </div>

              {/* View Controls */}
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setShowMinimap(!showMinimap)}
                  className={`p-2 rounded ${showMinimap ? 'bg-white text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}
                  title="Toggle minimap"
                >
                  <Navigation className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setShowGrid(!showGrid)}
                  className={`p-2 rounded ${showGrid ? 'bg-white text-blue-600' : 'text-gray-600 hover:bg-gray-200'}`}
                  title="Toggle grid"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => fitView({ padding: 0.2 })}
                  className="p-2 text-gray-600 hover:bg-gray-200 rounded"
                  title="Fit to view"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>

              {/* AI Toggle */}
              <AIToggleControl
                organizationId={organizationId}
                workflowId={workflowId}
                size="small"
                className="border border-gray-200"
                onToggle={(enabled, reason) => {
                  console.log('AI toggle changed:', { enabled, reason })
                }}
              />

              {/* Templates */}
              <button
                onClick={() => setShowTemplates(true)}
                className="px-3 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
              >
                <FileText className="w-4 h-4 mr-1 inline" />
                Templates
              </button>

              {/* Save */}
              <button
                onClick={saveWorkflow}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Save className="w-4 h-4 mr-1" />
                Save
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-2 text-gray-600 hover:text-gray-800"
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* React Flow Canvas */}
        <div ref={reactFlowWrapper} className="h-full pt-16">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onDrop={onDrop}
            onDragOver={onDragOver}
            nodeTypes={enhancedNodeTypes}
            fitView
            className="bg-gray-50"
            defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
            minZoom={0.1}
            maxZoom={2}
          >
            <Background 
              color="#e5e7eb" 
              gap={showGrid ? 16 : 0}
              size={showGrid ? 1 : 0}
            />
            <Controls position="bottom-left" />
            {showMinimap && (
              <MiniMap
                position="bottom-right"
                className="bg-white border border-gray-200 rounded"
                nodeColor={(node) => {
                  const colors: Record<string, string> = {
                    trigger: '#f97316',
                    action: '#3b82f6',
                    condition: '#6366f1',
                    wait: '#8b5cf6',
                    loop: '#f59e0b',
                    parallel: '#10b981',
                    merge: '#f43f5e',
                    transform: '#8b5cf6'
                  }
                  return colors[node.type] || '#6b7280'
                }}
              />
            )}
          </ReactFlow>

          {/* Execution Status Overlay */}
          <ExecutionStatusOverlay
            isRunning={isExecuting}
            executionStats={executionStats}
            onStop={stopExecution}
            onPause={() => {}}
            onResume={() => {}}
          />
        </div>
      </div>

      {/* Configuration Panel */}
      {showConfigPanel && selectedNode && (
        <DynamicConfigPanel
          node={selectedNode as WorkflowNode}
          onClose={() => {
            setShowConfigPanel(false)
            setSelectedNode(null)
          }}
          onSave={updateNodeConfig}
          organizationId={organizationId}
        />
      )}

      {/* Templates Modal */}
      {showTemplates && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
            <WorkflowTemplates
              onClose={() => setShowTemplates(false)}
              onSelectTemplate={selectTemplate}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function EnhancedWorkflowBuilderV2(props: EnhancedWorkflowBuilderProps) {
  return (
    <ReactFlowProvider>
      <EnhancedWorkflowBuilderInner {...props} />
    </ReactFlowProvider>
  )
}