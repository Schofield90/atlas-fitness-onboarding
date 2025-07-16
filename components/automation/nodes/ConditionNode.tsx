'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */
import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { GitBranch, Settings } from 'lucide-react';
import { FlowNode } from '@/lib/types/automation';

interface ConditionNodeProps {
  data: FlowNode['data'];
  selected?: boolean;
}

export default memo(function ConditionNode({ data, selected }: ConditionNodeProps) {
  const isConfigured = (data.config as any)?.conditions && (data.config as any).conditions.length > 0;

  return (
    <div className={`px-4 py-2 shadow-md rounded-md bg-white border-2 min-w-[200px] ${
      selected ? 'border-blue-500' : isConfigured ? 'border-green-500' : 'border-gray-300'
    }`}>
      <Handle
        type="target"
        position={Position.Left}
        className="w-3 h-3 !bg-gray-400 !border-2 !border-white"
      />

      <div className="flex items-center">
        <div className={`rounded-full p-2 mr-3 ${
          isConfigured ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'
        }`}>
          <GitBranch className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900">{data.label}</div>
          {data.description && (
            <div className="text-xs text-gray-500">{data.description}</div>
          )}
          {isConfigured && (
            <div className="text-xs text-purple-600 mt-1">
              {(data.config as any).conditions?.length} condition(s)
            </div>
          )}
        </div>
        {!isConfigured && (
          <Settings className="h-4 w-4 text-gray-400" />
        )}
      </div>

      {/* Success path */}
      <Handle
        type="source"
        position={Position.Right}
        id="success"
        style={{ top: '30%' }}
        className="w-3 h-3 !bg-green-500 !border-2 !border-white"
      />

      {/* Failure path */}
      <Handle
        type="source"
        position={Position.Right}
        id="failure"
        style={{ top: '70%' }}
        className="w-3 h-3 !bg-red-500 !border-2 !border-white"
      />

      {/* Labels for handles */}
      <div className="absolute right-4 top-1/4 transform -translate-y-1/2 text-xs text-green-600 font-medium">
        Yes
      </div>
      <div className="absolute right-4 top-3/4 transform -translate-y-1/2 text-xs text-red-600 font-medium">
        No
      </div>
    </div>
  );
});