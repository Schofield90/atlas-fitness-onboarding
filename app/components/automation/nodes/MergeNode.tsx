'use client'

import { Handle, Position, NodeProps } from 'reactflow'
import { useState } from 'react'
import { Merge, ChevronDown, ChevronRight, AlertCircle, CheckCircle, Clock } from 'lucide-react'

interface MergeNodeData {
  label: string
  description?: string
  icon?: string
  config: {
    strategy: 'wait_all' | 'wait_first' | 'wait_majority'
    timeout?: number
    inputs: number
    completedInputs?: number[]
  }
  isValid?: boolean
  error?: string
}

export function MergeNode({ data, selected }: NodeProps<MergeNodeData>) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getMergeSummary = () => {
    const { config } = data
    const strategyText = {
      'wait_all': 'Wait for all',
      'wait_first': 'First completes',
      'wait_majority': 'Majority completes'
    }[config.strategy]
    
    const completionText = config.completedInputs 
      ? ` (${config.completedInputs.length}/${config.inputs})` 
      : ''
    
    return `${strategyText}${completionText}`
  }

  const getNodeColor = () => {
    if (!data.isValid) return 'border-red-500 bg-red-900/20'
    if (selected) return 'border-cyan-400 bg-cyan-900/30'
    
    // Color based on completion status
    if (data.config.completedInputs) {
      const completion = data.config.completedInputs.length / data.config.inputs
      if (completion === 1) return 'border-green-500 bg-green-900/20'
      if (completion > 0) return 'border-yellow-500 bg-yellow-900/20'
    }
    
    return 'border-cyan-600 bg-cyan-900/20'
  }

  const getStatusIcon = () => {
    if (!data.isValid) {
      return <AlertCircle className="w-4 h-4 text-red-400" />
    }
    
    if (data.config.completedInputs) {
      const completion = data.config.completedInputs.length / data.config.inputs
      if (completion === 1) return <CheckCircle className="w-4 h-4 text-green-400" />
      if (completion > 0) return <Clock className="w-4 h-4 text-yellow-400" />
    }
    
    return <CheckCircle className="w-4 h-4 text-cyan-400" />
  }

  const getInputHandles = () => {
    const handles = []
    const positions = [
      { position: Position.Top, style: { top: -6, left: '20%' } },
      { position: Position.Top, style: { top: -6, left: '40%' } },
      { position: Position.Top, style: { top: -6, left: '60%' } },
      { position: Position.Top, style: { top: -6, left: '80%' } },
      { position: Position.Left, style: { left: -6, top: '25%' } },
      { position: Position.Left, style: { left: -6, top: '75%' } },
    ]

    for (let i = 0; i < Math.min(data.config.inputs, 6); i++) {
      const pos = positions[i]
      const isCompleted = data.config.completedInputs?.includes(i)
      
      handles.push(
        <Handle
          key={`input-${i}`}
          type="target"
          position={pos.position}
          id={`input-${i}`}
          className={`w-3 h-3 border-2 ${
            isCompleted 
              ? 'bg-green-400 border-green-300' 
              : 'bg-cyan-500 border-cyan-300'
          }`}
          style={pos.style}
        />
      )
    }

    return handles
  }

  const getCompletionPercentage = () => {
    if (!data.config.completedInputs) return 0
    return (data.config.completedInputs.length / data.config.inputs) * 100
  }

  const isReadyToProceed = () => {
    if (!data.config.completedInputs) return false
    
    const completed = data.config.completedInputs.length
    const total = data.config.inputs
    
    switch (data.config.strategy) {
      case 'wait_all':
        return completed === total
      case 'wait_first':
        return completed >= 1
      case 'wait_majority':
        return completed > total / 2
      default:
        return false
    }
  }

  return (
    <div className={`bg-gray-800 rounded-lg border-2 shadow-lg min-w-[280px] transition-all ${getNodeColor()}`}>
      {/* Dynamic Input Handles */}
      {getInputHandles()}
      
      {/* Node Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="text-xl">{data.icon || '🔗'}</div>
            <div className="flex-1">
              <div className="text-white font-medium text-sm">{data.label}</div>
              <div className="text-cyan-300 text-xs mt-1">{getMergeSummary()}</div>
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

        {/* Completion Progress */}
        {data.config.completedInputs && (
          <div className="mt-2">
            <div className="w-full bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  isReadyToProceed() ? 'bg-green-400' : 'bg-cyan-400'
                }`}
                style={{ width: `${getCompletionPercentage()}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 mt-1 flex justify-between">
              <span>{data.config.completedInputs.length} of {data.config.inputs} inputs received</span>
              {isReadyToProceed() && (
                <span className="text-green-400 font-medium">Ready to proceed</span>
              )}
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
                <span className="text-gray-400">Input Count:</span>
                <span className="text-gray-200 font-mono">{data.config.inputs}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Merge Strategy:</span>
                <span className="text-gray-200 capitalize">
                  {data.config.strategy.replace('_', ' ')}
                </span>
              </div>

              {data.config.timeout && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Timeout:</span>
                  <span className="text-gray-200">{data.config.timeout}s</span>
                </div>
              )}

              {/* Strategy Explanation */}
              <div className="mt-2 p-2 bg-blue-900/30 border border-blue-600 rounded">
                <div className="text-blue-300 text-xs font-medium mb-1">Merge Strategy</div>
                <div className="text-blue-200 text-xs">
                  {data.config.strategy === 'wait_all' && '• Waits for all inputs to complete before proceeding'}
                  {data.config.strategy === 'wait_first' && '• Proceeds as soon as first input completes'}
                  {data.config.strategy === 'wait_majority' && '• Proceeds when majority of inputs complete'}
                </div>
              </div>

              {/* Data Merging Info */}
              <div className="mt-2 p-2 bg-purple-900/30 border border-purple-600 rounded">
                <div className="text-purple-300 text-xs font-medium mb-1">Data Merging</div>
                <div className="text-purple-200 text-xs">
                  • Input data is combined into single output
                  • Maintains execution context from all branches
                  • Handles data conflicts automatically
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Output Handle */}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className={`w-3 h-3 border-2 ${
          isReadyToProceed() 
            ? 'bg-green-500 border-green-300' 
            : 'bg-cyan-500 border-cyan-300'
        }`}
      />
    </div>
  )
}