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
  NodeProps
} from 'reactflow'
// ReactFlow styles are imported globally to avoid SSR issues

// Import advanced automation components
import { AdvancedNodeFactory } from '../../lib/automation/advanced-node-system'
import { SubAgentSystem } from '../../lib/automation/sub-agents/SubAgentSystem'
import { DeepNodeConfigPanel } from './config/DeepNodeConfigPanel'
import { EnhancedLeadTriggerNode } from './nodes/EnhancedLeadTriggerNode'
import { EnhancedEmailActionNode } from './nodes/EnhancedEmailActionNode'
import { AdvancedConditionNode } from './nodes/AdvancedConditionNode'
import type { 
  AdvancedWorkflowNode, 
  AdvancedNodeData, 
  OrchestrationConfig, 
  CommunicationProtocol 
} from '../../lib/types/advanced-automation'

// Enhanced node types using advanced automation components
const nodeTypes = {
  trigger: EnhancedLeadTriggerNode,
  action: EnhancedEmailActionNode,
  condition: AdvancedConditionNode,
  // Keep backward compatibility with simple nodes
  simple_trigger: ({ data }: NodeProps) => (
    <div className="bg-orange-600 text-white p-4 rounded-lg shadow-lg min-w-[200px]">
      <div className="font-bold mb-2">{data.label}</div>
      <div className="text-sm opacity-80">{data.description}</div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  ),
  simple_action: ({ data }: NodeProps) => (
    <div className="bg-blue-600 text-white p-4 rounded-lg shadow-lg min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="font-bold mb-2">{data.label}</div>
      <div className="text-sm opacity-80">{data.description}</div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  ),
  simple_condition: ({ data }: NodeProps) => (
    <div className="bg-purple-600 text-white p-4 rounded-lg shadow-lg min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="font-bold mb-2">{data.label}</div>
      <div className="text-sm opacity-80">{data.description}</div>
      <Handle type="source" position={Position.Right} className="w-3 h-3" id="yes" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" id="no" />
    </div>
  )
}

// Enhanced node templates with advanced automation capabilities
const nodeTemplates = [
  // Advanced Triggers
  {
    type: 'trigger',
    nodeType: 'ai_lead_trigger',
    label: 'AI Lead Detection',
    description: 'Intelligent lead detection with AI qualification',
    category: 'Triggers',
    aiEnhanced: true,
    icon: '🎯'
  },
  {
    type: 'trigger',
    nodeType: 'ai_lead_trigger',
    label: 'Smart Form Trigger',
    description: 'AI-powered form submission trigger',
    category: 'Triggers',
    aiEnhanced: true,
    icon: '📝'
  },
  // Advanced Actions
  {
    type: 'action',
    nodeType: 'ai_email_action',
    label: 'AI Email Campaign',
    description: 'Intelligent email with AI content generation',
    category: 'Actions',
    aiEnhanced: true,
    icon: '📧'
  },
  {
    type: 'action',
    nodeType: 'multi_channel_action',
    label: 'Multi-Channel Outreach',
    description: 'Coordinated SMS, WhatsApp, and email campaign',
    category: 'Actions',
    aiEnhanced: true,
    icon: '📱'
  },
  {
    type: 'action',
    nodeType: 'enrichment_action',
    label: 'Data Enrichment',
    description: 'Enrich lead data with AI analysis',
    category: 'Data Processing',
    aiEnhanced: true,
    icon: '🔍'
  },
  // Advanced Logic
  {
    type: 'condition',
    nodeType: 'smart_condition',
    label: 'AI Decision Point',
    description: 'AI-powered conditional logic',
    category: 'Logic',
    aiEnhanced: true,
    icon: '🤔'
  },
  // Backward compatibility with simple nodes
  {
    type: 'simple_trigger',
    label: 'Simple Trigger',
    description: 'Basic trigger without AI features',
    category: 'Basic'
  },
  {
    type: 'simple_action',
    label: 'Simple Action',
    description: 'Basic action without AI features',
    category: 'Basic'
  },
  {
    type: 'simple_condition',
    label: 'Simple Condition',
    description: 'Basic condition without AI features',
    category: 'Basic'
  }
]

export default function SimpleWorkflowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState<AdvancedWorkflowNode[]>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedCategory, setSelectedCategory] = useState('Triggers')
  const [nodeIdCounter, setNodeIdCounter] = useState(1)
  const [selectedNode, setSelectedNode] = useState<AdvancedWorkflowNode | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showDeepConfig, setShowDeepConfig] = useState(false)
  const [availableForms, setAvailableForms] = useState<any[]>([])
  const [leadSources, setLeadSources] = useState<any[]>([])
  const [emailTemplates, setEmailTemplates] = useState<any[]>([])
  const [availableTags, setAvailableTags] = useState<any[]>([])
  const [loadingConfig, setLoadingConfig] = useState(true)
  const [showAIAssistant, setShowAIAssistant] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])
  
  // Advanced automation system instances
  const [nodeFactory] = useState(() => AdvancedNodeFactory.getInstance())
  const [subAgentSystem] = useState(() => {
    const orchestrationConfig: OrchestrationConfig = {
      coordinationStrategy: 'hierarchical',
      conflictResolution: 'priority',
      resourceSharing: true
    }
    const communicationProtocol: CommunicationProtocol = {
      messageFormat: 'json',
      encryption: false,
      acknowledgement: true,
      retryPolicy: {
        maxAttempts: 3,
        delay: 1000,
        backoffStrategy: 'exponential',
        retryableErrors: ['network_error', 'timeout']
      }
    }
    return new SubAgentSystem(orchestrationConfig, communicationProtocol)
  })

  // Initialize advanced automation system
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        setLoadingConfig(true)
        
        // Initialize node factory
        nodeFactory.initialize()
        
        // Start sub-agent system
        await subAgentSystem.start()
        
        // Fetch configuration data
        const fetchTasks = [
          fetch('/api/workflow-config/forms').then(res => res.json()),
          fetch('/api/workflow-config/lead-sources').then(res => res.json()),
          fetch('/api/workflow-config/email-templates').then(res => res.json()),
          fetch('/api/workflow-config/tags').then(res => res.json())
        ]
        
        const [formsData, sourcesData, templatesData, tagsData] = await Promise.all(fetchTasks)
        
        if (formsData.success) setAvailableForms(formsData.forms)
        if (sourcesData.success) setLeadSources(sourcesData.sources)
        if (templatesData.success) setEmailTemplates(templatesData.templates)
        if (tagsData.success) setAvailableTags(tagsData.tags)
        
      } catch (error) {
        console.error('Error initializing advanced automation system:', error)
      } finally {
        setLoadingConfig(false)
      }
    }
    
    initializeSystem()
    
    // Cleanup on unmount
    return () => {
      subAgentSystem.stop()
    }
  }, [])

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
    async (event: React.DragEvent) => {
      event.preventDefault()

      const reactFlowBounds = event.currentTarget.getBoundingClientRect()
      const templateData = event.dataTransfer.getData('application/reactflow')

      if (templateData) {
        const template = JSON.parse(templateData)
        const position = {
          x: event.clientX - reactFlowBounds.left - 100,
          y: event.clientY - reactFlowBounds.top - 40
        }

        try {
          let newNode: AdvancedWorkflowNode
          
          // Create advanced nodes using the NodeFactory if enhanced, otherwise create simple nodes
          if (template.aiEnhanced && template.nodeType) {
            newNode = await nodeFactory.createAdvancedNode(
              template.nodeType,
              {
                label: template.label,
                description: template.description,
                icon: template.icon
              },
              {
                workflowType: 'lead_automation',
                existingNodes: nodes.map(n => n.type),
                organizationData: { /* organization context */ }
              }
            )
            newNode.position = position
            
            // Trigger sub-agents for node optimization
            await subAgentSystem.triggerEvent('node_created', {
              nodeType: template.nodeType,
              nodeId: newNode.id,
              workflowContext: 'lead_automation'
            })
            
          } else {
            // Create simple node for backward compatibility
            newNode = {
              id: `node_${nodeIdCounter}`,
              type: template.type as any,
              position,
              data: { 
                label: template.label,
                description: template.description,
                config: {},
                advancedConfig: {},
                aiAssistance: {
                  contentGeneration: { enabled: false, provider: 'openai', templates: [], personalization: { enabled: false, dataPoints: [], personalizationLevel: 'basic', realTimeUpdates: false } },
                  configSuggestions: { enabled: false, suggestionTypes: [], learningFromHistory: false },
                  performanceOptimization: { enabled: false, autoOptimize: false, optimizationMetrics: [] },
                  errorPrevention: { enabled: false, predictiveAnalysis: false, autoCorrection: false }
                },
                fieldMappings: [],
                dataTransformations: [],
                validationRules: [],
                errorHandling: {
                  strategy: 'fail_fast' as const,
                  retryConfig: { maxAttempts: 0, delay: 0, backoffStrategy: 'fixed' as const, retryableErrors: [] },
                  fallbackActions: [],
                  alerting: { enabled: false, channels: [], severity: 'low' as const },
                  logging: { level: 'error' as const, destinations: [], structuredLogging: false, sensitiveDataHandling: 'mask' as const }
                },
                performanceConfig: {
                  caching: { enabled: false, strategy: 'memory' as const, ttl: 300, keyStrategy: 'automatic' as const },
                  parallelization: { enabled: false, maxConcurrency: 1, batchSize: 1, queueingStrategy: 'fifo' as const },
                  resourceLimits: { maxMemoryMB: 128, maxExecutionTimeMs: 30000, maxRetries: 3, rateLimitPerMinute: 60 },
                  monitoring: { metricsCollection: false, performanceTracking: false, errorTracking: false, customMetrics: [] }
                },
                uiConfig: {
                  configPanel: { sections: [], layout: 'tabs' as const, searchable: false, collapsible: false },
                  appearance: { color: '#666', icon: template.icon || '⚙️', size: 'medium' as const },
                  interactions: { clickable: true, draggable: true, resizable: false, customHandlers: [] },
                  documentation: { enabled: false, helpText: template.description, examples: [], videoTutorials: [], externalLinks: [] }
                }
              } as AdvancedNodeData
            }
          }

          setNodes((nds) => nds.concat(newNode))
          setNodeIdCounter((c) => c + 1)
          
        } catch (error) {
          console.error('Error creating node:', error)
          // Fallback to simple node creation
          const simpleNode: AdvancedWorkflowNode = {
            id: `node_${nodeIdCounter}`,
            type: template.type as any,
            position,
            data: { 
              label: template.label,
              description: template.description 
            } as any
          }
          setNodes((nds) => nds.concat(simpleNode))
          setNodeIdCounter((c) => c + 1)
        }
      }
    },
    [nodeIdCounter, setNodes, nodeFactory, subAgentSystem, nodes]
  )

  const deleteSelectedElements = useCallback(() => {
    setNodes((nds) => nds.filter((node) => !node.selected))
    setEdges((eds) => eds.filter((edge) => !edge.selected))
  }, [setNodes, setEdges])

  const categories = [...new Set(nodeTemplates.map(t => t.category))]
  
  // Helper functions for enhanced functionality
  const handleNodeUpgrade = async (nodeId: string, targetType: string) => {
    const nodeToUpgrade = nodes.find(n => n.id === nodeId)
    if (!nodeToUpgrade) return
    
    try {
      const upgradedNode = await nodeFactory.createAdvancedNode(
        targetType,
        {
          label: nodeToUpgrade.data.label,
          description: nodeToUpgrade.data.description,
          config: nodeToUpgrade.data.config || {}
        },
        {
          workflowType: 'upgrade_migration',
          existingNodes: nodes.map(n => n.type)
        }
      )
      
      upgradedNode.position = nodeToUpgrade.position
      
      setNodes((nds) =>
        nds.map((node) => (node.id === nodeId ? upgradedNode : node))
      )
      
      // Notify sub-agents of the upgrade
      await subAgentSystem.triggerEvent('node_upgraded', {
        originalType: nodeToUpgrade.type,
        newType: targetType,
        nodeId: upgradedNode.id
      })
      
    } catch (error) {
      console.error('Error upgrading node:', error)
    }
  }
  
  const getAIInsights = async () => {
    if (nodes.length === 0) return
    
    try {
      await subAgentSystem.triggerEvent('workflow_analysis_request', {
        nodeCount: nodes.length,
        edgeCount: edges.length,
        workflowComplexity: nodes.length + edges.length
      })
      
      // Get system status for insights
      const systemStatus = subAgentSystem.getSystemStatus()
      console.log('AI Insights:', systemStatus)
      
    } catch (error) {
      console.error('Error getting AI insights:', error)
    }
  }
  
  // Auto-save functionality
  const autoSaveWorkflow = useCallback(async () => {
    if (nodes.length === 0) return
    
    try {
      const workflowData = {
        nodes: nodes.map(node => ({
          id: node.id,
          type: node.type,
          position: node.position,
          data: node.data
        })),
        edges,
        metadata: {
          lastModified: new Date().toISOString(),
          aiEnhanced: nodes.some(n => n.data.aiAssistance?.configSuggestions?.enabled),
          subAgentOptimized: true
        }
      }
      
      // Auto-save to localStorage as backup
      if (typeof window !== 'undefined') {
        localStorage.setItem('workflow_autosave', JSON.stringify(workflowData))
      }
      
    } catch (error) {
      console.error('Auto-save failed:', error)
    }
  }, [nodes, edges])
  
  // Auto-save every 30 seconds
  useEffect(() => {
    const interval = setInterval(autoSaveWorkflow, 30000)
    return () => clearInterval(interval)
  }, [autoSaveWorkflow])
  
  // Load auto-saved workflow on mount
  useEffect(() => {
    const loadAutoSaved = () => {
      try {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('workflow_autosave') : null
        if (saved && nodes.length === 0) {
          const workflowData = JSON.parse(saved)
          if (workflowData.nodes?.length > 0) {
            // Show restore prompt
            const restore = typeof window !== 'undefined' ? window.confirm('Found auto-saved workflow. Would you like to restore it?') : false
            if (restore) {
              setNodes(workflowData.nodes)
              setEdges(workflowData.edges || [])
            }
          }
        }
      } catch (error) {
        console.error('Error loading auto-saved workflow:', error)
      }
    }
    
    // Delay loading to ensure system is initialized
    setTimeout(loadAutoSaved, 1000)
  }, [])

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
                className={`p-3 rounded cursor-move transition-colors ${
                  template.aiEnhanced 
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                draggable
                onDragStart={(e) => onDragStart(e, template)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-lg mr-2">{template.icon || '⚙️'}</span>
                    <div>
                      <div className="text-white font-medium flex items-center">
                        {template.label}
                        {template.aiEnhanced && (
                          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            AI
                          </span>
                        )}
                      </div>
                      <div className="text-gray-300 text-sm">{template.description}</div>
                    </div>
                  </div>
                </div>
                {template.aiEnhanced && (
                  <div className="mt-2 text-xs text-gray-200 bg-black bg-opacity-20 rounded px-2 py-1">
                    ✨ Includes: Smart configuration, AI content generation, performance optimization
                  </div>
                )}
              </div>
            ))}
        </div>

        <div className="mt-6 text-gray-400 text-sm">
          <p className="mb-2">💡 Tips:</p>
          <ul className="space-y-1 text-xs">
            <li>• Drag nodes to the canvas</li>
            <li>• Click nodes to configure settings</li>
            <li>• Connect nodes by dragging handles</li>
            <li>• Select and press Delete to remove</li>
            <li className="text-purple-300">• ✨ AI-Enhanced nodes offer intelligent configuration</li>
            <li className="text-purple-300">• 🚀 Use AI Assistant for complete workflow generation</li>
          </ul>
          
          <div className="mt-4 p-3 bg-gradient-to-r from-purple-800 to-blue-800 rounded-lg">
            <h4 className="text-white text-sm font-medium mb-1">🤖 AI System Status</h4>
            <div className="text-xs text-purple-200">
              <div className="flex items-center justify-between">
                <span>Sub-Agents:</span>
                <span className="text-green-300">{subAgentSystem.getSystemStatus().activeAgents}/{subAgentSystem.getSystemStatus().totalAgents}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Queue:</span>
                <span className={subAgentSystem.getSystemStatus().queueSize > 5 ? 'text-yellow-300' : 'text-green-300'}>
                  {subAgentSystem.getSystemStatus().queueSize} tasks
                </span>
              </div>
              <div className="mt-2 h-1 bg-purple-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-400 to-blue-400 transition-all duration-300"
                  style={{
                    width: `${(subAgentSystem.getSystemStatus().activeAgents / subAgentSystem.getSystemStatus().totalAgents) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative">
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <button
            onClick={() => setShowAIAssistant(true)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            AI Assistant
          </button>
          
          <button
            onClick={getAIInsights}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors flex items-center gap-2"
            title="Get AI-powered workflow analysis"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            AI Insights
          </button>
          <button
            onClick={async () => {
              const workflowName = prompt('Enter workflow name:')
              if (!workflowName) return
              
              try {
                // Enhanced workflow saving with AI metadata
                const aiEnhancedNodes = nodes.filter(n => n.data.aiAssistance?.configSuggestions?.enabled)
                const systemStatus = subAgentSystem.getSystemStatus()
                
                const workflowData = {
                  name: workflowName,
                  description: `Advanced workflow with ${aiEnhancedNodes.length} AI-enhanced nodes`,
                  nodes: nodes.map(node => ({
                    ...node,
                    // Include advanced configuration
                    metadata: {
                      isAIEnhanced: node.data.aiAssistance?.configSuggestions?.enabled || false,
                      hasAdvancedConfig: node.data.uiConfig?.configPanel?.sections?.length > 0,
                      optimizationHints: node.optimizationHints?.length || 0
                    }
                  })),
                  edges,
                  status: 'draft',
                  advanced_features: {
                    ai_enhanced_nodes: aiEnhancedNodes.length,
                    sub_agent_optimization: true,
                    performance_monitoring: true,
                    auto_optimization: nodes.some(n => n.data.performanceConfig?.monitoring?.performanceTracking)
                  },
                  system_metrics: {
                    active_agents: systemStatus.activeAgents,
                    total_agents: systemStatus.totalAgents,
                    queue_size: systemStatus.queueSize
                  }
                }
                
                // Trigger pre-save optimization
                await subAgentSystem.triggerEvent('workflow_save_request', {
                  workflowName,
                  nodeCount: nodes.length,
                  aiEnhancedCount: aiEnhancedNodes.length
                })
                
                const response = await fetch('/api/workflows', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(workflowData)
                })
                
                if (response.ok) {
                  const saved = await response.json()
                  
                  // Clear auto-save after successful save
                  if (typeof window !== 'undefined') {
                    localStorage.removeItem('workflow_autosave')
                  }
                  
                  if (typeof window !== 'undefined') {
                    alert(`Advanced workflow "${workflowName}" saved successfully with AI enhancements!`)
                    window.location.href = '/automations'
                  }
                } else {
                  const errorData = await response.json()
                  if (typeof window !== 'undefined') {
                    alert(`Failed to save workflow: ${errorData.error || 'Unknown error'}`)
                  }
                }
              } catch (error) {
                console.error('Save error:', error)
                if (typeof window !== 'undefined') {
                  alert('Error saving workflow. Auto-save backup is available.')
                }
              }
            }}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors"
          >
            Save Workflow
          </button>
          <button
            onClick={deleteSelectedElements}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete Selected
          </button>
          
          <button
            onClick={() => {
              if (nodes.length === 0) {
                alert('No workflow to analyze')
                return
              }
              
              const report = {
                totalNodes: nodes.length,
                aiEnhancedNodes: nodes.filter(n => n.data.aiAssistance?.configSuggestions?.enabled).length,
                connectedNodes: edges.length,
                systemHealth: subAgentSystem.getSystemStatus().activeAgents + '/' + subAgentSystem.getSystemStatus().totalAgents + ' agents active'
              }
              
              alert(`Workflow Analysis:\n• Total Nodes: ${report.totalNodes}\n• AI-Enhanced: ${report.aiEnhancedNodes}\n• Connections: ${report.connectedNodes}\n• System: ${report.systemHealth}`)
            }}
            className="bg-cyan-600 hover:bg-cyan-700 text-white px-4 py-2 rounded-lg shadow-lg transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012-2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
            Analysis
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
          onNodeClick={(event, node) => {
            setSelectedNode(node as AdvancedWorkflowNode)
            // Use DeepNodeConfigPanel for AI-enhanced nodes, fallback to simple settings for others
            if (node.data.aiAssistance?.configSuggestions?.enabled || node.data.uiConfig?.configPanel?.sections?.length > 0) {
              setShowDeepConfig(true)
            } else {
              setShowSettings(true)
            }
          }}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gray-900"
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {/* Deep Node Configuration Panel */}
      {showDeepConfig && selectedNode && (
        <DeepNodeConfigPanel
          node={selectedNode}
          isOpen={showDeepConfig}
          onClose={() => {
            setShowDeepConfig(false)
            setSelectedNode(null)
          }}
          onSave={(nodeData: AdvancedNodeData) => {
            if (selectedNode) {
              setNodes((nds) =>
                nds.map((node) =>
                  node.id === selectedNode.id
                    ? { ...node, data: nodeData }
                    : node
                )
              )
              setShowDeepConfig(false)
              setSelectedNode(null)
              
              // Trigger AI optimization suggestions
              subAgentSystem.triggerEvent('node_configured', {
                nodeId: selectedNode.id,
                nodeType: selectedNode.type,
                configuration: nodeData
              })
            }
          }}
          organizationId="" // TODO: Get from context
        />
      )}

      {/* Legacy Settings Panel for Simple Nodes */}
      {showSettings && selectedNode && (
        <div className="absolute right-0 top-0 w-96 h-full bg-gray-800 shadow-xl z-20 overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white">Node Settings</h3>
              <button
                onClick={() => {
                  setShowSettings(false)
                  setSelectedNode(null)
                }}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              {/* Upgrade Notice for Simple Nodes */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-purple-800">Basic Node Configuration</h3>
                    <div className="mt-1 text-sm text-purple-700">
                      <p>This is a basic node. For advanced AI-powered features like smart configuration, content generation, and performance optimization, try our enhanced node types!</p>
                    </div>
                    <div className="mt-3">
                      <button
                        onClick={() => {
                          setShowSettings(false)
                          setSelectedCategory('Triggers')
                        }}
                        className="text-sm font-medium text-purple-600 hover:text-purple-800"
                      >
                        Explore AI-Enhanced Nodes →
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Node Info */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Node Type</label>
                <div className="bg-gray-700 px-4 py-2 rounded-lg">
                  <p className="text-white font-medium">{selectedNode.data.label}</p>
                  <p className="text-gray-400 text-sm">{selectedNode.data.description}</p>
                </div>
              </div>

              {/* Trigger-specific settings */}
              {selectedNode.type === 'trigger' && selectedNode.data.label === 'New Lead' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Lead Source</label>
                  <select 
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    onChange={(e) => {
                      const updatedNodes = nodes.map(node => {
                        if (node.id === selectedNode.id) {
                          return {
                            ...node,
                            data: {
                              ...node.data,
                              source: e.target.value
                            }
                          }
                        }
                        return node
                      })
                      setNodes(updatedNodes)
                    }}
                    value={selectedNode.data.source || 'all'}
                  >
                    {loadingConfig ? (
                      <option>Loading sources...</option>
                    ) : (
                      leadSources.map(source => (
                        <option key={source.id} value={source.id}>
                          {source.name}
                          {source.hasData && ` (${source.count} leads)`}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              )}

              {selectedNode.type === 'trigger' && selectedNode.data.label === 'Form Submitted' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Select Form</label>
                  {!loadingConfig && availableForms.length === 1 && availableForms[0].category === 'All Forms' && (
                    <div className="mb-3 p-3 bg-yellow-900/30 border border-yellow-600 rounded-lg">
                      <p className="text-sm text-yellow-400">
                        No forms found. Create forms in the Forms section or connect Facebook to import lead forms.
                      </p>
                    </div>
                  )}
                  <select 
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    onChange={(e) => {
                      const formId = e.target.value;
                      let formData = null;
                      
                      // Find the selected form details
                      for (const category of availableForms) {
                        const form = category.items.find((f: any) => f.id === formId);
                        if (form) {
                          formData = {
                            ...form,
                            category: category.category
                          };
                          break;
                        }
                      }
                      
                      const updatedNodes = nodes.map(node => {
                        if (node.id === selectedNode.id) {
                          return {
                            ...node,
                            data: {
                              ...node.data,
                              formId: e.target.value,
                              formName: e.target.options[e.target.selectedIndex].text,
                              formType: formData?.type,
                              formCategory: formData?.category,
                              pageId: formData?.pageId,
                              pageName: formData?.pageName
                            }
                          }
                        }
                        return node
                      })
                      setNodes(updatedNodes)
                    }}
                    value={selectedNode.data.formId || ''}
                  >
                    <option value="">Select a form...</option>
                    {loadingConfig ? (
                      <option>Loading forms...</option>
                    ) : (
                      availableForms.map(category => (
                        <optgroup key={category.category} label={category.category}>
                          {category.items.map((form: any) => (
                            <option key={form.id} value={form.id}>
                              {form.name}
                              {form.description && ` - ${form.description}`}
                            </option>
                          ))}
                        </optgroup>
                      ))
                    )}
                  </select>
                </div>
              )}

              {/* Action-specific settings */}
              {selectedNode.type === 'action' && selectedNode.data.label === 'Send Email' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Email Template</label>
                    <select 
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      onChange={(e) => {
                        const updatedNodes = nodes.map(node => {
                          if (node.id === selectedNode.id) {
                            return {
                              ...node,
                              data: {
                                ...node.data,
                                templateId: e.target.value
                              }
                            }
                          }
                          return node
                        })
                        setNodes(updatedNodes)
                      }}
                      value={selectedNode.data.templateId || ''}
                    >
                      <option value="">Select template...</option>
                      {loadingConfig ? (
                        <option>Loading templates...</option>
                      ) : (
                        emailTemplates.map(template => (
                          <option key={template.id} value={template.id}>
                            {template.name}
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Subject Line</label>
                    <input
                      type="text"
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Enter email subject..."
                      value={selectedNode.data.subject || ''}
                      onChange={(e) => {
                        const updatedNodes = nodes.map(node => {
                          if (node.id === selectedNode.id) {
                            return {
                              ...node,
                              data: {
                                ...node.data,
                                subject: e.target.value
                              }
                            }
                          }
                          return node
                        })
                        setNodes(updatedNodes)
                      }}
                    />
                  </div>
                </>
              )}

              {selectedNode.type === 'action' && selectedNode.data.label === 'Send SMS' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">SMS Message</label>
                  <textarea
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows={4}
                    placeholder="Enter SMS message..."
                    value={selectedNode.data.message || ''}
                    onChange={(e) => {
                      const updatedNodes = nodes.map(node => {
                        if (node.id === selectedNode.id) {
                          return {
                            ...node,
                            data: {
                              ...node.data,
                              message: e.target.value
                            }
                          }
                        }
                        return node
                      })
                      setNodes(updatedNodes)
                    }}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    {(selectedNode.data.message || '').length}/160 characters
                  </p>
                </div>
              )}

              {selectedNode.type === 'action' && selectedNode.data.label === 'Send WhatsApp' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">WhatsApp Message</label>
                  <textarea
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    rows={4}
                    placeholder="Enter WhatsApp message..."
                    value={selectedNode.data.message || ''}
                    onChange={(e) => {
                      const updatedNodes = nodes.map(node => {
                        if (node.id === selectedNode.id) {
                          return {
                            ...node,
                            data: {
                              ...node.data,
                              message: e.target.value
                            }
                          }
                        }
                        return node
                      })
                      setNodes(updatedNodes)
                    }}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    You can use variables like {'{first_name}'} and {'{gym_name}'}
                  </p>
                </div>
              )}

              {selectedNode.type === 'action' && selectedNode.data.label === 'Wait' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Wait Duration</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      className="flex-1 bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      placeholder="Duration"
                      min="1"
                      value={selectedNode.data.duration || ''}
                      onChange={(e) => {
                        const updatedNodes = nodes.map(node => {
                          if (node.id === selectedNode.id) {
                            return {
                              ...node,
                              data: {
                                ...node.data,
                                duration: e.target.value
                              }
                            }
                          }
                          return node
                        })
                        setNodes(updatedNodes)
                      }}
                    />
                    <select 
                      className="bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                      value={selectedNode.data.unit || 'minutes'}
                      onChange={(e) => {
                        const updatedNodes = nodes.map(node => {
                          if (node.id === selectedNode.id) {
                            return {
                              ...node,
                              data: {
                                ...node.data,
                                unit: e.target.value
                              }
                            }
                          }
                          return node
                        })
                        setNodes(updatedNodes)
                      }}
                    >
                      <option value="minutes">Minutes</option>
                      <option value="hours">Hours</option>
                      <option value="days">Days</option>
                    </select>
                  </div>
                </div>
              )}

              {selectedNode.type === 'action' && selectedNode.data.label === 'Add Tag' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Select or Create Tag</label>
                  <select 
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 mb-2"
                    onChange={(e) => {
                      const updatedNodes = nodes.map(node => {
                        if (node.id === selectedNode.id) {
                          return {
                            ...node,
                            data: {
                              ...node.data,
                              tag: e.target.value
                            }
                          }
                        }
                        return node
                      })
                      setNodes(updatedNodes)
                    }}
                    value={selectedNode.data.tag || ''}
                  >
                    <option value="">Select a tag...</option>
                    {loadingConfig ? (
                      <option>Loading tags...</option>
                    ) : (
                      <>
                        <optgroup label="Lead Status">
                          {availableTags
                            .filter(tag => ['hot-lead', 'warm-lead', 'cold-lead'].includes(tag.value))
                            .map(tag => (
                              <option key={tag.value} value={tag.value}>
                                {tag.label}
                                {tag.count > 0 && ` (${tag.count} leads)`}
                              </option>
                            ))}
                        </optgroup>
                        <optgroup label="Common Tags">
                          {availableTags
                            .filter(tag => !['hot-lead', 'warm-lead', 'cold-lead'].includes(tag.value))
                            .map(tag => (
                              <option key={tag.value} value={tag.value}>
                                {tag.label}
                                {tag.count > 0 && ` (${tag.count} leads)`}
                              </option>
                            ))}
                        </optgroup>
                      </>
                    )}
                  </select>
                  <input
                    type="text"
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Or type a new tag..."
                    value={selectedNode.data.customTag || ''}
                    onChange={(e) => {
                      const updatedNodes = nodes.map(node => {
                        if (node.id === selectedNode.id) {
                          return {
                            ...node,
                            data: {
                              ...node.data,
                              customTag: e.target.value,
                              tag: e.target.value.toLowerCase().replace(/\s+/g, '-')
                            }
                          }
                        }
                        return node
                      })
                      setNodes(updatedNodes)
                    }}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Tags help categorize and segment your leads
                  </p>
                </div>
              )}

              {selectedNode.type === 'condition' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Condition</label>
                  <select 
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 mb-2"
                    value={selectedNode.data.field || ''}
                    onChange={(e) => {
                      const updatedNodes = nodes.map(node => {
                        if (node.id === selectedNode.id) {
                          return {
                            ...node,
                            data: {
                              ...node.data,
                              field: e.target.value
                            }
                          }
                        }
                        return node
                      })
                      setNodes(updatedNodes)
                    }}
                  >
                    <option value="">Select field...</option>
                    <option value="email">Email</option>
                    <option value="tag">Tag</option>
                    <option value="source">Lead Source</option>
                    <option value="score">Lead Score</option>
                  </select>
                  
                  <select 
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500 mb-2"
                    value={selectedNode.data.operator || ''}
                    onChange={(e) => {
                      const updatedNodes = nodes.map(node => {
                        if (node.id === selectedNode.id) {
                          return {
                            ...node,
                            data: {
                              ...node.data,
                              operator: e.target.value
                            }
                          }
                        }
                        return node
                      })
                      setNodes(updatedNodes)
                    }}
                  >
                    <option value="">Select operator...</option>
                    <option value="equals">Equals</option>
                    <option value="contains">Contains</option>
                    <option value="greater">Greater than</option>
                    <option value="less">Less than</option>
                  </select>
                  
                  <input
                    type="text"
                    className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Value"
                    value={selectedNode.data.value || ''}
                    onChange={(e) => {
                      const updatedNodes = nodes.map(node => {
                        if (node.id === selectedNode.id) {
                          return {
                            ...node,
                            data: {
                              ...node.data,
                              value: e.target.value
                            }
                          }
                        }
                        return node
                      })
                      setNodes(updatedNodes)
                    }}
                  />
                </div>
              )}

              {/* Upgrade CTA */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 mb-2">🚀 Unlock Advanced Features</h4>
                <p className="text-sm text-blue-700 mb-3">
                  Upgrade to AI-Enhanced nodes for intelligent configuration, content generation, and performance optimization.
                </p>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => {
                      // Convert to advanced node
                      const convertToAdvanced = async () => {
                        try {
                          const advancedNode = await nodeFactory.createAdvancedNode(
                            selectedNode.type === 'simple_trigger' ? 'ai_lead_trigger' :
                            selectedNode.type === 'simple_action' ? 'ai_email_action' : 'smart_condition',
                            {
                              label: selectedNode.data.label,
                              description: selectedNode.data.description
                            }
                          )
                          advancedNode.position = selectedNode.position
                          
                          setNodes((nds) =>
                            nds.map((node) =>
                              node.id === selectedNode.id ? advancedNode : node
                            )
                          )
                          
                          setShowSettings(false)
                          setSelectedNode(null)
                        } catch (error) {
                          console.error('Error upgrading node:', error)
                        }
                      }
                      convertToAdvanced()
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Upgrade Node
                  </button>
                  <button
                    onClick={() => {
                      setShowSettings(false)
                      setSelectedNode(null)
                    }}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Keep Basic
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Assistant Modal */}
      {showAIAssistant && (
        <div className="absolute inset-0 bg-black bg-opacity-50 z-30 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-lg shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  AI Workflow Assistant
                </h2>
                <button
                  onClick={() => {
                    setShowAIAssistant(false)
                    setAiPrompt('')
                    setAiSuggestions([])
                  }}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Describe your workflow
                </label>
                <textarea
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  rows={4}
                  placeholder="E.g., 'When a new lead comes in from Facebook, wait 5 minutes, then send a welcome SMS, and if they don't respond within 1 hour, send a follow-up email'"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                />
              </div>

              {/* Quick Templates */}
              <div>
                <p className="text-sm font-medium text-gray-300 mb-2">Quick Templates:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setAiPrompt('Create an AI-powered welcome sequence for new fitness leads with personalized content, multi-channel outreach (email, SMS, WhatsApp), and intelligent timing optimization')}
                    className="text-left p-3 bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded-lg text-sm text-white transition-colors"
                  >
                    👋 AI Welcome Sequence
                    <div className="text-xs text-purple-200 mt-1">With smart personalization</div>
                  </button>
                  <button
                    onClick={() => setAiPrompt('Build an intelligent lead nurturing campaign with AI content generation, behavioral triggers, lead scoring, and automated optimization over 14 days')}
                    className="text-left p-3 bg-gradient-to-br from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 rounded-lg text-sm text-white transition-colors"
                  >
                    📈 Smart Lead Nurturing
                    <div className="text-xs text-green-200 mt-1">With AI optimization</div>
                  </button>
                  <button
                    onClick={() => setAiPrompt('Create an AI-powered fitness class reminder system with personalized messages, attendance tracking, and smart reschedule handling')}
                    className="text-left p-3 bg-gradient-to-br from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 rounded-lg text-sm text-white transition-colors"
                  >
                    🏃‍♀️ Class Reminders
                    <div className="text-xs text-orange-200 mt-1">Fitness-optimized</div>
                  </button>
                  <button
                    onClick={() => setAiPrompt('Build a comprehensive member retention workflow with AI-powered churn prediction, personalized re-engagement campaigns, and success tracking')}
                    className="text-left p-3 bg-gradient-to-br from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700 rounded-lg text-sm text-white transition-colors"
                  >
                    💎 Retention Campaign
                    <div className="text-xs text-pink-200 mt-1">With churn prediction</div>
                  </button>
                </div>
              </div>

              {/* AI Suggestions */}
              {aiSuggestions.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-300 mb-2">AI Suggestions:</p>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {aiSuggestions.map((suggestion, index) => (
                      <div key={index} className="p-3 bg-gray-700 rounded-lg text-sm text-gray-300">
                        {suggestion}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    if (!aiPrompt.trim()) return
                    
                    setAiLoading(true)
                    try {
                      // Use sub-agent system for AI workflow generation
                      await subAgentSystem.triggerEvent('ai_workflow_request', {
                        prompt: aiPrompt,
                        context: {
                          existingNodes: nodes.length,
                          workflowType: 'lead_automation'
                        }
                      })
                      
                      const response = await fetch('/api/ai/workflow-assistant', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          prompt: aiPrompt,
                          enhancedMode: true,
                          subAgentOptimization: true
                        })
                      })
                      
                      if (response.ok) {
                        const data = await response.json()
                        if (data.workflow) {
                          // Create enhanced workflow nodes
                          const enhancedNodes = await Promise.all(
                            (data.workflow.nodes || []).map(async (nodeData: any, index: number) => {
                              if (nodeData.aiEnhanced) {
                                const advancedNode = await nodeFactory.createAdvancedNode(
                                  nodeData.nodeType,
                                  nodeData,
                                  { workflowType: 'ai_generated' }
                                )
                                // Set position for better layout
                                advancedNode.position = {
                                  x: 100 + (index % 3) * 300,
                                  y: 100 + Math.floor(index / 3) * 200
                                }
                                return advancedNode
                              }
                              return {
                                ...nodeData,
                                position: {
                                  x: 100 + (index % 3) * 300,
                                  y: 100 + Math.floor(index / 3) * 200
                                }
                              }
                            })
                          )
                          
                          setNodes(enhancedNodes)
                          setEdges(data.workflow.edges || [])
                          setShowAIAssistant(false)
                          setAiPrompt('')
                          
                          // Trigger optimization suggestions
                          await subAgentSystem.triggerEvent('workflow_generated', {
                            nodeCount: enhancedNodes.length,
                            aiGenerated: true
                          })
                        }
                        if (data.suggestions) {
                          setAiSuggestions(data.suggestions)
                        }
                      } else {
                        const errorData = await response.json()
                        console.error('AI Assistant API error:', errorData)
                        alert(errorData.error || 'Failed to generate workflow. Please make sure you are logged in.')
                      }
                    } catch (error) {
                      console.error('AI Assistant error:', error)
                      alert('Failed to get AI suggestions. Please try again.')
                    } finally {
                      setAiLoading(false)
                    }
                  }}
                  disabled={!aiPrompt.trim() || aiLoading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {aiLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Building Workflow...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate Workflow
                    </>
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowAIAssistant(false)
                    setAiPrompt('')
                    setAiSuggestions([])
                  }}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}