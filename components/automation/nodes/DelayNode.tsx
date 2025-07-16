'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Clock, Settings } from 'lucide-react';
import { FlowNode } from '@/lib/types/automation';

interface DelayNodeProps {
  data: FlowNode['data'];
  selected?: boolean;
}

export default memo(function DelayNode({ data, selected }: DelayNodeProps) {
  const isConfigured = data.config?.seconds || data.config?.minutes || data.config?.hours;
  
  const formatDuration = () => {
    const { seconds = 0, minutes = 0, hours = 0 } = data.config || {};
    const totalSeconds = hours * 3600 + minutes * 60 + seconds;
    
    if (totalSeconds < 60) return `${totalSeconds}s`;
    if (totalSeconds < 3600) return `${Math.floor(totalSeconds / 60)}m`;
    return `${Math.floor(totalSeconds / 3600)}h`;
  };

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
          isConfigured ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'
        }`}>
          <Clock className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900">{data.label}</div>
          {data.description && (
            <div className="text-xs text-gray-500">{data.description}</div>
          )}
          {isConfigured && (
            <div className="text-xs text-orange-600 mt-1">
              Wait {formatDuration()}
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