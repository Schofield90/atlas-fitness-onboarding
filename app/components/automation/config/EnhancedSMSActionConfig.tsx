'use client'

import { useState, useEffect } from 'react'
import { 
  MessageSquare, Variable, Sparkles, Eye, Clock, Send, 
  CheckCircle, XCircle, Loader2, Image, Video, FileText,
  Settings, Shield, Repeat, Globe, Calendar, Users,
  AlertTriangle, Info, Zap, Target, BarChart3
} from 'lucide-react'
import { createClient } from '@/app/lib/supabase/client'

interface SMSTemplate {
  id: string
  name: string
  message: string
  category?: string
  variables: string[]
  isActive?: boolean
}

interface SMSActionConfigProps {
  config: any
  onChange: (config: any) => void
  organizationId?: string
}

interface MMSConfig {
  enabled: boolean
  mediaUrl?: string
  mediaType?: 'image' | 'video' | 'document'
  caption?: string
}

interface DeliveryConfig {
  trackDelivery: boolean
  trackClicks: boolean
  deliveryReports: boolean
  failureNotifications: boolean
}

interface OptOutConfig {
  includeOptOut: boolean
  customOptOutMessage?: string
  automaticOptOutHandling: boolean
  suppressionListSync: boolean
}

interface RetryConfig {
  enabled: boolean
  maxRetries: number
  retryDelay: number // minutes
  retryOnFailureTypes: string[]
}

interface BusinessHoursConfig {
  enabled: boolean
  timeZone: string
  workingDays: string[]
  startTime: string
  endTime: string
  holidayRespect: boolean
}

interface ComplianceConfig {
  region: 'US' | 'UK' | 'EU' | 'CA' | 'AU'
  consentRequired: boolean
  optInConfirmation: boolean
  dataRetention: number // days
  gdprCompliant: boolean
}

export default function EnhancedSMSActionConfig({ config, onChange, organizationId }: SMSActionConfigProps) {
  const [templates, setTemplates] = useState<SMSTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<SMSTemplate | null>(null)
  const [messageMode, setMessageMode] = useState<'template' | 'custom'>(config.mode || 'custom')
  const [message, setMessage] = useState(config.message || '')
  const [showVariables, setShowVariables] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [testPhone, setTestPhone] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'basic' | 'mms' | 'delivery' | 'compliance' | 'schedule'>('basic')

  // MMS Configuration
  const [mmsConfig, setMMSConfig] = useState<MMSConfig>(config.mmsConfig || {
    enabled: false
  })

  // Delivery Configuration
  const [deliveryConfig, setDeliveryConfig] = useState<DeliveryConfig>(config.deliveryConfig || {
    trackDelivery: true,
    trackClicks: false,
    deliveryReports: true,
    failureNotifications: true
  })

  // Opt-out Configuration
  const [optOutConfig, setOptOutConfig] = useState<OptOutConfig>(config.optOutConfig || {
    includeOptOut: true,
    automaticOptOutHandling: true,
    suppressionListSync: true
  })

  // Retry Configuration
  const [retryConfig, setRetryConfig] = useState<RetryConfig>(config.retryConfig || {
    enabled: true,
    maxRetries: 3,
    retryDelay: 5,
    retryOnFailureTypes: ['network_error', 'rate_limit', 'temporary_failure']
  })

  // Business Hours Configuration
  const [businessHoursConfig, setBusinessHoursConfig] = useState<BusinessHoursConfig>(config.businessHoursConfig || {
    enabled: false,
    timeZone: 'Europe/London',
    workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    startTime: '09:00',
    endTime: '17:00',
    holidayRespect: true
  })

  // Compliance Configuration
  const [complianceConfig, setComplianceConfig] = useState<ComplianceConfig>(config.complianceConfig || {
    region: 'UK',
    consentRequired: true,
    optInConfirmation: false,
    dataRetention: 365,
    gdprCompliant: true
  })

  const availableVariables = [
    { key: '{{user.first_name}}', label: 'First Name', example: 'John', category: 'Contact' },
    { key: '{{user.last_name}}', label: 'Last Name', example: 'Doe', category: 'Contact' },
    { key: '{{user.full_name}}', label: 'Full Name', example: 'John Doe', category: 'Contact' },
    { key: '{{user.email}}', label: 'Email', example: 'john@example.com', category: 'Contact' },
    { key: '{{user.phone}}', label: 'Phone Number', example: '+447123456789', category: 'Contact' },
    { key: '{{appointment.only_start_date}}', label: 'Appointment Date', example: '2025-01-31', category: 'Appointment' },
    { key: '{{appointment.only_start_time}}', label: 'Appointment Time', example: '14:30', category: 'Appointment' },
    { key: '{{appointment.full_datetime}}', label: 'Full Appointment', example: '31/01/2025 at 14:30', category: 'Appointment' },
    { key: '{{appointment.location}}', label: 'Appointment Location', example: 'Main Studio', category: 'Appointment' },
    { key: '{{appointment.type}}', label: 'Appointment Type', example: 'Discovery Call', category: 'Appointment' },
    { key: '{{organization.name}}', label: 'Gym Name', example: 'Aimees Place', category: 'Organization' },
    { key: '{{organization.phone}}', label: 'Gym Phone', example: '+441234567890', category: 'Organization' },
    { key: '{{organization.address}}', label: 'Gym Address', example: '123 Main St', category: 'Organization' },
    { key: '{{lead.source}}', label: 'Lead Source', example: 'Facebook', category: 'Lead Data' },
    { key: '{{lead.interest}}', label: 'Interest/Goal', example: 'weight loss', category: 'Lead Data' },
    { key: '{{current.date}}', label: 'Current Date', example: '31/01/2025', category: 'System' },
    { key: '{{current.time}}', label: 'Current Time', example: '14:30', category: 'System' }
  ]

  useEffect(() => {
    loadSMSTemplates()
  }, [organizationId])

  useEffect(() => {
    // Update parent config when any sub-config changes
    onChange({
      ...config,
      mode: messageMode,
      message,
      templateId: selectedTemplate?.id,
      mmsConfig,
      deliveryConfig,
      optOutConfig,
      retryConfig,
      businessHoursConfig,
      complianceConfig
    })
  }, [messageMode, message, selectedTemplate, mmsConfig, deliveryConfig, optOutConfig, retryConfig, businessHoursConfig, complianceConfig])

  const loadSMSTemplates = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('sms_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error loading SMS templates:', error)
      // Use mock data as fallback
      setTemplates([
        {
          id: '1',
          name: 'Appointment Confirmation',
          message: 'Congrats! 👏 Your call is scheduled for {{appointment.only_start_date}} at {{appointment.only_start_time}}.\n\nLook forward to chatting then.\n\n{{user.first_name}}\n{{organization.name}}',
          variables: ['user.first_name', 'appointment.only_start_date', 'appointment.only_start_time', 'organization.name']
        },
        {
          id: '2',
          name: 'Welcome Message',
          message: 'Hi {{user.first_name}}! Welcome to {{organization.name}}. We\'re excited to help you reach your fitness goals! 💪',
          variables: ['user.first_name', 'organization.name']
        },
        {
          id: '3',
          name: 'Appointment Reminder',
          message: 'Hi {{user.first_name}}! Reminder: Your {{appointment.type}} is scheduled for {{appointment.only_start_date}} at {{appointment.only_start_time}}. See you soon!',
          variables: ['user.first_name', 'appointment.type', 'appointment.only_start_date', 'appointment.only_start_time']
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateSelect = (template: SMSTemplate) => {
    setSelectedTemplate(template)
    setMessage(template.message)
    setMessageMode('template')
  }

  const handleMessageChange = (value: string) => {
    setMessage(value)
    if (messageMode === 'template') {
      setMessageMode('custom')
      setSelectedTemplate(null)
    }
  }

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('sms-message') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newText = message.substring(0, start) + variable + message.substring(end)
      handleMessageChange(newText)
      
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + variable.length, start + variable.length)
      }, 0)
    }
  }

  const generateWithAI = async () => {
    setAiGenerating(true)
    try {
      await new Promise(resolve => setTimeout(resolve, 2000))

      const aiMessage = `Congrats! 👏 Your call is scheduled for {{appointment.only_start_date}} at {{appointment.only_start_time}}.

Look forward to chatting then.

{{user.first_name}}
{{organization.name}}`

      handleMessageChange(aiMessage)
    } catch (error) {
      console.error('AI generation error:', error)
    } finally {
      setAiGenerating(false)
    }
  }

  const getCharacterCount = () => message.length

  const getSMSCount = () => {
    const length = message.length
    if (length <= 160) return 1
    return Math.ceil(length / 153) // SMS split at 153 chars for multi-part
  }

  const getEstimatedCost = () => {
    const smsCount = getSMSCount()
    const costPerSMS = 0.04 // £0.04 per SMS in UK
    return (smsCount * costPerSMS).toFixed(3)
  }

  const sendTestSMS = async () => {
    if (!testPhone || !organizationId) return
    
    setSendingTest(true)
    setTestResult(null)
    
    try {
      let testMessage = message || 'Test SMS from [organization_name]. Your SMS integration is working correctly!'
      
      // Replace variables with sample data
      const sampleData: Record<string, string> = {
        '{{user.first_name}}': 'John',
        '{{user.last_name}}': 'Doe',
        '{{user.full_name}}': 'John Doe',
        '{{user.email}}': 'john@example.com',
        '{{user.phone}}': testPhone,
        '{{appointment.only_start_date}}': '2025-02-01',
        '{{appointment.only_start_time}}': '14:30',
        '{{appointment.full_datetime}}': '01/02/2025 at 14:30',
        '{{appointment.location}}': 'Main Studio',
        '{{appointment.type}}': 'Discovery Call',
        '{{organization.name}}': 'Aimees Place',
        '{{organization.phone}}': '+441234567890',
        '{{organization.address}}': '123 Main St, Bedford',
        '{{lead.source}}': 'Website',
        '{{lead.interest}}': 'Personal Training',
        '{{current.date}}': new Date().toLocaleDateString('en-GB'),
        '{{current.time}}': new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      }

      Object.entries(sampleData).forEach(([key, value]) => {
        testMessage = testMessage.replace(new RegExp(key.replace(/[{}]/g, '\\$&'), 'g'), value)
      })
      
      const response = await fetch('/api/sms/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          testPhone,
          message: testMessage,
          mmsConfig,
          optOutConfig,
          complianceConfig
        })
      })
      
      const data = await response.json()
      
      setTestResult({
        success: response.ok,
        message: response.ok 
          ? 'Test SMS sent successfully! Check your phone.'
          : data.error || 'Failed to send test SMS'
      })
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'An error occurred while sending the test SMS'
      })
    } finally {
      setSendingTest(false)
    }
  }

  const renderPreview = () => {
    let preview = message

    // Replace variables with example data
    availableVariables.forEach(variable => {
      preview = preview.replace(
        new RegExp(variable.key.replace(/[{}]/g, '\\$&'), 'g'),
        variable.example
      )
    })

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Preview with Sample Data</h4>
        <div className="bg-white p-4 rounded border">
          <div className="flex items-start">
            <MessageSquare className="w-5 h-5 text-gray-400 mt-0.5 mr-2" />
            <div className="flex-1">
              <p className="text-sm whitespace-pre-wrap">{preview}</p>
              {mmsConfig.enabled && mmsConfig.mediaUrl && (
                <div className="mt-2 p-2 bg-gray-50 rounded border">
                  <p className="text-xs text-gray-600 flex items-center">
                    {mmsConfig.mediaType === 'image' && <Image className="w-3 h-3 mr-1" />}
                    {mmsConfig.mediaType === 'video' && <Video className="w-3 h-3 mr-1" />}
                    {mmsConfig.mediaType === 'document' && <FileText className="w-3 h-3 mr-1" />}
                    Media: {mmsConfig.mediaUrl}
                  </p>
                  {mmsConfig.caption && (
                    <p className="text-xs text-gray-600 mt-1">{mmsConfig.caption}</p>
                  )}
                </div>
              )}
              {optOutConfig.includeOptOut && (
                <p className="text-xs text-gray-500 mt-3 border-t pt-2">
                  {optOutConfig.customOptOutMessage || 'Reply STOP to unsubscribe'}
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Message Stats */}
        <div className="mt-3 grid grid-cols-3 gap-4 text-xs">
          <div className="text-center">
            <p className="font-medium">{getCharacterCount()}</p>
            <p className="text-gray-500">Characters</p>
          </div>
          <div className="text-center">
            <p className="font-medium">{getSMSCount()}</p>
            <p className="text-gray-500">SMS Parts</p>
          </div>
          <div className="text-center">
            <p className="font-medium">£{getEstimatedCost()}</p>
            <p className="text-gray-500">Est. Cost</p>
          </div>
        </div>
      </div>
    )
  }

  const renderBasicConfig = () => (
    <div className="space-y-6">
      {/* Message Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Message Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMessageMode('template')}
            className={`px-4 py-2 rounded-lg border ${
              messageMode === 'template'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Use Template
          </button>
          <button
            type="button"
            onClick={() => setMessageMode('custom')}
            className={`px-4 py-2 rounded-lg border ${
              messageMode === 'custom'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-2" />
            Custom Message
          </button>
        </div>
      </div>

      {/* Template Selection */}
      {messageMode === 'template' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select SMS Template
          </label>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleTemplateSelect(template)}
                className={`w-full text-left p-3 rounded-lg border ${
                  selectedTemplate?.id === template.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">{template.name}</div>
                <div className="text-sm text-gray-600 truncate">{template.message}</div>
              </button>
            ))}
          </div>
          
          {templates.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No SMS templates found. Create a custom message instead.
            </div>
          )}
        </div>
      )}

      {/* Message Input */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            SMS Message
          </label>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setShowVariables(!showVariables)}
              className="text-sm text-green-600 hover:text-green-700 flex items-center"
            >
              <Variable className="w-4 h-4 mr-1" />
              Variables
            </button>
            <button
              type="button"
              onClick={generateWithAI}
              disabled={aiGenerating}
              className="text-sm text-purple-600 hover:text-purple-700 flex items-center"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              {aiGenerating ? 'Generating...' : 'AI Write'}
            </button>
          </div>
        </div>
        
        <textarea
          id="sms-message"
          value={message}
          onChange={(e) => handleMessageChange(e.target.value)}
          placeholder="Type your SMS message here... Use [first_name] to personalize"
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />
        
        <div className="mt-2 flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span className={`${getCharacterCount() > 160 ? 'text-orange-600' : 'text-gray-500'}`}>
              {getCharacterCount()} characters
            </span>
            <span className="text-gray-500">
              {getSMSCount()} SMS {getSMSCount() > 1 ? 'messages' : 'message'}
            </span>
          </div>
          <span className="text-gray-500 font-medium">
            Est. cost: £{getEstimatedCost()}
          </span>
        </div>
      </div>

      {/* Variable Helper */}
      {showVariables && (
        <div className="p-3 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Click to insert variables:</h4>
          <div className="space-y-3">
            {Object.entries(
              availableVariables.reduce((acc, variable) => {
                if (!acc[variable.category]) acc[variable.category] = []
                acc[variable.category].push(variable)
                return acc
              }, {} as Record<string, typeof availableVariables>)
            ).map(([category, vars]) => (
              <div key={category}>
                <h5 className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-2">{category}</h5>
                <div className="grid grid-cols-2 gap-2">
                  {vars.map((variable) => (
                    <button
                      key={variable.key}
                      type="button"
                      onClick={() => insertVariable(variable.key)}
                      className="text-left px-2 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50"
                    >
                      <code className="text-green-600 text-xs font-mono">{variable.key}</code>
                      <span className="text-gray-600 ml-1">→ {variable.example}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Character Limit Warning */}
      {getCharacterCount() > 160 && (
        <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 mr-2" />
            <div className="text-sm text-orange-800">
              <p className="font-medium">Message will be split</p>
              <p>Your message exceeds 160 characters and will be sent as {getSMSCount()} separate SMS messages, costing approximately £{getEstimatedCost()}.</p>
            </div>
          </div>
        </div>
      )}

      {/* Basic Settings */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">Basic Settings</h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Sender Name (optional)
          </label>
          <input
            type="text"
            value={config.senderName || ''}
            onChange={(e) => onChange({ ...config, senderName: e.target.value })}
            placeholder="e.g., AtlasFitness"
            maxLength={11}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Alphanumeric sender ID (max 11 characters). Leave blank to use your phone number.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Priority Level
          </label>
          <select
            value={config.priority || 'normal'}
            onChange={(e) => onChange({ ...config, priority: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          >
            <option value="low">Low - Standard delivery</option>
            <option value="normal">Normal - Default priority</option>
            <option value="high">High - Express delivery</option>
          </select>
        </div>
      </div>
    </div>
  )

  const renderMMSConfig = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-700">MMS Configuration</h3>
          <p className="text-xs text-gray-500">Add images, videos, or documents to your SMS</p>
        </div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={mmsConfig.enabled}
            onChange={(e) => setMMSConfig(prev => ({ ...prev, enabled: e.target.checked }))}
            className="rounded border-gray-300 text-green-600"
          />
          <span className="ml-2 text-sm text-gray-700">Enable MMS</span>
        </label>
      </div>

      {mmsConfig.enabled && (
        <>
          {/* Media Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Media Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'image', label: 'Image', icon: Image },
                { value: 'video', label: 'Video', icon: Video },
                { value: 'document', label: 'Document', icon: FileText }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMMSConfig(prev => ({ ...prev, mediaType: value as any }))}
                  className={`px-4 py-2 rounded-lg border text-sm ${
                    mmsConfig.mediaType === value
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4 inline mr-2" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Media URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Media URL
            </label>
            <input
              type="url"
              value={mmsConfig.mediaUrl || ''}
              onChange={(e) => setMMSConfig(prev => ({ ...prev, mediaUrl: e.target.value }))}
              placeholder="https://example.com/image.jpg"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Direct URL to your media file. File size limits: Images (1MB), Videos (3MB), Documents (500KB)
            </p>
          </div>

          {/* Media Caption */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Media Caption (optional)
            </label>
            <input
              type="text"
              value={mmsConfig.caption || ''}
              onChange={(e) => setMMSConfig(prev => ({ ...prev, caption: e.target.value }))}
              placeholder="Add a caption for your media"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* MMS Guidelines */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="text-sm font-medium text-blue-900 mb-2">MMS Guidelines</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Images: JPG, PNG, GIF (max 1MB)</li>
              <li>• Videos: MP4, MOV (max 3MB, under 30 seconds recommended)</li>
              <li>• Documents: PDF (max 500KB)</li>
              <li>• MMS messages cost more than regular SMS</li>
              <li>• Some carriers may not support MMS delivery</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )

  const renderDeliveryConfig = () => (
    <div className="space-y-6">
      <h3 className="text-sm font-medium text-gray-700">Delivery & Tracking</h3>

      {/* Tracking Options */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-600">Tracking Options</h4>
        
        {[
          { key: 'trackDelivery', label: 'Track delivery status', description: 'Know when messages are delivered' },
          { key: 'trackClicks', label: 'Track link clicks', description: 'Monitor clicks on links in your SMS' },
          { key: 'deliveryReports', label: 'Delivery reports', description: 'Receive detailed delivery reports' },
          { key: 'failureNotifications', label: 'Failure notifications', description: 'Get notified when messages fail' }
        ].map(({ key, label, description }) => (
          <label key={key} className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={(deliveryConfig as any)[key]}
              onChange={(e) => setDeliveryConfig(prev => ({ ...prev, [key]: e.target.checked }))}
              className="rounded border-gray-300 text-green-600 mt-0.5"
            />
            <div>
              <span className="text-sm text-gray-700">{label}</span>
              <p className="text-xs text-gray-500">{description}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Retry Configuration */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-600">Retry Logic</h4>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={retryConfig.enabled}
              onChange={(e) => setRetryConfig(prev => ({ ...prev, enabled: e.target.checked }))}
              className="rounded border-gray-300 text-green-600"
            />
            <span className="ml-2 text-sm text-gray-700">Enable retries</span>
          </label>
        </div>

        {retryConfig.enabled && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max retries
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={retryConfig.maxRetries}
                onChange={(e) => setRetryConfig(prev => ({ ...prev, maxRetries: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Retry delay (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={retryConfig.retryDelay}
                onChange={(e) => setRetryConfig(prev => ({ ...prev, retryDelay: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Opt-out Management */}
      <div>
        <h4 className="text-sm font-medium text-gray-600 mb-3">Opt-out Management</h4>
        
        <div className="space-y-3">
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={optOutConfig.includeOptOut}
              onChange={(e) => setOptOutConfig(prev => ({ ...prev, includeOptOut: e.target.checked }))}
              className="rounded border-gray-300 text-green-600 mt-0.5"
            />
            <div>
              <span className="text-sm text-gray-700">Include opt-out message</span>
              <p className="text-xs text-gray-500">Add "Reply STOP to unsubscribe" to messages</p>
            </div>
          </label>

          {optOutConfig.includeOptOut && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Custom opt-out message (optional)
              </label>
              <input
                type="text"
                value={optOutConfig.customOptOutMessage || ''}
                onChange={(e) => setOptOutConfig(prev => ({ ...prev, customOptOutMessage: e.target.value }))}
                placeholder="Reply STOP to unsubscribe"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          )}

          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={optOutConfig.automaticOptOutHandling}
              onChange={(e) => setOptOutConfig(prev => ({ ...prev, automaticOptOutHandling: e.target.checked }))}
              className="rounded border-gray-300 text-green-600 mt-0.5"
            />
            <div>
              <span className="text-sm text-gray-700">Automatic opt-out handling</span>
              <p className="text-xs text-gray-500">Automatically process STOP replies</p>
            </div>
          </label>

          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={optOutConfig.suppressionListSync}
              onChange={(e) => setOptOutConfig(prev => ({ ...prev, suppressionListSync: e.target.checked }))}
              className="rounded border-gray-300 text-green-600 mt-0.5"
            />
            <div>
              <span className="text-sm text-gray-700">Sync with suppression lists</span>
              <p className="text-xs text-gray-500">Keep opt-outs synchronized across all campaigns</p>
            </div>
          </label>
        </div>
      </div>
    </div>
  )

  const renderScheduleConfig = () => (
    <div className="space-y-6">
      <h3 className="text-sm font-medium text-gray-700">Business Hours & Compliance</h3>

      {/* Business Hours */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-600">Business Hours Compliance</h4>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={businessHoursConfig.enabled}
              onChange={(e) => setBusinessHoursConfig(prev => ({ ...prev, enabled: e.target.checked }))}
              className="rounded border-gray-300 text-green-600"
            />
            <span className="ml-2 text-sm text-gray-700">Enable</span>
          </label>
        </div>

        {businessHoursConfig.enabled && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Zone
              </label>
              <select
                value={businessHoursConfig.timeZone}
                onChange={(e) => setBusinessHoursConfig(prev => ({ ...prev, timeZone: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="Europe/London">London (GMT/BST)</option>
                <option value="America/New_York">New York (EST/EDT)</option>
                <option value="America/Los_Angeles">Los Angeles (PST/PDT)</option>
                <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
                <option value="Europe/Paris">Paris (CET/CEST)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start time
                </label>
                <input
                  type="time"
                  value={businessHoursConfig.startTime}
                  onChange={(e) => setBusinessHoursConfig(prev => ({ ...prev, startTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End time
                </label>
                <input
                  type="time"
                  value={businessHoursConfig.endTime}
                  onChange={(e) => setBusinessHoursConfig(prev => ({ ...prev, endTime: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Working Days
              </label>
              <div className="grid grid-cols-2 gap-2">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => (
                  <label key={day} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={businessHoursConfig.workingDays.includes(day)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBusinessHoursConfig(prev => ({
                            ...prev,
                            workingDays: [...prev.workingDays, day]
                          }))
                        } else {
                          setBusinessHoursConfig(prev => ({
                            ...prev,
                            workingDays: prev.workingDays.filter(d => d !== day)
                          }))
                        }
                      }}
                      className="rounded border-gray-300 text-green-600"
                    />
                    <span className="text-sm text-gray-700 capitalize">{day}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={businessHoursConfig.holidayRespect}
                onChange={(e) => setBusinessHoursConfig(prev => ({ ...prev, holidayRespect: e.target.checked }))}
                className="rounded border-gray-300 text-green-600"
              />
              <span className="text-sm text-gray-700">Respect public holidays</span>
            </label>
          </div>
        )}
      </div>

      {/* Compliance Settings */}
      <div>
        <h4 className="text-sm font-medium text-gray-600 mb-3">Regulatory Compliance</h4>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Region
            </label>
            <select
              value={complianceConfig.region}
              onChange={(e) => setComplianceConfig(prev => ({ ...prev, region: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value="UK">United Kingdom (GDPR, PECR)</option>
              <option value="US">United States (TCPA, CAN-SPAM)</option>
              <option value="EU">European Union (GDPR)</option>
              <option value="CA">Canada (CASL)</option>
              <option value="AU">Australia (SPAM Act)</option>
            </select>
          </div>

          <div className="space-y-3">
            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={complianceConfig.consentRequired}
                onChange={(e) => setComplianceConfig(prev => ({ ...prev, consentRequired: e.target.checked }))}
                className="rounded border-gray-300 text-green-600 mt-0.5"
              />
              <div>
                <span className="text-sm text-gray-700">Explicit consent required</span>
                <p className="text-xs text-gray-500">Only send to contacts who have explicitly opted in</p>
              </div>
            </label>

            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={complianceConfig.optInConfirmation}
                onChange={(e) => setComplianceConfig(prev => ({ ...prev, optInConfirmation: e.target.checked }))}
                className="rounded border-gray-300 text-green-600 mt-0.5"
              />
              <div>
                <span className="text-sm text-gray-700">Double opt-in confirmation</span>
                <p className="text-xs text-gray-500">Send confirmation message after opt-in</p>
              </div>
            </label>

            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={complianceConfig.gdprCompliant}
                onChange={(e) => setComplianceConfig(prev => ({ ...prev, gdprCompliant: e.target.checked }))}
                className="rounded border-gray-300 text-green-600 mt-0.5"
              />
              <div>
                <span className="text-sm text-gray-700">GDPR compliant processing</span>
                <p className="text-xs text-gray-500">Follow GDPR data processing requirements</p>
              </div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data retention period (days)
            </label>
            <input
              type="number"
              min="30"
              max="2555" // 7 years
              value={complianceConfig.dataRetention}
              onChange={(e) => setComplianceConfig(prev => ({ ...prev, dataRetention: parseInt(e.target.value) }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              How long to retain SMS delivery data and analytics
            </p>
          </div>
        </div>
      </div>

      {/* Compliance Warning */}
      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
        <div className="flex items-start">
          <Shield className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">Compliance Notice</p>
            <p>Ensure you comply with local SMS marketing regulations. Violations can result in significant penalties. Consider consulting with legal advisors for compliance guidance.</p>
          </div>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
        <span className="ml-2 text-gray-600">Loading SMS configuration...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {[
            { id: 'basic', label: 'Basic', icon: MessageSquare },
            { id: 'mms', label: 'MMS', icon: Image },
            { id: 'delivery', label: 'Delivery', icon: Send },
            { id: 'schedule', label: 'Schedule', icon: Clock },
            { id: 'compliance', label: 'Compliance', icon: Shield }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === id
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {activeTab === 'basic' && renderBasicConfig()}
        {activeTab === 'mms' && renderMMSConfig()}
        {activeTab === 'delivery' && renderDeliveryConfig()}
        {activeTab === 'schedule' && renderScheduleConfig()}
        {activeTab === 'compliance' && renderScheduleConfig()} {/* Same as schedule for now */}
      </div>

      {/* Test SMS Section */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Test SMS</h4>
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="tel"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="+447123456789"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <button
              type="button"
              onClick={sendTestSMS}
              disabled={!testPhone || sendingTest || !message}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {sendingTest ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Send className="w-4 h-4 mr-2" />
              )}
              Send Test
            </button>
          </div>
          
          <p className="text-xs text-gray-500">
            Include country code (e.g., +44 for UK, +1 for US)
          </p>
          
          {testResult && (
            <div className={`p-3 rounded-md ${testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-start">
                {testResult.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5" />
                )}
                <p className={`text-sm ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
                  {testResult.message}
                </p>
              </div>
            </div>
          )}

          <div className="bg-gray-50 rounded-md p-3">
            <h5 className="text-sm font-medium text-gray-700 mb-1">Test includes:</h5>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• SMS delivery and configuration</li>
              <li>• Message content with variables replaced</li>
              <li>• Character count and message splitting</li>
              <li>• MMS media delivery (if configured)</li>
              <li>• Opt-out compliance (if enabled)</li>
              <li>• Business hours validation (if enabled)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div>
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center justify-center"
        >
          <Eye className="w-4 h-4 mr-2" />
          {showPreview ? 'Hide Preview' : 'Show Preview'}
        </button>
        
        {showPreview && renderPreview()}
      </div>
    </div>
  )
}