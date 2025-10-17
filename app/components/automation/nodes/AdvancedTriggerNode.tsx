'use client'

import { Handle, Position, NodeProps } from 'reactflow'
import { useState } from 'react'
import { ChevronDown, ChevronRight, Play, AlertCircle, CheckCircle } from 'lucide-react'

interface TriggerNodeData {
  label: string
  description?: string
  icon?: string
  config: any
  isValid?: boolean
  error?: string
  isActive?: boolean
  lastTriggered?: string
  triggerCount?: number
}

export function AdvancedTriggerNode({ data, selected }: NodeProps<TriggerNodeData>) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getTriggerSummary = () => {
    switch (data.label) {
      case 'New Lead':
        return data.config.source === 'all' ? 'Any source' : `Source: ${data.config.source}`
      case 'Form Submitted':
        return data.config.formId === 'all' ? 'Any form' : `Form: ${data.config.formName || 'Selected'}`
      case 'Lead Score Change':
        return `${data.config.direction === 'increase' ? '↗️' : '↘️'} ${data.config.scoreThreshold} points`
      case 'Email Activity':
        return `${data.config.activity} activity`
      default:
        return 'Trigger not configured'
    }
  }

  const getNodeColor = () => {
    if (!data.isValid) return 'border-red-500 bg-red-900/20'
    if (selected) return 'border-orange-400 bg-orange-900/30'
    if (data.isActive) return 'border-orange-600 bg-orange-900/20'
    return 'border-gray-600 bg-gray-900/20'
  }

  const getStatusIcon = () => {
    if (!data.isValid) {
      return <AlertCircle className="w-4 h-4 text-red-400" />
    }
    if (data.isActive) {
      return <Play className="w-4 h-4 text-green-400" />
    }
    return <CheckCircle className="w-4 h-4 text-gray-400" />
  }

  const getTriggerIcon = () => {
    if (data.icon) return data.icon
    
    switch (data.label) {
      case 'New Lead': return '👤'
      case 'Form Submitted': return '📝'
      case 'Lead Score Change': return '📊'
      case 'Email Activity': return '📧'
      case 'Schedule': return '📅'
      case 'Webhook': return '🔗'
      default: return '⚡'
    }
  }

  const formatLastTriggered = (timestamp?: string) => {
    if (!timestamp) return 'Never'
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))

    if (minutes < 1) return 'Just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    return `${days}d ago`
  }

  return (
    <div className={`bg-gray-800 rounded-lg border-2 shadow-lg min-w-[250px] transition-all ${getNodeColor()}`}>
      {/* Node Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="text-xl">{getTriggerIcon()}</div>
            <div className="flex-1">
              <div className="text-white font-medium text-sm flex items-center gap-2">
                {data.label}
                {data.isActive && (
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                )}
              </div>
              <div className="text-orange-300 text-xs mt-1">{getTriggerSummary()}</div>
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

        {/* Trigger Stats */}
        <div className="mt-2 flex items-center gap-4 text-xs">
          <div className="text-gray-400">
            <span className="text-gray-300">{data.triggerCount || 0}</span> triggers
          </div>
          <div className="text-gray-400">
            Last: <span className="text-gray-300">{formatLastTriggered(data.lastTriggered)}</span>
          </div>
        </div>

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
                <span className="text-gray-400">Trigger Type:</span>
                <span className="text-gray-200 font-mono">{data.label}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Status:</span>
                <span className={`text-xs font-medium ${data.isActive ? 'text-green-400' : 'text-gray-400'}`}>
                  {data.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {/* Trigger-specific details */}
              {data.label === 'New Lead' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Source Filter:</span>
                    <span className="text-gray-200">{data.config.source || 'All'}</span>
                  </div>
                  {data.config.leadScore && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Score Range:</span>
                      <span className="text-gray-200">
                        {data.config.leadScore.min}-{data.config.leadScore.max}
                      </span>
                    </div>
                  )}
                </>
              )}

              {data.label === 'Form Submitted' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Form:</span>
                    <span className="text-gray-200">{data.config.formName || 'Any'}</span>
                  </div>
                  {data.config.fields && data.config.fields.length > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Required Fields:</span>
                      <span className="text-gray-200">{data.config.fields.length}</span>
                    </div>
                  )}
                </>
              )}

              {data.label === 'Lead Score Change' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Threshold:</span>
                    <span className="text-gray-200">{data.config.scoreThreshold}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Direction:</span>
                    <span className="text-gray-200 capitalize">{data.config.direction}</span>
                  </div>
                </>
              )}

              {data.label === 'Email Activity' && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Activity:</span>
                    <span className="text-gray-200 capitalize">{data.config.activity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Template:</span>
                    <span className="text-gray-200">{data.config.templateId === 'any' ? 'Any' : 'Specific'}</span>
                  </div>
                </>
              )}

              {/* Conditions */}
              {data.config.conditions && data.config.conditions.length > 0 && (
                <div className="mt-2 p-2 bg-blue-900/30 border border-blue-600 rounded">
                  <div className="text-blue-300 text-xs font-medium mb-1">Additional Conditions</div>
                  <div className="text-blue-200 text-xs">
                    {data.config.conditions.length} condition(s) must be met
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
        className="w-3 h-3 bg-orange-500 border-2 border-orange-300" 
      />
    </div>
  )
}