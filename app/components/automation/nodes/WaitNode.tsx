'use client'

import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { Clock, Settings } from 'lucide-react'
import type { CustomNodeProps } from '@/app/lib/types/automation'

const WaitNode = ({ data, selected }: CustomNodeProps) => {
  return (
    <div className={`bg-gray-800 rounded-lg border-2 transition-all min-w-[180px] ${
      selected ? 'border-green-500 shadow-lg shadow-green-500/20' : 'border-gray-600'
    } ${data.error ? 'border-red-500' : ''}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-green-500 border-2 border-gray-900"
      />
      
      <div className="bg-gray-700 px-4 py-2 rounded-t-lg border-b border-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-green-400" />
            <span className="font-medium text-sm">Wait</span>
          </div>
          <button className="hover:bg-gray-600 p-1 rounded transition-colors">
            <Settings className="h-3 w-3" />
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <h4 className="font-medium text-sm mb-1">{data.label || 'Wait'}</h4>
        
        {data.config?.duration && data.config?.unit ? (
          <div className="text-sm bg-gray-700 px-2 py-1 rounded">
            {data.config.duration} {data.config.unit}
          </div>
        ) : data.config?.datetime ? (
          <div className="text-sm bg-gray-700 px-2 py-1 rounded">
            Until: {new Date(data.config.datetime).toLocaleString('en-GB')}
          </div>
        ) : data.config?.condition ? (
          <div className="text-sm bg-gray-700 px-2 py-1 rounded">
            Condition: {data.config.condition.substring(0, 30)}...
          </div>
        ) : (
          <p className="text-xs text-gray-400">Duration not set</p>
        )}
        
        {data.error && (
          <div className="mt-2 text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded">
            {data.error}
          </div>
        )}
      </div>
      
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-3 h-3 bg-green-500 border-2 border-gray-900"
      />
    </div>
  )
}

export default memo(WaitNode)