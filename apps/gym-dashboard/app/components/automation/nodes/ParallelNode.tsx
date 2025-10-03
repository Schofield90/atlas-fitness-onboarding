'use client'

import { Handle, Position, NodeProps } from 'reactflow'
import { useState } from 'react'
import { Zap, ChevronDown, ChevronRight, AlertCircle, CheckCircle } from 'lucide-react'

interface ParallelNodeData {
  label: string
  description?: string
  icon?: string
  config: {
    branches: number
    waitForAll: boolean
    timeout?: number
    activeBranches?: number[]
  }
  isValid?: boolean
  error?: string
}

export function ParallelNode({ data, selected }: NodeProps<ParallelNodeData>) {
  const [isExpanded, setIsExpanded] = useState(false)

  const getParallelSummary = () => {
    const { config } = data
    const waitText = config.waitForAll ? 'Wait for all' : 'Continue on first'
    return `${config.branches} branches • ${waitText}`
  }

  const getNodeColor = () => {
    if (!data.isValid) return 'border-red-500 bg-red-900/20'
    if (selected) return 'border-yellow-400 bg-yellow-900/30'
    return 'border-yellow-600 bg-yellow-900/20'
  }

  const getStatusIcon = () => {
    if (!data.isValid) {
      return <AlertCircle className="w-4 h-4 text-red-400" />
    }
    return <CheckCircle className="w-4 h-4 text-yellow-400" />
  }

  const getBranchHandles = () => {
    const handles = []
    const positions = [
      { position: Position.Right, style: { right: -6, top: '25%' } },
      { position: Position.Right, style: { right: -6, top: '50%' } },
      { position: Position.Right, style: { right: -6, top: '75%' } },
      { position: Position.Bottom, style: { bottom: -6, left: '25%' } },
      { position: Position.Bottom, style: { bottom: -6, left: '75%' } },
    ]

    for (let i = 0; i < Math.min(data.config.branches, 5); i++) {
      const pos = positions[i]
      const isActive = data.config.activeBranches?.includes(i)
      
      handles.push(
        <Handle
          key={`branch-${i}`}
          type="source"
          position={pos.position}
          id={`branch-${i}`}
          className={`w-3 h-3 border-2 ${
            isActive 
              ? 'bg-green-400 border-green-300 animate-pulse' 
              : 'bg-yellow-500 border-yellow-300'
          }`}
          style={pos.style}
        />
      )
    }

    return handles
  }

  return (
    <div className={`bg-gray-800 rounded-lg border-2 shadow-lg min-w-[280px] transition-all ${getNodeColor()}`}>
      {/* Input Handle */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 bg-yellow-500 border-2 border-yellow-300" 
      />
      
      {/* Node Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2 flex-1">
            <div className="text-xl">{data.icon || '⚡'}</div>
            <div className="flex-1">
              <div className="text-white font-medium text-sm">{data.label}</div>
              <div className="text-yellow-300 text-xs mt-1">{getParallelSummary()}</div>
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

        {/* Branch Status */}
        {data.config.activeBranches && (
          <div className="mt-2">
            <div className="flex gap-1">
              {Array.from({ length: data.config.branches }, (_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full ${
                    data.config.activeBranches?.includes(i) 
                      ? 'bg-green-400 animate-pulse' 
                      : 'bg-gray-600'
                  }`}
                />
              ))}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {data.config.activeBranches.length} of {data.config.branches} branches active
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
                <span className="text-gray-400">Branches:</span>
                <span className="text-gray-200 font-mono">{data.config.branches}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-400">Execution Mode:</span>
                <span className="text-gray-200">
                  {data.config.waitForAll ? 'Wait for all' : 'First completion'}
                </span>
              </div>

              {data.config.timeout && (
                <div className="flex justify-between">
                  <span className="text-gray-400">Timeout:</span>
                  <span className="text-gray-200">{data.config.timeout}s</span>
                </div>
              )}

              {/* Parallel Execution Info */}
              <div className="mt-2 p-2 bg-blue-900/30 border border-blue-600 rounded">
                <div className="text-blue-300 text-xs font-medium mb-1">Parallel Execution</div>
                <div className="text-blue-200 text-xs">
                  • Branches execute simultaneously
                  • {data.config.waitForAll ? 'All branches must complete' : 'First completion triggers continuation'}
                  • Shared execution context
                </div>
              </div>

              {/* Performance Note */}
              <div className="mt-2 p-2 bg-amber-900/30 border border-amber-600 rounded">
                <div className="text-amber-300 text-xs font-medium mb-1">Performance Note</div>
                <div className="text-amber-200 text-xs">
                  High branch counts may impact performance. Consider using batch processing for large parallel operations.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Branch Handles */}
      {getBranchHandles()}
    </div>
  )
}