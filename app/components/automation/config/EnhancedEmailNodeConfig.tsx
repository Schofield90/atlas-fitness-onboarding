'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Bold, 
  Italic, 
  Underline, 
  Link, 
  List, 
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Image,
  Code,
  Sparkles,
  Tag,
  Users,
  Mail,
  Phone,
  MessageSquare,
  Eye,
  Send,
  X,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

interface EnhancedEmailNodeConfigProps {
  nodeData: any
  onChange: (data: any) => void
  organizationId: string
}

export default function EnhancedEmailNodeConfig({ 
  nodeData, 
  onChange,
  organizationId 
}: EnhancedEmailNodeConfigProps) {
  const [activeTab, setActiveTab] = useState<'compose' | 'templates' | 'ai'>('compose')
  const [fromName, setFromName] = useState(nodeData.fromName || '')
  const [fromEmail, setFromEmail] = useState(nodeData.fromEmail || '')
  const [subject, setSubject] = useState(nodeData.subject || '')
  const [message, setMessage] = useState(nodeData.message || '')
  const [selectedTemplate, setSelectedTemplate] = useState(nodeData.templateId || '')
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [ccEmails, setCcEmails] = useState(nodeData.cc || '')
  const [bccEmails, setBccEmails] = useState(nodeData.bcc || '')
  const editorRef = useRef<HTMLDivElement>(null)
  const [templates, setTemplates] = useState<any[]>([])
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [isSendingTest, setIsSendingTest] = useState(false)
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' })

  // Load email templates
  useEffect(() => {
    fetchTemplates()
  }, [organizationId])

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`/api/email-templates?organizationId=${organizationId}`)
      if (response.ok) {
        const data = await response.json()
        setTemplates(data.templates || [])
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  // Format toolbar functions
  const formatText = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    if (editorRef.current) {
      setMessage(editorRef.current.innerHTML)
    }
  }

  const insertLink = () => {
    const url = prompt('Enter URL:')
    if (url) {
      formatText('createLink', url)
    }
  }

  const insertImage = () => {
    const url = prompt('Enter image URL:')
    if (url) {
      formatText('insertImage', url)
    }
  }

  const insertVariable = (variable: string) => {
    if (editorRef.current) {
      const selection = window.getSelection()
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        range.deleteContents()
        const span = document.createElement('span')
        span.className = 'bg-blue-100 text-blue-700 px-1 rounded'
        span.contentEditable = 'false'
        span.textContent = `{{${variable}}}`
        range.insertNode(span)
        
        // Move cursor after the inserted variable
        range.setStartAfter(span)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
        
        setMessage(editorRef.current.innerHTML)
      }
    }
  }

  const generateAIContent = async () => {
    setIsGeneratingAI(true)
    try {
      const prompt = `Generate a professional email for a gym/fitness business. Context: ${subject || 'Follow-up email'}`
      
      // Simulate AI generation
      setTimeout(() => {
        const generatedContent = `
          <p>Hi {{first_name}},</p>
          <br>
          <p>I hope this email finds you well! I wanted to follow up on your recent interest in our fitness programs at Atlas Fitness.</p>
          <br>
          <p>We have some exciting opportunities that might be perfect for your fitness goals:</p>
          <ul>
            <li>Personal training sessions tailored to your needs</li>
            <li>Group fitness classes with motivated communities</li>
            <li>Nutrition guidance to complement your training</li>
          </ul>
          <br>
          <p>I'd love to schedule a quick call or meeting to discuss how we can help you achieve your fitness goals. Are you available for a brief consultation this week?</p>
          <br>
          <p>Looking forward to hearing from you!</p>
          <br>
          <p>Best regards,<br>
          {{user_name}}<br>
          Atlas Fitness Team</p>
        `
        setMessage(generatedContent)
        if (editorRef.current) {
          editorRef.current.innerHTML = generatedContent
        }
        setIsGeneratingAI(false)
      }, 1500)
    } catch (error) {
      console.error('Error generating AI content:', error)
      setIsGeneratingAI(false)
    }
  }

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId)
    if (template) {
      setSelectedTemplate(templateId)
      setSubject(template.subject || subject)
      setMessage(template.content || '')
      if (editorRef.current) {
        editorRef.current.innerHTML = template.content || ''
      }
    }
  }

  // Send test email
  const sendTestEmail = async () => {
    if (!testEmail) {
      setTestStatus({ type: 'error', message: 'Please enter a test email address' })
      return
    }

    setIsSendingTest(true)
    setTestStatus({ type: null, message: '' })

    try {
      const response = await fetch('/api/automations/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          fromName: fromName || 'Atlas Fitness',
          fromEmail: fromEmail || 'noreply@atlasfitness.com',
          subject: subject || 'Test Email',
          html: message || '<p>This is a test email</p>',
          organizationId
        })
      })

      if (response.ok) {
        setTestStatus({ type: 'success', message: 'Test email sent successfully!' })
      } else {
        const error = await response.json()
        throw new Error(error.message || 'Failed to send test email')
      }
    } catch (error: any) {
      setTestStatus({ type: 'error', message: error.message || 'Failed to send test email' })
    } finally {
      setIsSendingTest(false)
    }
  }

  // Process variables in content
  const processVariables = (content: string) => {
    const sampleData = {
      first_name: 'John',
      last_name: 'Doe',
      email: 'john.doe@example.com',
      phone: '+44 7700 900000',
      company: 'Fitness Enthusiasts Ltd',
      gym_name: 'Atlas Fitness',
      user_name: 'Sarah Coach',
      booking_date: new Date().toLocaleDateString('en-GB'),
      class_name: 'Morning Yoga'
    }

    let processed = content
    Object.entries(sampleData).forEach(([key, value]) => {
      const regex = new RegExp(`{{${key}}}`, 'g')
      processed = processed.replace(regex, value)
    })
    return processed
  }

  // Update parent component
  useEffect(() => {
    onChange({
      ...nodeData,
      fromName,
      fromEmail,
      subject,
      message,
      templateId: selectedTemplate,
      cc: ccEmails,
      bcc: bccEmails
    })
  }, [fromName, fromEmail, subject, message, selectedTemplate, ccEmails, bccEmails])

  const variables = [
    { label: 'First Name', value: 'first_name' },
    { label: 'Last Name', value: 'last_name' },
    { label: 'Email', value: 'email' },
    { label: 'Phone', value: 'phone' },
    { label: 'Company', value: 'company' },
    { label: 'Gym Name', value: 'gym_name' },
    { label: 'User Name', value: 'user_name' },
    { label: 'Booking Date', value: 'booking_date' },
    { label: 'Class Name', value: 'class_name' }
  ]

  return (
    <div className="space-y-4">
      {/* Action Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Action Name <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={nodeData.name || 'Email'}
          onChange={(e) => onChange({ ...nodeData, name: e.target.value })}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* From Name */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          From Name
        </label>
        <div className="relative">
          <input
            type="text"
            value={fromName}
            onChange={(e) => setFromName(e.target.value)}
            placeholder="From Name"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => insertVariable('user_name')}
            className="absolute right-2 top-2 p-1 text-gray-400 hover:text-white"
          >
            <Tag className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          If empty, email will be sent using default values
        </p>
      </div>

      {/* From Email */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          From Email
        </label>
        <div className="relative">
          <input
            type="email"
            value={fromEmail}
            onChange={(e) => setFromEmail(e.target.value)}
            placeholder="From Email"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => insertVariable('user_email')}
            className="absolute right-2 top-2 p-1 text-gray-400 hover:text-white"
          >
            <Tag className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* CC/BCC Buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => setShowCc(!showCc)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            showCc ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Cc
        </button>
        <button
          onClick={() => setShowBcc(!showBcc)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            showBcc ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Bcc
        </button>
      </div>

      {/* CC Field */}
      {showCc && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            CC
          </label>
          <input
            type="text"
            value={ccEmails}
            onChange={(e) => setCcEmails(e.target.value)}
            placeholder="Enter CC emails (comma separated)"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* BCC Field */}
      {showBcc && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            BCC
          </label>
          <input
            type="text"
            value={bccEmails}
            onChange={(e) => setBccEmails(e.target.value)}
            placeholder="Enter BCC emails (comma separated)"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Subject */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Subject <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject"
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={() => insertVariable('first_name')}
            className="absolute right-2 top-2 p-1 text-gray-400 hover:text-white"
          >
            <Tag className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-1">
          Subject is optional for email templates. Leave empty to use template subject.
        </p>
      </div>

      {/* Templates Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Templates
        </label>
        <select
          value={selectedTemplate}
          onChange={(e) => handleTemplateSelect(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Please Select</option>
          {templates.map(template => (
            <option key={template.id} value={template.id}>
              {template.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-gray-400 mt-1">Select Template</p>
      </div>

      {/* Message Editor */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-300">
            Message
          </label>
          <button
            onClick={generateAIContent}
            disabled={isGeneratingAI}
            className="flex items-center gap-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            {isGeneratingAI ? 'Generating...' : 'Write with AI'}
          </button>
        </div>

        {/* Rich Text Toolbar */}
        <div className="bg-gray-700 border border-gray-600 rounded-t-lg p-2">
          <div className="flex items-center gap-1 flex-wrap">
            {/* Variables Dropdown */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  insertVariable(e.target.value)
                  e.target.value = ''
                }
              }}
              className="px-2 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-500"
            >
              <option value="">Variables</option>
              {variables.map(v => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>

            <div className="w-px h-6 bg-gray-600 mx-1" />

            {/* Text Formatting */}
            <button
              onClick={() => formatText('bold')}
              className="p-1.5 hover:bg-gray-600 rounded transition-colors"
              title="Bold"
            >
              <Bold className="h-4 w-4 text-gray-300" />
            </button>
            <button
              onClick={() => formatText('italic')}
              className="p-1.5 hover:bg-gray-600 rounded transition-colors"
              title="Italic"
            >
              <Italic className="h-4 w-4 text-gray-300" />
            </button>
            <button
              onClick={() => formatText('underline')}
              className="p-1.5 hover:bg-gray-600 rounded transition-colors"
              title="Underline"
            >
              <Underline className="h-4 w-4 text-gray-300" />
            </button>

            <div className="w-px h-6 bg-gray-600 mx-1" />

            {/* Lists */}
            <button
              onClick={() => formatText('insertUnorderedList')}
              className="p-1.5 hover:bg-gray-600 rounded transition-colors"
              title="Bullet List"
            >
              <List className="h-4 w-4 text-gray-300" />
            </button>
            <button
              onClick={() => formatText('insertOrderedList')}
              className="p-1.5 hover:bg-gray-600 rounded transition-colors"
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4 text-gray-300" />
            </button>

            <div className="w-px h-6 bg-gray-600 mx-1" />

            {/* Alignment */}
            <button
              onClick={() => formatText('justifyLeft')}
              className="p-1.5 hover:bg-gray-600 rounded transition-colors"
              title="Align Left"
            >
              <AlignLeft className="h-4 w-4 text-gray-300" />
            </button>
            <button
              onClick={() => formatText('justifyCenter')}
              className="p-1.5 hover:bg-gray-600 rounded transition-colors"
              title="Align Center"
            >
              <AlignCenter className="h-4 w-4 text-gray-300" />
            </button>
            <button
              onClick={() => formatText('justifyRight')}
              className="p-1.5 hover:bg-gray-600 rounded transition-colors"
              title="Align Right"
            >
              <AlignRight className="h-4 w-4 text-gray-300" />
            </button>

            <div className="w-px h-6 bg-gray-600 mx-1" />

            {/* Link & Image */}
            <button
              onClick={insertLink}
              className="p-1.5 hover:bg-gray-600 rounded transition-colors"
              title="Insert Link"
            >
              <Link className="h-4 w-4 text-gray-300" />
            </button>
            <button
              onClick={insertImage}
              className="p-1.5 hover:bg-gray-600 rounded transition-colors"
              title="Insert Image"
            >
              <Image className="h-4 w-4 text-gray-300" />
            </button>

            <div className="w-px h-6 bg-gray-600 mx-1" />

            {/* Code */}
            <button
              onClick={() => formatText('formatBlock', '<pre>')}
              className="p-1.5 hover:bg-gray-600 rounded transition-colors"
              title="Code Block"
            >
              <Code className="h-4 w-4 text-gray-300" />
            </button>
          </div>

          {/* Font Controls */}
          <div className="flex items-center gap-2 mt-2">
            <select
              onChange={(e) => formatText('fontName', e.target.value)}
              className="px-2 py-1 bg-gray-600 text-white text-sm rounded"
            >
              <option value="Arial">Arial</option>
              <option value="Verdana">Verdana</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Georgia">Georgia</option>
              <option value="Courier New">Courier New</option>
            </select>

            <select
              onChange={(e) => formatText('fontSize', e.target.value)}
              className="px-2 py-1 bg-gray-600 text-white text-sm rounded"
            >
              <option value="1">10px</option>
              <option value="2">12px</option>
              <option value="3">14px</option>
              <option value="4">16px</option>
              <option value="5">18px</option>
              <option value="6">24px</option>
              <option value="7">32px</option>
            </select>

            <input
              type="color"
              onChange={(e) => formatText('foreColor', e.target.value)}
              className="w-8 h-8 bg-gray-600 rounded cursor-pointer"
              title="Text Color"
            />
          </div>
        </div>

        {/* Content Editable Area */}
        <div
          ref={editorRef}
          contentEditable
          className="min-h-[300px] p-4 bg-gray-700 border border-gray-600 border-t-0 rounded-b-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          onInput={(e) => setMessage(e.currentTarget.innerHTML)}
          dangerouslySetInnerHTML={{ __html: message }}
          placeholder="Type your message here..."
        />
      </div>

      {/* Test and Preview Section */}
      <div className="border-t border-gray-600 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-300">Test & Preview</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
            >
              <Eye className="h-4 w-4" />
              {showPreview ? 'Hide' : 'Show'} Preview
            </button>
          </div>
        </div>

        {/* Test Email Section */}
        <div className="bg-gray-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium text-gray-300">Send Test Email</span>
          </div>
          <div className="flex gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Enter test email address"
              className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={sendTestEmail}
              disabled={isSendingTest || !testEmail}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors"
            >
              <Send className="h-4 w-4" />
              {isSendingTest ? 'Sending...' : 'Send Test'}
            </button>
          </div>
          
          {/* Test Status */}
          {testStatus.type && (
            <div className={`flex items-center gap-2 p-2 rounded-lg text-sm ${
              testStatus.type === 'success' 
                ? 'bg-green-900/50 text-green-300' 
                : 'bg-red-900/50 text-red-300'
            }`}>
              {testStatus.type === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <AlertCircle className="h-4 w-4" />
              )}
              <span>{testStatus.message}</span>
            </div>
          )}
        </div>

        {/* Email Preview */}
        {showPreview && (
          <div className="bg-gray-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-300">Email Preview</h4>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="bg-white rounded-lg p-4 space-y-3">
              {/* Preview Header */}
              <div className="border-b pb-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">From:</span>
                  <span>{fromName || 'Atlas Fitness'} &lt;{fromEmail || 'noreply@atlasfitness.com'}&gt;</span>
                </div>
                {ccEmails && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <span className="font-medium">CC:</span>
                    <span>{ccEmails}</span>
                  </div>
                )}
                {bccEmails && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <span className="font-medium">BCC:</span>
                    <span>{bccEmails}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                  <span className="font-medium">Subject:</span>
                  <span className="font-semibold">{processVariables(subject) || 'No Subject'}</span>
                </div>
              </div>
              
              {/* Preview Body */}
              <div 
                className="text-gray-800 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: processVariables(message) || '<p>No content</p>' }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-2 pt-4 border-t border-gray-600">
        <button
          onClick={() => setShowPreview(false)}
          className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            // Save logic here
            console.log('Saving email configuration:', {
              fromName,
              fromEmail,
              subject,
              message,
              cc: ccEmails,
              bcc: bccEmails
            })
          }}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          Save Action
        </button>
      </div>
    </div>
  )
}