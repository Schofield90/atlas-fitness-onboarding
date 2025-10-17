'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import SettingsHeader from '@/app/components/settings/SettingsHeader'
import { 
  Mail,
  MessageSquare,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Eye,
  Send,
  Calendar,
  UserCheck,
  Clock,
  AlertCircle,
  ChevronRight
} from 'lucide-react'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  template_type: 'appointment_confirmation' | 'appointment_reminder' | 'welcome' | 'follow_up' | 'cancellation' | 'custom'
  html_content: string
  text_content: string
  sms_content?: string
  available_variables: string[]
  is_active: boolean
  is_system: boolean
  category: 'email' | 'sms' | 'both'
}

const gymTemplates: EmailTemplate[] = [
  {
    id: 'apt_confirm',
    name: 'Appointment Confirmation',
    subject: 'Your {{appointment_type}} is Confirmed - {{gym_name}}',
    template_type: 'appointment_confirmation',
    html_content: `
      <p>Hi {{client_name}},</p>
      <p>Your {{appointment_type}} has been confirmed!</p>
      <p><strong>Details:</strong></p>
      <ul>
        <li>Date: {{appointment_date}}</li>
        <li>Time: {{appointment_time}}</li>
        <li>Duration: {{duration}}</li>
        <li>Coach: {{coach_name}}</li>
        <li>Location: {{gym_address}}</li>
      </ul>
      <p>Please arrive 5-10 minutes early and bring water and appropriate workout attire.</p>
      <p>Need to reschedule? <a href="{{reschedule_link}}">Click here</a></p>
      <p>Best regards,<br>{{gym_name}} Team</p>
    `,
    text_content: `Hi {{client_name}}, Your {{appointment_type}} is confirmed for {{appointment_date}} at {{appointment_time}} with {{coach_name}}. Location: {{gym_address}}. To reschedule visit: {{reschedule_link}}`,
    sms_content: `{{gym_name}}: Your {{appointment_type}} is confirmed for {{appointment_date}} at {{appointment_time}} with {{coach_name}}. Reply STOP to opt out.`,
    available_variables: ['client_name', 'appointment_type', 'appointment_date', 'appointment_time', 'duration', 'coach_name', 'gym_name', 'gym_address', 'reschedule_link'],
    is_active: true,
    is_system: true,
    category: 'both'
  },
  {
    id: 'apt_reminder',
    name: 'Appointment Reminder',
    subject: 'Reminder: {{appointment_type}} Tomorrow - {{gym_name}}',
    template_type: 'appointment_reminder',
    html_content: `
      <p>Hi {{client_name}},</p>
      <p>This is a friendly reminder about your upcoming {{appointment_type}}.</p>
      <p><strong>Tomorrow's Session:</strong></p>
      <ul>
        <li>Time: {{appointment_time}}</li>
        <li>Coach: {{coach_name}}</li>
        <li>Location: {{gym_address}}</li>
      </ul>
      <p>Can't make it? Please let us know ASAP so we can offer the slot to someone else.</p>
      <p><a href="{{cancel_link}}">Cancel Appointment</a> | <a href="{{reschedule_link}}">Reschedule</a></p>
      <p>See you soon!<br>{{gym_name}} Team</p>
    `,
    text_content: `Reminder: You have a {{appointment_type}} tomorrow at {{appointment_time}} with {{coach_name}} at {{gym_address}}. To cancel or reschedule, visit {{reschedule_link}}`,
    sms_content: `{{gym_name}} Reminder: {{appointment_type}} tomorrow at {{appointment_time}} with {{coach_name}}. Reply C to cancel.`,
    available_variables: ['client_name', 'appointment_type', 'appointment_time', 'coach_name', 'gym_name', 'gym_address', 'cancel_link', 'reschedule_link'],
    is_active: true,
    is_system: true,
    category: 'both'
  },
  {
    id: 'welcome',
    name: 'Welcome New Member',
    subject: 'Welcome to {{gym_name}} - Let\'s Start Your Fitness Journey!',
    template_type: 'welcome',
    html_content: `
      <p>Hi {{client_name}},</p>
      <p>Welcome to the {{gym_name}} family! We're thrilled to have you join us.</p>
      <p><strong>Here's what happens next:</strong></p>
      <ol>
        <li>Your membership is now active</li>
        <li>Book your free induction session with one of our coaches</li>
        <li>Download our app to book classes and track your progress</li>
        <li>Join our member Facebook group for tips and community support</li>
      </ol>
      <p><strong>Your Membership Details:</strong></p>
      <ul>
        <li>Membership Type: {{membership_type}}</li>
        <li>Start Date: {{start_date}}</li>
        <li>Member ID: {{member_id}}</li>
      </ul>
      <p>Got questions? Reply to this email or call us at {{gym_phone}}.</p>
      <p>Let's achieve your fitness goals together!<br>{{gym_name}} Team</p>
    `,
    text_content: `Welcome to {{gym_name}}, {{client_name}}! Your {{membership_type}} membership is now active. Book your free induction and download our app to get started. Questions? Call {{gym_phone}}.`,
    sms_content: `Welcome to {{gym_name}}, {{client_name}}! Your membership is active. Book your free induction at {{booking_link}}`,
    available_variables: ['client_name', 'gym_name', 'membership_type', 'start_date', 'member_id', 'gym_phone', 'booking_link'],
    is_active: true,
    is_system: true,
    category: 'both'
  },
  {
    id: 'follow_up',
    name: 'Lead Follow Up',
    subject: 'Still Interested in Joining {{gym_name}}?',
    template_type: 'follow_up',
    html_content: `
      <p>Hi {{lead_name}},</p>
      <p>Thanks for your interest in {{gym_name}}! I noticed you haven't had a chance to visit us yet.</p>
      <p>I'd love to offer you a <strong>FREE trial session</strong> so you can experience what we're all about.</p>
      <p><strong>This week we're offering:</strong></p>
      <ul>
        <li>Free personal training consultation</li>
        <li>Body composition analysis</li>
        <li>Customized workout plan</li>
        <li>No commitment required</li>
      </ul>
      <p><a href="{{booking_link}}" style="background: #f97316; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Book Your Free Trial</a></p>
      <p>Or reply to this email with your preferred time and we'll sort it out for you.</p>
      <p>Hope to see you soon!<br>{{staff_name}}<br>{{gym_name}}</p>
    `,
    text_content: `Hi {{lead_name}}, Still interested in {{gym_name}}? Book your FREE trial session at {{booking_link}} or reply with your preferred time. - {{staff_name}}`,
    sms_content: `Hi {{lead_name}}, {{gym_name}} here! Your FREE trial session is waiting. Book now: {{booking_link}}`,
    available_variables: ['lead_name', 'gym_name', 'staff_name', 'booking_link'],
    is_active: true,
    is_system: true,
    category: 'both'
  }
]

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'email' | 'sms'>('email')
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const supabase = createClient()

  useEffect(() => {
    fetchTemplates()
  }, [])

  // Loading timeout to prevent infinite spinners
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Loading timeout - forcing loading to stop')
        setLoading(false)
      }
    }, 5000) // 5 second timeout
    
    return () => clearTimeout(timeout)
  }, [loading])

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

      // Fetch templates
      const { data: emailTemplates } = await supabase
        .from('email_templates')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .order('created_at', { ascending: true })

      if (emailTemplates && emailTemplates.length > 0) {
        setTemplates(emailTemplates)
        setSelectedTemplate(emailTemplates[0])
      } else {
        // Initialize with gym templates
        setTemplates(gymTemplates)
        setSelectedTemplate(gymTemplates[0])
        
        // Save to database
        for (const template of gymTemplates) {
          await supabase.from('email_templates').insert({
            ...template,
            organization_id: userOrg.organization_id
          })
        }
      }
    } catch (error) {
      setLoading(false)
      console.error('Error fetching templates:', error)
      // Use default templates as fallback
      setTemplates(gymTemplates)
      setSelectedTemplate(gymTemplates[0])
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTemplate = async () => {
    if (!editingTemplate) return

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
        .update(editingTemplate)
        .eq('id', editingTemplate.id)
        .eq('organization_id', userOrg.organization_id)

      if (error) throw error

      setTemplates(templates.map(t => t.id === editingTemplate.id ? editingTemplate : t))
      setSelectedTemplate(editingTemplate)
      setEditingTemplate(null)
      alert('Template saved successfully!')
    } catch (error) {
      setLoading(false)
      console.error('Error saving template:', error)
      alert('Failed to save template')
    }
  }

  const handleSendTest = async () => {
    if (!testEmail || !selectedTemplate) {
      alert('Please enter a test email address')
      return
    }

    alert(`Test email would be sent to ${testEmail} with template: ${selectedTemplate.name}`)
    setTestEmail('')
  }

  const getTemplateIcon = (type: string) => {
    switch (type) {
      case 'appointment_confirmation': return <Calendar className="h-4 w-4" />
      case 'appointment_reminder': return <Clock className="h-4 w-4" />
      case 'welcome': return <UserCheck className="h-4 w-4" />
      case 'follow_up': return <ChevronRight className="h-4 w-4" />
      default: return <Mail className="h-4 w-4" />
    }
  }

  const getTemplateColor = (type: string) => {
    switch (type) {
      case 'appointment_confirmation': return 'text-green-400'
      case 'appointment_reminder': return 'text-yellow-400'
      case 'welcome': return 'text-blue-400'
      case 'follow_up': return 'text-purple-400'
      default: return 'text-gray-400'
    }
  }

  const replaceVariables = (content: string) => {
    const sampleData: { [key: string]: string } = {
      client_name: 'John Smith',
      lead_name: 'John Smith',
      appointment_type: 'Personal Training Session',
      appointment_date: 'Monday, 15th January',
      appointment_time: '10:00 AM',
      duration: '60 minutes',
      coach_name: 'Sarah Johnson',
      staff_name: 'Sarah Johnson',
      gym_name: 'Atlas Fitness',
      gym_address: '123 High Street, York, YO1 1AA',
      gym_phone: '01234 567890',
      membership_type: 'Premium Monthly',
      start_date: '15th January 2024',
      member_id: 'AF-2024-001',
      booking_link: 'https://atlas-fitness.com/book',
      reschedule_link: 'https://atlas-fitness.com/reschedule',
      cancel_link: 'https://atlas-fitness.com/cancel'
    }

    let result = content
    Object.entries(sampleData).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value)
    })
    return result
  }

  const filteredTemplates = templates.filter(t => 
    activeTab === 'email' ? t.category !== 'sms' : t.category !== 'email'
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading templates...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsHeader 
        title="Email & SMS Templates"
        description="Manage automated communication templates for appointments and follow-ups"
      />

      {/* Info Banner */}
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
          <div>
            <p className="text-sm text-blue-300 font-medium">Smart Templates</p>
            <p className="text-xs text-blue-200 mt-1">
              Templates automatically populate with client and appointment details. 
              Variables like {'{{client_name}}'} and {'{{appointment_time}}'} are replaced with actual data when sent.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'email'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <Mail className="h-4 w-4" />
            Email Templates
          </button>
          <button
            onClick={() => setActiveTab('sms')}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'sms'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            SMS Templates
          </button>
        </nav>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Templates</h2>
            <button className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => setSelectedTemplate(template)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedTemplate?.id === template.id
                    ? 'bg-gray-700 border border-blue-500'
                    : 'bg-gray-700/50 hover:bg-gray-700'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 ${getTemplateColor(template.template_type)}`}>
                    {getTemplateIcon(template.template_type)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white">{template.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {template.template_type.replace(/_/g, ' ')}
                    </div>
                  </div>
                  {template.is_system && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-900 text-blue-300 rounded">
                      System
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Template Editor */}
        <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6">
          {selectedTemplate ? (
            <>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-lg font-semibold text-white">{selectedTemplate.name}</h2>
                  <p className="text-sm text-gray-400 mt-1">
                    Type: {selectedTemplate.template_type.replace(/_/g, ' ')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setEditingTemplate(selectedTemplate)}
                    className="p-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {showPreview ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gray-700 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-400 mb-2">Preview</h3>
                    {activeTab === 'email' ? (
                      <>
                        <div className="mb-3 pb-3 border-b border-gray-600">
                          <p className="text-xs text-gray-500">Subject:</p>
                          <p className="text-white">{replaceVariables(selectedTemplate.subject)}</p>
                        </div>
                        <div 
                          className="text-gray-300 prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: replaceVariables(selectedTemplate.html_content) }}
                        />
                      </>
                    ) : (
                      <div className="text-gray-300">
                        {replaceVariables(selectedTemplate.sms_content || '')}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <input
                      type="email"
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="test@example.com"
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    />
                    <button
                      onClick={handleSendTest}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Send Test
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeTab === 'email' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Subject Line
                      </label>
                      <input
                        type="text"
                        value={editingTemplate?.subject || selectedTemplate.subject}
                        onChange={(e) => setEditingTemplate({ 
                          ...editingTemplate || selectedTemplate, 
                          subject: e.target.value 
                        })}
                        disabled={!editingTemplate}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white disabled:opacity-50"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      {activeTab === 'email' ? 'Email Content' : 'SMS Content'}
                    </label>
                    <textarea
                      value={
                        activeTab === 'email' 
                          ? (editingTemplate?.html_content || selectedTemplate.html_content)
                          : (editingTemplate?.sms_content || selectedTemplate.sms_content)
                      }
                      onChange={(e) => setEditingTemplate({ 
                        ...editingTemplate || selectedTemplate, 
                        [activeTab === 'email' ? 'html_content' : 'sms_content']: e.target.value 
                      })}
                      disabled={!editingTemplate}
                      className="w-full h-64 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white font-mono text-sm disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Available Variables
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {selectedTemplate.available_variables.map((variable) => (
                        <code
                          key={variable}
                          className="px-2 py-1 bg-gray-700 text-blue-400 rounded text-xs cursor-pointer hover:bg-gray-600"
                          onClick={() => {
                            if (editingTemplate) {
                              const content = activeTab === 'email' 
                                ? editingTemplate.html_content 
                                : editingTemplate.sms_content || ''
                              setEditingTemplate({
                                ...editingTemplate,
                                [activeTab === 'email' ? 'html_content' : 'sms_content']: 
                                  content + ` {{${variable}}}`
                              })
                            }
                          }}
                        >
                          {`{{${variable}}}`}
                        </code>
                      ))}
                    </div>
                  </div>

                  {editingTemplate && (
                    <div className="flex gap-3">
                      <button
                        onClick={handleSaveTemplate}
                        className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        Save Changes
                      </button>
                      <button
                        onClick={() => setEditingTemplate(null)}
                        className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-gray-400">
              Select a template to view or edit
            </div>
          )}
        </div>
      </div>
    </div>
  )
}