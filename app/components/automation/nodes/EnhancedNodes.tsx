'use client'

import React from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import {
  Zap,
  Mail,
  MessageSquare,
  Clock,
  Filter,
  Repeat,
  Shuffle,
  Merge,
  Transform,
  Users,
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
  Bell,
  X,
  Play,
  Pause,
  AlertCircle,
  CheckCircle,
  XCircle,
  RotateCcw,
  MessageCircle,
  Settings,
  Database,
  Code,
  GitBranch,
  Layers,
  Workflow,
  Activity,
  Brain,
  Sparkles
} from 'lucide-react'
import { NodeData } from '@/app/lib/types/automation'

// Base node component with common functionality
interface BaseNodeProps extends NodeProps {
  data: NodeData & {
    onDelete?: (id: string) => void
    executionStatus?: 'idle' | 'running' | 'completed' | 'failed' | 'paused'
    executionTime?: number
    iterationCount?: number
  }
}

const BaseNode: React.FC<BaseNodeProps & {
  children: React.ReactNode
  className?: string
  hasTargetHandle?: boolean
  hasSourceHandle?: boolean
  customHandles?: React.ReactNode
}> = ({
  id,
  data,
  selected,
  children,
  className = '',
  hasTargetHandle = true,
  hasSourceHandle = true,
  customHandles
}) => {
  const getStatusIndicator = () => {
    switch (data.executionStatus) {
      case 'running':
        return <Play className="w-3 h-3 text-blue-400 animate-pulse" />
      case 'completed':
        return <CheckCircle className="w-3 h-3 text-green-400" />
      case 'failed':
        return <XCircle className="w-3 h-3 text-red-400" />
      case 'paused':
        return <Pause className="w-3 h-3 text-yellow-400" />
      default:
        return null
    }
  }

  const getValidationIndicator = () => {
    if (data.error) {
      return <AlertCircle className="w-3 h-3 text-red-400" title={data.error} />
    }
    if (data.isValid === false) {
      return <AlertCircle className="w-3 h-3 text-orange-400" title="Configuration incomplete" />
    }
    return null
  }

  return (
    <div className={`relative group ${className} ${selected ? 'ring-2 ring-blue-300' : ''}`}>
      {/* Delete button */}
      {data.onDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            data.onDelete!(id)
          }}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 shadow-md z-10"
          title="Delete node"
        >
          <X className="w-3 h-3 text-white" />
        </button>
      )}

      {/* Status indicators */}
      <div className="absolute -top-2 -left-2 flex gap-1">
        {getStatusIndicator()}
        {getValidationIndicator()}
      </div>

      {/* Execution stats */}
      {(data.executionTime || data.iterationCount) && (
        <div className="absolute -bottom-6 left-0 right-0 flex justify-center">
          <div className="bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
            {data.executionTime && `${data.executionTime}ms`}
            {data.iterationCount && ` | ${data.iterationCount} loops`}
          </div>
        </div>
      )}

      {/* Target handle */}
      {hasTargetHandle && (
        <Handle type="target" position={Position.Top} className="w-3 h-3" />
      )}

      {children}

      {/* Source handle */}
      {hasSourceHandle && (
        <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
      )}

      {/* Custom handles */}
      {customHandles}
    </div>
  )
}

// Trigger Node Component
export const EnhancedTriggerNode: React.FC<BaseNodeProps> = (props) => {
  const { data } = props
  
  const getTriggerIcon = () => {
    switch (data.config?.subtype) {
      case 'lead_trigger': return <Users className="w-5 h-5" />
      case 'birthday_trigger': return <Calendar className="w-5 h-5" />
      case 'contact_tagged': return <Tag className="w-5 h-5" />
      case 'webhook_received': return <Webhook className="w-5 h-5" />
      case 'email_event': return <MailOpen className="w-5 h-5" />
      case 'appointment_status': return <Calendar className="w-5 h-5" />
      default: return <Zap className="w-5 h-5" />
    }
  }

  return (
    <BaseNode
      {...props}
      className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 rounded-lg shadow-lg min-w-[220px]"
      hasTargetHandle={false}
    >
      <div className="flex items-center justify-between mb-2">
        {getTriggerIcon()}
        <span className="text-xs bg-orange-700 px-2 py-1 rounded">Trigger</span>
      </div>
      <div className="font-bold text-sm mb-1">{data.label}</div>
      <div className="text-xs opacity-80">
        {data.description || 'Configure trigger...'}
      </div>
      {data.config?.frequency && (
        <div className="text-xs mt-2 bg-orange-700 bg-opacity-50 px-2 py-1 rounded">
          {data.config.frequency}
        </div>
      )}
    </BaseNode>
  )
}

// Action Node Component
export const EnhancedActionNode: React.FC<BaseNodeProps> = (props) => {
  const { data } = props
  
  const getActionIcon = () => {
    switch (data.actionType) {
      case 'send_email': return <Mail className="w-5 h-5" />
      case 'send_sms': return <MessageSquare className="w-5 h-5" />
      case 'send_whatsapp': return <MessageCircle className="w-5 h-5" />
      case 'create_task': return <ClipboardCheck className="w-5 h-5" />
      case 'update_contact': return <Users className="w-5 h-5" />
      case 'webhook': return <Webhook className="w-5 h-5" />
      case 'database': return <Database className="w-5 h-5" />
      case 'api_call': return <Code className="w-5 h-5" />
      default: return <Zap className="w-5 h-5" />
    }
  }

  const getActionColor = () => {
    switch (data.actionType) {
      case 'send_email': return 'from-blue-500 to-blue-600'
      case 'send_sms': return 'from-green-500 to-green-600'
      case 'send_whatsapp': return 'from-teal-500 to-teal-600'
      case 'create_task': return 'from-purple-500 to-purple-600'
      case 'update_contact': return 'from-indigo-500 to-indigo-600'
      case 'webhook': return 'from-gray-500 to-gray-600'
      case 'database': return 'from-cyan-500 to-cyan-600'
      case 'api_call': return 'from-pink-500 to-pink-600'
      default: return 'from-blue-500 to-blue-600'
    }
  }

  return (
    <BaseNode
      {...props}
      className={`bg-gradient-to-r ${getActionColor()} text-white p-4 rounded-lg shadow-lg min-w-[220px]`}
    >
      <div className="flex items-center justify-between mb-2">
        {getActionIcon()}
        <span className="text-xs bg-black bg-opacity-30 px-2 py-1 rounded">Action</span>
      </div>
      <div className="font-bold text-sm mb-1">{data.label}</div>
      <div className="text-xs opacity-80">
        {data.description || 'Configure action...'}
      </div>
      {data.config?.priority && (
        <div className="text-xs mt-2 bg-black bg-opacity-30 px-2 py-1 rounded">
          Priority: {data.config.priority}
        </div>
      )}
    </BaseNode>
  )
}

// Condition Node Component
export const EnhancedConditionNode: React.FC<BaseNodeProps> = (props) => {
  const { data } = props

  const customHandles = (
    <>
      <Handle type="source" position={Position.Right} className="w-3 h-3" id="true">
        <div className="absolute -top-6 right-0 text-xs text-green-600 font-medium">
          Yes
        </div>
      </Handle>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" id="false">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-xs text-red-600 font-medium">
          No
        </div>
      </Handle>
    </>
  )

  return (
    <BaseNode
      {...props}
      className="bg-gradient-to-r from-indigo-500 to-indigo-600 text-white p-4 rounded-lg shadow-lg min-w-[220px]"
      hasSourceHandle={false}
      customHandles={customHandles}
    >
      <div className="flex items-center justify-between mb-2">
        <Filter className="w-5 h-5" />
        <span className="text-xs bg-indigo-700 px-2 py-1 rounded">Condition</span>
      </div>
      <div className="font-bold text-sm mb-1">{data.label}</div>
      <div className="text-xs opacity-80">
        {data.description || 'Configure condition...'}
      </div>
      {data.config?.conditions && (
        <div className="text-xs mt-2 bg-indigo-700 bg-opacity-50 px-2 py-1 rounded">
          {Array.isArray(data.config.conditions) 
            ? `${data.config.conditions.length} rule(s)`
            : '1 rule'
          }
        </div>
      )}
    </BaseNode>
  )
}

// Wait/Delay Node Component
export const EnhancedWaitNode: React.FC<BaseNodeProps> = (props) => {
  const { data } = props

  const getWaitTypeIcon = () => {
    if (data.config?.waitType === 'dynamic') return <Brain className="w-5 h-5" />
    if (data.config?.waitType === 'until_time') return <Clock className="w-5 h-5" />
    return <Clock className="w-5 h-5" />
  }

  return (
    <BaseNode
      {...props}
      className="bg-gradient-to-r from-purple-500 to-purple-600 text-white p-4 rounded-lg shadow-lg min-w-[220px]"
    >
      <div className="flex items-center justify-between mb-2">
        {getWaitTypeIcon()}
        <span className="text-xs bg-purple-700 px-2 py-1 rounded">Wait</span>
      </div>
      <div className="font-bold text-sm mb-1">{data.label}</div>
      <div className="text-xs opacity-80">
        {data.description || 'Configure wait time...'}
      </div>
      {data.config?.duration && (
        <div className="text-xs mt-2 bg-purple-700 bg-opacity-50 px-2 py-1 rounded">
          {data.config.duration.value} {data.config.duration.unit}
        </div>
      )}
    </BaseNode>
  )
}

// Loop Node Component
export const EnhancedLoopNode: React.FC<BaseNodeProps> = (props) => {
  const { data } = props

  const customHandles = (
    <>
      <Handle type="source" position={Position.Right} className="w-3 h-3" id="loop-body">
        <div className="absolute -top-6 right-0 text-xs text-blue-600 font-medium">
          Loop
        </div>
      </Handle>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" id="exit">
        <div className="absolute top-4 left-1/2 -translate-x-1/2 text-xs text-green-600 font-medium">
          Exit
        </div>
      </Handle>
      <Handle type="target" position={Position.Left} className="w-3 h-3" id="loop-back">
        <div className="absolute -top-6 left-0 text-xs text-orange-600 font-medium">
          Back
        </div>
      </Handle>
    </>
  )

  return (
    <BaseNode
      {...props}
      className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-4 rounded-lg shadow-lg min-w-[220px]"
      hasSourceHandle={false}
      customHandles={customHandles}
    >
      <div className="flex items-center justify-between mb-2">
        <Repeat className="w-5 h-5" />
        <span className="text-xs bg-amber-700 px-2 py-1 rounded">Loop</span>
      </div>
      <div className="font-bold text-sm mb-1">{data.label}</div>
      <div className="text-xs opacity-80">
        {data.description || 'Configure loop...'}
      </div>
      {(data.config?.maxIterations || data.iterationCount) && (
        <div className="text-xs mt-2 bg-amber-700 bg-opacity-50 px-2 py-1 rounded">
          {data.iterationCount ? `${data.iterationCount}/` : ''}
          {data.config?.maxIterations || '∞'} iterations
        </div>
      )}
    </BaseNode>
  )
}

// Parallel Node Component  
export const EnhancedParallelNode: React.FC<BaseNodeProps> = (props) => {
  const { data } = props

  const branchCount = data.config?.branches || 2
  const customHandles = (
    <>
      {Array.from({ length: branchCount }, (_, i) => (
        <Handle
          key={i}
          type="source"
          position={Position.Bottom}
          className="w-3 h-3"
          id={`branch-${i}`}
          style={{ left: `${20 + (i * 60 / branchCount)}%` }}
        >
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-xs text-blue-600 font-medium">
            {i + 1}
          </div>
        </Handle>
      ))}
    </>
  )

  return (
    <BaseNode
      {...props}
      className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-4 rounded-lg shadow-lg min-w-[220px]"
      hasSourceHandle={false}
      customHandles={customHandles}
    >
      <div className="flex items-center justify-between mb-2">
        <GitBranch className="w-5 h-5" />
        <span className="text-xs bg-emerald-700 px-2 py-1 rounded">Parallel</span>
      </div>
      <div className="font-bold text-sm mb-1">{data.label}</div>
      <div className="text-xs opacity-80">
        {data.description || 'Configure parallel execution...'}
      </div>
      <div className="text-xs mt-2 bg-emerald-700 bg-opacity-50 px-2 py-1 rounded">
        {branchCount} branches | {data.config?.waitForAll ? 'Wait all' : 'Race mode'}
      </div>
    </BaseNode>
  )
}

// Merge Node Component
export const EnhancedMergeNode: React.FC<BaseNodeProps> = (props) => {
  const { data } = props

  const inputCount = data.config?.inputs || 2
  const customHandles = (
    <>
      {Array.from({ length: inputCount }, (_, i) => (
        <Handle
          key={i}
          type="target"
          position={Position.Top}
          className="w-3 h-3"
          id={`input-${i}`}
          style={{ left: `${20 + (i * 60 / inputCount)}%` }}
        />
      ))}
    </>
  )

  return (
    <BaseNode
      {...props}
      className="bg-gradient-to-r from-rose-500 to-rose-600 text-white p-4 rounded-lg shadow-lg min-w-[220px]"
      hasTargetHandle={false}
      customHandles={customHandles}
    >
      <div className="flex items-center justify-between mb-2">
        <Merge className="w-5 h-5" />
        <span className="text-xs bg-rose-700 px-2 py-1 rounded">Merge</span>
      </div>
      <div className="font-bold text-sm mb-1">{data.label}</div>
      <div className="text-xs opacity-80">
        {data.description || 'Configure merge strategy...'}
      </div>
      <div className="text-xs mt-2 bg-rose-700 bg-opacity-50 px-2 py-1 rounded">
        {inputCount} inputs | {data.config?.mergeStrategy || 'First wins'}
      </div>
    </BaseNode>
  )
}

// Transform Node Component
export const EnhancedTransformNode: React.FC<BaseNodeProps> = (props) => {
  const { data } = props

  return (
    <BaseNode
      {...props}
      className="bg-gradient-to-r from-violet-500 to-violet-600 text-white p-4 rounded-lg shadow-lg min-w-[220px]"
    >
      <div className="flex items-center justify-between mb-2">
        <Transform className="w-5 h-5" />
        <span className="text-xs bg-violet-700 px-2 py-1 rounded">Transform</span>
      </div>
      <div className="font-bold text-sm mb-1">{data.label}</div>
      <div className="text-xs opacity-80">
        {data.description || 'Configure data transformation...'}
      </div>
      {data.config?.transformations && (
        <div className="text-xs mt-2 bg-violet-700 bg-opacity-50 px-2 py-1 rounded">
          {data.config.transformations.length} transformation(s)
        </div>
      )}
    </BaseNode>
  )
}

// AI Node Component
export const EnhancedAINode: React.FC<BaseNodeProps> = (props) => {
  const { data } = props

  const getAIIcon = () => {
    switch (data.config?.aiType) {
      case 'decision': return <Brain className="w-5 h-5" />
      case 'content': return <Sparkles className="w-5 h-5" />
      case 'analysis': return <Activity className="w-5 h-5" />
      default: return <Brain className="w-5 h-5" />
    }
  }

  return (
    <BaseNode
      {...props}
      className="bg-gradient-to-r from-fuchsia-500 to-fuchsia-600 text-white p-4 rounded-lg shadow-lg min-w-[220px]"
    >
      <div className="flex items-center justify-between mb-2">
        {getAIIcon()}
        <span className="text-xs bg-fuchsia-700 px-2 py-1 rounded">AI</span>
      </div>
      <div className="font-bold text-sm mb-1">{data.label}</div>
      <div className="text-xs opacity-80">
        {data.description || 'Configure AI processing...'}
      </div>
      {data.config?.model && (
        <div className="text-xs mt-2 bg-fuchsia-700 bg-opacity-50 px-2 py-1 rounded">
          Model: {data.config.model}
        </div>
      )}
    </BaseNode>
  )
}

// Sub-workflow Node Component
export const EnhancedSubWorkflowNode: React.FC<BaseNodeProps> = (props) => {
  const { data } = props

  return (
    <BaseNode
      {...props}
      className="bg-gradient-to-r from-slate-500 to-slate-600 text-white p-4 rounded-lg shadow-lg min-w-[220px] border-2 border-dashed border-slate-300"
    >
      <div className="flex items-center justify-between mb-2">
        <Workflow className="w-5 h-5" />
        <span className="text-xs bg-slate-700 px-2 py-1 rounded">Sub-workflow</span>
      </div>
      <div className="font-bold text-sm mb-1">{data.label}</div>
      <div className="text-xs opacity-80">
        {data.description || 'Configure sub-workflow...'}
      </div>
      {data.config?.workflowId && (
        <div className="text-xs mt-2 bg-slate-700 bg-opacity-50 px-2 py-1 rounded">
          Workflow: {data.config.workflowName || data.config.workflowId}
        </div>
      )}
    </BaseNode>
  )
}

// Export all node types
export const enhancedNodeTypes = {
  trigger: EnhancedTriggerNode,
  action: EnhancedActionNode,
  condition: EnhancedConditionNode,
  wait: EnhancedWaitNode,
  loop: EnhancedLoopNode,
  parallel: EnhancedParallelNode,
  merge: EnhancedMergeNode,
  transform: EnhancedTransformNode,
  ai_node: EnhancedAINode,
  sub_workflow: EnhancedSubWorkflowNode
}