'use client'

import React, { useState, useMemo } from 'react'
import { Search, ChevronDown, ChevronRight, Info, Star } from 'lucide-react'
import {
  Zap,
  Mail,
  MessageSquare,
  Clock,
  Filter,
  Repeat,
  GitBranch,
  Merge,
  Transform,
  Users,
  Calendar,
  Tag,
  Webhook,
  Phone,
  MailOpen,
  Target,
  TrendingUp,
  Reply,
  ClipboardCheck,
  FileText,
  StickyNote,
  Bell,
  MessageCircle,
  Database,
  Code,
  Brain,
  Sparkles,
  Activity,
  Workflow,
  XCircle,
  CheckCircle,
  Settings,
  Plus,
  Layers
} from 'lucide-react'

interface NodeTemplate {
  id: string
  type: string
  subtype?: string
  actionType?: string
  category: string
  name: string
  description: string
  icon: React.ComponentType<any>
  tags: string[]
  complexity: 'beginner' | 'intermediate' | 'advanced'
  isPremium?: boolean
  isNew?: boolean
  defaultConfig?: Record<string, any>
  examples?: string[]
}

const nodeTemplates: NodeTemplate[] = [
  // TRIGGERS
  {
    id: 'lead-trigger',
    type: 'trigger',
    subtype: 'lead_trigger',
    category: 'triggers',
    name: 'New Lead',
    description: 'Triggers when a new lead is created',
    icon: Users,
    tags: ['leads', 'crm', 'contacts'],
    complexity: 'beginner',
    examples: ['Welcome new leads', 'Lead qualification', 'Initial outreach']
  },
  {
    id: 'birthday-trigger',
    type: 'trigger',
    subtype: 'birthday_trigger',
    category: 'triggers',
    name: 'Birthday',
    description: 'Triggers on contact birthdays',
    icon: Calendar,
    tags: ['birthday', 'celebration', 'personal'],
    complexity: 'beginner',
    examples: ['Birthday wishes', 'Special offers', 'Personal touch']
  },
  {
    id: 'contact-tagged',
    type: 'trigger',
    subtype: 'contact_tagged',
    category: 'triggers',
    name: 'Contact Tagged',
    description: 'Triggers when a contact is tagged',
    icon: Tag,
    tags: ['tags', 'segmentation', 'organization'],
    complexity: 'beginner',
    examples: ['VIP treatment', 'Segment-based campaigns', 'Targeted messaging']
  },
  {
    id: 'webhook-trigger',
    type: 'trigger',
    subtype: 'webhook_received',
    category: 'triggers',
    name: 'Webhook',
    description: 'Triggers from external webhooks',
    icon: Webhook,
    tags: ['integration', 'api', 'external'],
    complexity: 'intermediate',
    examples: ['Form submissions', 'Payment notifications', 'External events']
  },
  {
    id: 'email-event',
    type: 'trigger',
    subtype: 'email_event',
    category: 'triggers',
    name: 'Email Event',
    description: 'Triggers on email interactions',
    icon: MailOpen,
    tags: ['email', 'engagement', 'tracking'],
    complexity: 'intermediate',
    examples: ['Email opened', 'Link clicked', 'Reply received']
  },
  {
    id: 'appointment-trigger',
    type: 'trigger',
    subtype: 'appointment_status',
    category: 'triggers',
    name: 'Appointment',
    description: 'Triggers on appointment changes',
    icon: Calendar,
    tags: ['appointments', 'scheduling', 'calendar'],
    complexity: 'intermediate',
    examples: ['Booking confirmations', 'Cancellation handling', 'Reminders']
  },
  {
    id: 'booking-confirmed',
    type: 'trigger',
    subtype: 'booking_confirmed',
    category: 'triggers',
    name: 'Booking Confirmed',
    description: 'Triggers when a booking is confirmed',
    icon: CheckCircle,
    tags: ['booking', 'fitness', 'confirmation'],
    complexity: 'beginner',
    isNew: true,
    examples: ['Welcome sequence', 'Preparation tips', 'What to expect']
  },
  {
    id: 'missed-session',
    type: 'trigger',
    subtype: 'missed_session',
    category: 'triggers',
    name: 'Missed Session',
    description: 'Triggers when client misses a session',
    icon: XCircle,
    tags: ['booking', 'fitness', 'retention'],
    complexity: 'intermediate',
    examples: ['Re-engagement', 'Reschedule offers', 'Check-in messages']
  },

  // ACTIONS - Communication
  {
    id: 'send-email',
    type: 'action',
    actionType: 'send_email',
    category: 'communication',
    name: 'Send Email',
    description: 'Send personalized emails',
    icon: Mail,
    tags: ['email', 'communication', 'marketing'],
    complexity: 'beginner',
    examples: ['Welcome emails', 'Newsletters', 'Follow-ups']
  },
  {
    id: 'send-sms',
    type: 'action',
    actionType: 'send_sms',
    category: 'communication',
    name: 'Send SMS',
    description: 'Send SMS messages',
    icon: MessageSquare,
    tags: ['sms', 'mobile', 'quick'],
    complexity: 'beginner',
    examples: ['Appointment reminders', 'Quick updates', 'Urgent notifications']
  },
  {
    id: 'send-whatsapp',
    type: 'action',
    actionType: 'send_whatsapp',
    category: 'communication',
    name: 'Send WhatsApp',
    description: 'Send WhatsApp messages',
    icon: MessageCircle,
    tags: ['whatsapp', 'messaging', 'instant'],
    complexity: 'intermediate',
    examples: ['Personal messaging', 'Rich media', 'Interactive buttons']
  },
  {
    id: 'make-call',
    type: 'action',
    actionType: 'make_call',
    category: 'communication',
    name: 'Make Call',
    description: 'Initiate phone calls',
    icon: Phone,
    tags: ['phone', 'voice', 'personal'],
    complexity: 'advanced',
    isPremium: true,
    examples: ['Sales calls', 'Follow-ups', 'Urgent contact']
  },

  // ACTIONS - CRM
  {
    id: 'update-contact',
    type: 'action',
    actionType: 'update_contact',
    category: 'crm',
    name: 'Update Contact',
    description: 'Update contact information',
    icon: Users,
    tags: ['crm', 'data', 'contacts'],
    complexity: 'beginner',
    examples: ['Add tags', 'Update status', 'Set custom fields']
  },
  {
    id: 'create-task',
    type: 'action',
    actionType: 'create_task',
    category: 'crm',
    name: 'Create Task',
    description: 'Create follow-up tasks',
    icon: ClipboardCheck,
    tags: ['tasks', 'follow-up', 'productivity'],
    complexity: 'beginner',
    examples: ['Follow-up reminders', 'Action items', 'Team assignments']
  },
  {
    id: 'add-note',
    type: 'action',
    actionType: 'add_note',
    category: 'crm',
    name: 'Add Note',
    description: 'Add notes to contact',
    icon: StickyNote,
    tags: ['notes', 'documentation', 'history'],
    complexity: 'beginner',
    examples: ['Interaction logs', 'Important info', 'Follow-up notes']
  },
  {
    id: 'create-opportunity',
    type: 'action',
    actionType: 'create_opportunity',
    category: 'crm',
    name: 'Create Opportunity',
    description: 'Create sales opportunities',
    icon: Target,
    tags: ['sales', 'opportunity', 'pipeline'],
    complexity: 'intermediate',
    examples: ['Qualified leads', 'Sales pipeline', 'Deal tracking']
  },

  // ACTIONS - Data & Integration
  {
    id: 'webhook-action',
    type: 'action',
    actionType: 'webhook',
    category: 'integration',
    name: 'Send Webhook',
    description: 'Send data to external systems',
    icon: Webhook,
    tags: ['webhook', 'integration', 'api'],
    complexity: 'advanced',
    examples: ['CRM sync', 'External notifications', 'Third-party integration']
  },
  {
    id: 'api-call',
    type: 'action',
    actionType: 'api_call',
    category: 'integration',
    name: 'API Call',
    description: 'Make custom API calls',
    icon: Code,
    tags: ['api', 'custom', 'integration'],
    complexity: 'advanced',
    isPremium: true,
    examples: ['Custom integrations', 'Data fetching', 'External processing']
  },
  {
    id: 'database-query',
    type: 'action',
    actionType: 'database',
    category: 'data',
    name: 'Database Query',
    description: 'Query database for information',
    icon: Database,
    tags: ['database', 'query', 'data'],
    complexity: 'advanced',
    isPremium: true,
    examples: ['Data lookup', 'Custom reports', 'Analytics queries']
  },

  // LOGIC & CONTROL
  {
    id: 'condition',
    type: 'condition',
    category: 'logic',
    name: 'If/Then/Else',
    description: 'Branch workflow based on conditions',
    icon: Filter,
    tags: ['condition', 'logic', 'branching'],
    complexity: 'beginner',
    examples: ['Lead scoring', 'Segmentation', 'Personalization']
  },
  {
    id: 'wait-delay',
    type: 'wait',
    category: 'logic',
    name: 'Wait/Delay',
    description: 'Wait before next action',
    icon: Clock,
    tags: ['delay', 'timing', 'pause'],
    complexity: 'beginner',
    examples: ['Follow-up delays', 'Drip campaigns', 'Timing optimization']
  },
  {
    id: 'loop',
    type: 'loop',
    category: 'logic',
    name: 'Loop',
    description: 'Repeat actions multiple times',
    icon: Repeat,
    tags: ['loop', 'iteration', 'repeat'],
    complexity: 'intermediate',
    examples: ['Drip sequences', 'Recurring tasks', 'Multi-step processes']
  },
  {
    id: 'parallel',
    type: 'parallel',
    category: 'logic',
    name: 'Parallel',
    description: 'Execute multiple branches simultaneously',
    icon: GitBranch,
    tags: ['parallel', 'concurrent', 'multi-path'],
    complexity: 'intermediate',
    examples: ['Multi-channel campaigns', 'Concurrent processing', 'A/B testing']
  },
  {
    id: 'merge',
    type: 'merge',
    category: 'logic',
    name: 'Merge',
    description: 'Combine multiple workflow paths',
    icon: Merge,
    tags: ['merge', 'combine', 'join'],
    complexity: 'intermediate',
    examples: ['Path convergence', 'Data combining', 'Unified processing']
  },

  // AI & ADVANCED
  {
    id: 'ai-decision',
    type: 'ai_node',
    category: 'ai',
    name: 'AI Decision',
    description: 'Make intelligent decisions using AI',
    icon: Brain,
    tags: ['ai', 'decision', 'intelligent'],
    complexity: 'advanced',
    isPremium: true,
    isNew: true,
    examples: ['Lead scoring', 'Content personalization', 'Smart routing']
  },
  {
    id: 'ai-content',
    type: 'ai_node',
    category: 'ai',
    name: 'AI Content',
    description: 'Generate content using AI',
    icon: Sparkles,
    tags: ['ai', 'content', 'generation'],
    complexity: 'advanced',
    isPremium: true,
    isNew: true,
    examples: ['Email personalization', 'Dynamic content', 'Smart responses']
  },
  {
    id: 'ai-analysis',
    type: 'ai_node',
    category: 'ai',
    name: 'AI Analysis',
    description: 'Analyze data with AI',
    icon: Activity,
    tags: ['ai', 'analysis', 'insights'],
    complexity: 'advanced',
    isPremium: true,
    examples: ['Sentiment analysis', 'Behavior prediction', 'Risk assessment']
  },
  {
    id: 'transform',
    type: 'transform',
    category: 'data',
    name: 'Transform Data',
    description: 'Transform and manipulate data',
    icon: Transform,
    tags: ['transform', 'data', 'manipulation'],
    complexity: 'intermediate',
    examples: ['Format conversion', 'Data cleaning', 'Field mapping']
  },
  {
    id: 'sub-workflow',
    type: 'sub_workflow',
    category: 'advanced',
    name: 'Sub-workflow',
    description: 'Execute another workflow',
    icon: Workflow,
    tags: ['workflow', 'modular', 'reusable'],
    complexity: 'advanced',
    examples: ['Reusable processes', 'Complex workflows', 'Modular design']
  }
]

const categories = [
  { id: 'triggers', name: 'Triggers', icon: Zap, description: 'Start your workflows' },
  { id: 'communication', name: 'Communication', icon: MessageSquare, description: 'Send messages' },
  { id: 'crm', name: 'CRM Actions', icon: Users, description: 'Manage contacts' },
  { id: 'logic', name: 'Logic & Control', icon: Filter, description: 'Control workflow flow' },
  { id: 'data', name: 'Data', icon: Database, description: 'Process and transform data' },
  { id: 'integration', name: 'Integration', icon: Webhook, description: 'Connect external systems' },
  { id: 'ai', name: 'AI & Smart', icon: Brain, description: 'Intelligent automation' },
  { id: 'advanced', name: 'Advanced', icon: Settings, description: 'Advanced features' }
]

interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, template: NodeTemplate) => void
  className?: string
}

export default function NodePalette({ onDragStart, className = '' }: NodePaletteProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [selectedComplexity, setSelectedComplexity] = useState<string>('all')
  const [showPremiumOnly, setShowPremiumOnly] = useState(false)

  const filteredTemplates = useMemo(() => {
    return nodeTemplates.filter(template => {
      // Search filter
      const searchMatch = !searchTerm || 
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))

      // Category filter
      const categoryMatch = selectedCategory === 'all' || template.category === selectedCategory

      // Complexity filter
      const complexityMatch = selectedComplexity === 'all' || template.complexity === selectedComplexity

      // Premium filter
      const premiumMatch = !showPremiumOnly || template.isPremium

      return searchMatch && categoryMatch && complexityMatch && premiumMatch
    })
  }, [searchTerm, selectedCategory, selectedComplexity, showPremiumOnly])

  const templatesByCategory = useMemo(() => {
    const grouped: Record<string, NodeTemplate[]> = {}
    
    if (selectedCategory === 'all') {
      categories.forEach(cat => {
        grouped[cat.id] = filteredTemplates.filter(t => t.category === cat.id)
      })
    } else {
      grouped[selectedCategory] = filteredTemplates
    }
    
    return grouped
  }, [filteredTemplates, selectedCategory])

  const toggleCategory = (categoryId: string) => {
    const newCollapsed = new Set(collapsedCategories)
    if (newCollapsed.has(categoryId)) {
      newCollapsed.delete(categoryId)
    } else {
      newCollapsed.add(categoryId)
    }
    setCollapsedCategories(newCollapsed)
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'beginner': return 'text-green-400'
      case 'intermediate': return 'text-yellow-400'
      case 'advanced': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getComplexityDots = (complexity: string) => {
    const count = complexity === 'beginner' ? 1 : complexity === 'intermediate' ? 2 : 3
    return Array.from({ length: 3 }, (_, i) => (
      <div
        key={i}
        className={`w-2 h-2 rounded-full ${
          i < count ? getComplexityColor(complexity).replace('text-', 'bg-') : 'bg-gray-600'
        }`}
      />
    ))
  }

  return (
    <div className={`bg-gray-50 border-r border-gray-200 flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-3">Workflow Nodes</h3>
        
        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
          />
        </div>

        {/* Filters */}
        <div className="space-y-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select
            value={selectedComplexity}
            onChange={(e) => setSelectedComplexity(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 text-sm"
          >
            <option value="all">All Levels</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          <label className="flex items-center text-sm text-gray-600">
            <input
              type="checkbox"
              checked={showPremiumOnly}
              onChange={(e) => setShowPremiumOnly(e.target.checked)}
              className="mr-2"
            />
            Premium only
          </label>
        </div>
      </div>

      {/* Node Categories */}
      <div className="flex-1 overflow-y-auto">
        {Object.entries(templatesByCategory).map(([categoryId, templates]) => {
          if (templates.length === 0) return null
          
          const category = categories.find(c => c.id === categoryId)
          if (!category) return null
          
          const isCollapsed = collapsedCategories.has(categoryId)
          const CategoryIcon = category.icon

          return (
            <div key={categoryId} className="mb-2">
              <button
                onClick={() => toggleCategory(categoryId)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center">
                  <CategoryIcon className="w-4 h-4 text-gray-600 mr-2" />
                  <span className="font-medium text-gray-900">{category.name}</span>
                  <span className="ml-2 text-xs text-gray-500">({templates.length})</span>
                </div>
                {isCollapsed ? 
                  <ChevronRight className="w-4 h-4 text-gray-400" /> :
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                }
              </button>
              
              {!isCollapsed && (
                <div className="pb-2">
                  {templates.map((template) => {
                    const IconComponent = template.icon
                    
                    return (
                      <div
                        key={template.id}
                        draggable
                        onDragStart={(e) => onDragStart(e, template)}
                        className="mx-3 mb-2 p-3 bg-white rounded-lg border border-gray-200 cursor-move hover:border-blue-300 hover:shadow-sm transition-all group relative"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center">
                            <IconComponent className="w-4 h-4 text-gray-600 mr-2 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-gray-900 flex items-center">
                                {template.name}
                                {template.isNew && (
                                  <span className="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                                    NEW
                                  </span>
                                )}
                                {template.isPremium && (
                                  <Star className="ml-1 w-3 h-3 text-yellow-500" />
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {template.description}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Complexity indicator */}
                        <div className="flex items-center justify-between">
                          <div className="flex gap-1">
                            {getComplexityDots(template.complexity)}
                          </div>
                          
                          {/* Tags */}
                          <div className="flex gap-1">
                            {template.tags.slice(0, 2).map(tag => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Tooltip on hover */}
                        <div className="absolute left-full top-0 ml-2 p-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 w-48">
                          <div className="font-medium mb-1">{template.name}</div>
                          <div className="mb-2">{template.description}</div>
                          {template.examples && (
                            <div>
                              <div className="font-medium mb-1">Examples:</div>
                              <ul className="list-disc list-inside text-xs">
                                {template.examples.slice(0, 2).map((example, idx) => (
                                  <li key={idx}>{example}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {/* No results */}
        {Object.values(templatesByCategory).every(templates => templates.length === 0) && (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">🔍</div>
            <div className="text-sm">No nodes found</div>
            <button
              onClick={() => {
                setSearchTerm('')
                setSelectedCategory('all')
                setSelectedComplexity('all')
                setShowPremiumOnly(false)
              }}
              className="mt-2 text-xs text-blue-600 hover:text-blue-700"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>

      {/* Quick Add Section */}
      <div className="border-t border-gray-200 p-3">
        <div className="text-xs font-medium text-gray-700 mb-2">Quick Add</div>
        <div className="grid grid-cols-2 gap-2">
          {nodeTemplates.slice(0, 4).map(template => {
            const IconComponent = template.icon
            return (
              <button
                key={template.id}
                draggable
                onDragStart={(e) => onDragStart(e, template)}
                className="flex items-center justify-center p-2 bg-white border border-gray-200 rounded-lg hover:border-blue-300 transition-colors text-xs"
              >
                <IconComponent className="w-3 h-3 mr-1" />
                {template.name}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}