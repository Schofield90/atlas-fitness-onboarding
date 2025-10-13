'use client'

import { useState, useMemo } from 'react'
import {
  Search,
  Filter,
  Copy,
  Eye,
  Star,
  Download,
  Upload,
  Plus,
  Tag as TagIcon,
  Clock,
  Users,
  TrendingUp,
  Layers,
  Zap,
  Calendar,
  MessageSquare,
  AlertCircle,
  Mail,
  Target,
  RefreshCw,
  GitBranch,
  Activity,
  CheckCircle,
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Bookmark,
  Share2,
  Code,
  FileText,
  Sparkles
} from 'lucide-react'

interface WorkflowTemplate {
  id: string
  name: string
  description: string
  longDescription?: string
  category: 'lead_nurture' | 'client_onboarding' | 'retention' | 'sales' | 'marketing' | 'operations' | 'fitness_specific' | 'ai_powered'
  complexity: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
  nodes: any[]
  edges: any[]
  estimatedExecutionTime: string
  usageCount: number
  rating: number
  features: string[]
  previewImage?: string
  author?: string
  createdAt?: string
  updatedAt?: string
  isPremium?: boolean
  isNew?: boolean
  isFavorite?: boolean
  isBookmarked?: boolean
  industries: string[]
  prerequisites?: string[]
  outcomes: string[]
}

const fitnessWorkflowTemplates: WorkflowTemplate[] = [
  {
    id: 'gym-member-welcome',
    name: 'New Gym Member Welcome Journey',
    description: 'Complete onboarding sequence for new gym members with assessment, goal setting, and first session booking.',
    longDescription: 'A comprehensive welcome workflow designed specifically for fitness facilities. This template guides new members through their first 30 days with personalized communication, fitness assessments, goal setting, and automated scheduling of their first personal training session.',
    category: 'fitness_specific',
    complexity: 'intermediate',
    tags: ['gym', 'onboarding', 'assessment', 'pt-booking', 'welcome'],
    estimatedExecutionTime: '7-30 days',
    usageCount: 2100,
    rating: 4.9,
    features: [
      'Automated fitness assessment scheduling',
      'Personalized goal setting questionnaire',
      'PT session booking integration',
      'Progress tracking setup',
      'Welcome package delivery scheduling',
      'Community group introductions'
    ],
    author: 'Atlas Fitness Team',
    createdAt: '2024-01-15',
    updatedAt: '2024-02-01',
    isNew: true,
    industries: ['Fitness', 'Wellness', 'Health Clubs'],
    prerequisites: ['Booking system integration', 'Member management system'],
    outcomes: [
      '40% increase in member retention',
      '60% more PT session bookings',
      '50% faster member activation'
    ],
    nodes: [
      {
        id: 'trigger_1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'New Member Registration',
          config: { subtype: 'lead_trigger', source: 'membership_signup' }
        }
      },
      {
        id: 'action_1',
        type: 'action',
        position: { x: 300, y: 100 },
        data: {
          label: 'Send Welcome Email',
          actionType: 'send_email',
          config: { templateId: 'gym-welcome', priority: 'high' }
        }
      },
      {
        id: 'wait_1',
        type: 'wait',
        position: { x: 500, y: 100 },
        data: {
          label: 'Wait 2 Hours',
          config: { waitType: 'duration', duration: { value: 2, unit: 'hours' } }
        }
      },
      {
        id: 'action_2',
        type: 'action',
        position: { x: 700, y: 100 },
        data: {
          label: 'Schedule Fitness Assessment',
          actionType: 'create_task',
          config: { taskTitle: 'Book fitness assessment', priority: 'high' }
        }
      },
      {
        id: 'condition_1',
        type: 'condition',
        position: { x: 500, y: 250 },
        data: {
          label: 'Assessment Completed?',
          config: { conditionType: 'field_comparison', field: 'assessment_status', operator: 'equals', value: 'completed' }
        }
      },
      {
        id: 'action_3',
        type: 'action',
        position: { x: 300, y: 400 },
        data: {
          label: 'Send Goal Setting Form',
          actionType: 'send_email',
          config: { templateId: 'goal-setting-form' }
        }
      },
      {
        id: 'action_4',
        type: 'action',
        position: { x: 700, y: 400 },
        data: {
          label: 'Offer PT Consultation',
          actionType: 'send_whatsapp',
          config: { templateId: 'pt-consultation-offer' }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'trigger_1', target: 'action_1' },
      { id: 'e2', source: 'action_1', target: 'wait_1' },
      { id: 'e3', source: 'wait_1', target: 'action_2' },
      { id: 'e4', source: 'action_2', target: 'condition_1' },
      { id: 'e5', source: 'condition_1', target: 'action_3', sourceHandle: 'true' },
      { id: 'e6', source: 'condition_1', target: 'action_4', sourceHandle: 'true' }
    ]
  },
  {
    id: 'class-no-show-recovery',
    name: 'Class No-Show Recovery Campaign',
    description: 'Automated follow-up sequence for members who miss their booked fitness classes.',
    longDescription: 'Reduce no-shows and re-engage members who miss their fitness classes. This workflow automatically detects missed classes and initiates a caring follow-up sequence to understand barriers and offer solutions.',
    category: 'retention',
    complexity: 'intermediate',
    tags: ['no-show', 'retention', 'classes', 'engagement', 'recovery'],
    estimatedExecutionTime: '3-7 days',
    usageCount: 1800,
    rating: 4.7,
    features: [
      'Automatic no-show detection',
      'Personalized follow-up messages',
      'Barrier identification survey',
      'Alternative class suggestions',
      'Reschedule automation',
      'Personal trainer recommendations'
    ],
    author: 'Retention Specialists',
    createdAt: '2024-01-20',
    industries: ['Fitness Studios', 'Group Fitness', 'Boutique Gyms'],
    outcomes: [
      '35% reduction in repeat no-shows',
      '25% increase in class rebookings',
      '20% improvement in member satisfaction'
    ],
    nodes: [
      {
        id: 'trigger_1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'Class No-Show Detected',
          config: { subtype: 'missed_session' }
        }
      },
      {
        id: 'wait_1',
        type: 'wait',
        position: { x: 300, y: 100 },
        data: {
          label: 'Wait 2 Hours',
          config: { waitType: 'duration', duration: { value: 2, unit: 'hours' } }
        }
      },
      {
        id: 'action_1',
        type: 'action',
        position: { x: 500, y: 100 },
        data: {
          label: 'Send Caring Check-in',
          actionType: 'send_sms',
          config: { message: 'Hi {{contact.firstName}}! We missed you in {{class.name}} today. Everything okay? 💪' }
        }
      },
      {
        id: 'condition_1',
        type: 'condition',
        position: { x: 700, y: 100 },
        data: {
          label: 'Member Responded?',
          config: { conditionType: 'activity', activityType: 'sms_replied', timeframe: { value: 4, unit: 'hours' } }
        }
      },
      {
        id: 'action_2',
        type: 'action',
        position: { x: 900, y: 50 },
        data: {
          label: 'Thank & Reschedule',
          actionType: 'send_whatsapp',
          config: { message: 'Thanks for letting us know! Would you like to book another class?' }
        }
      },
      {
        id: 'action_3',
        type: 'action',
        position: { x: 900, y: 150 },
        data: {
          label: 'Send Barrier Survey',
          actionType: 'send_email',
          config: { templateId: 'class-barrier-survey' }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'trigger_1', target: 'wait_1' },
      { id: 'e2', source: 'wait_1', target: 'action_1' },
      { id: 'e3', source: 'action_1', target: 'condition_1' },
      { id: 'e4', source: 'condition_1', target: 'action_2', sourceHandle: 'true' },
      { id: 'e5', source: 'condition_1', target: 'action_3', sourceHandle: 'false' }
    ]
  },
  {
    id: 'ai-personal-training-lead',
    name: 'AI-Powered Personal Training Lead Conversion',
    description: 'Intelligent lead qualification and conversion system for personal training services using AI analysis.',
    longDescription: 'Leverage AI to analyze member behavior, fitness goals, and engagement patterns to identify high-potential personal training leads and automatically initiate personalized outreach campaigns.',
    category: 'ai_powered',
    complexity: 'advanced',
    tags: ['ai', 'personal-training', 'lead-conversion', 'behavioral-analysis', 'smart-targeting'],
    estimatedExecutionTime: '2-14 days',
    usageCount: 950,
    rating: 4.8,
    isPremium: true,
    isNew: true,
    features: [
      'AI behavior analysis',
      'Automated lead scoring',
      'Personalized outreach timing',
      'Dynamic content generation',
      'Conversion prediction',
      'A/B testing automation'
    ],
    author: 'AI Development Team',
    createdAt: '2024-02-10',
    industries: ['Premium Gyms', 'Personal Training Studios', 'Wellness Centers'],
    prerequisites: ['AI analysis tools', 'Member behavior data', 'CRM integration'],
    outcomes: [
      '80% increase in PT lead conversion',
      '45% more qualified consultations',
      '60% reduction in sales cycle time'
    ],
    nodes: [
      {
        id: 'trigger_1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'Member Activity Analysis',
          config: { subtype: 'ai_trigger', analysisType: 'behavioral_pattern' }
        }
      },
      {
        id: 'ai_1',
        type: 'ai_node',
        position: { x: 300, y: 100 },
        data: {
          label: 'AI Lead Scoring',
          config: { 
            aiType: 'analysis',
            model: 'gpt-4',
            prompt: 'Analyze member fitness behavior and score PT readiness'
          }
        }
      },
      {
        id: 'condition_1',
        type: 'condition',
        position: { x: 500, y: 100 },
        data: {
          label: 'High PT Potential?',
          config: { conditionType: 'lead_score', operator: 'greater_than', value: 75 }
        }
      },
      {
        id: 'ai_2',
        type: 'ai_node',
        position: { x: 700, y: 50 },
        data: {
          label: 'Generate Personalized Message',
          config: {
            aiType: 'content',
            model: 'gpt-4',
            prompt: 'Create personalized PT outreach based on member goals and behavior'
          }
        }
      },
      {
        id: 'action_1',
        type: 'action',
        position: { x: 900, y: 50 },
        data: {
          label: 'Send AI-Generated Outreach',
          actionType: 'send_email',
          config: { mode: 'ai_generated', priority: 'high' }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'trigger_1', target: 'ai_1' },
      { id: 'e2', source: 'ai_1', target: 'condition_1' },
      { id: 'e3', source: 'condition_1', target: 'ai_2', sourceHandle: 'true' },
      { id: 'e4', source: 'ai_2', target: 'action_1' }
    ]
  },
  {
    id: 'membership-renewal-campaign',
    name: 'Smart Membership Renewal Campaign',
    description: 'Automated renewal campaign with early bird incentives, payment reminders, and win-back sequences.',
    longDescription: 'Maximize membership renewals with a comprehensive campaign that starts 60 days before expiration. Includes early bird offers, payment reminders, and win-back sequences for lapsed members.',
    category: 'retention',
    complexity: 'advanced',
    tags: ['membership', 'renewal', 'retention', 'payment', 'win-back'],
    estimatedExecutionTime: '60-90 days',
    usageCount: 1650,
    rating: 4.6,
    features: [
      '60-day renewal campaign',
      'Early bird discount automation',
      'Payment failure handling',
      'Win-back sequences',
      'Loyalty program integration',
      'Referral incentives'
    ],
    industries: ['Gyms', 'Fitness Clubs', 'Wellness Centers'],
    outcomes: [
      '25% increase in renewal rate',
      '15% higher customer lifetime value',
      '30% reduction in churn'
    ],
    nodes: [
      {
        id: 'trigger_1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'Membership Expiring Soon',
          config: { subtype: 'custom_date_trigger', daysBeforeExpiry: 60 }
        }
      },
      {
        id: 'action_1',
        type: 'action',
        position: { x: 300, y: 100 },
        data: {
          label: 'Send Early Bird Offer',
          actionType: 'send_email',
          config: { templateId: 'early-bird-renewal' }
        }
      },
      {
        id: 'wait_1',
        type: 'wait',
        position: { x: 500, y: 100 },
        data: {
          label: 'Wait 14 Days',
          config: { waitType: 'duration', duration: { value: 14, unit: 'days' } }
        }
      },
      {
        id: 'condition_1',
        type: 'condition',
        position: { x: 700, y: 100 },
        data: {
          label: 'Renewed?',
          config: { conditionType: 'field_comparison', field: 'membership_status', operator: 'equals', value: 'renewed' }
        }
      },
      {
        id: 'action_2',
        type: 'action',
        position: { x: 900, y: 50 },
        data: {
          label: 'Send Thank You',
          actionType: 'send_whatsapp',
          config: { message: 'Thanks for renewing! Here\'s your member perks update 🎉' }
        }
      },
      {
        id: 'loop_1',
        type: 'loop',
        position: { x: 900, y: 150 },
        data: {
          label: 'Renewal Reminders',
          config: { loopType: 'count', maxIterations: 3 }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'trigger_1', target: 'action_1' },
      { id: 'e2', source: 'action_1', target: 'wait_1' },
      { id: 'e3', source: 'wait_1', target: 'condition_1' },
      { id: 'e4', source: 'condition_1', target: 'action_2', sourceHandle: 'true' },
      { id: 'e5', source: 'condition_1', target: 'loop_1', sourceHandle: 'false' }
    ]
  }
]

// Combine with original templates
const allTemplates = [...fitnessWorkflowTemplates]

interface TemplatePreviewProps {
  template: WorkflowTemplate
  onClose: () => void
  onSelect: () => void
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({ template, onClose, onSelect }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'workflow' | 'code'>('overview')

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{template.name}</h2>
            <p className="text-gray-600 mt-1">{template.description}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <div className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview', icon: Eye },
              { id: 'workflow', label: 'Workflow', icon: GitBranch },
              { id: 'code', label: 'Code', icon: Code }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 py-4 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Left Column */}
              <div className="space-y-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Description</h3>
                  <p className="text-gray-700 leading-relaxed">
                    {template.longDescription || template.description}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Key Features</h3>
                  <ul className="space-y-2">
                    {template.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-700">
                        <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Expected Outcomes</h3>
                  <ul className="space-y-2">
                    {template.outcomes.map((outcome, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-700">
                        <TrendingUp className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" />
                        {outcome}
                      </li>
                    ))}
                  </ul>
                </div>

                {template.prerequisites && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Prerequisites</h3>
                    <ul className="space-y-2">
                      {template.prerequisites.map((prereq, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-700">
                          <AlertCircle className="w-4 h-4 text-orange-500 mr-2 flex-shrink-0" />
                          {prereq}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600">Complexity</div>
                    <div className={`font-medium capitalize ${
                      template.complexity === 'beginner' ? 'text-green-600' :
                      template.complexity === 'intermediate' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {template.complexity}
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600">Execution Time</div>
                    <div className="font-medium text-gray-900">{template.estimatedExecutionTime}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600">Usage Count</div>
                    <div className="font-medium text-gray-900">{template.usageCount.toLocaleString()}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600">Rating</div>
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                      <span className="font-medium text-gray-900">{template.rating}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Tags</h3>
                  <div className="flex flex-wrap gap-2">
                    {template.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Industries</h3>
                  <div className="flex flex-wrap gap-2">
                    {template.industries.map(industry => (
                      <span
                        key={industry}
                        className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                      >
                        {industry}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">Workflow Stats</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Nodes:</span>
                      <span className="font-medium">{template.nodes.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Connections:</span>
                      <span className="font-medium">{template.edges.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Node Types:</span>
                      <span className="font-medium">
                        {Array.from(new Set(template.nodes.map(n => n.type))).length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'workflow' && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Workflow Structure</h3>
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="text-sm text-gray-600 mb-4">
                  This workflow contains {template.nodes.length} nodes and {template.edges.length} connections.
                </div>
                <div className="space-y-4">
                  {template.nodes.map((node, index) => (
                    <div key={node.id} className="flex items-center space-x-4 bg-white rounded-lg p-3 border">
                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{node.data.label}</div>
                        <div className="text-sm text-gray-500 capitalize">{node.type} node</div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {node.data.actionType || node.data.config?.subtype || node.type}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'code' && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-4">Template Code</h3>
              <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-auto text-sm">
                {JSON.stringify({ nodes: template.nodes, edges: template.edges }, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-4">
            {template.author && (
              <div className="text-sm text-gray-600">
                Created by <span className="font-medium">{template.author}</span>
              </div>
            )}
            {template.isPremium && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full flex items-center">
                <Star className="w-3 h-3 mr-1" />
                Premium
              </span>
            )}
          </div>

          <div className="flex items-center space-x-3">
            <button
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
            <button
              onClick={onSelect}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Copy className="w-4 h-4" />
              <span>Use This Template</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

interface EnhancedWorkflowTemplatesProps {
  onClose: () => void
  onSelectTemplate: (template: WorkflowTemplate) => void
}

export default function EnhancedWorkflowTemplates({ 
  onClose, 
  onSelectTemplate 
}: EnhancedWorkflowTemplatesProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedComplexity, setSelectedComplexity] = useState<string>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set())
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'rating' | 'name'>('popular')

  const categories = [
    { value: 'all', label: 'All Categories', icon: Layers },
    { value: 'fitness_specific', label: 'Fitness Specific', icon: Activity },
    { value: 'lead_nurture', label: 'Lead Nurturing', icon: Users },
    { value: 'client_onboarding', label: 'Client Onboarding', icon: Target },
    { value: 'retention', label: 'Retention', icon: RefreshCw },
    { value: 'sales', label: 'Sales', icon: TrendingUp },
    { value: 'marketing', label: 'Marketing', icon: MessageSquare },
    { value: 'operations', label: 'Operations', icon: Zap },
    { value: 'ai_powered', label: 'AI-Powered', icon: Sparkles }
  ]

  const complexityLevels = [
    { value: 'all', label: 'All Levels' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ]

  const filteredAndSortedTemplates = useMemo(() => {
    let filtered = allTemplates.filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
      const matchesComplexity = selectedComplexity === 'all' || template.complexity === selectedComplexity
      
      return matchesSearch && matchesCategory && matchesComplexity
    })

    // Sort templates
    switch (sortBy) {
      case 'popular':
        filtered = filtered.sort((a, b) => b.usageCount - a.usageCount)
        break
      case 'recent':
        filtered = filtered.sort((a, b) => 
          new Date(b.updatedAt || b.createdAt || '').getTime() - 
          new Date(a.updatedAt || a.createdAt || '').getTime()
        )
        break
      case 'rating':
        filtered = filtered.sort((a, b) => b.rating - a.rating)
        break
      case 'name':
        filtered = filtered.sort((a, b) => a.name.localeCompare(b.name))
        break
    }

    return filtered
  }, [searchTerm, selectedCategory, selectedComplexity, sortBy])

  const toggleFavorite = (templateId: string) => {
    const newFavorites = new Set(favorites)
    if (newFavorites.has(templateId)) {
      newFavorites.delete(templateId)
    } else {
      newFavorites.add(templateId)
    }
    setFavorites(newFavorites)
  }

  const toggleBookmark = (templateId: string) => {
    const newBookmarks = new Set(bookmarks)
    if (newBookmarks.has(templateId)) {
      newBookmarks.delete(templateId)
    } else {
      newBookmarks.add(templateId)
    }
    setBookmarks(newBookmarks)
  }

  const handleSelectTemplate = (template: WorkflowTemplate) => {
    onSelectTemplate(template)
    onClose()
  }

  const handlePreviewTemplate = (template: WorkflowTemplate) => {
    setSelectedTemplate(template)
    setShowPreview(true)
  }

  return (
    <>
      <div className="flex flex-col h-full bg-gray-900 text-white">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Workflow Templates</h2>
              <p className="text-gray-400 mt-1">
                Choose from {allTemplates.length} pre-built workflows designed for fitness businesses
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>
            
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
            
            <select
              value={selectedComplexity}
              onChange={(e) => setSelectedComplexity(e.target.value)}
              className="px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              {complexityLevels.map(level => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              <option value="popular">Most Popular</option>
              <option value="recent">Most Recent</option>
              <option value="rating">Highest Rated</option>
              <option value="name">Name A-Z</option>
            </select>
          </div>
        </div>

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredAndSortedTemplates.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">No templates found matching your criteria</div>
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategory('all')
                  setSelectedComplexity('all')
                }}
                className="text-purple-400 hover:text-purple-300"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAndSortedTemplates.map(template => (
                <div
                  key={template.id}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-purple-500 transition-all group"
                >
                  {/* Template Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                          {template.name}
                        </h3>
                        {template.isNew && (
                          <span className="px-2 py-1 bg-green-500 text-white text-xs rounded-full">
                            NEW
                          </span>
                        )}
                        {template.isPremium && (
                          <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        )}
                      </div>
                      <p className="text-gray-400 text-sm leading-relaxed">
                        {template.description}
                      </p>
                    </div>
                    
                    <div className="flex flex-col items-center space-y-2 ml-4">
                      <button
                        onClick={() => toggleFavorite(template.id)}
                        className={`p-1 rounded hover:bg-gray-700 ${
                          favorites.has(template.id) ? 'text-red-400' : 'text-gray-500'
                        }`}
                      >
                        <Heart className={`w-4 h-4 ${favorites.has(template.id) ? 'fill-current' : ''}`} />
                      </button>
                      <button
                        onClick={() => toggleBookmark(template.id)}
                        className={`p-1 rounded hover:bg-gray-700 ${
                          bookmarks.has(template.id) ? 'text-blue-400' : 'text-gray-500'
                        }`}
                      >
                        <Bookmark className={`w-4 h-4 ${bookmarks.has(template.id) ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {/* Template Stats */}
                  <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 text-yellow-400 fill-current" />
                        <span>{template.rating}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        <span>{template.usageCount.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>{template.estimatedExecutionTime}</span>
                      </div>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs ${
                      template.complexity === 'beginner' ? 'bg-green-900 text-green-300' :
                      template.complexity === 'intermediate' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-red-900 text-red-300'
                    }`}>
                      {template.complexity}
                    </div>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {template.tags.slice(0, 3).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                    {template.tags.length > 3 && (
                      <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                        +{template.tags.length - 3}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePreviewTemplate(template)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </button>
                    <button
                      onClick={() => handleSelectTemplate(template)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors text-sm"
                    >
                      <Copy className="w-4 h-4" />
                      Use Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Template Preview Modal */}
      {showPreview && selectedTemplate && (
        <TemplatePreview
          template={selectedTemplate}
          onClose={() => {
            setShowPreview(false)
            setSelectedTemplate(null)
          }}
          onSelect={() => handleSelectTemplate(selectedTemplate)}
        />
      )}
    </>
  )
}