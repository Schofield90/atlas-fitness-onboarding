'use client'

import { Handle, Position, NodeProps } from 'reactflow'
import { useState } from 'react'
import { ChevronDown, ChevronRight, Settings, AlertCircle, CheckCircle } from 'lucide-react'

interface ConditionNodeData {
  label: string
  description?: string
  icon?: string
  config: {
    conditionType: 'lead_score' | 'tags' | 'time_based' | 'field_comparison' | 'activity' | 'multi_condition'
    conditions?: any[]
    logic?: 'AND' | 'OR'
    operator?: string
    value?: any
    field?: string
    tags?: string[]
    timeType?: string
    activityType?: string
  }
  isValid?: boolean
  error?: string
}

export function AdvancedConditionNode({ data, selected }: NodeProps<ConditionNodeData>) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getConditionSummary = () => {
    const { config } = data
    switch (config.conditionType) {
      case 'lead_score':
        return `Score ${config.operator} ${config.value}`
      case 'tags':
        const tagText = config.tags?.length ? config.tags.join(', ') : 'any tags'
        return `Has ${tagText}`
      case 'time_based':
        return config.timeType === 'business_hours' ? 'During business hours' : config.timeType
      case 'field_comparison':
        return `${config.field} ${config.operator} ${config.value}`
      case 'activity':
        return `${config.activityType} activity`
      case 'multi_condition':
        return `${config.conditions?.length || 0} conditions (${config.logic})`
      default:
        return 'Condition not configured'
    }
  }

  const getNodeColor = () => {
    if (!data.isValid) return 'border-red-500 bg-red-900/20'
    if (selected) return 'border-purple-400 bg-purple-900/30'
    return 'border-purple-600 bg-purple-900/20'
  }

  const getBranchColors = () => {
    switch (data.config.conditionType) {
      case 'lead_score':
        return { true: '#10b981', false: '#ef4444' } // green/red for score
      case 'tags':
        return { true: '#3b82f6', false: '#6b7280' } // blue/gray for tags
      case 'time_based':
        return { true: '#f59e0b', false: '#6b7280' } // amber/gray for time
      case 'activity':
        return { true: '#8b5cf6', false: '#6b7280' } // purple/gray for activity
      default:
        return { true: '#10b981', false: '#ef4444' }
    }
  }

  const branchColors = getBranchColors()

  return (
    <div className={`bg-gray-800 rounded-lg border-2 shadow-lg min-w-[250px] transition-all ${getNodeColor()}`}>
      {/* Input Handle */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 bg-purple-500 border-2 border-purple-300" 
      />
      
      {/* Node Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="text-xl">{data.icon || '🤔'}</div>
            <div className="flex-1">
              <div className="text-white font-medium text-sm">{data.label}</div>
              <div className="text-purple-300 text-xs mt-1">{getConditionSummary()}</div>
            </div>
          </div>
          
          {/* Status Indicator */}
          <div className="flex items-center gap-1">
            {data.isValid ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400" />
            )}
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
                <span className="text-gray-400">Type:</span>
                <span className="text-gray-200 font-mono">{data.config.conditionType}</span>
              </div>
              
              {data.config.conditionType === 'multi_condition' && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Logic:</span>
                  <span className="text-gray-200 font-mono">{data.config.logic}</span>
                </div>
              )}
              
              {data.config.operator && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Operator:</span>
                  <span className="text-gray-200 font-mono">{data.config.operator}</span>
                </div>
              )}
              
              {data.config.value !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Value:</span>
                  <span className="text-gray-200 font-mono">
                    {typeof data.config.value === 'object' ? JSON.stringify(data.config.value) : String(data.config.value)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Branch Paths */}
      <div className="px-4 pb-4">
        <div className="flex justify-between items-center">
          <div className="flex flex-col items-center">
            <div className="text-xs text-green-300 font-medium mb-1">YES</div>
            <Handle
              type="source"
              position={Position.Right}
              id="true"
              className="w-3 h-3 border-2"
              style={{ 
                backgroundColor: branchColors.true,
                borderColor: branchColors.true,
                right: -6
              }}
            />
          </div>
          
          <div className="flex flex-col items-center">
            <div className="text-xs text-red-300 font-medium mb-1">NO</div>
            <Handle
              type="source"
              position={Position.Bottom}
              id="false"
              className="w-3 h-3 border-2"
              style={{
                backgroundColor: branchColors.false,
                borderColor: branchColors.false,
                bottom: -6
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Additional Handles for Multi-Branch Conditions */}
      {data.config.conditionType === 'multi_condition' && data.config.conditions && data.config.conditions.length > 2 && (
        <>
          <Handle
            type="source"
            position={Position.Left}
            id="alternative"
            className="w-3 h-3 bg-yellow-500 border-2 border-yellow-300"
            style={{ left: -6 }}
          />
        </>
      )}
    </div>
  )
}