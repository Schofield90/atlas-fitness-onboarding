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
  console.log('🚀🚀🚀 [getNodeConfigSchema] FUNCTION CALLED!', {
    nodeType: node.type,
    nodeData: node.data,
    actionType: node.data?.actionType
  })

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
      // Check if it's a specific trigger type
      const triggerType = node.data?.actionType === 'facebook_lead_form'
        ? 'facebook_lead_form'
        : node.data?.actionType === 'form_submitted'
        ? 'form_submitted'
        : node.data?.actionType === 'website_form'
        ? 'form_submitted' // Website form uses same config as form_submitted
        : node.data?.actionType === 'call_booking.created'
        ? 'call_booking'
        : node.data?.actionType === 'scheduled'
        ? 'scheduled_time'
        : node.data?.actionType === 'webhook'
        ? 'webhook_received'
        : node.data?.subtype === 'webhook_received'
        ? 'webhook_received'
        : (node.data?.config?.subtype || 'lead_trigger')

      console.log('🎯 [DynamicConfigPanel] Trigger Type Detection:')
      console.log('🎯   actionType:', node.data?.actionType)
      console.log('🎯   subtype:', node.data?.subtype)
      console.log('🎯   config.subtype:', node.data?.config?.subtype)
      console.log('🎯   DETECTED triggerType:', triggerType)
      console.log('🎯   Full node.data:', node.data)

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
  const hideDropdown = ['facebook_lead_form', 'form_submitted', 'scheduled_time', 'webhook_received', 'call_booking'].includes(subtype)

  console.log('🔧 [getTriggerFields] CALLED WITH SUBTYPE:', subtype)
  console.log('🔧 [getTriggerFields] hideDropdown:', hideDropdown)
  console.log('🔧 [getTriggerFields] Is call_booking?', subtype === 'call_booking')

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
      const { facebookPages = [], facebookForms = [], loadingFacebookPages = false, loadingFacebookForms = false } = dynamicData || {}
      
      // Debug logging
      console.log('Facebook Lead Form Config:', {
        pagesCount: facebookPages.length,
        formsCount: facebookForms.length,
        loadingPages: loadingFacebookPages,
        loadingForms: loadingFacebookForms,
        currentPageId: dynamicData?.config?.pageId
      })
      
      // Filter forms for the selected page
      const selectedPageId = dynamicData?.config?.pageId
      const availableForms = selectedPageId && selectedPageId !== '' 
        ? facebookForms.filter((f: any) => f.pageId === selectedPageId)
        : []
      
      return [
        {
          key: 'pageId',
          label: 'Facebook Page',
          type: 'select' as const,
          required: true,
          options: loadingFacebookPages 
            ? [{ value: 'loading', label: 'Loading pages...' }]
            : facebookPages.length > 0 
              ? facebookPages
              : [{ value: '', label: 'No pages available - Please connect Facebook in Settings > Integrations' }],
          description: facebookPages.length > 0 
            ? 'Select the Facebook page to monitor for lead forms'
            : 'No Facebook pages found. Please ensure your Facebook account is connected and has pages with lead forms access.'
        },
        {
          key: 'formSelection',
          label: 'Form Selection',
          type: 'select' as const,
          required: true,
          defaultValue: 'all',
          options: [
            { value: 'all', label: 'All Forms (current and future)' },
            { value: 'specific', label: 'Specific Forms Only' }
          ],
          description: 'Choose whether to trigger for all forms or specific ones',
          showWhen: (config: any) => config.pageId && config.pageId !== 'loading' && config.pageId !== '' && availableForms.length > 0
        },
        {
          key: 'formIds',
          label: 'Select Lead Forms',
          type: 'multi-select' as const,
          required: true,
          options: loadingFacebookForms
            ? [{ value: 'loading', label: 'Loading forms...' }]
            : availableForms.length > 0
              ? availableForms
              : [{ value: '', label: 'No forms found - Create forms in Facebook Ads Manager' }],
          description: availableForms.length > 0
            ? `Found ${availableForms.length} form(s) for this page. Select which forms to monitor.`
            : 'No forms found for this page. Create lead forms in Facebook Ads Manager first.',
          showWhen: (config: any) => config.pageId && config.pageId !== 'loading' && config.pageId !== '' && config.formSelection === 'specific'
        },
        {
          key: 'refreshForms',
          label: '',
          type: 'button' as const,
          buttonText: '🔄 Refresh Forms',
          onClick: () => dynamicData?.onRefreshForms?.(),
          description: 'Click to fetch the latest forms from Facebook',
          showWhen: (config: any) => config.pageId && config.pageId !== ''
        },
        {
          key: 'connectFacebook',
          label: '',
          type: 'button' as const,
          buttonText: '🔗 Connect Facebook Account',
          onClick: () => window.open('/settings/integrations', '_blank'),
          description: 'Connect your Facebook account to use this trigger',
          showWhen: (config: any) => facebookPages.length === 0 && !loadingFacebookPages
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
      // Simplified schedule trigger - multiple days and time
      return [
        {
          key: 'scheduleType',
          label: 'Schedule Type',
          type: 'select' as const,
          required: true,
          defaultValue: 'specific_days',
          options: [
            { value: 'specific_days', label: 'Specific Days' },
            { value: 'everyday', label: 'Every Day' },
            { value: 'weekdays', label: 'Weekdays (Mon-Fri)' },
            { value: 'weekends', label: 'Weekends (Sat-Sun)' }
          ],
          description: 'Choose your schedule pattern'
        },
        {
          key: 'daysOfWeek',
          label: 'Select Days',
          type: 'multi-select' as const,
          required: true,
          defaultValue: ['1'],
          options: [
            { value: '1', label: 'Monday' },
            { value: '2', label: 'Tuesday' },
            { value: '3', label: 'Wednesday' },
            { value: '4', label: 'Thursday' },
            { value: '5', label: 'Friday' },
            { value: '6', label: 'Saturday' },
            { value: '0', label: 'Sunday' }
          ],
          description: 'Select which days to run the automation',
          showWhen: (config: any) => config.scheduleType === 'specific_days'
        },
        {
          key: 'runTime',
          label: 'Time',
          type: 'time' as const,
          required: true,
          defaultValue: '09:00',
          description: 'What time to trigger (e.g., 9:00 AM)'
        },
        {
          key: 'timezone',
          label: 'Timezone',
          type: 'select' as const,
          required: true,
          defaultValue: 'Europe/London',
          options: [
            { value: 'Europe/London', label: 'London (GMT/BST)' },
            { value: 'Europe/Dublin', label: 'Dublin' },
            { value: 'Europe/Paris', label: 'Paris' },
            { value: 'Europe/Berlin', label: 'Berlin' },
            { value: 'America/New_York', label: 'New York' },
            { value: 'America/Chicago', label: 'Chicago' },
            { value: 'America/Los_Angeles', label: 'Los Angeles' },
            { value: 'UTC', label: 'UTC' }
          ],
          description: 'Timezone for the schedule'
        }
      ]

    case 'call_booking':
      // Call Booking configuration - select which booking link triggers the workflow
      const { bookingLinks = [], loadingBookingLinks = false } = dynamicData || {}

      console.log('[getTriggerFields] CALL_BOOKING case executed!', {
        bookingLinksCount: bookingLinks.length,
        loadingBookingLinks
      })

      return [
        {
          key: 'booking_link_id',
          label: 'Booking Link',
          type: 'select' as const,
          required: true,
          options: loadingBookingLinks
            ? [{ value: 'loading', label: 'Loading booking links...' }]
            : bookingLinks.length > 0
              ? bookingLinks
              : [{ value: '', label: 'No booking links available - Please create one in Calendar & Booking Links' }],
          description: bookingLinks.length === 0 && !loadingBookingLinks
            ? 'No booking links found. Create a booking link in Calendar & Booking Links to use this trigger.'
            : 'Select which booking link should trigger this workflow. The workflow will run whenever someone books a call through the selected link.'
        }
      ]

    case 'webhook_received':
      // Webhook configuration with detailed event types
      return [
        {
          key: 'webhookEvent',
          label: 'Webhook Event Type',
          type: 'select' as const,
          required: true,
          defaultValue: 'custom',
          options: [
            { value: 'custom', label: 'Custom Webhook' },
            { value: 'stripe_payment_succeeded', label: 'Stripe - Payment Succeeded' },
            { value: 'stripe_payment_failed', label: 'Stripe - Payment Failed' },
            { value: 'stripe_subscription_created', label: 'Stripe - Subscription Created' },
            { value: 'stripe_subscription_cancelled', label: 'Stripe - Subscription Cancelled' },
            { value: 'stripe_invoice_paid', label: 'Stripe - Invoice Paid' },
            { value: 'stripe_invoice_failed', label: 'Stripe - Invoice Failed' },
            { value: 'twilio_message_received', label: 'Twilio - Message Received' },
            { value: 'twilio_call_completed', label: 'Twilio - Call Completed' },
            { value: 'calendar_event_created', label: 'Calendar - Event Created' },
            { value: 'calendar_event_updated', label: 'Calendar - Event Updated' },
            { value: 'calendar_event_cancelled', label: 'Calendar - Event Cancelled' },
            { value: 'form_submission', label: 'External Form Submission' },
            { value: 'booking_created', label: 'Booking Created' },
            { value: 'booking_cancelled', label: 'Booking Cancelled' },
            { value: 'membership_expired', label: 'Membership Expired' },
            { value: 'review_submitted', label: 'Review Submitted' }
          ],
          description: 'Select the type of webhook event to listen for'
        },
        {
          key: 'webhookUrl',
          label: 'Webhook URL',
          type: 'text' as const,
          required: false,
          placeholder: 'https://your-domain.com/webhooks/...',
          description: 'Your unique webhook URL (generated automatically)',
          readOnly: true,
          defaultValue: `${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/automation/${dynamicData?.workflowId || 'new'}`,
          showWhen: (config: any) => config.webhookEvent
        },
        {
          key: 'webhookSecret',
          label: 'Webhook Secret (Optional)',
          type: 'text' as const,
          required: false,
          placeholder: 'Enter a secret key for webhook verification',
          description: 'Add a secret key to verify webhook authenticity (recommended for production)',
          showWhen: (config: any) => config.webhookEvent === 'custom'
        },
        {
          key: 'webhookFilters',
          label: 'Filter Conditions',
          type: 'textarea' as const,
          required: false,
          placeholder: 'e.g., event.type === "payment.succeeded" && event.amount > 100',
          description: 'JavaScript expression to filter webhook events (advanced)',
          showWhen: (config: any) => config.webhookEvent === 'custom'
        },
        {
          key: 'webhookHelp',
          label: '',
          type: 'button' as const,
          buttonText: '📖 Webhook Setup Guide',
          onClick: () => window.open('/docs/webhooks', '_blank'),
          description: 'Learn how to set up webhooks with your external services',
          showWhen: (config: any) => config.webhookEvent
        },
        {
          key: 'testWebhook',
          label: '',
          type: 'button' as const,
          buttonText: '🧪 Send Test Webhook',
          onClick: () => {
            // Send test webhook
            fetch('/api/webhooks/test', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                webhookUrl: dynamicData?.config?.webhookUrl,
                eventType: dynamicData?.config?.webhookEvent,
                secret: dynamicData?.config?.webhookSecret
              })
            }).then(res => {
              if (res.ok) {
                toast.success('Test webhook sent! Check your automation logs.')
              } else {
                toast.error('Failed to send test webhook')
              }
            })
          },
          description: 'Send a test webhook to verify your configuration',
          showWhen: (config: any) => config.webhookEvent && config.webhookUrl
        }
      ]

    default:
      console.log('[getTriggerFields] DEFAULT case executed!', {
        subtype,
        commonFieldsCount: commonFields.length
      })
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
  // Initialize all hooks before any conditional returns
  const [config, setConfig] = useState(node?.data?.config || {})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isValid, setIsValid] = useState(false)
  const [facebookPages, setFacebookPages] = useState<Array<{ value: string; label: string }>>([])
  const [facebookForms, setFacebookForms] = useState<Array<{ value: string; label: string; pageId?: string }>>([])
  const [loadingFacebookPages, setLoadingFacebookPages] = useState(false)
  const [loadingFacebookForms, setLoadingFacebookForms] = useState(false)
  const [forms, setForms] = useState<Array<{ value: string; label: string }>>([])
  const [loadingForms, setLoadingForms] = useState(false)
  const [bookingLinks, setBookingLinks] = useState<Array<{ value: string; label: string }>>([])
  const [loadingBookingLinks, setLoadingBookingLinks] = useState(false)
  const [userPhone, setUserPhone] = useState('')
  const [userWhatsApp, setUserWhatsApp] = useState('')

  // Feature flags
  const useControlledConfig = useFeatureFlag('automationBuilderControlledConfig')

  // Define functions before hooks that use them
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
  const fetchFacebookData = async () => {
    console.log('fetchFacebookData called')
    setLoadingFacebookPages(true)
    setLoadingFacebookForms(false)
    try {
      // Fetch pages with organization context
      const pagesResponse = await fetch('/api/integrations/facebook/pages')
      console.log('Facebook pages API response status:', pagesResponse.status)

      if (pagesResponse.ok) {
        const pagesData = await pagesResponse.json()
        console.log('Facebook pages data:', pagesData)

        if (!pagesData.hasConnection) {
          // No Facebook connection
          console.log('No Facebook connection found')
          setFacebookPages([])
          setFacebookForms([])
          setLoadingFacebookPages(false)
          toast.error('Please connect your Facebook account first in Settings > Integrations')
          return
        }

        if (pagesData.pages && pagesData.pages.length > 0) {
          const pageOptions = pagesData.pages.map((page: any) => ({
            value: page.id,
            label: page.name
          }))
          setFacebookPages(pageOptions)
          setLoadingFacebookPages(false)

          // Now fetch forms for ALL pages using the lead-forms endpoint
          const pageIds = pagesData.pages.map((p: any) => p.id).join(',')
          console.log('Fetching lead forms for pages:', pageIds)

          try {
            setLoadingFacebookForms(true)
            const formsResponse = await fetch(`/api/integrations/facebook/lead-forms?pageIds=${pageIds}`)
            if (formsResponse.ok) {
              const formsData = await formsResponse.json()
              console.log('Lead forms response:', formsData)

              const allForms: Array<{ value: string; label: string; pageId: string }> = []

              if (formsData.forms && formsData.forms.length > 0) {
                formsData.forms.forEach((form: any) => {
                  // Find which page this form belongs to
                  const page = pagesData.pages.find((p: any) => p.id === form.pageId)
                  const pageName = page?.name || 'Unknown Page'

                  allForms.push({
                    value: form.id,
                    label: `${form.name} (${pageName})`,
                    pageId: form.pageId
                  })
                })
              }

              console.log('Processed forms for workflow:', allForms)
              setFacebookForms(allForms)
            } else {
              const errorData = await formsResponse.json()
              console.error('Failed to fetch lead forms:', errorData)
              // Still set empty forms so user can see the page selection
              setFacebookForms([])
            }
          } catch (error) {
            console.error('Error fetching lead forms:', error)
            setFacebookForms([])
          } finally {
            setLoadingFacebookForms(false)
          }
        } else {
          setFacebookPages([])
          setFacebookForms([])
          setLoadingFacebookPages(false)
        }
      } else {
        const errorData = await pagesResponse.json()
        console.error('Failed to fetch pages:', errorData)
        setLoadingFacebookPages(false)
        toast.error(errorData.message || 'Failed to load Facebook pages')
      }
    } catch (error) {
      console.error('Error fetching Facebook data:', error)
      setLoadingFacebookPages(false)
      setLoadingFacebookForms(false)
      toast.error('Failed to load Facebook data. Please check your Facebook integration.')
    }
  }

  // Fetch forms
  const fetchForms = async () => {
    setLoadingForms(true)
    try {
      const response = await fetch('/api/forms/list')
      if (response.ok) {
        const data = await response.json()
        if (data.forms) {
          const formOptions = [
            { value: 'default', label: 'Default Lead Form' },
            ...data.forms.map((form: any) => ({
              value: form.id,
              label: form.title || form.name || `Form ${form.id}`
            }))
          ]
          setForms(formOptions)
        } else {
          // If no custom forms, at least show the default form
          setForms([{ value: 'default', label: 'Default Lead Form' }])
        }
      }
    } catch (error) {
      console.error('Error fetching forms:', error)
      // On error, at least show the default form
      setForms([{ value: 'default', label: 'Default Lead Form' }])
    } finally {
      setLoadingForms(false)
    }
  }

  // Fetch booking links
  const fetchBookingLinks = async () => {
    setLoadingBookingLinks(true)
    try {
      const response = await fetch(`/api/booking-links`)
      if (response.ok) {
        const data = await response.json()
        // API returns booking_links (with underscore)
        const links = data.booking_links || data.bookingLinks || []
        if (links.length > 0) {
          const linkOptions = links.map((link: any) => ({
            value: link.id,
            label: `${link.name} (${link.slug})${link.is_active ? '' : ' (Inactive)'}`
          }))
          setBookingLinks(linkOptions)
        } else {
          setBookingLinks([])
        }
      } else {
        console.error('Error fetching booking links:', response.status, response.statusText)
        setBookingLinks([])
      }
    } catch (error) {
      console.error('Error fetching booking links:', error)
      setBookingLinks([])
    } finally {
      setLoadingBookingLinks(false)
    }
  }

  // Test send functions
  const sendTestEmail = async (config: any) => {
    if (!config.testEmail) {
      toast.error('Please enter a test email address')
      return
    }

    const loadingToast = toast.loading('Sending test email...')

    try {
      const response = await fetch('/api/automations/test/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: config.testEmail,
          subject: config.subject || 'Test Email',
          body: config.body || 'This is a test email from your automation.',
          from: config.from
        })
      })

      toast.dismiss(loadingToast)

      if (response.ok) {
        const data = await response.json()
        toast.success(
          <div>
            <strong>✅ Test email sent successfully!</strong>
            <br />
            <span className="text-sm">Check {config.testEmail} for your test message.</span>
          </div>,
          { duration: 5000 }
        )
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(
          <div>
            <strong>❌ Failed to send test email</strong>
            <br />
            <span className="text-sm">{errorData.error || 'Please check your email configuration'}</span>
          </div>,
          { duration: 5000 }
        )
      }
    } catch (error) {
      toast.dismiss(loadingToast)
      console.error('Error sending test email:', error)
      toast.error(
        <div>
          <strong>❌ Network error</strong>
          <br />
          <span className="text-sm">Could not connect to email service</span>
        </div>,
        { duration: 5000 }
      )
    }
  }

  const sendTestSMS = async (config: any) => {
    if (!config.testPhone) {
      toast.error('Please enter a test phone number')
      return
    }

    const loadingToast = toast.loading('Sending test SMS...')

    try {
      const response = await fetch('/api/automations/test/sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: config.testPhone,
          message: config.message || 'This is a test SMS from your automation.',
          from: config.from
        })
      })

      toast.dismiss(loadingToast)

      if (response.ok) {
        toast.success(
          <div>
            <strong>✅ Test SMS sent successfully!</strong>
            <br />
            <span className="text-sm">Check {config.testPhone} for your test message.</span>
          </div>,
          { duration: 5000 }
        )
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(
          <div>
            <strong>❌ Failed to send test SMS</strong>
            <br />
            <span className="text-sm">{errorData.error || 'Please check your SMS configuration'}</span>
          </div>,
          { duration: 5000 }
        )
      }
    } catch (error) {
      toast.dismiss(loadingToast)
      console.error('Error sending test SMS:', error)
      toast.error('Failed to connect to SMS service')
    }
  }

  const sendTestWhatsApp = async (config: any) => {
    if (!config.testWhatsApp) {
      toast.error('Please enter a test WhatsApp number')
      return
    }

    const loadingToast = toast.loading('Sending test WhatsApp message...')

    try {
      const response = await fetch('/api/automations/test/whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: config.testWhatsApp,
          message: config.message || 'This is a test WhatsApp message from your automation.',
          from: config.from
        })
      })

      toast.dismiss(loadingToast)

      if (response.ok) {
        toast.success(
          <div>
            <strong>✅ Test WhatsApp sent successfully!</strong>
            <br />
            <span className="text-sm">Check {config.testWhatsApp} for your test message.</span>
          </div>,
          { duration: 5000 }
        )
      } else {
        const errorData = await response.json().catch(() => ({}))
        toast.error(
          <div>
            <strong>❌ Failed to send test WhatsApp</strong>
            <br />
            <span className="text-sm">{errorData.error || 'Please check your WhatsApp configuration'}</span>
          </div>,
          { duration: 5000 }
        )
      }
    } catch (error) {
      toast.dismiss(loadingToast)
      console.error('Error sending test WhatsApp:', error)
      toast.error('Failed to connect to WhatsApp service')
    }
  }

  const formSchema = getNodeConfigSchema(node, {
    facebookPages,
    facebookForms,
    loadingFacebookPages,
    loadingFacebookForms,
    config,
    forms,
    loadingForms,
    bookingLinks,
    loadingBookingLinks,
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

  const handleFieldChange = (key: string, value: any) => {
    // Defensive: ensure config is an object
    const safeConfig = config || {}
    const newConfig = { ...safeConfig, [key]: value }

    // When Facebook page changes, reset form selection
    if (key === 'pageId' && node.type === 'trigger' && node.data?.actionType === 'facebook_lead_form') {
      newConfig.formSelection = 'all'
      newConfig.formIds = []
    }

    setConfig(newConfig)
    if (onChange) {
      onChange(newConfig)
    }
  }

  // Helper function to safely get config values
  const getConfigValue = (key: string, defaultValue: any = '') => {
    if (!config || typeof config !== 'object') {
      return defaultValue
    }
    return config[key] !== undefined ? config[key] : defaultValue
  }

  const handleSave = () => {
    if (isValid) {
      // Ensure all config values are preserved
      const updatedConfig = {
        ...config,
        label: config.label || node.data?.label,
        // Preserve Facebook-specific settings
        pageId: config.pageId,
        formSelection: config.formSelection || 'all',
        formIds: config.formIds || [],
        // Preserve any other node-specific settings
        ...config
      }

      console.log('Saving node config:', {
        nodeId: node.id,
        nodeType: node.type,
        actionType: node.data?.actionType,
        config: updatedConfig
      })

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
            value={getConfigValue(field.key, '')}
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
            value={getConfigValue(field.key, '')}
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
            value={getConfigValue(field.key, field.defaultValue || '')}
            onChange={(e) => handleFieldChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full px-3 py-2 bg-gray-800 border ${errors[field.key] ? 'border-red-500' : 'border-gray-700'} rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500`}
            required={field.required}
          />
        )}

        {field.type === 'textarea' && (
          <textarea
            value={getConfigValue(field.key, '')}
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
              checked={getConfigValue(field.key, false)}
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

  // All useEffect hooks BEFORE any conditional returns
  // CRITICAL FIX: Sync config state when node changes
  useEffect(() => {
    if (!node?.data) return

    // Reset config to the new node's config when node changes
    const newConfig = node.data?.config || {}
    setConfig(newConfig)
    setErrors({}) // Clear errors for new node
    setIsValid(false) // Reset validation state

    // Also update node.data fields if they exist
    if (node.data?.label) {
      setConfig(prev => ({ ...prev, label: node.data.label }))
    }
    if (node.data?.description) {
      setConfig(prev => ({ ...prev, description: node.data.description }))
    }
  }, [node?.id, node?.data]) // Re-run when node or its data changes

  // Fetch user phone numbers
  useEffect(() => {
    fetchUserDetails()
  }, [])

  // Fetch data based on node type
  useEffect(() => {
    if (!node?.type || !node?.data) return

    if (node.type === 'trigger' && node.data?.actionType === 'facebook_lead_form') {
      console.log('Facebook Lead Form trigger detected, fetching Facebook data...')
      console.log('Current config:', config)
      fetchFacebookData()
    }
    if (node.type === 'trigger' && (node.data?.actionType === 'form_submitted' || node.data?.actionType === 'website_form' || config?.subtype === 'form_submitted')) {
      fetchForms()
    }
    if (node.type === 'trigger' && node.data?.actionType === 'call_booking.created') {
      console.log('Call Booking trigger detected, fetching booking links...')
      fetchBookingLinks()
    }
  }, [node?.type, node?.data?.actionType, config?.subtype]) // Removed fetchFacebookData and fetchForms from deps to prevent infinite loop

  // Load saved config on mount
  useEffect(() => {
    if (!node?.data?.config) return

    if (node.data.config && Object.keys(config).length === 0) {
      console.log('Loading saved node config:', node.data.config)
      setConfig(node.data.config)
    }
  }, [])

  useEffect(() => {
    validateForm()
  }, [config])

  // Validate node exists and has required properties AFTER all hooks
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