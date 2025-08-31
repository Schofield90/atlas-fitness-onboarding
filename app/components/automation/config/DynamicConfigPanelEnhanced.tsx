'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { X, Save, AlertCircle, CheckCircle, Info, Code, Eye, EyeOff, Plus, Trash2, ChevronDown } from 'lucide-react'
import { WorkflowNode } from '@/app/lib/types/automation'
import { useFeatureFlag } from '@/app/lib/feature-flags'
import { validateNodeConfig } from './schemas'
import { toast } from 'react-hot-toast'

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
  type: 'text' | 'textarea' | 'select' | 'multi-select' | 'number' | 'boolean' | 'date' | 'time' | 'datetime-local' | 'email' | 'tel' | 'url' | 'json' | 'array' | 'variable' | 'button' | 'rich-text'
  required?: boolean
  placeholder?: string
  description?: string
  options?: Array<{ value: string; label: string; pageId?: string }>
  defaultValue?: any
  validation?: {
    min?: number
    max?: number
    pattern?: string
    custom?: (value: any) => string | null
  }
  dependencies?: Array<{ field: string; value: any }>
  showWhen?: (config: any) => boolean
  buttonText?: string
  onClick?: () => void
  variables?: Array<{ value: string; label: string; description?: string }>
}

// Variable suggestions for messaging fields
const MESSAGE_VARIABLES = [
  { value: '{{firstName}}', label: 'First Name', description: 'Contact\'s first name' },
  { value: '{{lastName}}', label: 'Last Name', description: 'Contact\'s last name' },
  { value: '{{email}}', label: 'Email', description: 'Contact\'s email address' },
  { value: '{{phone}}', label: 'Phone', description: 'Contact\'s phone number' },
  { value: '{{company}}', label: 'Company', description: 'Contact\'s company name' },
  { value: '{{membershipLevel}}', label: 'Membership Level', description: 'Current membership tier' },
  { value: '{{nextSessionDate}}', label: 'Next Session', description: 'Next scheduled session' },
  { value: '{{trainerName}}', label: 'Trainer Name', description: 'Assigned trainer' },
  { value: '{{gymLocation}}', label: 'Gym Location', description: 'Preferred gym location' },
  { value: '{{customField1}}', label: 'Custom Field 1', description: 'Custom field value' },
]

// SMS-specific variables (using square brackets)
const SMS_VARIABLES = [
  { value: '[firstName]', label: 'First Name', description: 'Contact\'s first name' },
  { value: '[lastName]', label: 'Last Name', description: 'Contact\'s last name' },
  { value: '[phone]', label: 'Phone', description: 'Contact\'s phone number' },
  { value: '[nextSession]', label: 'Next Session', description: 'Next scheduled session' },
  { value: '[trainer]', label: 'Trainer', description: 'Assigned trainer' },
  { value: '[location]', label: 'Location', description: 'Gym location' },
]

const getNodeConfigSchema = (node: WorkflowNode, dynamicData?: any): FormField[] => {
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
      // Check if it's a Facebook lead form trigger
      const triggerType = node.data?.actionType === 'facebook_lead_form' 
        ? 'facebook_lead_form' 
        : node.data?.actionType === 'form_submitted'
        ? 'form_submitted'
        : (node.data?.config?.subtype || 'lead_trigger')
      return [
        ...baseFields,
        ...getTriggerFields(triggerType, dynamicData)
      ]
    
    case 'action':
      // Use the actionType from the node data (set when dragged from palette)
      const actionType = node.data?.actionType || node.data?.config?.actionType || 'send_email'
      return [
        ...baseFields,
        ...getActionFields(actionType, dynamicData)
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
    
    default:
      return baseFields
  }
}

const getTriggerFields = (subtype: string, dynamicData?: any): FormField[] => {
  // For specific trigger types, don't show the dropdown
  const hideDropdown = ['facebook_lead_form', 'form_submitted', 'scheduled_time'].includes(subtype)
  
  const commonFields = hideDropdown ? [] : [
    {
      key: 'subtype',
      label: 'Trigger Type',
      type: 'select' as const,
      required: true,
      options: [
        { value: 'lead_trigger', label: 'New Lead' },
        { value: 'scheduled_time', label: 'Schedule' },
        { value: 'birthday_trigger', label: 'Birthday' },
        { value: 'contact_tagged', label: 'Contact Tagged' },
        { value: 'webhook_received', label: 'Webhook' },
        { value: 'form_submitted', label: 'Form Submitted' }
      ]
    }
  ]

  switch (subtype) {
    case 'facebook_lead_form':
      const { facebookPages = [], facebookForms = [], loadingFacebookData = false } = dynamicData || {}
      
      return [
        {
          key: 'pageId',
          label: 'Facebook Page',
          type: 'select' as const,
          required: true,
          options: loadingFacebookData 
            ? [{ value: 'loading', label: 'Loading pages...' }]
            : facebookPages.length > 0 
              ? facebookPages
              : [{ value: '', label: 'No pages available - Please connect Facebook' }],
          description: 'Select the Facebook page to monitor for lead forms'
        },
        {
          key: 'formIds',
          label: 'Select Lead Forms',
          type: 'multi-select' as const,
          required: true,
          options: loadingFacebookData
            ? [{ value: 'loading', label: 'Loading forms...' }]
            : (() => {
                // Filter forms for the selected page
                const pageId = dynamicData?.config?.pageId
                const pageForms = pageId ? facebookForms.filter((f: any) => f.pageId === pageId) : []
                if (pageForms.length > 0) {
                  return [{ value: 'all', label: 'All Forms for this Page' }, ...pageForms]
                }
                return [{ value: '', label: 'No forms found - Create forms in Facebook Ads Manager' }]
              })(),
          description: (() => {
            const pageId = dynamicData?.config?.pageId
            const pageForms = pageId ? facebookForms.filter((f: any) => f.pageId === pageId) : []
            if (pageForms.length > 0) {
              return `Found ${pageForms.length} form(s) for this page. Select one or more to monitor.`
            }
            return 'No forms found for this page. Create lead forms in Facebook Ads Manager first.'
          })(),
          showWhen: (config: any) => config.pageId && config.pageId !== 'loading' && config.pageId !== ''
        },
        {
          key: 'refreshForms',
          label: '',
          type: 'button' as const,
          buttonText: '🔄 Refresh Forms',
          onClick: () => dynamicData?.onRefreshForms?.(),
          description: 'Click to fetch the latest forms from Facebook',
          showWhen: (config: any) => config.pageId && config.pageId !== ''
        }
      ]

    case 'form_submitted':
      const { forms = [], loadingForms = false } = dynamicData || {}
      
      return [
        {
          key: 'formId',
          label: 'Select Form',
          type: 'select' as const,
          required: true,
          options: loadingForms
            ? [{ value: 'loading', label: 'Loading forms...' }]
            : forms.length > 0
              ? forms
              : [{ value: '', label: 'No forms available' }],
          description: forms.length === 0 && !loadingForms
            ? 'No forms found. Click below to create a form.'
            : 'Select which form submission should trigger this automation'
        },
        {
          key: 'createForm',
          label: '',
          type: 'button' as const,
          buttonText: '➕ Create New Form',
          onClick: () => window.open('https://atlas-fitness-onboarding.vercel.app/forms', '_blank'),
          description: 'Open Forms section to create a new form',
          showWhen: (config: any) => forms.length === 0 && !loadingForms
        }
      ]

    case 'scheduled_time':
      // Schedule trigger should only show timing settings, no trigger type
      return [
        {
          key: 'scheduleType',
          label: 'Schedule Type',
          type: 'select' as const,
          required: true,
          defaultValue: 'daily',
          options: [
            { value: 'once', label: 'One Time' },
            { value: 'daily', label: 'Daily' },
            { value: 'weekly', label: 'Weekly' },
            { value: 'monthly', label: 'Monthly' },
            { value: 'cron', label: 'Custom (Cron)' }
          ]
        },
        {
          key: 'runDateTime',
          label: 'Run Date & Time',
          type: 'datetime-local' as const,
          required: true,
          description: 'When to trigger this automation',
          showWhen: (config) => config.scheduleType === 'once'
        },
        {
          key: 'runTime',
          label: 'Run Time',
          type: 'time' as const,
          required: true,
          defaultValue: '09:00',
          description: 'Time to run the automation',
          showWhen: (config) => ['daily', 'weekly', 'monthly'].includes(config.scheduleType)
        },
        {
          key: 'dayOfWeek',
          label: 'Day of Week',
          type: 'select' as const,
          required: true,
          options: [
            { value: '1', label: 'Monday' },
            { value: '2', label: 'Tuesday' },
            { value: '3', label: 'Wednesday' },
            { value: '4', label: 'Thursday' },
            { value: '5', label: 'Friday' },
            { value: '6', label: 'Saturday' },
            { value: '0', label: 'Sunday' }
          ],
          showWhen: (config) => config.scheduleType === 'weekly'
        },
        {
          key: 'dayOfMonth',
          label: 'Day of Month',
          type: 'number' as const,
          required: true,
          validation: { min: 1, max: 31 },
          defaultValue: 1,
          description: 'Day of the month to run (1-31)',
          showWhen: (config) => config.scheduleType === 'monthly'
        },
        {
          key: 'cronExpression',
          label: 'Cron Expression',
          type: 'text' as const,
          required: true,
          placeholder: '0 9 * * 1-5',
          description: 'Cron expression (e.g., 0 9 * * 1-5 for 9 AM weekdays)',
          showWhen: (config) => config.scheduleType === 'cron'
        },
        {
          key: 'timezone',
          label: 'Timezone',
          type: 'select' as const,
          required: true,
          defaultValue: 'Europe/London',
          options: [
            { value: 'Europe/London', label: 'London (GMT)' },
            { value: 'UTC', label: 'UTC' },
            { value: 'America/New_York', label: 'New York (EST)' }
          ]
        }
      ]

    default:
      return commonFields
  }
}

const getActionFields = (actionType: string, dynamicData?: any): FormField[] => {
  const { userPhone = '', userWhatsApp = '' } = dynamicData || {}
  
  switch (actionType) {
    case 'send_email':
      return [
        {
          key: 'to',
          label: 'To',
          type: 'rich-text' as const,
          required: true,
          placeholder: '{{email}} or recipient@example.com',
          description: 'Recipient email address',
          variables: MESSAGE_VARIABLES
        },
        {
          key: 'subject',
          label: 'Subject',
          type: 'rich-text' as const,
          required: true,
          placeholder: 'Welcome to Atlas Fitness, {{firstName}}!',
          description: 'Email subject line',
          variables: MESSAGE_VARIABLES
        },
        {
          key: 'body',
          label: 'Email Body',
          type: 'rich-text' as const,
          required: true,
          placeholder: 'Hi {{firstName}},\n\nWelcome to Atlas Fitness! Your next session is on {{nextSessionDate}}.',
          description: 'Email content',
          variables: MESSAGE_VARIABLES
        },
        {
          key: 'testEmail',
          label: 'Test Email Address',
          type: 'email' as const,
          placeholder: 'test@example.com',
          description: 'Send a test email to this address'
        },
        {
          key: 'sendTest',
          label: '',
          type: 'button' as const,
          buttonText: '📧 Send Test Email',
          onClick: () => dynamicData?.onSendTestEmail?.(dynamicData.config),
          description: 'Send a test version of this email',
          showWhen: (config: any) => config.testEmail && config.testEmail.includes('@')
        }
      ]

    case 'send_sms':
      return [
        {
          key: 'from',
          label: 'From Number',
          type: 'text' as const,
          required: true,
          defaultValue: userPhone,
          placeholder: userPhone || 'Your phone number',
          description: 'Your SMS sender number (auto-filled from profile)'
        },
        {
          key: 'to',
          label: 'To',
          type: 'rich-text' as const,
          required: true,
          placeholder: '[phone] or +447123456789',
          description: 'Recipient phone number',
          variables: SMS_VARIABLES
        },
        {
          key: 'message',
          label: 'SMS Message',
          type: 'rich-text' as const,
          required: true,
          placeholder: 'Hi [firstName], your session at Atlas Fitness is tomorrow at [nextSession]. Reply STOP to opt out.',
          validation: { max: 1600 },
          description: 'SMS content (160 chars = 1 SMS)',
          variables: SMS_VARIABLES
        },
        {
          key: 'testPhone',
          label: 'Test Phone Number',
          type: 'tel' as const,
          placeholder: '+447123456789',
          description: 'Send a test SMS to this number'
        },
        {
          key: 'sendTestSMS',
          label: '',
          type: 'button' as const,
          buttonText: '💬 Send Test SMS',
          onClick: () => dynamicData?.onSendTestSMS?.(dynamicData.config),
          description: 'Send a test version of this SMS',
          showWhen: (config: any) => config.testPhone && config.testPhone.length > 7
        }
      ]

    case 'send_whatsapp':
      return [
        {
          key: 'from',
          label: 'From Number',
          type: 'text' as const,
          required: true,
          defaultValue: userWhatsApp,
          placeholder: userWhatsApp || 'Your WhatsApp Business number',
          description: 'Your WhatsApp Business number (auto-filled from profile)'
        },
        {
          key: 'to',
          label: 'To',
          type: 'rich-text' as const,
          required: true,
          placeholder: '{{phone}} or +447123456789',
          description: 'Recipient WhatsApp number',
          variables: MESSAGE_VARIABLES
        },
        {
          key: 'message',
          label: 'WhatsApp Message',
          type: 'rich-text' as const,
          required: true,
          placeholder: 'Hi {{firstName}}! 🏋️\n\nYour next training session is on {{nextSessionDate}} with {{trainerName}}.',
          description: 'WhatsApp message content',
          variables: MESSAGE_VARIABLES
        },
        {
          key: 'testWhatsApp',
          label: 'Test WhatsApp Number',
          type: 'tel' as const,
          placeholder: '+447123456789',
          description: 'Send a test WhatsApp message'
        },
        {
          key: 'sendTestWhatsApp',
          label: '',
          type: 'button' as const,
          buttonText: '💚 Send Test WhatsApp',
          onClick: () => dynamicData?.onSendTestWhatsApp?.(dynamicData.config),
          description: 'Send a test version of this WhatsApp message',
          showWhen: (config: any) => config.testWhatsApp && config.testWhatsApp.length > 7
        }
      ]

    default:
      return []
  }
}

const getConditionFields = (): FormField[] => [
  {
    key: 'field',
    label: 'Field to Check',
    type: 'select',
    required: true,
    options: [
      { value: 'email', label: 'Email' },
      { value: 'leadScore', label: 'Lead Score' },
      { value: 'tags', label: 'Tags' },
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
    placeholder: 'Enter value to compare'
  }
]

const getWaitFields = (): FormField[] => [
  {
    key: 'duration',
    label: 'Wait Duration',
    type: 'number',
    required: true,
    validation: { min: 1 },
    defaultValue: 1
  },
  {
    key: 'unit',
    label: 'Time Unit',
    type: 'select',
    required: true,
    defaultValue: 'hours',
    options: [
      { value: 'minutes', label: 'Minutes' },
      { value: 'hours', label: 'Hours' },
      { value: 'days', label: 'Days' },
      { value: 'weeks', label: 'Weeks' }
    ]
  }
]

// Component for rich text fields with variable insertion
const RichTextField: React.FC<{
  field: FormField
  value: string
  onChange: (value: string) => void
  error?: string
}> = ({ field, value, onChange, error }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [showVariables, setShowVariables] = useState(false)
  
  const insertVariable = (variable: string) => {
    if (!textareaRef.current) return
    
    // Sanitize variable to prevent XSS attacks
    const sanitizedVariable = variable
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // Remove iframes
      .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '') // Remove objects
      .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '') // Remove embeds
    
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const newValue = value.substring(0, start) + sanitizedVariable + value.substring(end)
    
    onChange(newValue)
    
    // Set cursor position after variable
    setTimeout(() => {
      textarea.selectionStart = start + variable.length
      textarea.selectionEnd = start + variable.length
      textarea.focus()
    }, 0)
  }
  
  return (
    <div className="space-y-2">
      <div className="relative">
        {field.type === 'textarea' || field.type === 'rich-text' ? (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-3 py-2 bg-gray-800 border ${error ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none`}
            rows={field.key === 'body' ? 6 : 3}
            required={field.required}
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-3 py-2 bg-gray-800 border ${error ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
            required={field.required}
          />
        )}
        
        {field.variables && field.variables.length > 0 && (
          <button
            type="button"
            onClick={() => setShowVariables(!showVariables)}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-white transition-colors"
            title="Insert variable"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showVariables ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      
      {showVariables && field.variables && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-2">
          <div className="text-xs text-gray-400 mb-2">Click to insert variable:</div>
          <div className="flex flex-wrap gap-1">
            {field.variables.map((variable) => (
              <button
                key={variable.value}
                type="button"
                onClick={() => {
                  insertVariable(variable.value)
                  setShowVariables(false)
                }}
                className="px-2 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-blue-400 rounded border border-gray-700 hover:border-blue-500 transition-colors"
                title={variable.description}
              >
                {variable.label}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {error && <p className="text-red-500 text-sm">{error}</p>}
      {field.description && !error && (
        <p className="text-gray-400 text-sm">{field.description}</p>
      )}
    </div>
  )
}

export default function DynamicConfigPanelEnhanced({ node, onClose, onSave, onChange, organizationId }: DynamicConfigPanelProps) {
  // Validate node exists and has required properties
  if (!node) {
    console.error('DynamicConfigPanelEnhanced: No node provided')
    toast.error('Configuration error: No node selected')
    onClose()
    return null
  }
  
  if (!node.id || !node.type) {
    console.error('DynamicConfigPanelEnhanced: Invalid node data', node)
    toast.error('Configuration error: Invalid node data')
    onClose()
    return null
  }
  
  console.log('DynamicConfigPanelEnhanced: Opening config for node', { id: node.id, type: node.type, data: node.data })
  
  // Add safety check for node.data
  if (!node.data) {
    node.data = { config: {} }
  }
  
  const [config, setConfig] = useState(node.data?.config || {})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isValid, setIsValid] = useState(false)
  const [facebookPages, setFacebookPages] = useState<Array<{ value: string; label: string }>>([])
  const [facebookForms, setFacebookForms] = useState<Array<{ value: string; label: string; pageId?: string }>>([])
  const [loadingFacebookData, setLoadingFacebookData] = useState(false)
  const [forms, setForms] = useState<Array<{ value: string; label: string }>>([])
  const [loadingForms, setLoadingForms] = useState(false)
  const [userPhone, setUserPhone] = useState('')
  const [userWhatsApp, setUserWhatsApp] = useState('')
  
  // Feature flags
  const useControlledConfig = useFeatureFlag('automationBuilderControlledConfig')
  
  // Fetch user phone numbers
  useEffect(() => {
    fetchUserDetails()
  }, [])
  
  const fetchUserDetails = async () => {
    try {
      const response = await fetch('/api/user/profile')
      if (response.ok) {
        const data = await response.json()
        setUserPhone(data.phone || '')
        setUserWhatsApp(data.whatsapp || data.phone || '')
      }
    } catch (error) {
      console.error('Error fetching user details:', error)
    }
  }
  
  // Fetch Facebook data
  const fetchFacebookData = useCallback(async () => {
    setLoadingFacebookData(true)
    try {
      // Fetch pages with organization context
      const pagesResponse = await fetch('/api/integrations/facebook/pages')
      if (pagesResponse.ok) {
        const pagesData = await pagesResponse.json()
        
        if (!pagesData.hasConnection) {
          // No Facebook connection
          setFacebookPages([])
          setFacebookForms([])
          toast.error('Please connect your Facebook account first in Settings > Integrations')
          return
        }
        
        if (pagesData.pages && pagesData.pages.length > 0) {
          const pageOptions = pagesData.pages.map((page: any) => ({
            value: page.id,
            label: page.name
          }))
          setFacebookPages(pageOptions)
          
          // Now fetch forms for each page
          const allForms: Array<{ value: string; label: string; pageId: string }> = []
          
          for (const page of pagesData.pages) {
            // If page already has forms, use them
            if (page.forms && page.forms.length > 0) {
              page.forms.forEach((form: any) => {
                allForms.push({
                  value: form.facebook_form_id || form.id,
                  label: `${form.form_name || form.name} (${page.name})`,
                  pageId: page.id
                })
              })
            } else {
              // Otherwise fetch forms from API
              try {
                const formsResponse = await fetch(`/api/integrations/facebook/forms?pageId=${page.id}`)
                if (formsResponse.ok) {
                  const formsData = await formsResponse.json()
                  if (formsData.forms && formsData.forms.length > 0) {
                    formsData.forms.forEach((form: any) => {
                      allForms.push({
                        value: form.id,
                        label: `${form.name} (${page.name})`,
                        pageId: page.id
                      })
                    })
                  }
                }
              } catch (error) {
                console.error(`Error fetching forms for page ${page.id}:`, error)
              }
            }
          }
          
          setFacebookForms(allForms)
        } else {
          setFacebookPages([])
          setFacebookForms([])
        }
      } else {
        const errorData = await pagesResponse.json()
        console.error('Failed to fetch pages:', errorData)
        toast.error(errorData.message || 'Failed to load Facebook pages')
      }
    } catch (error) {
      console.error('Error fetching Facebook data:', error)
      toast.error('Failed to load Facebook data. Please check your Facebook integration.')
    } finally {
      setLoadingFacebookData(false)
    }
  }, [])
  
  // Fetch forms
  const fetchForms = useCallback(async () => {
    setLoadingForms(true)
    try {
      const response = await fetch(`/api/forms?organizationId=${organizationId}`)
      if (response.ok) {
        const data = await response.json()
        if (data.forms) {
          const formOptions = data.forms.map((form: any) => ({
            value: form.id,
            label: form.name || form.title || `Form ${form.id}`
          }))
          setForms(formOptions)
        }
      }
    } catch (error) {
      console.error('Error fetching forms:', error)
    } finally {
      setLoadingForms(false)
    }
  }, [organizationId])
  
  // Fetch data based on node type
  useEffect(() => {
    if (node.type === 'trigger' && node.data?.actionType === 'facebook_lead_form') {
      fetchFacebookData()
    }
    if (node.type === 'trigger' && (node.data?.actionType === 'form_submitted' || config?.subtype === 'form_submitted')) {
      fetchForms()
    }
  }, [node.type, node.data?.actionType, config?.subtype, fetchFacebookData, fetchForms])
  
  // Test send functions
  const sendTestEmail = async (config: any) => {
    try {
      const response = await fetch('/api/automations/test/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: config.testEmail,
          subject: config.subject,
          body: config.body,
          from: config.from
        })
      })
      
      if (response.ok) {
        toast.success('Test email sent successfully!')
      } else {
        toast.error('Failed to send test email')
      }
    } catch (error) {
      console.error('Error sending test email:', error)
      toast.error('Failed to send test email')
    }
  }
  
  const sendTestSMS = async (config: any) => {
    try {
      const response = await fetch('/api/automations/test/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: config.testPhone,
          message: config.message,
          from: config.from
        })
      })
      
      if (response.ok) {
        toast.success('Test SMS sent successfully!')
      } else {
        toast.error('Failed to send test SMS')
      }
    } catch (error) {
      console.error('Error sending test SMS:', error)
      toast.error('Failed to send test SMS')
    }
  }
  
  const sendTestWhatsApp = async (config: any) => {
    try {
      const response = await fetch('/api/automations/test/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: config.testWhatsApp,
          message: config.message,
          from: config.from
        })
      })
      
      if (response.ok) {
        toast.success('Test WhatsApp message sent successfully!')
      } else {
        toast.error('Failed to send test WhatsApp message')
      }
    } catch (error) {
      console.error('Error sending test WhatsApp:', error)
      toast.error('Failed to send test WhatsApp message')
    }
  }
  
  const formSchema = getNodeConfigSchema(node, { 
    facebookPages, 
    facebookForms, 
    loadingFacebookData, 
    config,
    forms,
    loadingForms,
    onRefreshForms: fetchFacebookData,
    userPhone,
    userWhatsApp,
    onSendTestEmail: sendTestEmail,
    onSendTestSMS: sendTestSMS,
    onSendTestWhatsApp: sendTestWhatsApp
  })
  
  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    let valid = true
    
    formSchema.forEach(field => {
      if (field.required && !config[field.key]) {
        newErrors[field.key] = `${field.label} is required`
        valid = false
      }
      
      if (field.validation?.custom) {
        const error = field.validation.custom(config[field.key])
        if (error) {
          newErrors[field.key] = error
          valid = false
        }
      }
    })
    
    setErrors(newErrors)
    setIsValid(valid)
  }
  
  useEffect(() => {
    validateForm()
  }, [config])
  
  const handleFieldChange = (key: string, value: any) => {
    const newConfig = { ...config, [key]: value }
    setConfig(newConfig)
    if (onChange) {
      onChange(newConfig)
    }
  }
  
  const handleSave = () => {
    if (isValid) {
      // Update the node label if it was changed
      const updatedConfig = {
        ...config,
        label: config.label || node.data?.label
      }
      onSave(node.id, updatedConfig)
      onClose()
    }
  }
  
  const renderField = (field: FormField) => {
    if (field.showWhen && !field.showWhen(config)) {
      return null
    }
    
    if (field.type === 'button') {
      return (
        <div key={field.key} className="mt-4">
          <button
            type="button"
            onClick={field.onClick}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            {field.buttonText}
          </button>
          {field.description && (
            <p className="text-gray-400 text-sm mt-1">{field.description}</p>
          )}
        </div>
      )
    }
    
    if (field.type === 'rich-text') {
      return (
        <div key={field.key} className="space-y-2">
          <label className="block text-sm font-medium text-gray-200">
            {field.label}
            {field.required && <span className="text-red-500 ml-1">*</span>}
          </label>
          <RichTextField
            field={field}
            value={config[field.key] || ''}
            onChange={(value) => handleFieldChange(field.key, value)}
            error={errors[field.key]}
          />
        </div>
      )
    }
    
    // Render other field types...
    return (
      <div key={field.key} className="space-y-2">
        <label className="block text-sm font-medium text-gray-200">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        {field.type === 'select' && (
          <select
            value={config[field.key] || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            className={`w-full px-3 py-2 bg-gray-800 border ${errors[field.key] ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500`}
            required={field.required}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        )}
        
        {field.type === 'multi-select' && (
          <div className="space-y-2 bg-gray-800 border border-gray-700 rounded-lg p-3">
            {field.options?.map(option => (
              <label key={option.value} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={(config[field.key] || []).includes(option.value)}
                  onChange={(e) => {
                    const current = config[field.key] || []
                    const newValue = e.target.checked
                      ? [...current, option.value]
                      : current.filter((v: string) => v !== option.value)
                    handleFieldChange(field.key, newValue)
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                />
                <span className="text-gray-200">{option.label}</span>
              </label>
            ))}
          </div>
        )}
        
        {['text', 'email', 'tel', 'url', 'number', 'date', 'time', 'datetime-local'].includes(field.type) && (
          <input
            type={field.type}
            value={config[field.key] || field.defaultValue || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-3 py-2 bg-gray-800 border ${errors[field.key] ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
            required={field.required}
          />
        )}
        
        {field.type === 'textarea' && (
          <textarea
            value={config[field.key] || ''}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-3 py-2 bg-gray-800 border ${errors[field.key] ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none`}
            rows={3}
            required={field.required}
          />
        )}
        
        {field.type === 'boolean' && (
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={config[field.key] || false}
              onChange={(e) => handleFieldChange(field.key, e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <span className="text-gray-200">Enable</span>
          </label>
        )}
        
        {errors[field.key] && (
          <p className="text-red-500 text-sm">{errors[field.key]}</p>
        )}
        
        {field.description && !errors[field.key] && (
          <p className="text-gray-400 text-sm">{field.description}</p>
        )}
      </div>
    )
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">
            Configure {node.data?.label || 'Node'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {formSchema.map(renderField)}
          </div>
        </div>
        
        <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              isValid
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Save className="w-4 h-4" />
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  )
}