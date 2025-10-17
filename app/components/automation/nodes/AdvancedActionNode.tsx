'use client'

import { Handle, Position, NodeProps } from 'reactflow'
import { useState } from 'react'
import { ChevronDown, ChevronRight, Settings, AlertCircle, CheckCircle, Clock, Zap } from 'lucide-react'

interface ActionNodeData {
  label: string
  description?: string
  icon?: string
  config: any
  isValid?: boolean
  error?: string
  executionTime?: number
  status?: 'pending' | 'running' | 'completed' | 'failed'
}

export function AdvancedActionNode({ data, selected }: NodeProps<ActionNodeData>) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getActionSummary = () => {
    switch (data.label) {
      case 'Send Email':
        return data.config.templateId ? `Template: ${data.config.templateName || 'Selected'}` : 'Custom message'
      case 'Send SMS':
        return data.config.message ? `"${data.config.message.substring(0, 30)}..."` : 'No message set'
      case 'Add/Remove Tags':
        return data.config.action === 'add' ? `Add: ${data.config.tags?.join(', ') || 'none'}` : `Remove: ${data.config.tags?.join(', ') || 'none'}`
      case 'Update Lead Score':
        return `${data.config.operation === 'set' ? 'Set to' : data.config.operation === 'add' ? 'Add' : 'Subtract'} ${data.config.value || 0}`
      case 'Create Task':
        return data.config.title || 'Task title not set'
      default:
        return 'Action not configured'
    }
  }

  const getNodeColor = () => {
    if (!data.isValid) return 'border-red-500 bg-red-900/20'
    if (selected) return 'border-blue-400 bg-blue-900/30'
    if (data.status === 'running') return 'border-yellow-500 bg-yellow-900/20'
    if (data.status === 'completed') return 'border-green-500 bg-green-900/20'
    if (data.status === 'failed') return 'border-red-500 bg-red-900/20'
    return 'border-blue-600 bg-blue-900/20'
  }

  const getStatusIcon = () => {
    switch (data.status) {
      case 'running':
        return <Clock className="w-4 h-4 text-yellow-400 animate-spin" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-400" />
      default:
        return data.isValid ? (
          <CheckCircle className="w-4 h-4 text-green-400" />
        ) : (
          <AlertCircle className="w-4 h-4 text-red-400" />
        )
    }
  }

  const getActionIcon = () => {
    if (data.icon) return data.icon
    
    switch (data.label) {
      case 'Send Email': return '📧'
      case 'Send SMS': return '💬'
      case 'Send WhatsApp': return '💬'
      case 'Add/Remove Tags': return '🏷️'
      case 'Update Lead Score': return '📊'
      case 'Create Task': return '✅'
      case 'Wait': return '⏸️'
      default: return '⚡'
    }
  }

  return (
    <div className={`bg-gray-800 rounded-lg border-2 shadow-lg min-w-[250px] transition-all ${getNodeColor()}`}>
      {/* Input Handle */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 bg-blue-500 border-2 border-blue-300" 
      />
      
      {/* Node Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="text-xl">{getActionIcon()}</div>
            <div className="flex-1">
              <div className="text-white font-medium text-sm">{data.label}</div>
              <div className="text-blue-300 text-xs mt-1">{getActionSummary()}</div>
            </div>
          </div>
          
          {/* Status and Controls */}
          <div className="flex items-center gap-1">
            {getStatusIcon()}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-white"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Execution Time */}
        {data.executionTime && (
          <div className="mt-2 text-xs text-gray-400">
            Execution time: {data.executionTime}ms
          </div>
        )}

        {/* Error Message */}
        {data.error && (
          <div className="mt-2 p-2 bg-red-900/30 border border-red-600 rounded text-red-300 text-xs">
            {data.error}
          </div>
        )}

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-600">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-gray-400">Action Type:</span>
                <span className="text-gray-200 font-mono">{data.label}</span>
              </div>
              
              {/* Action-specific details */}
              {data.label === 'Send Email' && (
                <>
                  {data.config.subject && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Subject:</span>
                      <span className="text-gray-200 truncate max-w-32">{data.config.subject}</span>
                    </div>
                  )}
                  {data.config.templateId && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Template:</span>
                      <span className="text-gray-200">{data.config.templateName || 'Selected'}</span>
                    </div>
                  )}
                </>
              )}

              {data.label === 'Send SMS' && data.config.message && (
                <div>
                  <span className="text-gray-400">Message:</span>
                  <div className="mt-1 p-2 bg-gray-700 rounded text-gray-200 text-xs">
                    {data.config.message}
                  </div>
                </div>
              )}

              {data.label === 'Add/Remove Tags' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Action:</span>
                    <span className="text-gray-200 capitalize">{data.config.action || 'add'}</span>
                  </div>
                  {data.config.tags && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Tags:</span>
                      <span className="text-gray-200">{data.config.tags.join(', ')}</span>
                    </div>
                  )}
                </>
              )}

              {data.label === 'Update Lead Score' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Operation:</span>
                    <span className="text-gray-200 capitalize">{data.config.operation || 'add'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Value:</span>
                    <span className="text-gray-200">{data.config.value || 0}</span>
                  </div>
                </>
              )}

              {data.label === 'Wait' && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Duration:</span>
                  <span className="text-gray-200">{data.config.duration} {data.config.unit}</span>
                </div>
              )}

              {/* Conditional execution */}
              {data.config.conditions && data.config.conditions.length > 0 && (
                <div className="mt-2 p-2 bg-purple-900/30 border border-purple-600 rounded">
                  <div className="text-purple-300 text-xs font-medium mb-1">Conditional Execution</div>
                  <div className="text-purple-200 text-xs">
                    {data.config.conditions.length} condition(s) defined
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 bg-blue-500 border-2 border-blue-300" 
      />

      {/* Conditional Output Handles */}
      {data.config.hasConditionalOutputs && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            id="success"
            className="w-3 h-3 bg-green-500 border-2 border-green-300"
            style={{ right: -6 }}
          />
          <Handle
            type="source"
            position={Position.Left}
            id="failure"
            className="w-3 h-3 bg-red-500 border-2 border-red-300"
            style={{ left: -6 }}
          />
        </>
      )}
    </div>
  )
}