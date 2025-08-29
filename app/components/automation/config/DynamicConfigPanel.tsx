'use client'

import React, { useState, useEffect, useRef } from 'react'
import { X, Save, AlertCircle, CheckCircle, Info, Code, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { WorkflowNode } from '@/app/lib/types/automation'
import { useFeatureFlag } from '@/app/lib/feature-flags'
import { validateNodeConfig } from './schemas'

interface DynamicConfigPanelProps {
  node: WorkflowNode
  onClose: () => void
  onSave: (nodeId: string, config: any) => void
  onChange?: (config: any) => void
  organizationId: string
}

interface FormField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'select' | 'number' | 'boolean' | 'date' | 'time' | 'email' | 'tel' | 'url' | 'json' | 'array' | 'variable'
  required?: boolean
  placeholder?: string
  description?: string
  options?: Array<{ value: string; label: string }>
  defaultValue?: any
  validation?: {
    min?: number
    max?: number
    pattern?: string
    custom?: (value: any) => string | null
  }
  dependencies?: Array<{ field: string; value: any }>
  showWhen?: (config: any) => boolean
}

const getNodeConfigSchema = (node: WorkflowNode): FormField[] => {
  const baseFields: FormField[] = [
    {
      key: 'label',
      label: 'Node Name',
      type: 'text',
      required: true,
      placeholder: 'Enter node name',
      description: 'A descriptive name for this node'
    },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea',
      placeholder: 'Enter description (optional)',
      description: 'Optional description of what this node does'
    }
  ]

  // Add type-specific fields based on node type
  switch (node.type) {
    case 'trigger':
      return [
        ...baseFields,
        ...getTriggerFields(node.data.config?.subtype || 'lead_trigger')
      ]
    
    case 'action':
      return [
        ...baseFields,
        ...getActionFields(node.data.actionType || 'send_email')
      ]
    
    case 'condition':
      return [
        ...baseFields,
        ...getConditionFields()
      ]
    
    case 'wait':
      return [
        ...baseFields,
        ...getWaitFields()
      ]
    
    case 'loop':
      return [
        ...baseFields,
        ...getLoopFields()
      ]
    
    case 'parallel':
      return [
        ...baseFields,
        ...getParallelFields()
      ]
    
    case 'merge':
      return [
        ...baseFields,
        ...getMergeFields()
      ]
    
    case 'transform':
      return [
        ...baseFields,
        ...getTransformFields()
      ]
    
    case 'ai_node':
      return [
        ...baseFields,
        ...getAIFields()
      ]
    
    case 'sub_workflow':
      return [
        ...baseFields,
        ...getSubWorkflowFields()
      ]
    
    default:
      return baseFields
  }
}

const getTriggerFields = (subtype: string): FormField[] => {
  const commonFields = [
    {
      key: 'subtype',
      label: 'Trigger Type',
      type: 'select' as const,
      required: true,
      options: [
        { value: 'lead_trigger', label: 'New Lead' },
        { value: 'birthday_trigger', label: 'Birthday' },
        { value: 'contact_tagged', label: 'Contact Tagged' },
        { value: 'webhook_received', label: 'Webhook' },
        { value: 'email_event', label: 'Email Event' },
        { value: 'appointment_status', label: 'Appointment' },
        { value: 'booking_confirmed', label: 'Booking Confirmed' },
        { value: 'missed_session', label: 'Missed Session' }
      ]
    }
  ]

  switch (subtype) {
    case 'lead_trigger':
      return [
        ...commonFields,
        {
          key: 'sourceId',
          label: 'Lead Source',
          type: 'select' as const,
          options: [
            { value: 'all', label: 'All Sources' },
            { value: 'website', label: 'Website Form' },
            { value: 'facebook', label: 'Facebook Ads' },
            { value: 'google', label: 'Google Ads' },
            { value: 'referral', label: 'Referral' }
          ],
          description: 'Filter by specific lead source'
        },
        {
          key: 'leadScore',
          label: 'Minimum Lead Score',
          type: 'number' as const,
          placeholder: '0',
          validation: { min: 0, max: 100 }
        }
      ]

    case 'contact_tagged':
      return [
        ...commonFields,
        {
          key: 'tagId',
          label: 'Tag',
          type: 'select' as const,
          required: true,
          options: [
            { value: 'vip', label: 'VIP' },
            { value: 'hot-lead', label: 'Hot Lead' },
            { value: 'interested', label: 'Interested' }
          ]
        }
      ]

    case 'webhook_received':
      return [
        ...commonFields,
        {
          key: 'webhookUrl',
          label: 'Webhook URL',
          type: 'url' as const,
          required: true,
          description: 'The webhook endpoint URL'
        },
        {
          key: 'secret',
          label: 'Secret',
          type: 'text' as const,
          description: 'Optional webhook secret for verification'
        }
      ]

    default:
      return commonFields
  }
}

const getActionFields = (actionType: string): FormField[] => {
  const commonFields = [
    {
      key: 'actionType',
      label: 'Action Type',
      type: 'select' as const,
      required: true,
      options: [
        { value: 'send_email', label: 'Send Email' },
        { value: 'send_sms', label: 'Send SMS' },
        { value: 'send_whatsapp', label: 'Send WhatsApp' },
        { value: 'create_task', label: 'Create Task' },
        { value: 'update_contact', label: 'Update Contact' },
        { value: 'webhook', label: 'Send Webhook' },
        { value: 'api_call', label: 'API Call' }
      ]
    }
  ]

  switch (actionType) {
    case 'send_email':
      return [
        ...commonFields,
        {
          key: 'mode',
          label: 'Email Mode',
          type: 'select' as const,
          required: true,
          options: [
            { value: 'template', label: 'Use Template' },
            { value: 'custom', label: 'Custom Email' }
          ]
        },
        {
          key: 'templateId',
          label: 'Email Template',
          type: 'select' as const,
          required: true,
          showWhen: (config) => config.mode === 'template',
          options: [
            { value: 'welcome', label: 'Welcome Email' },
            { value: 'follow-up', label: 'Follow-up' },
            { value: 'newsletter', label: 'Newsletter' }
          ]
        },
        {
          key: 'subject',
          label: 'Subject',
          type: 'text' as const,
          required: true,
          showWhen: (config) => config.mode === 'custom',
          placeholder: 'Email subject line'
        },
        {
          key: 'body',
          label: 'Email Body',
          type: 'textarea' as const,
          required: true,
          showWhen: (config) => config.mode === 'custom',
          placeholder: 'Email content...'
        },
        {
          key: 'fromName',
          label: 'From Name',
          type: 'text' as const,
          placeholder: 'Your Name'
        },
        {
          key: 'delay',
          label: 'Send Delay (minutes)',
          type: 'number' as const,
          defaultValue: 0,
          validation: { min: 0 }
        }
      ]

    case 'send_sms':
      return [
        ...commonFields,
        {
          key: 'message',
          label: 'SMS Message',
          type: 'textarea' as const,
          required: true,
          placeholder: 'Enter SMS message...',
          validation: { max: 160 },
          description: 'Keep under 160 characters for single SMS'
        }
      ]

    case 'send_whatsapp':
      return [
        ...commonFields,
        {
          key: 'mode',
          label: 'WhatsApp Mode',
          type: 'select' as const,
          required: true,
          options: [
            { value: 'template', label: 'Template Message' },
            { value: 'freeform', label: 'Free-form Message' }
          ]
        },
        {
          key: 'templateId',
          label: 'WhatsApp Template',
          type: 'select' as const,
          showWhen: (config) => config.mode === 'template',
          options: [
            { value: 'appointment_reminder', label: 'Appointment Reminder' },
            { value: 'welcome_message', label: 'Welcome Message' }
          ]
        },
        {
          key: 'message',
          label: 'Message',
          type: 'textarea' as const,
          showWhen: (config) => config.mode === 'freeform',
          placeholder: 'Enter WhatsApp message...'
        }
      ]

    case 'create_task':
      return [
        ...commonFields,
        {
          key: 'taskTitle',
          label: 'Task Title',
          type: 'text' as const,
          required: true,
          placeholder: 'Task title'
        },
        {
          key: 'taskDescription',
          label: 'Task Description',
          type: 'textarea' as const,
          placeholder: 'Task description...'
        },
        {
          key: 'dueDate',
          label: 'Due Date',
          type: 'date' as const,
        },
        {
          key: 'priority',
          label: 'Priority',
          type: 'select' as const,
          options: [
            { value: 'low', label: 'Low' },
            { value: 'medium', label: 'Medium' },
            { value: 'high', label: 'High' },
            { value: 'urgent', label: 'Urgent' }
          ],
          defaultValue: 'medium'
        }
      ]

    default:
      return commonFields
  }
}

const getConditionFields = (): FormField[] => [
  {
    key: 'conditionType',
    label: 'Condition Type',
    type: 'select',
    required: true,
    options: [
      { value: 'field_comparison', label: 'Field Comparison' },
      { value: 'lead_score', label: 'Lead Score' },
      { value: 'tag_check', label: 'Tag Check' },
      { value: 'time_based', label: 'Time Based' },
      { value: 'custom', label: 'Custom Logic' }
    ]
  },
  {
    key: 'field',
    label: 'Field',
    type: 'select',
    required: true,
    showWhen: (config) => config.conditionType === 'field_comparison',
    options: [
      { value: 'name', label: 'Name' },
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' },
      { value: 'status', label: 'Status' }
    ]
  },
  {
    key: 'operator',
    label: 'Operator',
    type: 'select',
    required: true,
    options: [
      { value: 'equals', label: 'Equals' },
      { value: 'not_equals', label: 'Not Equals' },
      { value: 'contains', label: 'Contains' },
      { value: 'greater_than', label: 'Greater Than' },
      { value: 'less_than', label: 'Less Than' }
    ]
  },
  {
    key: 'value',
    label: 'Value',
    type: 'text',
    required: true,
    placeholder: 'Comparison value'
  }
]

const getWaitFields = (): FormField[] => [
  {
    key: 'waitType',
    label: 'Wait Type',
    type: 'select',
    required: true,
    options: [
      { value: 'duration', label: 'Fixed Duration' },
      { value: 'until_time', label: 'Until Specific Time' },
      { value: 'until_condition', label: 'Until Condition Met' },
      { value: 'dynamic', label: 'Dynamic Wait' }
    ]
  },
  {
    key: 'duration',
    label: 'Duration',
    type: 'json',
    required: true,
    showWhen: (config) => config.waitType === 'duration',
    defaultValue: { value: 1, unit: 'hours' },
    description: 'Example: {"value": 2, "unit": "days"}'
  },
  {
    key: 'untilTime',
    label: 'Until Time',
    type: 'time',
    showWhen: (config) => config.waitType === 'until_time'
  },
  {
    key: 'condition',
    label: 'Wait Condition',
    type: 'textarea',
    showWhen: (config) => config.waitType === 'until_condition',
    placeholder: 'Define condition to wait for...'
  }
]

const getLoopFields = (): FormField[] => [
  {
    key: 'loopType',
    label: 'Loop Type',
    type: 'select',
    required: true,
    options: [
      { value: 'count', label: 'Fixed Count' },
      { value: 'while', label: 'While Condition' },
      { value: 'for_each', label: 'For Each Item' }
    ]
  },
  {
    key: 'maxIterations',
    label: 'Maximum Iterations',
    type: 'number',
    required: true,
    showWhen: (config) => config.loopType === 'count',
    validation: { min: 1, max: 1000 },
    defaultValue: 5
  },
  {
    key: 'condition',
    label: 'Loop Condition',
    type: 'textarea',
    required: true,
    showWhen: (config) => config.loopType === 'while',
    placeholder: 'Define loop condition...'
  },
  {
    key: 'breakCondition',
    label: 'Break Condition',
    type: 'textarea',
    placeholder: 'Optional condition to break the loop early'
  }
]

const getParallelFields = (): FormField[] => [
  {
    key: 'branches',
    label: 'Number of Branches',
    type: 'number',
    required: true,
    validation: { min: 2, max: 10 },
    defaultValue: 2
  },
  {
    key: 'waitForAll',
    label: 'Wait for All Branches',
    type: 'boolean',
    defaultValue: false,
    description: 'Wait for all branches to complete before continuing'
  },
  {
    key: 'timeout',
    label: 'Timeout (seconds)',
    type: 'number',
    validation: { min: 1 },
    description: 'Maximum time to wait for branches'
  }
]

const getMergeFields = (): FormField[] => [
  {
    key: 'mergeStrategy',
    label: 'Merge Strategy',
    type: 'select',
    required: true,
    options: [
      { value: 'first_wins', label: 'First Wins' },
      { value: 'last_wins', label: 'Last Wins' },
      { value: 'merge_data', label: 'Merge Data' },
      { value: 'custom', label: 'Custom Logic' }
    ]
  },
  {
    key: 'inputs',
    label: 'Number of Inputs',
    type: 'number',
    required: true,
    validation: { min: 2, max: 10 },
    defaultValue: 2
  }
]

const getTransformFields = (): FormField[] => [
  {
    key: 'transformType',
    label: 'Transform Type',
    type: 'select',
    required: true,
    options: [
      { value: 'field_mapping', label: 'Field Mapping' },
      { value: 'data_format', label: 'Data Format' },
      { value: 'calculation', label: 'Calculation' },
      { value: 'custom_script', label: 'Custom Script' }
    ]
  },
  {
    key: 'transformations',
    label: 'Transformations',
    type: 'array',
    required: true,
    description: 'Define field transformations'
  }
]

const getAIFields = (): FormField[] => [
  {
    key: 'aiType',
    label: 'AI Type',
    type: 'select',
    required: true,
    options: [
      { value: 'decision', label: 'AI Decision' },
      { value: 'content', label: 'Content Generation' },
      { value: 'analysis', label: 'Data Analysis' }
    ]
  },
  {
    key: 'model',
    label: 'AI Model',
    type: 'select',
    required: true,
    options: [
      { value: 'gpt-4', label: 'GPT-4' },
      { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
      { value: 'claude', label: 'Claude' }
    ]
  },
  {
    key: 'prompt',
    label: 'AI Prompt',
    type: 'textarea',
    required: true,
    placeholder: 'Enter AI prompt...'
  },
  {
    key: 'temperature',
    label: 'Creativity Level',
    type: 'number',
    validation: { min: 0, max: 2 },
    defaultValue: 0.7,
    description: 'Higher values = more creative (0-2)'
  }
]

const getSubWorkflowFields = (): FormField[] => [
  {
    key: 'workflowId',
    label: 'Sub-workflow',
    type: 'select',
    required: true,
    options: [
      { value: 'workflow_1', label: 'Welcome Sequence' },
      { value: 'workflow_2', label: 'Follow-up Campaign' }
    ]
  },
  {
    key: 'waitForCompletion',
    label: 'Wait for Completion',
    type: 'boolean',
    defaultValue: true,
    description: 'Wait for sub-workflow to complete before continuing'
  }
]

export default function DynamicConfigPanel({ node, onClose, onSave, onChange, organizationId }: DynamicConfigPanelProps) {
  const [config, setConfig] = useState(node.data.config || {})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isValid, setIsValid] = useState(false)
  const [showJsonView, setShowJsonView] = useState(false)
  
  // Feature flags
  const useControlledConfig = useFeatureFlag('automationBuilderControlledConfig')
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const formSchema = getNodeConfigSchema(node)

  useEffect(() => {
    validateForm()
  }, [config])

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    // Use Zod validation if feature flag is enabled
    if (useControlledConfig) {
      const subtype = config.subtype || config.actionType
      const result = validateNodeConfig(node.type, config, subtype)
      
      if (!result.success) {
        result.error.errors.forEach(error => {
          const path = error.path.join('.')
          newErrors[path] = error.message
        })
      }
    } else {
      // Fallback to original validation
      formSchema.forEach(field => {
        if (field.showWhen && !field.showWhen(config)) return
        
        const value = config[field.key]
        
        if (field.required && (!value || value === '')) {
          newErrors[field.key] = `${field.label} is required`
        }
        
        if (field.validation && value) {
          const validation = field.validation
          
          if (validation.min !== undefined && Number(value) < validation.min) {
            newErrors[field.key] = `${field.label} must be at least ${validation.min}`
          }
          
          if (validation.max !== undefined && Number(value) > validation.max) {
            newErrors[field.key] = `${field.label} must be at most ${validation.max}`
          }
          
          if (validation.pattern && !new RegExp(validation.pattern).test(String(value))) {
            newErrors[field.key] = `${field.label} format is invalid`
          }
          
          if (validation.custom) {
            const customError = validation.custom(value)
            if (customError) {
              newErrors[field.key] = customError
            }
          }
        }
      })
      
      // ADDED: Action-type specific validation
      validateActionSpecificFields(newErrors)
    }
    
    setErrors(newErrors)
    setIsValid(Object.keys(newErrors).length === 0)
  }

  const validateActionSpecificFields = (errors: Record<string, string>) => {
    if (node.type !== 'action') return
    
    const actionType = config.actionType
    
    switch (actionType) {
      case 'send_email':
        if (config.mode === 'custom') {
          if (!config.subject?.trim()) {
            errors['subject'] = 'Email subject is required for custom emails'
          }
          if (!config.body?.trim()) {
            errors['body'] = 'Email body is required for custom emails'
          }
        } else if (config.mode === 'template' && !config.templateId) {
          errors['templateId'] = 'Email template selection is required'
        }
        break
        
      case 'send_sms':
        if (!config.message?.trim()) {
          errors['message'] = 'SMS message is required'
        } else if (config.message.length > 160) {
          errors['message'] = 'SMS message should be under 160 characters'
        }
        break
        
      case 'send_whatsapp':
        if (config.mode === 'freeform' && !config.message?.trim()) {
          errors['message'] = 'WhatsApp message is required'
        } else if (config.mode === 'template' && !config.templateId) {
          errors['templateId'] = 'WhatsApp template selection is required'
        }
        break
        
      case 'create_task':
        if (!config.taskTitle?.trim()) {
          errors['taskTitle'] = 'Task title is required'
        }
        break
    }
  }

  const handleFieldChange = (key: string, value: any) => {
    const updatedConfig = { ...config, [key]: value }
    setConfig(updatedConfig)
    // FIXED: Use updated config instead of stale closure
    if (onChange) {
      onChange(updatedConfig)
    }
  }

  const handleFieldBlur = (key: string, value: any) => {
    // Auto-save on blur if feature flag is enabled
    if (useControlledConfig && isValid) {
      // Clear any existing timeout
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
      
      // Set a new timeout for auto-save
      autoSaveTimeoutRef.current = setTimeout(() => {
        onSave(node.id, config)
      }, 500) // Save after 500ms of inactivity
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current)
      }
    }
  }, [])

  const handleSave = () => {
    if (isValid) {
      onSave(node.id, config)
      onClose() // Close panel after successful save
    } else {
      // Show validation errors
      const errorCount = Object.keys(errors).length
      alert(`Please fix ${errorCount} validation error${errorCount > 1 ? 's' : ''} before saving.`)
    }
  }

  const renderField = (field: FormField) => {
    if (field.showWhen && !field.showWhen(config)) return null
    
    const value = config[field.key] || field.defaultValue || ''
    const hasError = errors[field.key]

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'url':
        return (
          <input
            type={field.type}
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            onBlur={(e) => handleFieldBlur(field.key, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              hasError 
                ? 'border-red-500 focus:ring-red-200' 
                : 'border-gray-300 focus:ring-blue-200'
            }`}
          />
        )

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            onBlur={(e) => handleFieldBlur(field.key, e.target.value)}
            placeholder={field.placeholder}
            rows={3}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              hasError 
                ? 'border-red-500 focus:ring-red-200' 
                : 'border-gray-300 focus:ring-blue-200'
            }`}
          />
        )

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.key, Number(e.target.value))}
            onBlur={(e) => handleFieldBlur(field.key, Number(e.target.value))}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              hasError 
                ? 'border-red-500 focus:ring-red-200' 
                : 'border-gray-300 focus:ring-blue-200'
            }`}
          />
        )

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            onBlur={(e) => handleFieldBlur(field.key, e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              hasError 
                ? 'border-red-500 focus:ring-red-200' 
                : 'border-gray-300 focus:ring-blue-200'
            }`}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )

      case 'boolean':
        return (
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={Boolean(value)}
              onChange={(e) => handleFieldChange(field.key, e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">Enable {field.label}</span>
          </label>
        )

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              hasError 
                ? 'border-red-500 focus:ring-red-200' 
                : 'border-gray-300 focus:ring-blue-200'
            }`}
          />
        )

      case 'time':
        return (
          <input
            type="time"
            value={value}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
              hasError 
                ? 'border-red-500 focus:ring-red-200' 
                : 'border-gray-300 focus:ring-blue-200'
            }`}
          />
        )

      case 'json':
        return (
          <div>
            <textarea
              value={typeof value === 'string' ? value : JSON.stringify(value, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value)
                  handleFieldChange(field.key, parsed)
                } catch {
                  handleFieldChange(field.key, e.target.value)
                }
              }}
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 font-mono text-sm ${
                hasError 
                  ? 'border-red-500 focus:ring-red-200' 
                  : 'border-gray-300 focus:ring-blue-200'
              }`}
            />
          </div>
        )

      case 'array':
        return (
          <div className="space-y-2">
            {Array.isArray(value) && value.map((item: any, index: number) => (
              <div key={index} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={item}
                  onChange={(e) => {
                    const newArray = [...value]
                    newArray[index] = e.target.value
                    handleFieldChange(field.key, newArray)
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
                <button
                  onClick={() => {
                    const newArray = value.filter((_: any, i: number) => i !== index)
                    handleFieldChange(field.key, newArray)
                  }}
                  className="p-2 text-red-600 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => {
                const newArray = Array.isArray(value) ? [...value, ''] : ['']
                handleFieldChange(field.key, newArray)
              }}
              className="flex items-center space-x-1 px-3 py-2 text-blue-600 hover:bg-blue-50 rounded"
            >
              <Plus className="w-4 h-4" />
              <span>Add Item</span>
            </button>
          </div>
        )

      default:
        return <div>Unsupported field type: {field.type}</div>
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              Configure {node.data.label}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {node.type} node configuration
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowJsonView(!showJsonView)}
              className="p-2 text-gray-400 hover:text-gray-600"
              title={showJsonView ? "Hide JSON" : "Show JSON"}
            >
              {showJsonView ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {showJsonView ? (
            <div>
              <h3 className="font-medium text-gray-900 mb-2 flex items-center">
                <Code className="w-4 h-4 mr-2" />
                JSON Configuration
              </h3>
              <textarea
                value={JSON.stringify(config, null, 2)}
                onChange={(e) => {
                  try {
                    const parsed = JSON.parse(e.target.value)
                    setConfig(parsed)
                    if (onChange) {
                      onChange(parsed)
                    }
                  } catch {
                    // Invalid JSON, don't update
                  }
                }}
                rows={20}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 font-mono text-sm"
              />
            </div>
          ) : (
            <div className="space-y-6">
              {formSchema.map((field) => (
                <div key={field.key} className="space-y-2">
                  <label className="block">
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-700">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </span>
                      {field.description && (
                        <div className="ml-2" title={field.description}>
                          <Info className="w-4 h-4 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="mt-1">
                      {renderField(field)}
                    </div>
                  </label>
                  
                  {errors[field.key] && (
                    <div className="flex items-center space-x-1 text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4" />
                      <span>{errors[field.key]}</span>
                    </div>
                  )}
                  
                  {field.description && (
                    <p className="text-xs text-gray-500">{field.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-2 text-sm">
            {isValid ? (
              <div className="flex items-center text-green-600">
                <CheckCircle className="w-4 h-4 mr-1" />
                <span>Configuration is valid</span>
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <AlertCircle className="w-4 h-4 mr-1" />
                <span>{Object.keys(errors).length} error(s) found</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!isValid}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Save className="w-4 h-4 mr-1" />
              Save Configuration
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}