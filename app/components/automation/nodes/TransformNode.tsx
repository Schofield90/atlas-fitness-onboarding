'use client'

import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { Code, Settings } from 'lucide-react'
import type { CustomNodeProps } from '@/app/lib/types/automation'

const TransformNode = ({ data, selected }: CustomNodeProps) => {
  return (
    <div className={`bg-gray-800 rounded-lg border-2 transition-all min-w-[200px] ${
      selected ? 'border-cyan-500 shadow-lg shadow-cyan-500/20' : 'border-gray-600'
    } ${data.error ? 'border-red-500' : ''}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-cyan-500 border-2 border-gray-900"
      />
      
      <div className="bg-gray-700 px-4 py-2 rounded-t-lg border-b border-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4 text-cyan-400" />
            <span className="font-medium text-sm">Transform</span>
          </div>
          <button className="hover:bg-gray-600 p-1 rounded transition-colors">
            <Settings className="h-3 w-3" />
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <h4 className="font-medium text-sm mb-1">{data.label || 'Transform Data'}</h4>
        
        {data.config?.code ? (
          <div className="mt-2">
            <div className="text-xs text-gray-400 mb-1">JavaScript Code:</div>
            <pre className="text-xs bg-gray-900 px-2 py-1 rounded overflow-x-auto max-h-20">
              {data.config.code}
            </pre>
          </div>
        ) : (
          <p className="text-xs text-gray-400">No transformation code</p>
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
        className="w-3 h-3 bg-cyan-500 border-2 border-gray-900"
      />
    </div>
  )
}

export default memo(TransformNode)