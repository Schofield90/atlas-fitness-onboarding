'use client'

import { useState } from 'react'
import DashboardLayout from '@/app/components/DashboardLayout'
import { 
  MailIcon, 
  SendIcon, 
  SaveIcon, 
  EyeIcon,
  ClockIcon,
  UsersIcon,
  TrendingUpIcon,
  PlusIcon,
  EditIcon,
  TrashIcon
} from 'lucide-react'

interface EmailDraft {
  id: string
  subject: string
  content: string
  recipients: string[]
  status: 'draft' | 'scheduled' | 'sent'
  createdAt: Date
  scheduledFor?: Date
}

export default function EmailMarketingPage() {
  const [activeTab, setActiveTab] = useState<'compose' | 'templates' | 'campaigns'>('compose')
  const [emailSubject, setEmailSubject] = useState('')
  const [emailContent, setEmailContent] = useState('')
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [drafts, setDrafts] = useState<EmailDraft[]>([])

  const handleSendEmail = () => {
    if (!emailSubject || !emailContent) {
      alert('Please enter a subject and content for your email')
      return
    }
    if (selectedRecipients.length === 0) {
      alert('Please select at least one recipient group')
      return
    }
    
    alert('Email campaign sent successfully!')
    // Reset form
    setEmailSubject('')
    setEmailContent('')
    setSelectedRecipients([])
  }

  const handleSaveDraft = () => {
    const newDraft: EmailDraft = {
      id: Date.now().toString(),
      subject: emailSubject || 'Untitled Draft',
      content: emailContent,
      recipients: selectedRecipients,
      status: 'draft',
      createdAt: new Date()
    }
    setDrafts([...drafts, newDraft])
    alert('Draft saved successfully!')
  }

  const emailTemplates = [
    { id: 1, name: 'Welcome Email', description: 'Send to new members' },
    { id: 2, name: 'Class Reminder', description: 'Remind members about upcoming classes' },
    { id: 3, name: 'Membership Renewal', description: 'Encourage membership renewals' },
    { id: 4, name: 'Special Offer', description: 'Promote special deals and discounts' },
    { id: 5, name: 'Newsletter', description: 'Monthly gym newsletter' }
  ]

  const renderCompose = () => (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Contacts</p>
              <p className="text-2xl font-bold text-white">2,456</p>
            </div>
            <UsersIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Emails Sent Today</p>
              <p className="text-2xl font-bold text-white">143</p>
            </div>
            <SendIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Avg Open Rate</p>
              <p className="text-2xl font-bold text-white">47.3%</p>
            </div>
            <TrendingUpIcon className="h-8 w-8 text-orange-500" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Scheduled</p>
              <p className="text-2xl font-bold text-white">5</p>
            </div>
            <ClockIcon className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Email Composer */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4">Compose Email</h2>
        
        {/* Recipients */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">Recipients</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {['All Members', 'Active Members', 'Inactive Members', 'Trial Members', 'Leads', 'Staff'].map((group) => (
              <label key={group} className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedRecipients.includes(group)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedRecipients([...selectedRecipients, group])
                    } else {
                      setSelectedRecipients(selectedRecipients.filter(g => g !== group))
                    }
                  }}
                  className="mr-2 rounded border-gray-600 bg-gray-700 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-gray-300">{group}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Subject */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">Subject Line</label>
          <input
            type="text"
            value={emailSubject}
            onChange={(e) => setEmailSubject(e.target.value)}
            placeholder="Enter your email subject..."
            className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-orange-500 focus:outline-none"
          />
        </div>

        {/* Email Editor Toolbar */}
        <div className="mb-2">
          <div className="flex gap-1 p-2 bg-gray-700 rounded-lg">
            <button className="p-2 hover:bg-gray-600 rounded" title="Bold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"></path>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"></path>
              </svg>
            </button>
            <button className="p-2 hover:bg-gray-600 rounded" title="Italic">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 4h4m0 0l-4 16m4-16h4m-8 16h4m0 0h4"></path>
              </svg>
            </button>
            <button className="p-2 hover:bg-gray-600 rounded" title="Underline">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v7a5 5 0 0010 0V4M5 21h14"></path>
              </svg>
            </button>
            <div className="w-px bg-gray-600 mx-1"></div>
            <button className="p-2 hover:bg-gray-600 rounded" title="Bullet List">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 6h13M8 12h13m-13 6h13M3 6h.01M3 12h.01M3 18h.01"></path>
              </svg>
            </button>
            <button className="p-2 hover:bg-gray-600 rounded" title="Link">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
              </svg>
            </button>
            <button className="p-2 hover:bg-gray-600 rounded" title="Image">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
              </svg>
            </button>
            <div className="w-px bg-gray-600 mx-1"></div>
            <button className="p-2 hover:bg-gray-600 rounded" title="Insert Button">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2z"></path>
              </svg>
            </button>
            <button className="p-2 hover:bg-gray-600 rounded" title="Personalization">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
            </button>
          </div>
        </div>

        {/* Content Editor */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-400 mb-2">Email Content</label>
          <textarea
            value={emailContent}
            onChange={(e) => setEmailContent(e.target.value)}
            placeholder="Start writing your email here...

Hi {{firstName}},

We hope you're enjoying your fitness journey with Atlas Fitness!

[Your message here]

Best regards,
The Atlas Fitness Team

P.S. Follow us on social media for daily fitness tips and motivation!"
            className="w-full h-96 px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white resize-none focus:border-orange-500 focus:outline-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSendEmail}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
          >
            <SendIcon className="h-4 w-4" />
            Send Now
          </button>
          <button
            onClick={() => alert('Schedule feature coming soon!')}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <ClockIcon className="h-4 w-4" />
            Schedule
          </button>
          <button
            onClick={handleSaveDraft}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <SaveIcon className="h-4 w-4" />
            Save Draft
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            <EyeIcon className="h-4 w-4" />
            Preview
          </button>
        </div>
      </div>

      {/* Email Preview */}
      {showPreview && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Email Preview</h3>
          <div className="bg-white rounded-lg p-6 text-gray-900">
            <div className="border-b pb-4 mb-4">
              <p className="text-sm text-gray-500">Subject:</p>
              <p className="font-semibold">{emailSubject || 'No subject'}</p>
            </div>
            <div className="whitespace-pre-wrap">
              {emailContent || 'No content'}
            </div>
          </div>
        </div>
      )}

      {/* Saved Drafts */}
      {drafts.length > 0 && (
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Saved Drafts</h3>
          <div className="space-y-3">
            {drafts.map((draft) => (
              <div key={draft.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div>
                  <p className="text-white font-medium">{draft.subject}</p>
                  <p className="text-sm text-gray-400">
                    Created {draft.createdAt.toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-gray-600 rounded">
                    <EditIcon className="h-4 w-4 text-gray-400" />
                  </button>
                  <button className="p-2 hover:bg-gray-600 rounded">
                    <TrashIcon className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )

  const renderTemplates = () => (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-white">Email Templates</h2>
        <button className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg">
          <PlusIcon className="h-4 w-4" />
          Create Template
        </button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {emailTemplates.map((template) => (
          <div key={template.id} className="p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer">
            <h3 className="font-medium text-white mb-1">{template.name}</h3>
            <p className="text-sm text-gray-400 mb-3">{template.description}</p>
            <button className="text-orange-500 hover:text-orange-400 text-sm">
              Use Template →
            </button>
          </div>
        ))}
      </div>
    </div>
  )

  const renderCampaigns = () => (
    <div className="bg-gray-800 rounded-lg p-6">
      <h2 className="text-xl font-semibold text-white mb-6">Recent Email Campaigns</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4 font-medium text-gray-400">Campaign</th>
              <th className="text-left py-3 px-4 font-medium text-gray-400">Sent</th>
              <th className="text-left py-3 px-4 font-medium text-gray-400">Opens</th>
              <th className="text-left py-3 px-4 font-medium text-gray-400">Clicks</th>
              <th className="text-left py-3 px-4 font-medium text-gray-400">Status</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-700">
              <td className="py-4 px-4">
                <div>
                  <p className="font-medium text-white">New Year Special Offer</p>
                  <p className="text-sm text-gray-400">Sent to All Members</p>
                </div>
              </td>
              <td className="py-4 px-4 text-gray-300">2,456</td>
              <td className="py-4 px-4 text-gray-300">1,234 (50.2%)</td>
              <td className="py-4 px-4 text-gray-300">234 (9.5%)</td>
              <td className="py-4 px-4">
                <span className="px-2 py-1 bg-green-900 text-green-300 rounded-full text-xs">Sent</span>
              </td>
            </tr>
            <tr className="border-b border-gray-700">
              <td className="py-4 px-4">
                <div>
                  <p className="font-medium text-white">Class Schedule Update</p>
                  <p className="text-sm text-gray-400">Sent to Active Members</p>
                </div>
              </td>
              <td className="py-4 px-4 text-gray-300">1,823</td>
              <td className="py-4 px-4 text-gray-300">912 (50.0%)</td>
              <td className="py-4 px-4 text-gray-300">156 (8.6%)</td>
              <td className="py-4 px-4">
                <span className="px-2 py-1 bg-green-900 text-green-300 rounded-full text-xs">Sent</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )

  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Email Marketing</h1>
          <p className="text-gray-400">Create and send email campaigns to your members</p>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-8">
          <button
            onClick={() => setActiveTab('compose')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'compose' 
                ? 'bg-orange-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <MailIcon className="h-4 w-4 inline mr-2" />
            Compose
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'templates' 
                ? 'bg-orange-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'campaigns' 
                ? 'bg-orange-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            Campaigns
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'compose' && renderCompose()}
        {activeTab === 'templates' && renderTemplates()}
        {activeTab === 'campaigns' && renderCampaigns()}
      </div>
    </DashboardLayout>
  )
}