'use client'

import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { Zap, Settings } from 'lucide-react'
import type { CustomNodeProps } from '@/app/lib/types/automation'

const TriggerNode = ({ data, selected }: CustomNodeProps) => {
  return (
    <div className={`bg-gray-800 rounded-lg border-2 transition-all ${
      selected ? 'border-orange-500 shadow-lg shadow-orange-500/20' : 'border-orange-600'
    } ${data.error ? 'border-red-500' : ''}`}>
      <div className="bg-orange-600 px-4 py-2 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            <span className="font-medium text-sm">Trigger</span>
          </div>
          <button className="hover:bg-orange-700 p-1 rounded transition-colors">
            <Settings className="h-3 w-3" />
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <h4 className="font-medium text-sm mb-1">{data.label}</h4>
        {data.description && (
          <p className="text-xs text-gray-400">{data.description}</p>
        )}
        
        {data.config?.source && (
          <div className="mt-2 text-xs bg-gray-700 px-2 py-1 rounded">
            Source: {data.config.source}
          </div>
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
        className="w-3 h-3 bg-orange-500 border-2 border-gray-900"
      />
    </div>
  )
}

export default memo(TriggerNode)