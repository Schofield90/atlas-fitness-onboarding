'use client'

import { useState, useEffect } from 'react'
import { Mail, Search, Plus, Sparkles, FileText, Eye, Edit, Variable, ChevronDown } from 'lucide-react'
import { createClient } from '@/app/lib/supabase/client'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  variables: string[]
}

interface EmailActionConfigProps {
  config: any
  onChange: (config: any) => void
  organizationId: string
}

export default function EmailActionConfig({ config, onChange, organizationId }: EmailActionConfigProps) {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [emailMode, setEmailMode] = useState<'template' | 'custom'>(config.mode || 'template')
  const [customEmail, setCustomEmail] = useState(config.customEmail || { subject: '', body: '' })
  const [showPreview, setShowPreview] = useState(false)
  const [showVariables, setShowVariables] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [loading, setLoading] = useState(true)

  const availableVariables = [
    { key: '{{first_name}}', label: 'First Name' },
    { key: '{{last_name}}', label: 'Last Name' },
    { key: '{{email}}', label: 'Email' },
    { key: '{{phone}}', label: 'Phone' },
    { key: '{{organization_name}}', label: 'Organization Name' },
    { key: '{{current_date}}', label: 'Current Date' },
    { key: '{{lead_source}}', label: 'Lead Source' },
    { key: '{{interest}}', label: 'Interest/Goal' },
    { key: '{{tag}}', label: 'Lead Tags' }
  ]

  useEffect(() => {
    loadEmailTemplates()
  }, [organizationId])

  useEffect(() => {
    // Load selected template if config has one
    if (config.templateId && templates.length > 0) {
      const template = templates.find(t => t.id === config.templateId)
      if (template) {
        setSelectedTemplate(template)
        setEmailMode('template')
      }
    } else if (config.customEmail) {
      setEmailMode('custom')
      setCustomEmail(config.customEmail)
    }
  }, [config, templates])

  const loadEmailTemplates = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setTemplates(data || [])
    } catch (error) {
      console.error('Error loading templates:', error)
      // Use mock data as fallback
      setTemplates([
        {
          id: '1',
          name: 'Welcome Email',
          subject: 'Welcome to {{organization_name}}, {{first_name}}!',
          body: 'Hi {{first_name}},\n\nThank you for your interest...',
          variables: ['first_name', 'organization_name']
        }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleTemplateSelect = (template: EmailTemplate) => {
    setSelectedTemplate(template)
    onChange({
      ...config,
      mode: 'template',
      templateId: template.id,
      customEmail: null
    })
  }

  const handleCustomEmailChange = (field: 'subject' | 'body', value: string) => {
    const updated = { ...customEmail, [field]: value }
    setCustomEmail(updated)
    onChange({
      ...config,
      mode: 'custom',
      templateId: null,
      customEmail: updated
    })
  }

  const insertVariable = (variable: string, field: 'subject' | 'body') => {
    const textarea = document.getElementById(`email-${field}`) as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = customEmail[field]
      const newText = text.substring(0, start) + variable + text.substring(end)
      handleCustomEmailChange(field, newText)
      
      // Reset cursor position
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + variable.length, start + variable.length)
      }, 0)
    }
  }

  const generateWithAI = async () => {
    setAiGenerating(true)
    try {
      // In real implementation, this would call your AI API
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const aiGenerated = {
        subject: `{{first_name}}, ready to transform your fitness journey?`,
        body: `Hi {{first_name}},

I noticed you're interested in {{interest}} - that's fantastic! At {{organization_name}}, we specialize in helping people just like you achieve their fitness goals.

Here's what makes us different:
✓ Personalized training programs
✓ Expert coaches who care about your success
✓ Supportive community that keeps you motivated

I'd love to offer you a FREE consultation to discuss your goals and show you around our facility. 

Are you available this week for a quick tour? Just reply with your preferred day and time.

Looking forward to meeting you!

Best regards,
The {{organization_name}} Team

P.S. New members get 20% off their first month - but this offer expires soon!`
      }
      
      setCustomEmail(aiGenerated)
      setEmailMode('custom')
      onChange({
        ...config,
        mode: 'custom',
        templateId: null,
        customEmail: aiGenerated
      })
    } catch (error) {
      console.error('AI generation error:', error)
    } finally {
      setAiGenerating(false)
    }
  }

  const renderPreview = () => {
    const email = emailMode === 'template' ? selectedTemplate : customEmail
    if (!email) return null

    // Replace variables with sample data
    const sampleData = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      organization_name: 'Atlas Fitness',
      interest: 'weight loss',
      current_date: new Date().toLocaleDateString()
    }

    let previewSubject = email.subject
    let previewBody = email.body

    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      previewSubject = previewSubject.replace(regex, value)
      previewBody = previewBody.replace(regex, value)
    })

    return (
      <div className="mt-4 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Preview with Sample Data</h4>
        <div className="bg-white p-3 rounded border">
          <div className="text-sm text-gray-600 mb-1">Subject:</div>
          <div className="font-medium">{previewSubject}</div>
          <div className="text-sm text-gray-600 mt-3 mb-1">Body:</div>
          <div className="whitespace-pre-wrap text-sm">{previewBody}</div>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="p-4 text-center">Loading email configuration...</div>
  }

  return (
    <div className="space-y-6">
      {/* Email Mode Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Email Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setEmailMode('template')}
            className={`px-4 py-2 rounded-lg border ${
              emailMode === 'template'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-2" />
            Use Template
          </button>
          <button
            type="button"
            onClick={() => setEmailMode('custom')}
            className={`px-4 py-2 rounded-lg border ${
              emailMode === 'custom'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Edit className="w-4 h-4 inline mr-2" />
            Custom Email
          </button>
        </div>
      </div>

      {/* Template Selection */}
      {emailMode === 'template' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Template
          </label>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => handleTemplateSelect(template)}
                className={`w-full text-left p-3 rounded-lg border ${
                  selectedTemplate?.id === template.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <div className="font-medium">{template.name}</div>
                <div className="text-sm text-gray-600 truncate">{template.subject}</div>
              </button>
            ))}
          </div>
          
          {templates.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No templates found. Create a custom email instead.
            </div>
          )}
        </div>
      )}

      {/* Custom Email Creation */}
      {emailMode === 'custom' && (
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Subject Line
              </label>
              <button
                type="button"
                onClick={() => setShowVariables(!showVariables)}
                className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
              >
                <Variable className="w-4 h-4 mr-1" />
                Variables
              </button>
            </div>
            <input
              id="email-subject"
              type="text"
              value={customEmail.subject}
              onChange={(e) => handleCustomEmailChange('subject', e.target.value)}
              placeholder="Enter subject line..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Body
            </label>
            <textarea
              id="email-body"
              value={customEmail.body}
              onChange={(e) => handleCustomEmailChange('body', e.target.value)}
              placeholder="Write your email content..."
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Variable Helper */}
          {showVariables && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Click to insert variables:</h4>
              <div className="grid grid-cols-2 gap-2">
                {availableVariables.map((variable) => (
                  <button
                    key={variable.key}
                    type="button"
                    onClick={() => insertVariable(variable.key, 'body')}
                    className="text-left px-2 py-1 text-sm bg-white border border-gray-200 rounded hover:bg-gray-50"
                  >
                    <code className="text-blue-600">{variable.key}</code>
                    <span className="text-gray-600 ml-1">- {variable.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* AI Generate Button */}
          <button
            type="button"
            onClick={generateWithAI}
            disabled={aiGenerating}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {aiGenerating ? 'Generating...' : 'Generate with AI'}
          </button>
        </div>
      )}

      {/* Advanced Settings */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">Sending Options</h3>
        
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={config.trackOpens || false}
            onChange={(e) => onChange({ ...config, trackOpens: e.target.checked })}
            className="rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm text-gray-700">Track email opens</span>
        </label>

        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={config.trackClicks || false}
            onChange={(e) => onChange({ ...config, trackClicks: e.target.checked })}
            className="rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm text-gray-700">Track link clicks</span>
        </label>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Send from name
          </label>
          <input
            type="text"
            value={config.fromName || ''}
            onChange={(e) => onChange({ ...config, fromName: e.target.value })}
            placeholder="e.g., Atlas Fitness Team"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
      </div>

      {/* Preview Button */}
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
  )
}