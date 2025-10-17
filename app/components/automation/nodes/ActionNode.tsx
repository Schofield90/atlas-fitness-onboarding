'use client'

import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { Play, Settings, Mail, MessageSquare, UserCheck, Tag, Globe } from 'lucide-react'
import type { CustomNodeProps } from '@/app/lib/types/automation'

const iconMap: Record<string, any> = {
  send_email: Mail,
  send_sms: MessageSquare,
  update_lead: UserCheck,
  add_tag: Tag,
  http_request: Globe,
}

const ActionNode = ({ data, selected }: CustomNodeProps) => {
  const Icon = iconMap[data.actionType || ''] || Play
  
  return (
    <div className={`bg-gray-800 rounded-lg border-2 transition-all min-w-[200px] ${
      selected ? 'border-blue-500 shadow-lg shadow-blue-500/20' : 'border-gray-600'
    } ${data.error ? 'border-red-500' : ''} ${!data.isValid ? 'opacity-60' : ''}`}>
      <Handle
        type="target"
        position={Position.Top}
        className="w-3 h-3 bg-blue-500 border-2 border-gray-900"
      />
      
      <div className="bg-gray-700 px-4 py-2 rounded-t-lg border-b border-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-blue-400" />
            <span className="font-medium text-sm">Action</span>
          </div>
          <button 
            className="hover:bg-gray-600 p-1 rounded transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              // The parent will handle the actual settings opening
            }}
            title="Configure node (or double-click)"
          >
            <Settings className="h-3 w-3" />
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <h4 className="font-medium text-sm mb-1">{data.label}</h4>
        {data.description && (
          <p className="text-xs text-gray-400">{data.description}</p>
        )}
        
        {/* Show configured values */}
        {data.config?.to && (
          <div className="mt-2 text-xs bg-gray-700 px-2 py-1 rounded">
            To: {data.config.to}
          </div>
        )}
        
        {data.config?.subject && (
          <div className="mt-1 text-xs bg-gray-700 px-2 py-1 rounded truncate">
            Subject: {data.config.subject}
          </div>
        )}
        
        {!data.isValid && (
          <div className="mt-2 text-xs text-yellow-400 bg-yellow-900/20 px-2 py-1 rounded">
            Configuration required
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
        className="w-3 h-3 bg-blue-500 border-2 border-gray-900"
      />
    </div>
  )
}

export default memo(ActionNode)