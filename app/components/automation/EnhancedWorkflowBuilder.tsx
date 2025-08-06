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
  MiniMap
} from 'reactflow'
import { 
  Sparkles, 
  Save, 
  Download, 
  Upload, 
  Bot,
  X,
  ChevronRight,
  ChevronLeft,
  Lightbulb,
  MessageSquare,
  Clock,
  Mail,
  Users,
  Filter,
  Zap,
  Calendar,
  Tag,
  Webhook,
  Phone,
  MailOpen,
  Target,
  TrendingUp,
  Reply,
  ClipboardCheck,
  FileText,
  StickyNote,
  Bell
} from 'lucide-react'

// Import configuration components
import LeadTriggerConfig from './config/LeadTriggerConfig'
import EmailActionConfig from './config/EmailActionConfig'
import WaitActionConfig from './config/WaitActionConfig'
import SMSActionConfig from './config/SMSActionConfig'
import BirthdayTriggerConfig from './config/BirthdayTriggerConfig'
import ContactTagTriggerConfig from './config/ContactTagTriggerConfig'
import WebhookTriggerConfig from './config/WebhookTriggerConfig'
import AppointmentTriggerConfig from './config/AppointmentTriggerConfig'
import ContactChangedTriggerConfig from './config/ContactChangedTriggerConfig'
import CustomDateTriggerConfig from './config/CustomDateTriggerConfig'
import CallStatusTriggerConfig from './config/CallStatusTriggerConfig'
import EmailEventTriggerConfig from './config/EmailEventTriggerConfig'
import OpportunityCreatedTriggerConfig from './config/OpportunityCreatedTriggerConfig'
import OpportunityStageChangedTriggerConfig from './config/OpportunityStageChangedTriggerConfig'
import CustomerRepliedTriggerConfig from './config/CustomerRepliedTriggerConfig'
import SurveySubmittedTriggerConfig from './config/SurveySubmittedTriggerConfig'
import FormSubmittedTriggerConfig from './config/FormSubmittedTriggerConfig'
import NoteAddedTriggerConfig from './config/NoteAddedTriggerConfig'
import TaskReminderTriggerConfig from './config/TaskReminderTriggerConfig'
import { safeAlert } from '@/app/lib/utils/safe-alert'

// Simple node components for the canvas
const TriggerNode = ({ data, selected }: NodeProps) => (
  <div className={`bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg shadow-lg min-w-[220px] ${selected ? 'ring-2 ring-orange-300' : ''}`}>
    <div className="flex items-center justify-between mb-2">
      <Users className="w-5 h-5" />
      <span className="text-xs bg-orange-700 px-2 py-1 rounded">Trigger</span>
    </div>
    <div className="font-bold text-sm mb-1">{data.label}</div>
    <div className="text-xs opacity-80">{data.description || 'Configure trigger...'}</div>
    <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
  </div>
)

const EmailNode = ({ data, selected }: NodeProps) => (
  <div className={`bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 rounded-lg shadow-lg min-w-[220px] ${selected ? 'ring-2 ring-blue-300' : ''}`}>
    <Handle type="target" position={Position.Top} className="w-3 h-3" />
    <div className="flex items-center justify-between mb-2">
      <Mail className="w-5 h-5" />
      <span className="text-xs bg-blue-700 px-2 py-1 rounded">Action</span>
    </div>
    <div className="font-bold text-sm mb-1">{data.label}</div>
    <div className="text-xs opacity-80">{data.description || 'Configure email...'}</div>
    <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
  </div>
)

const WaitNode = ({ data, selected }: NodeProps) => (
  <div className={`bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg shadow-lg min-w-[220px] ${selected ? 'ring-2 ring-purple-300' : ''}`}>
    <Handle type="target" position={Position.Top} className="w-3 h-3" />
    <div className="flex items-center justify-between mb-2">
      <Clock className="w-5 h-5" />
      <span className="text-xs bg-purple-700 px-2 py-1 rounded">Wait</span>
    </div>
    <div className="font-bold text-sm mb-1">{data.label}</div>
    <div className="text-xs opacity-80">{data.description || 'Configure wait time...'}</div>
    <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
  </div>
)

const SMSNode = ({ data, selected }: NodeProps) => (
  <div className={`bg-gradient-to-r from-green-500 to-green-600 text-white p-4 rounded-lg shadow-lg min-w-[220px] ${selected ? 'ring-2 ring-green-300' : ''}`}>
    <Handle type="target" position={Position.Top} className="w-3 h-3" />
    <div className="flex items-center justify-between mb-2">
      <MessageSquare className="w-5 h-5" />
      <span className="text-xs bg-green-700 px-2 py-1 rounded">Action</span>
    </div>
    <div className="font-bold text-sm mb-1">{data.label}</div>
    <div className="text-xs opacity-80">{data.description || 'Configure SMS...'}</div>
    <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
  </div>
)

const ConditionNode = ({ data, selected }: NodeProps) => (
  <div className={`bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-4 rounded-lg shadow-lg min-w-[220px] ${selected ? 'ring-2 ring-indigo-300' : ''}`}>
    <Handle type="target" position={Position.Top} className="w-3 h-3" />
    <div className="flex items-center justify-between mb-2">
      <Filter className="w-5 h-5" />
      <span className="text-xs bg-indigo-700 px-2 py-1 rounded">Condition</span>
    </div>
    <div className="font-bold text-sm mb-1">{data.label}</div>
    <div className="text-xs opacity-80">{data.description || 'Configure condition...'}</div>
    <Handle type="source" position={Position.Right} className="w-3 h-3" id="yes">
      <span className="absolute -top-6 right-0 text-xs">Yes</span>
    </Handle>
    <Handle type="source" position={Position.Bottom} className="w-3 h-3" id="no">
      <span className="absolute top-4 left-1/2 -translate-x-1/2 text-xs">No</span>
    </Handle>
  </div>
)

const nodeTypes = {
  trigger: TriggerNode,
  email: EmailNode,
  wait: WaitNode,
  sms: SMSNode,
  condition: ConditionNode
}

// Node templates for the sidebar
const nodeTemplates = [
  {
    type: 'trigger',
    subtype: 'lead_trigger',
    label: 'Lead Trigger',
    description: 'When a new lead is created',
    icon: Users,
    category: 'Triggers'
  },
  {
    type: 'trigger',
    subtype: 'birthday_trigger',
    label: 'Birthday Trigger',
    description: 'When it\'s a contact\'s birthday',
    icon: Calendar,
    category: 'Triggers'
  },
  {
    type: 'trigger',
    subtype: 'contact_changed',
    label: 'Contact Changed',
    description: 'When contact info changes',
    icon: Users,
    category: 'Triggers'
  },
  {
    type: 'trigger',
    subtype: 'contact_tagged',
    label: 'Contact Tagged',
    description: 'When contact is tagged',
    icon: Tag,
    category: 'Triggers'
  },
  {
    type: 'trigger',
    subtype: 'custom_date_trigger',
    label: 'Custom Date',
    description: 'On specific dates/schedules',
    icon: Calendar,
    category: 'Triggers'
  },
  {
    type: 'trigger',
    subtype: 'webhook_received',
    label: 'Webhook',
    description: 'When webhook is received',
    icon: Webhook,
    category: 'Triggers'
  },
  {
    type: 'trigger',
    subtype: 'call_status_changed',
    label: 'Call Status',
    description: 'When call status changes',
    icon: Phone,
    category: 'Triggers'
  },
  {
    type: 'trigger',
    subtype: 'email_event',
    label: 'Email Event',
    description: 'Email opens, clicks, etc.',
    icon: MailOpen,
    category: 'Triggers'
  },
  {
    type: 'trigger',
    subtype: 'appointment_status',
    label: 'Appointment',
    description: 'Appointment status changes',
    icon: Calendar,
    category: 'Triggers'
  },
  {
    type: 'trigger',
    subtype: 'opportunity_created',
    label: 'Opportunity Created',
    description: 'When new opportunity is created',
    icon: Target,
    category: 'Triggers'
  },
  {
    type: 'trigger',
    subtype: 'opportunity_stage_changed',
    label: 'Opportunity Stage',
    description: 'When opportunity stage changes',
    icon: TrendingUp,
    category: 'Triggers'
  },
  {
    type: 'trigger',
    subtype: 'customer_replied',
    label: 'Customer Replied',
    description: 'When customer replies to message',
    icon: Reply,
    category: 'Triggers'
  },
  {
    type: 'trigger',
    subtype: 'survey_submitted',
    label: 'Survey Submitted',
    description: 'When survey is submitted',
    icon: ClipboardCheck,
    category: 'Triggers'
  },
  {
    type: 'trigger',
    subtype: 'form_submitted',
    label: 'Form Submitted',
    description: 'When form is submitted',
    icon: FileText,
    category: 'Triggers'
  },
  {
    type: 'trigger',
    subtype: 'note_added',
    label: 'Note Added',
    description: 'When note is added to contact',
    icon: StickyNote,
    category: 'Triggers'
  },
  {
    type: 'trigger',
    subtype: 'task_reminder',
    label: 'Task Reminder',
    description: 'Task due date reminders',
    icon: Bell,
    category: 'Triggers'
  },
  {
    type: 'email',
    label: 'Send Email',
    description: 'Send an email to the lead',
    icon: Mail,
    category: 'Actions'
  },
  {
    type: 'sms',
    label: 'Send SMS',
    description: 'Send an SMS message',
    icon: MessageSquare,
    category: 'Actions'
  },
  {
    type: 'wait',
    label: 'Wait',
    description: 'Wait before next action',
    icon: Clock,
    category: 'Logic'
  },
  {
    type: 'condition',
    label: 'If/Else',
    description: 'Branch based on conditions',
    icon: Filter,
    category: 'Logic'
  }
]

interface EnhancedWorkflowBuilderProps {
  organizationId: string
  workflowId?: string
  onSave?: (workflow: any) => void
}

export default function EnhancedWorkflowBuilder({ organizationId, workflowId, onSave }: EnhancedWorkflowBuilderProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [showConfigPanel, setShowConfigPanel] = useState(false)
  const [showAIAssistant, setShowAIAssistant] = useState(true)
  const [aiSuggestion, setAiSuggestion] = useState<string>('')
  const [workflowName, setWorkflowName] = useState('New Workflow')

  // Initialize with a trigger node
  useEffect(() => {
    if (nodes.length === 0) {
      const triggerNode = {
        id: '1',
        type: 'trigger',
        position: { x: 250, y: 50 },
        data: { 
          label: 'New Lead', 
          description: 'When a lead is created',
          subtype: 'lead_trigger',
          config: {}
        }
      }
      setNodes([triggerNode])
    }
  }, [])

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
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top
      }

      const newNode = {
        id: `${Date.now()}`,
        type: template.type,
        position,
        data: {
          label: template.label,
          description: template.description,
          subtype: template.subtype || template.type,
          config: {}
        }
      }

      setNodes((nds) => nds.concat(newNode))
      
      // Show AI suggestion for next step
      generateAISuggestion(newNode)
    },
    [reactFlowWrapper, setNodes]
  )

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node)
    setShowConfigPanel(true)
  }, [])

  const onDragStart = (event: React.DragEvent, template: any) => {
    event.dataTransfer.setData('application/reactflow', JSON.stringify(template))
    event.dataTransfer.effectAllowed = 'move'
  }

  const updateNodeConfig = (config: any) => {
    if (!selectedNode) return

    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNode.id) {
          // Update description based on config
          let description = node.data.description
          
          if (node.type === 'trigger' && config.sourceId) {
            description = `From: ${config.sourceDetails?.pageName || config.sourceId}`
          } else if (node.type === 'email') {
            if (config.mode === 'template' && config.templateId) {
              description = 'Send template email'
            } else if (config.mode === 'custom' && config.customEmail?.subject) {
              description = `Subject: ${config.customEmail.subject.substring(0, 30)}...`
            }
          } else if (node.type === 'wait' && config.duration) {
            description = `Wait ${config.duration.value} ${config.duration.unit}`
          } else if (node.type === 'sms' && config.message) {
            description = `SMS: ${config.message.substring(0, 30)}...`
          }

          return {
            ...node,
            data: {
              ...node.data,
              config,
              description
            }
          }
        }
        return node
      })
    )
  }

  const generateAISuggestion = async (lastNode?: Node) => {
    // Simulate AI analysis
    const suggestions = {
      trigger: "Great start! Now add an action. Try sending a welcome email or SMS to engage the lead immediately.",
      email: "Email added! Consider adding a wait period before the next action to avoid overwhelming the lead.",
      sms: "SMS is great for quick engagement! Add a condition to check if they responded before sending follow-ups.",
      wait: "Good timing strategy! Now add a follow-up action like another email or SMS.",
      condition: "Smart branching! Add different actions for each path to personalize the journey."
    }

    const type = lastNode?.type || 'trigger'
    setAiSuggestion(suggestions[type as keyof typeof suggestions] || "Keep building your workflow!")
  }

  const improveWithAI = async () => {
    // Analyze current workflow and provide suggestions
    const nodeCount = nodes.length
    const hasEmail = nodes.some(n => n.type === 'email')
    const hasSMS = nodes.some(n => n.type === 'sms')
    const hasWait = nodes.some(n => n.type === 'wait')

    let suggestion = "Here are some improvements for your workflow:\n\n"

    if (nodeCount === 1) {
      suggestion += "• Add an immediate response action (email or SMS) to engage leads quickly\n"
    }
    
    if (!hasWait && nodeCount > 2) {
      suggestion += "• Add wait periods between actions to avoid overwhelming leads\n"
    }
    
    if (!hasSMS && hasEmail) {
      suggestion += "• Consider adding SMS for higher open rates (98% vs 20% for email)\n"
    }
    
    if (nodeCount > 3 && !nodes.some(n => n.type === 'condition')) {
      suggestion += "• Add conditions to personalize the journey based on lead behavior\n"
    }

    suggestion += "\nWould you like me to add these improvements automatically?"
    
    setAiSuggestion(suggestion)
  }

  const saveWorkflow = async () => {
    const workflowData = {
      name: workflowName,
      nodes: nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          config: node.data.config || {}
        }
      })),
      edges,
      organizationId,
      status: 'active'
    }

    if (onSave) {
      onSave(workflowData)
    } else {
      // Save to database
      try {
        const response = await fetch('/api/workflows', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workflowData)
        })

        if (response.ok) {
          safeAlert('Workflow saved successfully!')
        } else {
          safeAlert('Failed to save workflow')
        }
      } catch (error) {
        console.error('Save error:', error)
        safeAlert('Error saving workflow')
      }
    }
  }

  const renderConfigPanel = () => {
    if (!selectedNode) return null

    const commonProps = {
      config: selectedNode.data.config || {},
      onChange: updateNodeConfig,
      organizationId
    }

    // Handle trigger subtypes
    if (selectedNode.type === 'trigger') {
      const subtype = selectedNode.data.subtype || 'lead_trigger'
      
      switch (subtype) {
        case 'lead_trigger':
          return <LeadTriggerConfig {...commonProps} />
        case 'birthday_trigger':
          return <BirthdayTriggerConfig {...commonProps} />
        case 'contact_changed':
          return <ContactChangedTriggerConfig {...commonProps} />
        case 'contact_tagged':
          return <ContactTagTriggerConfig {...commonProps} />
        case 'custom_date_trigger':
          return <CustomDateTriggerConfig {...commonProps} />
        case 'webhook_received':
          return <WebhookTriggerConfig {...commonProps} />
        case 'call_status_changed':
          return <CallStatusTriggerConfig {...commonProps} />
        case 'email_event':
          return <EmailEventTriggerConfig {...commonProps} />
        case 'appointment_status':
          return <AppointmentTriggerConfig {...commonProps} />
        case 'opportunity_created':
          return <OpportunityCreatedTriggerConfig {...commonProps} />
        case 'opportunity_stage_changed':
          return <OpportunityStageChangedTriggerConfig {...commonProps} />
        case 'customer_replied':
          return <CustomerRepliedTriggerConfig {...commonProps} />
        case 'survey_submitted':
          return <SurveySubmittedTriggerConfig {...commonProps} />
        case 'form_submitted':
          return <FormSubmittedTriggerConfig {...commonProps} />
        case 'note_added':
          return <NoteAddedTriggerConfig {...commonProps} />
        case 'task_reminder':
          return <TaskReminderTriggerConfig {...commonProps} />
        default:
          return <LeadTriggerConfig {...commonProps} />
      }
    }

    // Handle other node types
    switch (selectedNode.type) {
      case 'email':
        return <EmailActionConfig {...commonProps} />
      case 'wait':
        return <WaitActionConfig {...commonProps} />
      case 'sms':
        return <SMSActionConfig {...commonProps} />
      default:
        return <div className="p-4 text-gray-500">Configuration not available for this node type</div>
    }
  }

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Node Templates */}
      <div className="w-64 bg-gray-50 border-r border-gray-200 p-4 overflow-y-auto">
        <h3 className="font-semibold text-gray-900 mb-4">Workflow Nodes</h3>
        
        {['Triggers', 'Actions', 'Logic'].map((category) => (
          <div key={category} className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-2">{category}</h4>
            <div className="space-y-2">
              {nodeTemplates
                .filter((t) => t.category === category)
                .map((template) => (
                  <div
                    key={template.type}
                    draggable
                    onDragStart={(e) => onDragStart(e, template)}
                    className="flex items-center p-3 bg-white rounded-lg border border-gray-200 cursor-move hover:border-blue-300 hover:shadow-sm transition-all"
                  >
                    <template.icon className="w-5 h-5 text-gray-600 mr-3" />
                    <div>
                      <div className="text-sm font-medium">{template.label}</div>
                      <div className="text-xs text-gray-500">{template.description}</div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ))}
      </div>

      {/* Main Canvas */}
      <div className="flex-1 relative">
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="text-lg font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1"
              placeholder="Workflow Name"
            />
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowAIAssistant(!showAIAssistant)}
                className="px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 flex items-center"
              >
                <Bot className="w-4 h-4 mr-1" />
                AI Assistant
              </button>
              <button
                onClick={saveWorkflow}
                className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
              >
                <Save className="w-4 h-4 mr-1" />
                Save Workflow
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
            nodeTypes={nodeTypes}
            fitView
            className="bg-gray-50"
          >
            <Background color="#e5e7eb" gap={16} />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {/* AI Assistant */}
        {showAIAssistant && (
          <div className="absolute bottom-4 left-4 w-80 bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center">
                <Bot className="w-5 h-5 text-purple-600 mr-2" />
                <h3 className="font-semibold">AI Assistant</h3>
              </div>
              <button
                onClick={() => setShowAIAssistant(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4">
              {aiSuggestion ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-700">{aiSuggestion}</p>
                  <button
                    onClick={improveWithAI}
                    className="w-full px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 text-sm flex items-center justify-center"
                  >
                    <Lightbulb className="w-4 h-4 mr-1" />
                    Get More Suggestions
                  </button>
                </div>
              ) : (
                <button
                  onClick={improveWithAI}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:shadow-lg transition-shadow flex items-center justify-center"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Click here to improve your build with AI
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Sidebar - Configuration Panel */}
      {showConfigPanel && selectedNode && (
        <div className="w-96 bg-white border-l border-gray-200 shadow-lg overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                Configure {selectedNode.data.label}
              </h3>
              <button
                onClick={() => {
                  setShowConfigPanel(false)
                  setSelectedNode(null)
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="p-4">
            {renderConfigPanel()}
          </div>
        </div>
      )}
    </div>
  )
}

// Wrap with ReactFlowProvider
export function EnhancedWorkflowBuilderWrapper(props: EnhancedWorkflowBuilderProps) {
  return (
    <ReactFlowProvider>
      <EnhancedWorkflowBuilder {...props} />
    </ReactFlowProvider>
  )
}