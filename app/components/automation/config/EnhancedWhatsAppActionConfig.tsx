'use client'

import { useState, useEffect } from 'react'
import { 
  MessageSquare, Variable, Sparkles, Eye, Send, 
  CheckCircle, XCircle, Loader2, Image, Video, FileText,
  Settings, Users, Zap, Target, BarChart3, Phone,
  Plus, Minus, ChevronDown, ChevronRight, Globe,
  Calendar, Clock, Shield, AlertTriangle, Info,
  MessageCircle, List, MoreHorizontal
} from 'lucide-react'
import { createClient } from '@/app/lib/supabase/client'

interface WhatsAppTemplate {
  id: string
  name: string
  category: 'marketing' | 'utility' | 'authentication'
  language: string
  status: 'approved' | 'pending' | 'rejected'
  components: WhatsAppTemplateComponent[]
  businessVerified: boolean
}

interface WhatsAppTemplateComponent {
  type: 'header' | 'body' | 'footer' | 'buttons'
  format?: 'text' | 'image' | 'video' | 'document'
  text?: string
  example?: {
    header_text?: string[]
    body_text?: string[][]
  }
  buttons?: WhatsAppButton[]
}

interface WhatsAppButton {
  type: 'quick_reply' | 'url' | 'phone_number'
  text: string
  url?: string
  phone_number?: string
}

interface WhatsAppActionConfigProps {
  config: any
  onChange: (config: any) => void
  organizationId: string
}

interface MediaConfig {
  enabled: boolean
  type?: 'image' | 'video' | 'document'
  url?: string
  caption?: string
  filename?: string
}

interface InteractiveConfig {
  enabled: boolean
  type?: 'list' | 'buttons' | 'flow'
  title?: string
  body?: string
  footer?: string
  action?: {
    buttons?: InteractiveButton[]
    sections?: InteractiveSection[]
  }
}

interface InteractiveButton {
  type: 'reply'
  reply: {
    id: string
    title: string
  }
}

interface InteractiveSection {
  title: string
  rows: InteractiveRow[]
}

interface InteractiveRow {
  id: string
  title: string
  description?: string
}

interface ConversationConfig {
  trackConversations: boolean
  autoResponses: boolean
  conversationTimeout: number // hours
  handoverToHuman: boolean
  businessHours: {
    enabled: boolean
    timezone: string
    schedule: Record<string, { start: string; end: string }>
  }
}

interface ComplianceConfig {
  region: 'global' | 'india' | 'brazil'
  optInRequired: boolean
  businessVerification: boolean
  templateRequired: boolean
  rateLimiting: {
    enabled: boolean
    messagesPerSecond: number
    messagesPerDay: number
  }
}

export default function EnhancedWhatsAppActionConfig({ config, onChange, organizationId }: WhatsAppActionConfigProps) {
  const [templates, setTemplates] = useState<WhatsAppTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplate | null>(null)
  const [messageMode, setMessageMode] = useState<'template' | 'freeform'>(config.mode || 'freeform')
  const [message, setMessage] = useState(config.message || '')
  const [phoneNumber, setPhoneNumber] = useState(config.phoneNumber || '')
  const [showVariables, setShowVariables] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [loading, setLoading] = useState(true)
  const [testPhone, setTestPhone] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'basic' | 'media' | 'interactive' | 'conversation' | 'compliance'>('basic')

  // Media Configuration
  const [mediaConfig, setMediaConfig] = useState<MediaConfig>(config.mediaConfig || {
    enabled: false
  })

  // Interactive Configuration
  const [interactiveConfig, setInteractiveConfig] = useState<InteractiveConfig>(config.interactiveConfig || {
    enabled: false
  })

  // Conversation Management
  const [conversationConfig, setConversationConfig] = useState<ConversationConfig>(config.conversationConfig || {
    trackConversations: true,
    autoResponses: false,
    conversationTimeout: 24,
    handoverToHuman: false,
    businessHours: {
      enabled: false,
      timezone: 'Europe/London',
      schedule: {
        monday: { start: '09:00', end: '17:00' },
        tuesday: { start: '09:00', end: '17:00' },
        wednesday: { start: '09:00', end: '17:00' },
        thursday: { start: '09:00', end: '17:00' },
        friday: { start: '09:00', end: '17:00' },
        saturday: { start: '10:00', end: '16:00' },
        sunday: { start: '10:00', end: '16:00' }
      }
    }
  })

  // Compliance Configuration
  const [complianceConfig, setComplianceConfig] = useState<ComplianceConfig>(config.complianceConfig || {
    region: 'global',
    optInRequired: true,
    businessVerification: false,
    templateRequired: false,
    rateLimiting: {
      enabled: true,
      messagesPerSecond: 1,
      messagesPerDay: 1000
    }
  })

  const availableVariables = [
    { key: '{{1}}', label: 'First Name', example: 'John', category: 'Contact' },
    { key: '{{2}}', label: 'Last Name', example: 'Doe', category: 'Contact' },
    { key: '{{3}}', label: 'Organization', example: 'Atlas Fitness', category: 'Organization' },
    { key: '{{4}}', label: 'Interest', example: 'weight loss', category: 'Lead Data' },
    { key: '{{5}}', label: 'Appointment Time', example: 'Tomorrow at 3pm', category: 'Schedule' },
    { key: '{{6}}', label: 'Membership Type', example: 'Premium', category: 'Membership' },
    { key: '{{7}}', label: 'Current Date', example: '31/01/2025', category: 'System' },
    { key: '{{8}}', label: 'Lead Source', example: 'Facebook', category: 'Lead Data' }
  ]

  useEffect(() => {
    loadWhatsAppTemplates()
  }, [organizationId])

  useEffect(() => {
    // Update parent config when any sub-config changes
    onChange({
      ...config,
      mode: messageMode,
      message,
      phoneNumber,
      templateId: selectedTemplate?.id,
      mediaConfig,
      interactiveConfig,
      conversationConfig,
      complianceConfig
    })
  }, [messageMode, message, phoneNumber, selectedTemplate, mediaConfig, interactiveConfig, conversationConfig, complianceConfig])

  const loadWhatsAppTemplates = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error loading WhatsApp templates:', error)
      // Use mock data as fallback
      setTemplates([
        {
          id: '1',
          name: 'welcome_new_member',
          category: 'marketing',
          language: 'en',
          status: 'approved',
          businessVerified: true,
          components: [
            {
              type: 'header',
              format: 'text',
              text: 'Welcome to {{1}}!'
            },
            {
              type: 'body',
              text: 'Hi {{2}}! 🎉\n\nWelcome to {{1}}! We\'re excited to help you reach your fitness goals.\n\nYour membership is now active and you can:\n• Book classes through our app\n• Meet our expert trainers\n• Join our supportive community\n\nReady to get started?'
            },
            {
              type: 'buttons',
              buttons: [
                { type: 'quick_reply', text: 'Book First Class' },
                { type: 'quick_reply', text: 'View Schedule' },
                { type: 'phone_number', text: 'Call Us', phone_number: '+441234567890' }
              ]
            }
          ]
        },
        {
          id: '2',
          name: 'appointment_reminder',
          category: 'utility',
          language: 'en',
          status: 'approved',
          businessVerified: true,
          components: [
            {
              type: 'body',
              text: 'Hi {{1}}! 📅\n\nThis is a friendly reminder about your appointment:\n\n🕐 Time: {{2}}\n📍 Location: {{3}}\n👨‍💼 Trainer: {{4}}\n\nLooking forward to seeing you!'
            },
            {
              type: 'buttons',
              buttons: [
                { type: 'quick_reply', text: 'Confirm' },
                { type: 'quick_reply', text: 'Reschedule' }
              ]
            }
          ]
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateSelect = (template: WhatsAppTemplate) => {
    setSelectedTemplate(template)
    setMessageMode('template')
    
    // Extract text from template components for preview
    const bodyComponent = template.components.find(c => c.type === 'body')
    if (bodyComponent) {
      setMessage(bodyComponent.text || '')
    }
  }

  const handleMessageChange = (value: string) => {
    setMessage(value)
    if (messageMode === 'template') {
      setMessageMode('freeform')
      setSelectedTemplate(null)
    }
  }

  const insertVariable = (variable: string) => {
    const textarea = document.getElementById('whatsapp-message') as HTMLTextAreaElement
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
      await new Promise(resolve => setTimeout(resolve, 2500))
      
      const aiMessage = `Hi {{1}}! 🎉

Welcome to {{3}} - we're thrilled you've joined our fitness family!

✨ Here's what awaits you:
🏋️‍♂️ Personalized training programs
👥 Supportive community of fitness enthusiasts  
📱 Easy class booking through our app
🎯 Expert guidance to reach your {{4}} goals

Your journey starts now! 💪

Ready to book your first session?`
      
      handleMessageChange(aiMessage)
    } catch (error) {
      console.error('AI generation error:', error)
    } finally {
      setAiGenerating(false)
    }
  }

  const addInteractiveButton = () => {
    if (!interactiveConfig.action) {
      setInteractiveConfig(prev => ({
        ...prev,
        action: { buttons: [] }
      }))
    }

    const newButton: InteractiveButton = {
      type: 'reply',
      reply: {
        id: `btn_${Date.now()}`,
        title: 'New Button'
      }
    }

    setInteractiveConfig(prev => ({
      ...prev,
      action: {
        ...prev.action,
        buttons: [...(prev.action?.buttons || []), newButton]
      }
    }))
  }

  const updateInteractiveButton = (index: number, field: string, value: string) => {
    setInteractiveConfig(prev => ({
      ...prev,
      action: {
        ...prev.action,
        buttons: prev.action?.buttons?.map((btn, i) => 
          i === index 
            ? { ...btn, reply: { ...btn.reply, [field]: value } }
            : btn
        ) || []
      }
    }))
  }

  const removeInteractiveButton = (index: number) => {
    setInteractiveConfig(prev => ({
      ...prev,
      action: {
        ...prev.action,
        buttons: prev.action?.buttons?.filter((_, i) => i !== index) || []
      }
    }))
  }

  const addListSection = () => {
    if (!interactiveConfig.action) {
      setInteractiveConfig(prev => ({
        ...prev,
        action: { sections: [] }
      }))
    }

    const newSection: InteractiveSection = {
      title: 'New Section',
      rows: [{
        id: `row_${Date.now()}`,
        title: 'New Option',
        description: 'Description'
      }]
    }

    setInteractiveConfig(prev => ({
      ...prev,
      action: {
        ...prev.action,
        sections: [...(prev.action?.sections || []), newSection]
      }
    }))
  }

  const sendTestMessage = async () => {
    if (!testPhone || !organizationId) return
    
    setSendingTest(true)
    setTestResult(null)
    
    try {
      let testMessage = message || 'Test WhatsApp message from {{3}}. Your integration is working!'
      
      // Replace variables with sample data
      const sampleData: Record<string, string> = {
        '{{1}}': 'John',
        '{{2}}': 'Doe', 
        '{{3}}': 'Atlas Fitness',
        '{{4}}': 'weight loss',
        '{{5}}': 'Tomorrow at 3pm',
        '{{6}}': 'Premium',
        '{{7}}': new Date().toLocaleDateString('en-GB'),
        '{{8}}': 'Facebook'
      }
      
      Object.entries(sampleData).forEach(([key, value]) => {
        testMessage = testMessage.replace(new RegExp(key.replace('{', '\\{').replace('}', '\\}'), 'g'), value)
      })
      
      const response = await fetch('/api/whatsapp/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          testPhone,
          message: testMessage,
          messageMode,
          templateId: selectedTemplate?.id,
          mediaConfig,
          interactiveConfig,
          complianceConfig
        })
      })
      
      const data = await response.json()
      
      setTestResult({
        success: response.ok,
        message: response.ok 
          ? 'Test WhatsApp message sent successfully! Check your phone.'
          : data.error || 'Failed to send test message'
      })
    } catch (error: any) {
      setTestResult({
        success: false,
        message: error.message || 'An error occurred while sending the test message'
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
        new RegExp(variable.key.replace('{', '\\{').replace('}', '\\}'), 'g'), 
        variable.example
      )
    })

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">WhatsApp Preview</h4>
        
        {/* Phone Mockup */}
        <div className="bg-green-100 rounded-2xl p-4 max-w-sm mx-auto">
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {/* Header */}
            <div className="bg-green-500 text-white px-4 py-3 flex items-center">
              <div className="w-8 h-8 bg-green-400 rounded-full flex items-center justify-center mr-3">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <p className="font-medium text-sm">Atlas Fitness</p>
                <p className="text-xs opacity-90">Online</p>
              </div>
            </div>
            
            {/* Message Bubble */}
            <div className="p-4">
              <div className="bg-green-500 text-white rounded-2xl rounded-bl-md p-3 max-w-xs ml-auto">
                {/* Media Preview */}
                {mediaConfig.enabled && mediaConfig.url && (
                  <div className="mb-2">
                    {mediaConfig.type === 'image' && (
                      <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Image className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    {mediaConfig.type === 'video' && (
                      <div className="w-full h-32 bg-gray-200 rounded-lg flex items-center justify-center">
                        <Video className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    {mediaConfig.type === 'document' && (
                      <div className="w-full p-3 bg-gray-200 rounded-lg flex items-center">
                        <FileText className="w-6 h-6 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600">{mediaConfig.filename || 'Document'}</span>
                      </div>
                    )}
                    {mediaConfig.caption && (
                      <p className="text-sm mt-2">{mediaConfig.caption}</p>
                    )}
                  </div>
                )}
                
                {/* Message Text */}
                <p className="text-sm whitespace-pre-wrap">{preview}</p>
                
                {/* Interactive Elements */}
                {interactiveConfig.enabled && (
                  <div className="mt-3 space-y-2">
                    {interactiveConfig.type === 'buttons' && interactiveConfig.action?.buttons?.map((btn, idx) => (
                      <button
                        key={idx}
                        className="w-full p-2 border border-white border-opacity-30 rounded-lg text-sm hover:bg-white hover:bg-opacity-10"
                      >
                        {btn.reply.title}
                      </button>
                    ))}
                    
                    {interactiveConfig.type === 'list' && (
                      <div className="border border-white border-opacity-30 rounded-lg">
                        <div className="p-2 border-b border-white border-opacity-30">
                          <p className="text-sm font-medium">{interactiveConfig.title}</p>
                        </div>
                        {interactiveConfig.action?.sections?.map((section, idx) => (
                          <div key={idx} className="p-2">
                            <p className="text-xs font-medium opacity-75 mb-1">{section.title}</p>
                            {section.rows.map((row, rowIdx) => (
                              <div key={rowIdx} className="py-1">
                                <p className="text-sm">{row.title}</p>
                                {row.description && (
                                  <p className="text-xs opacity-75">{row.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Message Info */}
                <div className="flex items-center justify-end mt-2 space-x-1">
                  <span className="text-xs opacity-75">14:30</span>
                  <CheckCircle className="w-3 h-3 opacity-75" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderBasicConfig = () => (
    <div className="space-y-6">
      {/* Phone Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          <Phone className="inline w-4 h-4 mr-1" />
          Recipient Phone Number
        </label>
        <input
          type="tel"
          value={phoneNumber}
          onChange={(e) => setPhoneNumber(e.target.value)}
          placeholder="+447123456789 or use {{phone}} variable"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          Include country code (e.g., +44 for UK). Can use variables like {{'{phone}'}}
        </p>
      </div>

      {/* Message Mode Selection */}
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
            Template Message
          </button>
          <button
            type="button"
            onClick={() => setMessageMode('freeform')}
            className={`px-4 py-2 rounded-lg border ${
              messageMode === 'freeform'
                ? 'border-green-500 bg-green-50 text-green-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-2" />
            Freeform Message
          </button>
        </div>
      </div>

      {/* Template Selection */}
      {messageMode === 'template' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select WhatsApp Template
          </label>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleTemplateSelect(template)}
                className={`w-full text-left p-4 rounded-lg border ${
                  selectedTemplate?.id === template.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{template.name}</div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      template.status === 'approved' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {template.status}
                    </span>
                    <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">
                      {template.category}
                    </span>
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  {template.components.find(c => c.type === 'body')?.text?.substring(0, 100)}...
                </div>
                {template.businessVerified && (
                  <div className="flex items-center mt-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-xs text-green-600">Business Verified</span>
                  </div>
                )}
              </button>
            ))}
          </div>
          
          {templates.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No approved templates found.</p>
              <p className="text-sm">Create templates in WhatsApp Business Manager first.</p>
            </div>
          )}
        </div>
      )}

      {/* Freeform Message */}
      {messageMode === 'freeform' && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Message Content
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
                {aiGenerating ? 'Generating...' : 'AI Generate'}
              </button>
            </div>
          </div>
          
          <textarea
            id="whatsapp-message"
            value={message}
            onChange={(e) => handleMessageChange(e.target.value)}
            placeholder="Type your WhatsApp message here..."
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
          
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="text-gray-500">
              {message.length} characters
            </span>
            <span className="text-gray-500">
              WhatsApp supports rich formatting with *bold* and _italic_ text
            </span>
          </div>

          {/* Variable Helper */}
          {showVariables && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
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
                          className="text-left px-3 py-2 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50"
                        >
                          <code className="text-green-600 font-mono">{variable.key}</code>
                          <span className="text-gray-600 ml-2">→ {variable.example}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Formatting Help */}
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="text-sm font-medium text-blue-900 mb-2">WhatsApp Formatting</h4>
            <div className="grid grid-cols-2 gap-4 text-sm text-blue-800">
              <div>
                <p><code>*bold*</code> → <strong>bold</strong></p>
                <p><code>_italic_</code> → <em>italic</em></p>
                <p><code>~strikethrough~</code> → <del>strikethrough</del></p>
              </div>
              <div>
                <p><code>```monospace```</code> → <code>monospace</code></p>
                <p>Use emojis to make messages more engaging 🎉</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Message Preview Warning for Freeform */}
      {messageMode === 'freeform' && (
        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-start">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Freeform Message Limitation</p>
              <p>Freeform messages can only be sent within 24 hours after the customer has messaged your business. For unrestricted messaging, use approved templates.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderMediaConfig = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-700">Media Attachment</h3>
          <p className="text-xs text-gray-500">Add images, videos, or documents to your message</p>
        </div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={mediaConfig.enabled}
            onChange={(e) => setMediaConfig(prev => ({ ...prev, enabled: e.target.checked }))}
            className="rounded border-gray-300 text-green-600"
          />
          <span className="ml-2 text-sm text-gray-700">Enable Media</span>
        </label>
      </div>

      {mediaConfig.enabled && (
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
                  onClick={() => setMediaConfig(prev => ({ ...prev, type: value as any }))}
                  className={`px-4 py-3 rounded-lg border text-sm ${
                    mediaConfig.type === value
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5 mx-auto mb-1" />
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
              value={mediaConfig.url || ''}
              onChange={(e) => setMediaConfig(prev => ({ ...prev, url: e.target.value }))}
              placeholder={`https://example.com/${mediaConfig.type === 'image' ? 'image.jpg' : mediaConfig.type === 'video' ? 'video.mp4' : 'document.pdf'}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Direct URL to your media file. Must be publicly accessible.
            </p>
          </div>

          {/* Filename for Documents */}
          {mediaConfig.type === 'document' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filename (optional)
              </label>
              <input
                type="text"
                value={mediaConfig.filename || ''}
                onChange={(e) => setMediaConfig(prev => ({ ...prev, filename: e.target.value }))}
                placeholder="document.pdf"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          )}

          {/* Media Caption */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Caption (optional)
            </label>
            <textarea
              value={mediaConfig.caption || ''}
              onChange={(e) => setMediaConfig(prev => ({ ...prev, caption: e.target.value }))}
              placeholder="Add a caption for your media..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Media Guidelines */}
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Media Guidelines</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Images:</strong> JPG, PNG (max 5MB, recommended 1080px width)</li>
              <li>• <strong>Videos:</strong> MP4, MOV (max 16MB, under 30 seconds recommended)</li>
              <li>• <strong>Documents:</strong> PDF, DOC, DOCX, PPT, XLS (max 100MB)</li>
              <li>• Files must be publicly accessible via HTTPS</li>
              <li>• Media messages may have higher delivery costs</li>
            </ul>
          </div>
        </>
      )}
    </div>
  )

  const renderInteractiveConfig = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-700">Interactive Elements</h3>
          <p className="text-xs text-gray-500">Add buttons or lists to make your message interactive</p>
        </div>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={interactiveConfig.enabled}
            onChange={(e) => setInteractiveConfig(prev => ({ ...prev, enabled: e.target.checked }))}
            className="rounded border-gray-300 text-green-600"
          />
          <span className="ml-2 text-sm text-gray-700">Enable Interactive</span>
        </label>
      </div>

      {interactiveConfig.enabled && (
        <>
          {/* Interactive Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interactive Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'buttons', label: 'Reply Buttons', icon: MoreHorizontal },
                { value: 'list', label: 'List Menu', icon: List }
              ].map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setInteractiveConfig(prev => ({ ...prev, type: value as any }))}
                  className={`px-4 py-3 rounded-lg border text-sm ${
                    interactiveConfig.type === value
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-5 h-5 mx-auto mb-1" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Interactive Content */}
          {interactiveConfig.type === 'buttons' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-medium text-gray-700">Reply Buttons</h4>
                <button
                  type="button"
                  onClick={addInteractiveButton}
                  disabled={(interactiveConfig.action?.buttons?.length || 0) >= 3}
                  className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Button
                </button>
              </div>
              
              <div className="space-y-3">
                {interactiveConfig.action?.buttons?.map((button, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={button.reply.title}
                      onChange={(e) => updateInteractiveButton(index, 'title', e.target.value)}
                      placeholder={`Button ${index + 1}`}
                      maxLength={20}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeInteractiveButton(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              
              <p className="text-xs text-gray-500 mt-2">
                Maximum 3 buttons, 20 characters each
              </p>
            </div>
          )}

          {interactiveConfig.type === 'list' && (
            <div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    List Title
                  </label>
                  <input
                    type="text"
                    value={interactiveConfig.title || ''}
                    onChange={(e) => setInteractiveConfig(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Choose an option"
                    maxLength={60}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    List Description (optional)
                  </label>
                  <textarea
                    value={interactiveConfig.body || ''}
                    onChange={(e) => setInteractiveConfig(prev => ({ ...prev, body: e.target.value }))}
                    placeholder="Additional information about the list options"
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700">List Sections</h4>
                  <button
                    type="button"
                    onClick={addListSection}
                    disabled={(interactiveConfig.action?.sections?.length || 0) >= 10}
                    className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Section
                  </button>
                </div>
                
                {/* List sections would be rendered here - simplified for brevity */}
                <p className="text-xs text-gray-500">
                  Maximum 10 sections with 10 rows each
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )

  const renderConversationConfig = () => (
    <div className="space-y-6">
      <h3 className="text-sm font-medium text-gray-700">Conversation Management</h3>

      {/* Conversation Tracking */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-600">Conversation Settings</h4>
        
        <label className="flex items-start space-x-3">
          <input
            type="checkbox"
            checked={conversationConfig.trackConversations}
            onChange={(e) => setConversationConfig(prev => ({ ...prev, trackConversations: e.target.checked }))}
            className="rounded border-gray-300 text-green-600 mt-0.5"
          />
          <div>
            <span className="text-sm text-gray-700">Track conversations</span>
            <p className="text-xs text-gray-500">Monitor conversation threads and responses</p>
          </div>
        </label>

        <label className="flex items-start space-x-3">
          <input
            type="checkbox"
            checked={conversationConfig.autoResponses}
            onChange={(e) => setConversationConfig(prev => ({ ...prev, autoResponses: e.target.checked }))}
            className="rounded border-gray-300 text-green-600 mt-0.5"
          />
          <div>
            <span className="text-sm text-gray-700">Auto-responses</span>
            <p className="text-xs text-gray-500">Send automated replies based on keywords</p>
          </div>
        </label>

        <label className="flex items-start space-x-3">
          <input
            type="checkbox"
            checked={conversationConfig.handoverToHuman}
            onChange={(e) => setConversationConfig(prev => ({ ...prev, handoverToHuman: e.target.checked }))}
            className="rounded border-gray-300 text-green-600 mt-0.5"
          />
          <div>
            <span className="text-sm text-gray-700">Handover to human agent</span>
            <p className="text-xs text-gray-500">Transfer conversations to staff when needed</p>
          </div>
        </label>
      </div>

      {/* Conversation Timeout */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Conversation timeout (hours)
        </label>
        <input
          type="number"
          min="1"
          max="72"
          value={conversationConfig.conversationTimeout}
          onChange={(e) => setConversationConfig(prev => ({ ...prev, conversationTimeout: parseInt(e.target.value) }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
        />
        <p className="text-xs text-gray-500 mt-1">
          How long to keep conversation context active
        </p>
      </div>

      {/* Business Hours */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-600">Business Hours</h4>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={conversationConfig.businessHours.enabled}
              onChange={(e) => setConversationConfig(prev => ({ 
                ...prev, 
                businessHours: { ...prev.businessHours, enabled: e.target.checked }
              }))}
              className="rounded border-gray-300 text-green-600"
            />
            <span className="ml-2 text-sm text-gray-700">Enable</span>
          </label>
        </div>

        {conversationConfig.businessHours.enabled && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timezone
              </label>
              <select
                value={conversationConfig.businessHours.timezone}
                onChange={(e) => setConversationConfig(prev => ({ 
                  ...prev, 
                  businessHours: { ...prev.businessHours, timezone: e.target.value }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="Europe/London">London (GMT/BST)</option>
                <option value="America/New_York">New York (EST/EDT)</option>
                <option value="America/Los_Angeles">Los Angeles (PST/PDT)</option>
                <option value="Asia/Dubai">Dubai (GST)</option>
                <option value="Australia/Sydney">Sydney (AEST/AEDT)</option>
              </select>
            </div>

            <div className="text-xs text-gray-600">
              <p>Configure business hours for each day of the week. Messages outside business hours will receive an auto-response.</p>
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp Business Features */}
      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
        <h4 className="text-sm font-medium text-green-900 mb-2">WhatsApp Business Features</h4>
        <ul className="text-sm text-green-800 space-y-1">
          <li>• Conversation threads are automatically tracked</li>
          <li>• Business profiles display your organization info</li>
          <li>• Labels help organize customer conversations</li>
          <li>• Quick replies speed up common responses</li>
          <li>• Away messages inform customers when you're unavailable</li>
        </ul>
      </div>
    </div>
  )

  const renderComplianceConfig = () => (
    <div className="space-y-6">
      <h3 className="text-sm font-medium text-gray-700">WhatsApp Business Compliance</h3>

      {/* Region Settings */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Business Region
        </label>
        <select
          value={complianceConfig.region}
          onChange={(e) => setComplianceConfig(prev => ({ ...prev, region: e.target.value as any }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
        >
          <option value="global">Global (Standard)</option>
          <option value="india">India (Special Regulations)</option>
          <option value="brazil">Brazil (Special Regulations)</option>
        </select>
      </div>

      {/* Compliance Settings */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-600">Compliance Requirements</h4>
        
        <label className="flex items-start space-x-3">
          <input
            type="checkbox"
            checked={complianceConfig.optInRequired}
            onChange={(e) => setComplianceConfig(prev => ({ ...prev, optInRequired: e.target.checked }))}
            className="rounded border-gray-300 text-green-600 mt-0.5"
          />
          <div>
            <span className="text-sm text-gray-700">Opt-in consent required</span>
            <p className="text-xs text-gray-500">Only message users who have explicitly opted in</p>
          </div>
        </label>

        <label className="flex items-start space-x-3">
          <input
            type="checkbox"
            checked={complianceConfig.businessVerification}
            onChange={(e) => setComplianceConfig(prev => ({ ...prev, businessVerification: e.target.checked }))}
            className="rounded border-gray-300 text-green-600 mt-0.5"
          />
          <div>
            <span className="text-sm text-gray-700">Business verification required</span>
            <p className="text-xs text-gray-500">Use verified business account for messaging</p>
          </div>
        </label>

        <label className="flex items-start space-x-3">
          <input
            type="checkbox"
            checked={complianceConfig.templateRequired}
            onChange={(e) => setComplianceConfig(prev => ({ ...prev, templateRequired: e.target.checked }))}
            className="rounded border-gray-300 text-green-600 mt-0.5"
          />
          <div>
            <span className="text-sm text-gray-700">Templates required for initiated conversations</span>
            <p className="text-xs text-gray-500">Use approved templates when starting conversations</p>
          </div>
        </label>
      </div>

      {/* Rate Limiting */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-gray-600">Rate Limiting</h4>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={complianceConfig.rateLimiting.enabled}
              onChange={(e) => setComplianceConfig(prev => ({ 
                ...prev, 
                rateLimiting: { ...prev.rateLimiting, enabled: e.target.checked }
              }))}
              className="rounded border-gray-300 text-green-600"
            />
            <span className="ml-2 text-sm text-gray-700">Enable</span>
          </label>
        </div>

        {complianceConfig.rateLimiting.enabled && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Messages per second
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={complianceConfig.rateLimiting.messagesPerSecond}
                onChange={(e) => setComplianceConfig(prev => ({ 
                  ...prev, 
                  rateLimiting: { ...prev.rateLimiting, messagesPerSecond: parseInt(e.target.value) }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Messages per day
              </label>
              <input
                type="number"
                min="100"
                max="10000"
                step="100"
                value={complianceConfig.rateLimiting.messagesPerDay}
                onChange={(e) => setComplianceConfig(prev => ({ 
                  ...prev, 
                  rateLimiting: { ...prev.rateLimiting, messagesPerDay: parseInt(e.target.value) }
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* WhatsApp Business Requirements */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h4 className="text-sm font-medium text-blue-900 mb-2">WhatsApp Business API Requirements</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Business verification is required for API access</li>
          <li>• Message templates must be pre-approved by WhatsApp</li>
          <li>• 24-hour window for freeform messages after customer contact</li>
          <li>• Quality rating affects message limits and delivery</li>
          <li>• Pricing varies by conversation type and region</li>
        </ul>
      </div>

      {/* Compliance Warning */}
      <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
        <div className="flex items-start">
          <Shield className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" />
          <div className="text-sm text-yellow-800">
            <p className="font-medium mb-1">Compliance Notice</p>
            <p>WhatsApp has strict policies for business messaging. Violations can result in account restrictions or suspension. Ensure all messages comply with WhatsApp's Business Policy and local regulations.</p>
          </div>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-green-600" />
        <span className="ml-2 text-gray-600">Loading WhatsApp configuration...</span>
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
            { id: 'media', label: 'Media', icon: Image },
            { id: 'interactive', label: 'Interactive', icon: List },
            { id: 'conversation', label: 'Conversations', icon: Users },
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
        {activeTab === 'media' && renderMediaConfig()}
        {activeTab === 'interactive' && renderInteractiveConfig()}
        {activeTab === 'conversation' && renderConversationConfig()}
        {activeTab === 'compliance' && renderComplianceConfig()}
      </div>

      {/* Test WhatsApp Section */}
      <div className="border-t border-gray-200 pt-6">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Test WhatsApp Message</h4>
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
              onClick={sendTestMessage}
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
            Include country code (e.g., +44 for UK). Test number must be verified with WhatsApp.
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
              <li>• WhatsApp API connection and configuration</li>
              <li>• Message content with variables replaced</li>
              <li>• Media attachment delivery (if configured)</li>
              <li>• Interactive elements (if configured)</li>
              <li>• Business verification status</li>
              <li>• Rate limiting compliance</li>
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