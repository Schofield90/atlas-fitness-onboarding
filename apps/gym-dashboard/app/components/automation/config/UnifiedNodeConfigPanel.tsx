'use client'

import { useState, useEffect } from 'react'
import { X, Save, Settings, Mail, MessageSquare, MessageCircle, Loader2, AlertTriangle, Info, Zap, Target, Users, Calendar, Tag, RefreshCw, Plus, Minus } from 'lucide-react'
import type { WorkflowNode } from '@/app/lib/types/automation'

// Import communication action config panel
import CommunicationActionConfigPanel from './CommunicationActionConfigPanel'

// Import trigger configs
import LeadTriggerConfig from './LeadTriggerConfig'
import BirthdayTriggerConfig from './BirthdayTriggerConfig'
import ContactTagTriggerConfig from './ContactTagTriggerConfig'
import WebhookTriggerConfig from './WebhookTriggerConfig'
import AppointmentTriggerConfig from './AppointmentTriggerConfig'
import ContactChangedTriggerConfig from './ContactChangedTriggerConfig'
import CustomDateTriggerConfig from './CustomDateTriggerConfig'
import CallStatusTriggerConfig from './CallStatusTriggerConfig'
import EmailEventTriggerConfig from './EmailEventTriggerConfig'
import OpportunityCreatedTriggerConfig from './OpportunityCreatedTriggerConfig'
import OpportunityStageChangedTriggerConfig from './OpportunityStageChangedTriggerConfig'
import TaskAddedTriggerConfig from './TaskAddedTriggerConfig'
import TaskReminderTriggerConfig from './TaskReminderTriggerConfig'
import NoteAddedTriggerConfig from './NoteAddedTriggerConfig'
import FormSubmittedTriggerConfig from './FormSubmittedTriggerConfig'
import SurveySubmittedTriggerConfig from './SurveySubmittedTriggerConfig'
import CustomerRepliedTriggerConfig from './CustomerRepliedTriggerConfig'

// Import action configs
import WaitActionConfig from './WaitActionConfig'

interface UnifiedNodeConfigPanelProps {
  node: WorkflowNode | null
  onClose: () => void
  onSave: (nodeId: string, config: any) => void
  organizationId: string
}

export default function UnifiedNodeConfigPanel({ 
  node, 
  onClose, 
  onSave, 
  organizationId 
}: UnifiedNodeConfigPanelProps) {
  const [config, setConfig] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isDirty, setIsDirty] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  
  useEffect(() => {
    if (node?.data.config) {
      setConfig(node.data.config)
      setIsDirty(false)
    } else {
      setConfig({})
    }
    setErrors({})
  }, [node])

  if (!node) return null

  const handleConfigChange = (newConfig: any) => {
    setConfig(newConfig)
    setIsDirty(true)
    setErrors({})
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      onSave(node.id, config)
      setIsDirty(false)
      onClose()
    } catch (error) {
      console.error('Error saving config:', error)
      setErrors({ general: 'Failed to save configuration. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const getNodeIcon = () => {
    switch (node.type) {
      case 'trigger':
        switch (node.data.actionType) {
          case 'lead_trigger':
            return <Users className="w-6 h-6" />
          case 'birthday_trigger':
            return <Calendar className="w-6 h-6" />
          case 'contact_tag_trigger':
            return <Tag className="w-6 h-6" />
          case 'webhook_trigger':
            return <Zap className="w-6 h-6" />
          default:
            return <Target className="w-6 h-6" />
        }
      case 'action':
        switch (node.data.actionType) {
          case 'enhanced_email':
          case 'send_email':
            return <Mail className="w-6 h-6" />
          case 'enhanced_sms':
          case 'send_sms':
            return <MessageSquare className="w-6 h-6" />
          case 'enhanced_whatsapp':
          case 'send_whatsapp':
            return <MessageCircle className="w-6 h-6" />
          case 'wait':
            return <RefreshCw className="w-6 h-6" />
          default:
            return <Settings className="w-6 h-6" />
        }
      default:
        return <Settings className="w-6 h-6" />
    }
  }

  const getNodeTitle = () => {
    switch (node.type) {
      case 'trigger':
        return `Configure ${node.data.label} Trigger`
      case 'action':
        return `Configure ${node.data.label} Action`
      case 'condition':
        return `Configure ${node.data.label} Condition`
      default:
        return `Configure ${node.data.label}`
    }
  }

  // Check if this is a communication action that should use the specialized panel
  const isCommunicationAction = () => {
    return node.type === 'action' && [
      'enhanced_email', 'send_email',
      'enhanced_sms', 'send_sms', 
      'enhanced_whatsapp', 'send_whatsapp'
    ].includes(node.data.actionType || '')
  }

  // If it's a communication action, use the specialized panel
  if (isCommunicationAction()) {
    return (
      <CommunicationActionConfigPanel
        node={node}
        onClose={onClose}
        onSave={onSave}
        organizationId={organizationId}
        isEnhanced={node.data.actionType?.startsWith('enhanced_') || false}
      />
    )
  }

  const renderConfigComponent = () => {
    // Render trigger configurations
    if (node.type === 'trigger') {
      switch (node.data.actionType) {
        case 'lead_trigger':
          return (
            <LeadTriggerConfig
              config={config}
              onChange={handleConfigChange}
              organizationId={organizationId}
            />
          )
        case 'birthday_trigger':
          return (
            <BirthdayTriggerConfig
              config={config}
              onChange={handleConfigChange}
              organizationId={organizationId}
            />
          )
        case 'contact_tag_trigger':
          return (
            <ContactTagTriggerConfig
              config={config}
              onChange={handleConfigChange}
              organizationId={organizationId}
            />
          )
        case 'webhook_trigger':
          return (
            <WebhookTriggerConfig
              config={config}
              onChange={handleConfigChange}
              organizationId={organizationId}
            />
          )
        case 'appointment_trigger':
          return (
            <AppointmentTriggerConfig
              config={config}
              onChange={handleConfigChange}
              organizationId={organizationId}
            />
          )
        case 'contact_changed_trigger':
          return (
            <ContactChangedTriggerConfig
              config={config}
              onChange={handleConfigChange}
              organizationId={organizationId}
            />
          )
        case 'custom_date_trigger':
          return (
            <CustomDateTriggerConfig
              config={config}
              onChange={handleConfigChange}
              organizationId={organizationId}
            />
          )
        case 'call_status_trigger':
          return (
            <CallStatusTriggerConfig
              config={config}
              onChange={handleConfigChange}
              organizationId={organizationId}
            />
          )
        case 'email_event_trigger':
          return (
            <EmailEventTriggerConfig
              config={config}
              onChange={handleConfigChange}
              organizationId={organizationId}
            />
          )
        case 'opportunity_created_trigger':
          return (
            <OpportunityCreatedTriggerConfig
              config={config}
              onChange={handleConfigChange}
              organizationId={organizationId}
            />
          )
        case 'opportunity_stage_changed_trigger':
          return (
            <OpportunityStageChangedTriggerConfig
              config={config}
              onChange={handleConfigChange}
              organizationId={organizationId}
            />
          )
        case 'task_added_trigger':
          return (
            <TaskAddedTriggerConfig
              config={config}
              onChange={handleConfigChange}
              organizationId={organizationId}
            />
          )
        case 'task_reminder_trigger':
          return (
            <TaskReminderTriggerConfig
              config={config}
              onChange={handleConfigChange}
              organizationId={organizationId}
            />
          )
        case 'note_added_trigger':
          return (
            <NoteAddedTriggerConfig
              config={config}
              onChange={handleConfigChange}
              organizationId={organizationId}
            />
          )
        case 'form_submitted_trigger':
          return (
            <FormSubmittedTriggerConfig
              config={config}
              onChange={handleConfigChange}
              organizationId={organizationId}
            />
          )
        case 'survey_submitted_trigger':
          return (
            <SurveySubmittedTriggerConfig
              config={config}
              onChange={handleConfigChange}
              organizationId={organizationId}
            />
          )
        case 'customer_replied_trigger':
          return (
            <CustomerRepliedTriggerConfig
              config={config}
              onChange={handleConfigChange}
              organizationId={organizationId}
            />
          )
        case 'website_form':
          return (
            <FormSubmittedTriggerConfig
              config={config}
              onChange={handleConfigChange}
              organizationId={organizationId}
            />
          )
        default:
          return renderGenericTriggerConfig()
      }
    }

    // Render action configurations  
    if (node.type === 'action') {
      switch (node.data.actionType) {
        case 'wait':
          return (
            <WaitActionConfig
              config={config}
              onChange={handleConfigChange}
              organizationId={organizationId}
            />
          )
        case 'update_lead':
          return renderUpdateLeadConfig()
        case 'add_tag':
          return renderAddTagConfig()
        default:
          return renderGenericActionConfig()
      }
    }

    // Render condition configurations
    if (node.type === 'condition') {
      return renderConditionConfig()
    }

    return renderGenericConfig()
  }

  const renderGenericTriggerConfig = () => (
    <div className="space-y-4">
      <div className="text-center py-8 text-gray-500">
        <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Configuration for this trigger type is not yet available.</p>
        <p className="text-sm mt-2">Basic trigger settings will be used by default.</p>
      </div>
    </div>
  )

  const renderUpdateLeadConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Field to Update
        </label>
        <select
          value={config.field || ''}
          onChange={(e) => handleConfigChange({ ...config, field: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select field</option>
          <option value="status">Status</option>
          <option value="name">Name</option>
          <option value="email">Email</option>
          <option value="phone">Phone</option>
          <option value="interest">Interest</option>
          <option value="lead_score">Lead Score</option>
          <option value="notes">Notes</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          New Value
        </label>
        <input
          type="text"
          value={config.value || ''}
          onChange={(e) => handleConfigChange({ ...config, value: e.target.value })}
          placeholder="Enter new value"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  )

  const renderAddTagConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tag Name
        </label>
        <input
          type="text"
          value={config.tag || ''}
          onChange={(e) => handleConfigChange({ ...config, tag: e.target.value })}
          placeholder="Enter tag name"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Tag Color
        </label>
        <div className="grid grid-cols-8 gap-2">
          {['blue', 'green', 'yellow', 'red', 'purple', 'pink', 'indigo', 'gray'].map(color => (
            <button
              key={color}
              type="button"
              onClick={() => handleConfigChange({ ...config, tagColor: color })}
              className={`w-8 h-8 rounded-full bg-${color}-500 ${
                config.tagColor === color ? 'ring-2 ring-offset-2 ring-blue-500' : ''
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )

  const renderGenericActionConfig = () => (
    <div className="space-y-4">
      <div className="text-center py-8 text-gray-500">
        <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Configuration for this action type is not yet available.</p>
        <p className="text-sm mt-2">Default action behavior will be used.</p>
      </div>
    </div>
  )

  const renderConditionConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Field to Check
        </label>
        <input
          type="text"
          value={config.field || ''}
          onChange={(e) => handleConfigChange({ ...config, field: e.target.value })}
          placeholder="e.g., lead.status, contact.email"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Operator
        </label>
        <select
          value={config.operator || ''}
          onChange={(e) => handleConfigChange({ ...config, operator: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select operator</option>
          <option value="equals">Equals</option>
          <option value="not_equals">Not Equals</option>
          <option value="contains">Contains</option>
          <option value="not_contains">Does Not Contain</option>
          <option value="greater_than">Greater Than</option>
          <option value="less_than">Less Than</option>
          <option value="is_empty">Is Empty</option>
          <option value="is_not_empty">Is Not Empty</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Value to Compare
        </label>
        <input
          type="text"
          value={config.value || ''}
          onChange={(e) => handleConfigChange({ ...config, value: e.target.value })}
          placeholder="Enter comparison value"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
    </div>
  )

  const renderGenericConfig = () => (
    <div className="space-y-4">
      <div className="text-center py-8 text-gray-500">
        <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Configuration options for this node are not available.</p>
        <p className="text-sm mt-2">Node will use default settings.</p>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-xl">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              {getNodeIcon()}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {getNodeTitle()}
              </h2>
              <p className="text-sm text-gray-600">
                Configure node settings and behavior
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {isDirty && (
              <span className="text-sm text-orange-600 font-medium">
                Unsaved changes
              </span>
            )}

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Error Messages */}
        {Object.keys(errors).length > 0 && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400">
            <div className="flex">
              <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  Configuration Errors
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc list-inside space-y-1">
                    {Object.entries(errors).map(([field, error]) => (
                      <li key={field}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {renderConfigComponent()}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex items-center space-x-4">
            {Object.keys(errors).length > 0 && (
              <span className="flex items-center text-sm text-red-600">
                <AlertTriangle className="w-4 h-4 mr-1" />
                {Object.keys(errors).length} validation error(s)
              </span>
            )}
            
            <span className="flex items-center text-sm text-blue-600">
              <Info className="w-4 h-4 mr-1" />
              Configuration will be applied to workflow
            </span>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={handleSave}
              disabled={loading || !isDirty}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}