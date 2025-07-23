'use client'

import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { GitBranch, Settings } from 'lucide-react'
import type { CustomNodeProps } from '@/app/lib/types/automation'

const ConditionNode = ({ data, selected }: CustomNodeProps) => {
  return (
    <div className={`bg-gray-800 rounded-lg border-2 transition-all min-w-[220px] ${
      selected ? 'border-purple-500 shadow-lg shadow-purple-500/20' : 'border-gray-600'
    } ${data.error ? 'border-red-500' : ''}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-purple-500 border-2 border-gray-900"
      />
      
      <div className="bg-gray-700 px-4 py-2 rounded-t-lg border-b border-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-purple-400" />
            <span className="font-medium text-sm">If/Else</span>
          </div>
          <button className="hover:bg-gray-600 p-1 rounded transition-colors">
            <Settings className="h-3 w-3" />
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <h4 className="font-medium text-sm mb-2">{data.label || 'Condition'}</h4>
        
        {data.config?.conditions?.length > 0 ? (
          <div className="space-y-1">
            {data.config.conditions.map((condition: any, index: number) => (
              <div key={index} className="text-xs bg-gray-700 px-2 py-1 rounded">
                {condition.field} {condition.operator} {condition.value}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-400">No conditions set</p>
        )}
        
        {data.error && (
          <div className="mt-2 text-xs text-red-400 bg-red-900/20 px-2 py-1 rounded">
            {data.error}
          </div>
        )}
      </div>
      
      {/* True branch */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        style={{ left: '25%' }}
        className="w-3 h-3 bg-green-500 border-2 border-gray-900"
      >
        <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs text-green-400">
          True
        </div>
      </Handle>
      
      {/* False branch */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        style={{ left: '75%' }}
        className="w-3 h-3 bg-red-500 border-2 border-gray-900"
      >
        <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 text-xs text-red-400">
          False
        </div>
      </Handle>
    </div>
  )
}

export default memo(ConditionNode)