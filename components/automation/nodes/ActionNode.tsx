'use client';

import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  Database, 
  Webhook, 
  Bot, 
  Bell, 
  Settings,
  Zap
} from 'lucide-react';
import { FlowNode } from '@/lib/types/automation';

interface ActionNodeProps {
  data: FlowNode['data'];
  selected?: boolean;
}

const getActionIcon = (type: string) => {
  switch (type) {
    case 'email': return Mail;
    case 'sms': return MessageSquare;
    case 'whatsapp': return Phone;
    case 'webhook': return Webhook;
    case 'database': return Database;
    case 'ai_task': return Bot;
    case 'notification': return Bell;
    default: return Zap;
  }
};

const getActionColor = (type: string) => {
  switch (type) {
    case 'email': return 'text-blue-600 bg-blue-100';
    case 'sms': return 'text-green-600 bg-green-100';
    case 'whatsapp': return 'text-green-600 bg-green-100';
    case 'webhook': return 'text-purple-600 bg-purple-100';
    case 'database': return 'text-orange-600 bg-orange-100';
    case 'ai_task': return 'text-indigo-600 bg-indigo-100';
    case 'notification': return 'text-yellow-600 bg-yellow-100';
    default: return 'text-gray-600 bg-gray-100';
  }
};

export default memo(function ActionNode({ data, selected }: ActionNodeProps) {
  const isConfigured = data.action || Object.keys(data.config).length > 0;
  const actionType = data.action?.type || 'action';
  const IconComponent = getActionIcon(actionType);
  const colorClasses = getActionColor(actionType);

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
          isConfigured ? colorClasses : 'bg-gray-100 text-gray-400'
        }`}>
          <IconComponent className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900">
            {data.action?.name || data.label}
          </div>
          {data.description && (
            <div className="text-xs text-gray-500">{data.description}</div>
          )}
          {data.action && (
            <div className="text-xs text-gray-600 mt-1">
              {data.action.category}
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