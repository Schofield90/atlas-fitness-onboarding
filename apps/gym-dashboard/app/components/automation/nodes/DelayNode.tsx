'use client'

import { Handle, Position, NodeProps } from 'reactflow'
import { useState } from 'react'
import { Clock, ChevronDown, ChevronRight, AlertCircle, CheckCircle, Pause } from 'lucide-react'

interface DelayNodeData {
  label: string
  description?: string
  icon?: string
  config: {
    baseDelay: {
      value: number
      unit: 'seconds' | 'minutes' | 'hours' | 'days'
    }
    conditions?: Array<{
      condition: any
      delayModifier: {
        operation: 'add' | 'multiply' | 'set'
        value: number
        unit?: string
      }
    }>
    dynamicDelay?: boolean
    currentDelay?: number
    isWaiting?: boolean
    timeRemaining?: number
  }
  isValid?: boolean
  error?: string
}

export function DelayNode({ data, selected }: NodeProps<DelayNodeData>) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getDelaySummary = () => {
    const { config } = data
    const baseText = `${config.baseDelay.value} ${config.baseDelay.unit}`
    
    if (config.isWaiting && config.timeRemaining !== undefined) {
      const remaining = Math.ceil(config.timeRemaining / 1000)
      return `${baseText} (${remaining}s remaining)`
    }
    
    if (config.conditions && config.conditions.length > 0) {
      return `${baseText} + ${config.conditions.length} condition(s)`
    }
    
    return baseText
  }

  const getNodeColor = () => {
    if (!data.isValid) return 'border-red-500 bg-red-900/20'
    if (selected) return 'border-amber-400 bg-amber-900/30'
    if (data.config.isWaiting) return 'border-blue-500 bg-blue-900/20'
    return 'border-amber-600 bg-amber-900/20'
  }

  const getStatusIcon = () => {
    if (!data.isValid) {
      return <AlertCircle className="w-4 h-4 text-red-400" />
    }
    if (data.config.isWaiting) {
      return <Clock className="w-4 h-4 text-blue-400 animate-pulse" />
    }
    return <CheckCircle className="w-4 h-4 text-amber-400" />
  }

  const formatDuration = (value: number, unit: string) => {
    if (value === 1) {
      return `1 ${unit.slice(0, -1)}` // Remove 's' for singular
    }
    return `${value} ${unit}`
  }

  const getProgressPercentage = () => {
    if (!data.config.isWaiting || !data.config.currentDelay || !data.config.timeRemaining) {
      return 0
    }
    
    const elapsed = data.config.currentDelay - data.config.timeRemaining
    return (elapsed / data.config.currentDelay) * 100
  }

  return (
    <div className={`bg-gray-800 rounded-lg border-2 shadow-lg min-w-[250px] transition-all ${getNodeColor()}`}>
      {/* Input Handle */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 bg-amber-500 border-2 border-amber-300" 
      />
      
      {/* Node Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="text-xl">
              {data.config.isWaiting ? (
                <Clock className="w-5 h-5 text-blue-400 animate-pulse" />
              ) : (
                <span>{data.icon || '⏸️'}</span>
              )}
            </div>
            <div className="flex-1">
              <div className="text-white font-medium text-sm">{data.label}</div>
              <div className="text-amber-300 text-xs mt-1">{getDelaySummary()}</div>
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

        {/* Wait Progress */}
        {data.config.isWaiting && data.config.timeRemaining !== undefined && (
          <div className="mt-2">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className="bg-blue-400 h-2 rounded-full transition-all duration-1000"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-1 text-center">
              {Math.ceil(data.config.timeRemaining / 1000)}s remaining
            </div>
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
                <span className="text-gray-400">Base Delay:</span>
                <span className="text-gray-200 font-mono">
                  {formatDuration(data.config.baseDelay.value, data.config.baseDelay.unit)}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Dynamic:</span>
                <span className={`text-sm font-medium ${data.config.dynamicDelay ? 'text-green-400' : 'text-gray-400'}`}>
                  {data.config.dynamicDelay ? 'Enabled' : 'Disabled'}
                </span>
              </div>

              {data.config.currentDelay && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Delay:</span>
                  <span className="text-gray-200">{Math.ceil(data.config.currentDelay / 1000)}s</span>
                </div>
              )}

              {/* Conditional Delays */}
              {data.config.conditions && data.config.conditions.length > 0 && (
                <div className="mt-2 p-2 bg-purple-900/30 border border-purple-600 rounded">
                  <div className="text-purple-300 text-xs font-medium mb-1">Conditional Delays</div>
                  <div className="space-y-1">
                    {data.config.conditions.map((condition, index) => (
                      <div key={index} className="text-purple-200 text-xs">
                        • {condition.delayModifier.operation} {condition.delayModifier.value}
                        {condition.delayModifier.unit && ` ${condition.delayModifier.unit}`}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Delay Types Info */}
              <div className="mt-2 p-2 bg-blue-900/30 border border-blue-600 rounded">
                <div className="text-blue-300 text-xs font-medium mb-1">Delay Types</div>
                <div className="text-blue-200 text-xs">
                  • Fixed: Uses base delay value
                  • Conditional: Modifies delay based on data
                  • Dynamic: Calculates delay at runtime
                </div>
              </div>

              {/* Business Hours Note */}
              {data.config.baseDelay.unit === 'hours' || data.config.baseDelay.unit === 'days' && (
                <div className="mt-2 p-2 bg-amber-900/30 border border-amber-600 rounded">
                  <div className="text-amber-300 text-xs font-medium mb-1">Business Hours</div>
                  <div className="text-amber-200 text-xs">
                    Long delays respect business hours and timezone settings
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
        className="w-3 h-3 bg-amber-500 border-2 border-amber-300" 
      />
    </div>
  )
}