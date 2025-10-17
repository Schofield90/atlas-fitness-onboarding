'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DashboardLayout from '@/app/components/DashboardLayout'
import { 
  Zap, 
  Clock, 
  MessageSquare, 
  Calendar, 
  Target, 
  Users,
  TrendingUp,
  Heart,
  Mail,
  Phone,
  Star,
  ArrowRight,
  X,
  Eye,
  Copy
} from 'lucide-react'
import { TRIAL_CTA_TEXT } from '@/lib/constants'

interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: 'lead-generation' | 'retention' | 'sales' | 'support' | 'marketing'
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedSetupTime: number // in minutes
  features: string[]
  icon: React.ReactNode
  popular?: boolean
}

interface WorkflowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: { label: string; config?: any }
}

interface WorkflowData {
  nodes: WorkflowNode[]
  edges: Array<{ id: string; source: string; target: string }>
}

export default function WorkflowTemplatesPage() {
  const router = useRouter()
  const [userData, setUserData] = useState<any>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([])
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null)
  const [isCloning, setIsCloning] = useState(false)

  useEffect(() => {
    const storedData = localStorage.getItem('gymleadhub_trial_data')
    if (storedData) {
      setUserData(JSON.parse(storedData))
    }

    // Load templates
    setTemplates([
      {
        id: 'lead-welcome',
        name: 'New Lead Welcome Sequence',
        description: 'Automatically welcome new leads with personalized messages and schedule follow-ups to maximize conversion rates.',
        category: 'lead-generation',
        difficulty: 'beginner',
        estimatedSetupTime: 15,
        features: ['Instant welcome message', 'Follow-up sequence', 'Lead qualification', 'CRM integration'],
        icon: <MessageSquare className="h-6 w-6" />,
        popular: true
      },
      {
        id: 'trial-nurture',
        name: 'Free Trial Nurturing Campaign',
        description: 'Guide trial members through their journey with timely tips, check-ins, and conversion prompts.',
        category: 'retention',
        difficulty: 'intermediate',
        estimatedSetupTime: 25,
        features: ['Welcome onboarding', 'Progress tracking', 'Conversion reminders', 'Success stories'],
        icon: <TrendingUp className="h-6 w-6" />,
        popular: true
      },
      {
        id: 'appointment-reminders',
        name: 'Appointment Reminder System',
        description: 'Reduce no-shows with automated reminders sent via SMS and email before scheduled sessions.',
        category: 'support',
        difficulty: 'beginner',
        estimatedSetupTime: 10,
        features: ['24hr reminder', '1hr reminder', 'SMS & Email', 'Rescheduling links'],
        icon: <Calendar className="h-6 w-6" />
      },
      {
        id: 'membership-renewal',
        name: 'Membership Renewal Campaign',
        description: 'Automatically target members before renewal with personalized offers and retention incentives.',
        category: 'retention',
        difficulty: 'intermediate',
        estimatedSetupTime: 30,
        features: ['Renewal notifications', 'Personalized offers', 'Payment reminders', 'Win-back campaigns'],
        icon: <Heart className="h-6 w-6" />
      },
      {
        id: 'lead-qualification',
        name: 'AI Lead Qualification Bot',
        description: 'Qualify leads automatically with intelligent questions and route them to the right team members.',
        category: 'lead-generation',
        difficulty: 'advanced',
        estimatedSetupTime: 45,
        features: ['AI-powered questions', 'Lead scoring', 'Team routing', 'Priority flagging'],
        icon: <Target className="h-6 w-6" />,
        popular: true
      },
      {
        id: 'referral-program',
        name: 'Member Referral Program',
        description: 'Automate referral tracking, rewards distribution, and thank you messages to boost word-of-mouth.',
        category: 'marketing',
        difficulty: 'intermediate',
        estimatedSetupTime: 35,
        features: ['Referral tracking', 'Reward automation', 'Thank you messages', 'Progress updates'],
        icon: <Users className="h-6 w-6" />
      },
      {
        id: 'feedback-collection',
        name: 'Post-Workout Feedback System',
        description: 'Collect member feedback after sessions to improve services and identify satisfaction trends.',
        category: 'support',
        difficulty: 'beginner',
        estimatedSetupTime: 20,
        features: ['Automated surveys', 'Rating collection', 'Feedback analysis', 'Response alerts'],
        icon: <Star className="h-6 w-6" />
      },
      {
        id: 'birthday-campaign',
        name: 'Birthday & Anniversary Campaigns',
        description: 'Celebrate member milestones with personalized messages and special offers to boost loyalty.',
        category: 'marketing',
        difficulty: 'beginner',
        estimatedSetupTime: 15,
        features: ['Birthday greetings', 'Anniversary messages', 'Special offers', 'Milestone tracking'],
        icon: <Heart className="h-6 w-6" />
      },
      {
        id: 'class-booking',
        name: 'Class Booking Notifications',
        description: 'Notify members about available classes, waitlist updates, and booking confirmations.',
        category: 'support',
        difficulty: 'intermediate',
        estimatedSetupTime: 25,
        features: ['Class availability alerts', 'Waitlist notifications', 'Booking confirmations', 'Cancellation handling'],
        icon: <Calendar className="h-6 w-6" />
      }
    ])
  }, [])

  const categories = [
    { id: 'all', name: 'All Templates', count: templates.length },
    { id: 'lead-generation', name: 'Lead Generation', count: templates.filter(t => t.category === 'lead-generation').length },
    { id: 'retention', name: 'Member Retention', count: templates.filter(t => t.category === 'retention').length },
    { id: 'support', name: 'Member Support', count: templates.filter(t => t.category === 'support').length },
    { id: 'marketing', name: 'Marketing', count: templates.filter(t => t.category === 'marketing').length },
    { id: 'sales', name: 'Sales', count: templates.filter(t => t.category === 'sales').length }
  ]

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => t.category === selectedCategory)

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'text-green-400 bg-green-400/10'
      case 'intermediate': return 'text-yellow-400 bg-yellow-400/10'
      case 'advanced': return 'text-red-400 bg-red-400/10'
      default: return 'text-gray-400 bg-gray-400/10'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'lead-generation': return <Target className="h-4 w-4" />
      case 'retention': return <Heart className="h-4 w-4" />
      case 'support': return <MessageSquare className="h-4 w-4" />
      case 'marketing': return <TrendingUp className="h-4 w-4" />
      case 'sales': return <Zap className="h-4 w-4" />
      default: return <Zap className="h-4 w-4" />
    }
  }

  const handleUseTemplate = async (template: WorkflowTemplate) => {
    setIsCloning(true)
    
    // Store template data in localStorage for the builder to use
    const workflowData = getTemplateWorkflowData(template.id)
    localStorage.setItem('workflow_template_data', JSON.stringify({
      templateId: template.id,
      name: template.name,
      ...workflowData
    }))
    
    // Simulate cloning delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    setIsCloning(false)
    router.push(`/automations/builder/new?template=${template.id}`)
  }

  const getTemplateWorkflowData = (templateId: string): WorkflowData => {
    // Mock workflow data for each template
    const templates: Record<string, WorkflowData> = {
      'lead-welcome': {
        nodes: [
          { id: '1', type: 'trigger', position: { x: 100, y: 100 }, data: { label: 'New Lead Added' } },
          { id: '2', type: 'action', position: { x: 300, y: 100 }, data: { label: 'Send Welcome SMS' } },
          { id: '3', type: 'delay', position: { x: 500, y: 100 }, data: { label: 'Wait 1 hour' } },
          { id: '4', type: 'action', position: { x: 700, y: 100 }, data: { label: 'Send Follow-up Email' } }
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3' },
          { id: 'e3-4', source: '3', target: '4' }
        ]
      },
      'trial-nurture': {
        nodes: [
          { id: '1', type: 'trigger', position: { x: 100, y: 100 }, data: { label: 'Trial Started' } },
          { id: '2', type: 'action', position: { x: 300, y: 100 }, data: { label: 'Send Onboarding Email' } },
          { id: '3', type: 'condition', position: { x: 500, y: 100 }, data: { label: 'Check Progress' } },
          { id: '4', type: 'action', position: { x: 700, y: 50 }, data: { label: 'Send Success Tips' } },
          { id: '5', type: 'action', position: { x: 700, y: 150 }, data: { label: 'Send Reminder' } }
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3' },
          { id: 'e3-4', source: '3', target: '4' },
          { id: 'e3-5', source: '3', target: '5' }
        ]
      },
      'default': {
        nodes: [
          { id: '1', type: 'trigger', position: { x: 100, y: 100 }, data: { label: 'Trigger Event' } },
          { id: '2', type: 'action', position: { x: 300, y: 100 }, data: { label: 'Perform Action' } },
          { id: '3', type: 'action', position: { x: 500, y: 100 }, data: { label: 'Send Notification' } }
        ],
        edges: [
          { id: 'e1-2', source: '1', target: '2' },
          { id: 'e2-3', source: '2', target: '3' }
        ]
      }
    }
    
    return templates[templateId] || templates['default']
  }

  const handlePreviewTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template)
    setShowPreviewModal(true)
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Access Restricted</h1>
          <p className="text-gray-300 mb-8">Please sign up to access workflow templates.</p>
          <button 
            onClick={() => router.push('/signup')}
            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-colors"
          >
            {TRIAL_CTA_TEXT}
          </button>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout userData={userData}>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Workflow Templates</h1>
              <p className="text-gray-300">Start with proven automation templates designed for gyms and fitness businesses</p>
            </div>
            <button 
              onClick={() => router.push('/automations/builder/new')}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
            >
              <Zap className="h-4 w-4" />
              Build from Scratch
            </button>
          </div>

          {/* Popular Templates Banner */}
          <div className="bg-gradient-to-r from-orange-500/10 to-purple-500/10 border border-orange-500/20 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="h-5 w-5 text-orange-400" />
              <span className="font-medium text-white">Popular Templates</span>
            </div>
            <p className="text-gray-300 text-sm">
              Get started faster with our most successful automation templates, used by hundreds of gyms worldwide.
            </p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {category.id !== 'all' && getCategoryIcon(category.id)}
                <span>{category.name}</span>
                <span className="bg-gray-600 text-xs px-2 py-1 rounded-full">
                  {category.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="bg-gray-800 rounded-lg border border-gray-700 hover:border-gray-600 transition-colors">
              {template.popular && (
                <div className="bg-orange-500 text-white text-xs font-medium px-3 py-1 rounded-t-lg">
                  Most Popular
                </div>
              )}
              
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="bg-orange-500/20 p-3 rounded-lg">
                    {template.icon}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getDifficultyColor(template.difficulty)}`}>
                      {template.difficulty}
                    </span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-white mb-2">{template.name}</h3>
                <p className="text-gray-400 text-sm mb-4 line-clamp-3">{template.description}</p>

                <div className="mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                    <Clock className="h-4 w-4" />
                    <span>{template.estimatedSetupTime} min setup</span>
                  </div>
                  
                  <div className="space-y-1">
                    {template.features.slice(0, 3).map((feature, index) => (
                      <div key={index} className="flex items-center gap-2 text-sm text-gray-400">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                        <span>{feature}</span>
                      </div>
                    ))}
                    {template.features.length > 3 && (
                      <div className="text-sm text-gray-500">
                        +{template.features.length - 3} more features
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleUseTemplate(template)}
                    disabled={isCloning}
                    className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCloning ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                        Cloning...
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Use Template
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handlePreviewTemplate(template)}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredTemplates.length === 0 && (
          <div className="text-center py-12">
            <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No templates found</h3>
            <p className="text-gray-400">Try selecting a different category or create a custom workflow.</p>
          </div>
        )}

        {/* Custom Template CTA */}
        <div className="bg-gray-800 rounded-lg border border-gray-700 p-8 mt-8 text-center">
          <h3 className="text-xl font-semibold text-white mb-2">Need Something Custom?</h3>
          <p className="text-gray-400 mb-6">
            Can't find the perfect template? Create a custom workflow tailored to your specific business needs.
          </p>
          <div className="flex justify-center gap-4">
            <button 
              onClick={() => router.push('/automations/builder/new')}
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Build Custom Workflow
            </button>
            <button 
              onClick={() => {
                const toast = document.createElement('div')
                toast.className = 'fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg bg-blue-600 text-white'
                toast.innerHTML = `
                  <div class="font-medium">Custom Template Request</div>
                  <div class="text-sm opacity-90">Contact support@atlasfitness.com for custom templates</div>
                `
                document.body.appendChild(toast)
                setTimeout(() => {
                  toast.style.opacity = '0'
                  setTimeout(() => document.body.removeChild(toast), 300)
                }, 3000)
              }}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Request Custom Template
            </button>
          </div>
        </div>

        {/* Preview Modal */}
        {showPreviewModal && selectedTemplate && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">{selectedTemplate.name}</h2>
                  <p className="text-gray-400">{selectedTemplate.description}</p>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Workflow Visualization */}
              <div className="bg-gray-900 rounded-lg p-8 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Workflow Structure</h3>
                <div className="relative h-64 overflow-hidden">
                  {/* Simple workflow visualization */}
                  <div className="flex items-center justify-center h-full">
                    <div className="flex items-center gap-4">
                      <div className="bg-blue-600 p-3 rounded-lg">
                        <Zap className="h-6 w-6 text-white" />
                      </div>
                      <div className="h-0.5 w-16 bg-gray-600"></div>
                      <div className="bg-orange-600 p-3 rounded-lg">
                        <MessageSquare className="h-6 w-6 text-white" />
                      </div>
                      <div className="h-0.5 w-16 bg-gray-600"></div>
                      <div className="bg-green-600 p-3 rounded-lg">
                        <Clock className="h-6 w-6 text-white" />
                      </div>
                      <div className="h-0.5 w-16 bg-gray-600"></div>
                      <div className="bg-purple-600 p-3 rounded-lg">
                        <Mail className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none"></div>
                </div>
              </div>

              {/* Template Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Key Features</h3>
                  <ul className="space-y-2">
                    {selectedTemplate.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-gray-300">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Configuration</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Difficulty</span>
                      <span className="text-white capitalize">{selectedTemplate.difficulty}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Setup Time</span>
                      <span className="text-white">{selectedTemplate.estimatedSetupTime} minutes</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Category</span>
                      <span className="text-white capitalize">{selectedTemplate.category.replace('-', ' ')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowPreviewModal(false)
                    handleUseTemplate(selectedTemplate)
                  }}
                  disabled={isCloning}
                  className="flex-1 flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCloning ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Cloning Template...
                    </>
                  ) : (
                    <>
                      <Copy className="h-5 w-5" />
                      Use This Template
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}