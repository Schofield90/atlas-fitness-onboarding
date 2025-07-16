'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Zap, Settings } from 'lucide-react';
import { FlowNode } from '@/lib/types/automation';

interface TriggerNodeProps {
  data: FlowNode['data'];
  selected?: boolean;
}

export default memo(function TriggerNode({ data, selected }: TriggerNodeProps) {
  const isConfigured = data.config?.trigger_type;

  return (
    <div className={`px-4 py-2 shadow-md rounded-md bg-white border-2 min-w-[200px] ${
      selected ? 'border-blue-500' : isConfigured ? 'border-green-500' : 'border-gray-300'
    }`}>
      <div className="flex items-center">
        <div className={`rounded-full p-2 mr-3 ${
          isConfigured ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
        }`}>
          <Zap className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900">{data.label}</div>
          {data.description && (
            <div className="text-xs text-gray-500">{data.description}</div>
          )}
          {isConfigured && (
            <div className="text-xs text-green-600 mt-1">
              Trigger: {data.config.trigger_type?.replace('_', ' ')}
            </div>
          )}
        </div>
        {!isConfigured && (
          <Settings className="h-4 w-4 text-gray-400" />
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="w-3 h-3 !bg-blue-500 !border-2 !border-white"
      />
    </div>
  );
});