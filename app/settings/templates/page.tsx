'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Mail, Plus, Edit2, Trash2, Copy, Loader2, Sparkles, Eye } from 'lucide-react'
import SettingsHeader from '@/app/components/settings/SettingsHeader'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  body: string
  type: string
  variables: string[]
  is_active: boolean
  usage_count: number
}

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: '',
    type: 'welcome',
    variables: [] as string[]
  })
  const supabase = createClient()

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) return

      const { data: templatesData } = await supabase
        .from('email_templates')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .order('created_at', { ascending: false })

      setTemplates(templatesData || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateWithAI = async () => {
    if (!formData.name) {
      alert('Please enter a template name first')
      return
    }

    setAiGenerating(true)
    try {
      const prompt = `Create a professional email template for a gym/fitness business. Template name: "${formData.name}". Type: ${formData.type}. Include placeholders like {{customer_name}}, {{gym_name}}, etc. Make it engaging and conversion-focused.`
      
      // In a real implementation, this would call an AI API
      // For now, we'll simulate with a template
      const aiGenerated = {
        subject: formData.type === 'welcome' 
          ? 'Welcome to {{gym_name}}, {{customer_name}}!' 
          : formData.type === 'reminder'
          ? 'Don\'t forget your class tomorrow at {{gym_name}}'
          : 'Special offer just for you, {{customer_name}}!',
        body: formData.type === 'welcome'
          ? `Hi {{customer_name}},\n\nWelcome to {{gym_name}}! We're thrilled to have you as part of our fitness family.\n\nYour journey to a healthier, stronger you starts now. Here's what you can expect:\n\n• Access to all our state-of-the-art equipment\n• Expert guidance from certified trainers\n• A supportive community of fitness enthusiasts\n\nDon't forget to book your free introductory session with one of our trainers!\n\nSee you at the gym!\n\nBest regards,\n{{gym_name}} Team`
          : formData.type === 'reminder'
          ? `Hi {{customer_name}},\n\nJust a friendly reminder that you have {{class_name}} tomorrow at {{class_time}}.\n\nInstructor: {{instructor_name}}\nLocation: {{location}}\n\nRemember to bring:\n• Water bottle\n• Towel\n• Your energy and enthusiasm!\n\nCan't make it? Please cancel at least 24 hours in advance to avoid charges.\n\nSee you there!\n{{gym_name}} Team`
          : `Hi {{customer_name}},\n\nWe have an exclusive offer just for you!\n\n{{offer_details}}\n\nThis special deal is only available until {{expiry_date}}, so don't miss out!\n\nReady to take your fitness to the next level?\n\n[Claim Your Offer]\n\nBest regards,\n{{gym_name}} Team`,
        variables: formData.type === 'welcome'
          ? ['customer_name', 'gym_name']
          : formData.type === 'reminder'
          ? ['customer_name', 'class_name', 'class_time', 'instructor_name', 'location', 'gym_name']
          : ['customer_name', 'gym_name', 'offer_details', 'expiry_date']
      }

      setFormData({
        ...formData,
        subject: aiGenerated.subject,
        body: aiGenerated.body,
        variables: aiGenerated.variables
      })
    } catch (error) {
      console.error('Error generating with AI:', error)
    } finally {
      setAiGenerating(false)
    }
  }

  const handleCreateTemplate = async () => {
    if (!formData.name || !formData.subject || !formData.body) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) return

      const { error } = await supabase
        .from('email_templates')
        .insert({
          organization_id: userOrg.organization_id,
          name: formData.name,
          subject: formData.subject,
          body: formData.body,
          type: formData.type,
          variables: formData.variables,
          is_active: true,
          usage_count: 0
        })

      if (error) throw error

      setShowCreateModal(false)
      setFormData({ name: '', subject: '', body: '', type: 'welcome', variables: [] })
      fetchTemplates()
    } catch (error) {
      console.error('Error creating template:', error)
    }
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return

    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', templateId)

      if (error) throw error
      fetchTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
    }
  }

  const handleToggleActive = async (templateId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .update({ is_active: !isActive })
        .eq('id', templateId)

      if (error) throw error
      fetchTemplates()
    } catch (error) {
      console.error('Error toggling template:', error)
    }
  }

  const templateTypes = [
    { value: 'welcome', label: 'Welcome Email', icon: '👋' },
    { value: 'reminder', label: 'Class Reminder', icon: '⏰' },
    { value: 'promotional', label: 'Promotional', icon: '🎉' },
    { value: 'follow_up', label: 'Follow Up', icon: '📨' },
    { value: 'birthday', label: 'Birthday', icon: '🎂' },
    { value: 'win_back', label: 'Win Back', icon: '📞' },
    { value: 'feedback', label: 'Feedback Request', icon: '📝' },
    { value: 'custom', label: 'Custom', icon: '🔧' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsHeader 
        title="Email Templates"
        description="Create and manage email templates for automated communications"
        icon={<Mail className="h-6 w-6" />}
        action={
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Create Template
          </button>
        }
      />

      {/* Templates Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => {
          const typeInfo = templateTypes.find(t => t.value === template.type)
          return (
            <div key={template.id} className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{typeInfo?.icon}</span>
                    <h3 className="font-medium text-white">{template.name}</h3>
                  </div>
                  <p className="text-xs text-gray-500">{typeInfo?.label}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      setSelectedTemplate(template)
                      setShowPreviewModal(true)
                    }}
                    className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                    title="Preview"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTemplate(template.id)}
                    className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-400 mb-3 line-clamp-2">
                {template.subject}
              </p>

              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  Used {template.usage_count} times
                </span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={template.is_active}
                    onChange={() => handleToggleActive(template.id, template.is_active)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>
            </div>
          )
        })}
      </div>

      {templates.length === 0 && (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <Mail className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No email templates yet</h3>
          <p className="text-gray-400 mb-4">Create your first email template to automate your communications</p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Create Template
          </button>
        </div>
      )}

      {/* Create Template Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">Create Email Template</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Template Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="e.g., Welcome New Members"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Template Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  {templateTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-gray-400">
                    Subject Line *
                  </label>
                  <button
                    onClick={generateWithAI}
                    disabled={aiGenerating}
                    className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300"
                  >
                    {aiGenerating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    Generate with AI
                  </button>
                </div>
                <input
                  type="text"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="e.g., Welcome to {{gym_name}}, {{customer_name}}!"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Email Body *
                </label>
                <textarea
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm"
                  rows={12}
                  placeholder="Write your email content here...\n\nUse variables like {{customer_name}}, {{gym_name}}, etc."
                />
              </div>

              {formData.variables.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-400 mb-2">Variables Used:</p>
                  <div className="flex flex-wrap gap-2">
                    {formData.variables.map((variable, idx) => (
                      <span key={idx} className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">
                        {`{{${variable}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTemplate}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-4">Template Preview</h2>
            
            <div className="bg-gray-900 rounded-lg p-4 mb-4">
              <p className="text-sm text-gray-400 mb-1">Subject:</p>
              <p className="text-white">{selectedTemplate.subject}</p>
            </div>

            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Body:</p>
              <pre className="text-white whitespace-pre-wrap font-sans">{selectedTemplate.body}</pre>
            </div>

            <button
              onClick={() => setShowPreviewModal(false)}
              className="w-full mt-6 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}