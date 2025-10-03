'use client'

import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { Repeat, Settings } from 'lucide-react'
import type { CustomNodeProps } from '@/app/lib/types/automation'

const LoopNode = ({ data, selected }: CustomNodeProps) => {
  return (
    <div className={`bg-gray-800 rounded-lg border-2 transition-all min-w-[200px] ${
      selected ? 'border-yellow-500 shadow-lg shadow-yellow-500/20' : 'border-gray-600'
    } ${data.error ? 'border-red-500' : ''}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-yellow-500 border-2 border-gray-900"
      />
      
      <div className="bg-gray-700 px-4 py-2 rounded-t-lg border-b border-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat className="h-4 w-4 text-yellow-400" />
            <span className="font-medium text-sm">Loop</span>
          </div>
          <button className="hover:bg-gray-600 p-1 rounded transition-colors">
            <Settings className="h-3 w-3" />
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <h4 className="font-medium text-sm mb-1">{data.label || 'For Each'}</h4>
        
        {data.config?.items ? (
          <div className="space-y-1">
            <div className="text-xs bg-gray-700 px-2 py-1 rounded">
              Items: {data.config.items}
            </div>
            {data.config.maxIterations && (
              <div className="text-xs bg-gray-700 px-2 py-1 rounded">
                Max: {data.config.maxIterations} iterations
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No items configured</p>
        )}
        
        {data.error && (
          <div className="mt-2 text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded">
            {data.error}
          </div>
        )}
      </div>
      
      {/* Loop body */}
      <Handle
        type="source"
        position={Position.Right}
        id="loop"
        className="w-3 h-3 bg-yellow-500 border-2 border-gray-900"
      >
        <div className="absolute -right-8 top-1/2 transform -translate-y-1/2 text-xs text-yellow-400">
          Loop
        </div>
      </Handle>
      
      {/* Continue */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="done"
        className="w-3 h-3 bg-gray-500 border-2 border-gray-900"
      >
        <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs text-gray-400">
          Done
        </div>
      </Handle>
    </div>
  )
}

export default memo(LoopNode)