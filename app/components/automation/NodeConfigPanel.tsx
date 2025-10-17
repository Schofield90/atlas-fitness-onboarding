'use client'

import { useState, useEffect } from 'react'
import { X, Save } from 'lucide-react'
import type { WorkflowNode } from '@/app/lib/types/automation'

interface NodeConfigPanelProps {
  node: WorkflowNode | null
  onClose: () => void
  onSave: (nodeId: string, config: any) => void
}

export default function NodeConfigPanel({ node, onClose, onSave }: NodeConfigPanelProps) {
  const [config, setConfig] = useState<any>({})
  
  useEffect(() => {
    if (node?.data.config) {
      setConfig(node.data.config)
    } else {
      setConfig({})
    }
  }, [node])
  
  if (!node) return null
  
  const handleSave = () => {
    onSave(node.id, config)
    onClose()
  }
  
  const renderConfigFields = () => {
    switch (node.data.actionType) {
      case 'send_email':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">To Email</label>
              <input
                type="email"
                value={config.to || ''}
                onChange={(e) => setConfig({ ...config, to: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
                placeholder="recipient@example.com"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Subject</label>
              <input
                type="text"
                value={config.subject || ''}
                onChange={(e) => setConfig({ ...config, subject: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
                placeholder="Email subject"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Body</label>
              <textarea
                value={config.body || ''}
                onChange={(e) => setConfig({ ...config, body: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
                rows={4}
                placeholder="Email body"
              />
            </div>
          </>
        )
        
      case 'send_sms':
      case 'send_whatsapp':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">To Phone Number</label>
              <input
                type="tel"
                value={config.to || ''}
                onChange={(e) => setConfig({ ...config, to: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
                placeholder="+1234567890"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Message</label>
              <textarea
                value={config.message || ''}
                onChange={(e) => setConfig({ ...config, message: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
                rows={4}
                placeholder="Message text"
              />
            </div>
          </>
        )
        
      case 'update_lead':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Field to Update</label>
              <select
                value={config.field || ''}
                onChange={(e) => setConfig({ ...config, field: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
              >
                <option value="">Select field</option>
                <option value="status">Status</option>
                <option value="name">Name</option>
                <option value="email">Email</option>
                <option value="phone">Phone</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">New Value</label>
              <input
                type="text"
                value={config.value || ''}
                onChange={(e) => setConfig({ ...config, value: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
                placeholder="New value"
              />
            </div>
          </>
        )
        
      case 'add_tag':
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Tag Name</label>
            <input
              type="text"
              value={config.tag || ''}
              onChange={(e) => setConfig({ ...config, tag: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
              placeholder="Enter tag name"
            />
          </div>
        )
        
      case 'wait':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Wait Duration</label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={config.duration || ''}
                  onChange={(e) => setConfig({ ...config, duration: parseInt(e.target.value) })}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
                  placeholder="Duration"
                  min="1"
                />
                <select
                  value={config.unit || 'minutes'}
                  onChange={(e) => setConfig({ ...config, unit: e.target.value })}
                  className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
                >
                  <option value="seconds">Seconds</option>
                  <option value="minutes">Minutes</option>
                  <option value="hours">Hours</option>
                  <option value="days">Days</option>
                </select>
              </div>
            </div>
          </>
        )
        
      case 'condition':
        return (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Field</label>
              <input
                type="text"
                value={config.field || ''}
                onChange={(e) => setConfig({ ...config, field: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
                placeholder="e.g., lead.status"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Operator</label>
              <select
                value={config.operator || ''}
                onChange={(e) => setConfig({ ...config, operator: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
              >
                <option value="">Select operator</option>
                <option value="equals">Equals</option>
                <option value="not_equals">Not Equals</option>
                <option value="contains">Contains</option>
                <option value="greater_than">Greater Than</option>
                <option value="less_than">Less Than</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Value</label>
              <input
                type="text"
                value={config.value || ''}
                onChange={(e) => setConfig({ ...config, value: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
                placeholder="Value to compare"
              />
            </div>
          </>
        )
        
      default:
        return (
          <div className="text-gray-400">
            Configuration options for this node type are not yet available.
          </div>
        )
    }
  }
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          <h3 className="text-lg font-semibold">Configure {node.data.label}</h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-6">
          {renderConfigFields()}
        </div>
        
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  )
}