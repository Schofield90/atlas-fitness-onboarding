'use client'

import { useState } from 'react'
import { Search, Filter, Copy, Eye, Star } from 'lucide-react'

interface WorkflowTemplatesProps {
  onClose: () => void
  onSelectTemplate: (template: WorkflowTemplate) => void
}

interface WorkflowTemplate {
  id: string
  name: string
  description: string
  category: 'lead_nurture' | 'client_onboarding' | 'retention' | 'sales' | 'marketing' | 'operations'
  complexity: 'beginner' | 'intermediate' | 'advanced'
  tags: string[]
  nodes: any[]
  edges: any[]
  estimatedExecutionTime: string
  usageCount: number
  rating: number
  features: string[]
  previewImage?: string
}

const workflowTemplates: WorkflowTemplate[] = [
  {
    id: 'lead-nurture-advanced',
    name: 'Smart Lead Nurturing Campaign',
    description: 'Advanced multi-touch nurturing sequence with lead scoring, behavior tracking, and personalized content delivery.',
    category: 'lead_nurture',
    complexity: 'advanced',
    tags: ['scoring', 'personalization', 'multi-channel', 'conditional'],
    estimatedExecutionTime: '7-14 days',
    usageCount: 1250,
    rating: 4.8,
    features: [
      'Dynamic lead scoring',
      'Behavioral triggers',
      'A/B testing paths',
      'Multi-channel messaging',
      'Time-based conditions'
    ],
    nodes: [
      {
        id: 'trigger_1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'New Lead',
          icon: '👤',
          config: { source: 'all', leadScore: { min: 0, max: 100 } }
        }
      },
      {
        id: 'condition_1',
        type: 'condition',
        position: { x: 100, y: 200 },
        data: {
          label: 'Lead Score Check',
          icon: '📊',
          config: {
            conditionType: 'lead_score',
            operator: 'greater_than',
            value: 50
          }
        }
      },
      {
        id: 'action_1',
        type: 'action',
        position: { x: 300, y: 150 },
        data: {
          label: 'Send Welcome Email',
          icon: '📧',
          config: { templateId: 'welcome-high-score', priority: 'high' }
        }
      },
      {
        id: 'action_2',
        type: 'action',
        position: { x: 300, y: 250 },
        data: {
          label: 'Send Nurture Email',
          icon: '📧',
          config: { templateId: 'welcome-low-score', priority: 'normal' }
        }
      },
      {
        id: 'delay_1',
        type: 'delay',
        position: { x: 500, y: 200 },
        data: {
          label: 'Wait 2 Days',
          icon: '⏱️',
          config: {
            baseDelay: { value: 2, unit: 'days' },
            conditions: [
              {
                condition: { field: 'email_opened', operator: 'equals', value: true },
                delayModifier: { operation: 'multiply', value: 0.5 }
              }
            ]
          }
        }
      },
      {
        id: 'condition_2',
        type: 'condition',
        position: { x: 700, y: 200 },
        data: {
          label: 'Email Activity Check',
          icon: '📧',
          config: {
            conditionType: 'activity',
            activityType: 'email_opened',
            timeframe: { value: 3, unit: 'days' },
            operator: 'within'
          }
        }
      },
      {
        id: 'parallel_1',
        type: 'parallel',
        position: { x: 900, y: 150 },
        data: {
          label: 'Multi-Channel Follow-up',
          icon: '⚡',
          config: { branches: 2, waitForAll: false }
        }
      },
      {
        id: 'action_3',
        type: 'action',
        position: { x: 1100, y: 100 },
        data: {
          label: 'Send SMS',
          icon: '💬',
          config: { message: 'Thanks for engaging! Here\'s a special offer...' }
        }
      },
      {
        id: 'action_4',
        type: 'action',
        position: { x: 1100, y: 200 },
        data: {
          label: 'Update Lead Score',
          icon: '📊',
          config: { operation: 'add', value: 10 }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'trigger_1', target: 'condition_1' },
      { id: 'e2', source: 'condition_1', target: 'action_1', sourceHandle: 'true' },
      { id: 'e3', source: 'condition_1', target: 'action_2', sourceHandle: 'false' },
      { id: 'e4', source: 'action_1', target: 'delay_1' },
      { id: 'e5', source: 'action_2', target: 'delay_1' },
      { id: 'e6', source: 'delay_1', target: 'condition_2' },
      { id: 'e7', source: 'condition_2', target: 'parallel_1', sourceHandle: 'true' },
      { id: 'e8', source: 'parallel_1', target: 'action_3', sourceHandle: 'branch-0' },
      { id: 'e9', source: 'parallel_1', target: 'action_4', sourceHandle: 'branch-1' }
    ]
  },
  {
    id: 'client-onboarding-comprehensive',
    name: 'Complete Client Onboarding',
    description: 'Comprehensive onboarding workflow with progress tracking, conditional steps, and automated task creation.',
    category: 'client_onboarding',
    complexity: 'intermediate',
    tags: ['onboarding', 'tasks', 'progress-tracking', 'conditional'],
    estimatedExecutionTime: '2-4 weeks',
    usageCount: 890,
    rating: 4.6,
    features: [
      'Progress tracking',
      'Automated task creation',
      'Document collection',
      'Reminder sequences',
      'Completion milestones'
    ],
    nodes: [
      {
        id: 'trigger_1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'New Client Signup',
          icon: '🎯',
          config: { source: 'signup_form' }
        }
      },
      {
        id: 'action_1',
        type: 'action',
        position: { x: 300, y: 100 },
        data: {
          label: 'Send Welcome Package',
          icon: '📦',
          config: { templateId: 'welcome-package' }
        }
      },
      {
        id: 'action_2',
        type: 'action',
        position: { x: 500, y: 100 },
        data: {
          label: 'Create Onboarding Tasks',
          icon: '✅',
          config: { 
            tasks: [
              { title: 'Complete profile setup', dueInDays: 3 },
              { title: 'Schedule consultation', dueInDays: 7 },
              { title: 'Upload documents', dueInDays: 5 }
            ]
          }
        }
      },
      {
        id: 'loop_1',
        type: 'loop',
        position: { x: 700, y: 100 },
        data: {
          label: 'Progress Check Loop',
          icon: '🔄',
          config: {
            maxIterations: 10,
            breakCondition: { field: 'onboarding_complete', operator: 'equals', value: true }
          }
        }
      },
      {
        id: 'condition_1',
        type: 'condition',
        position: { x: 900, y: 100 },
        data: {
          label: 'Task Completion Check',
          icon: '✅',
          config: {
            conditionType: 'field_comparison',
            field: 'completed_tasks_percentage',
            operator: 'greater_than',
            value: 80
          }
        }
      },
      {
        id: 'action_3',
        type: 'action',
        position: { x: 1100, y: 50 },
        data: {
          label: 'Send Completion Email',
          icon: '🎉',
          config: { templateId: 'onboarding-complete' }
        }
      },
      {
        id: 'action_4',
        type: 'action',
        position: { x: 1100, y: 150 },
        data: {
          label: 'Send Reminder',
          icon: '⏰',
          config: { templateId: 'onboarding-reminder' }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'trigger_1', target: 'action_1' },
      { id: 'e2', source: 'action_1', target: 'action_2' },
      { id: 'e3', source: 'action_2', target: 'loop_1' },
      { id: 'e4', source: 'loop_1', target: 'condition_1', sourceHandle: 'loop-body' },
      { id: 'e5', source: 'condition_1', target: 'action_3', sourceHandle: 'true' },
      { id: 'e6', source: 'condition_1', target: 'action_4', sourceHandle: 'false' },
      { id: 'e7', source: 'action_4', target: 'loop_1' }
    ]
  },
  {
    id: 'retention-campaign',
    name: 'Smart Retention Campaign',
    description: 'Intelligent retention workflow with engagement scoring, win-back sequences, and personalized offers.',
    category: 'retention',
    complexity: 'advanced',
    tags: ['retention', 'engagement', 'personalization', 'win-back'],
    estimatedExecutionTime: '30-60 days',
    usageCount: 650,
    rating: 4.7,
    features: [
      'Engagement scoring',
      'Churn prediction',
      'Personalized offers',
      'Win-back sequences',
      'A/B testing'
    ],
    nodes: [
      {
        id: 'trigger_1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'Low Engagement Alert',
          icon: '📉',
          config: { 
            activityType: 'engagement_score_drop',
            threshold: 30 
          }
        }
      },
      {
        id: 'condition_1',
        type: 'condition',
        position: { x: 300, y: 100 },
        data: {
          label: 'Churn Risk Assessment',
          icon: '⚠️',
          config: {
            conditionType: 'multi_condition',
            logic: 'AND',
            conditions: [
              { field: 'days_since_last_login', operator: 'greater_than', value: 14 },
              { field: 'engagement_score', operator: 'less_than', value: 40 }
            ]
          }
        }
      },
      {
        id: 'parallel_1',
        type: 'parallel',
        position: { x: 500, y: 50 },
        data: {
          label: 'High-Risk Retention',
          icon: '🚨',
          config: { branches: 3, waitForAll: false }
        }
      },
      {
        id: 'action_1',
        type: 'action',
        position: { x: 700, y: 0 },
        data: {
          label: 'Personal Outreach',
          icon: '📞',
          config: { actionType: 'create_task', priority: 'high' }
        }
      },
      {
        id: 'action_2',
        type: 'action',
        position: { x: 700, y: 50 },
        data: {
          label: 'Special Offer Email',
          icon: '💌',
          config: { templateId: 'retention-offer' }
        }
      },
      {
        id: 'action_3',
        type: 'action',
        position: { x: 700, y: 100 },
        data: {
          label: 'Discount Code',
          icon: '🎟️',
          config: { discountPercentage: 20, validDays: 7 }
        }
      },
      {
        id: 'action_4',
        type: 'action',
        position: { x: 500, y: 150 },
        data: {
          label: 'Re-engagement Email',
          icon: '📧',
          config: { templateId: 're-engagement' }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'trigger_1', target: 'condition_1' },
      { id: 'e2', source: 'condition_1', target: 'parallel_1', sourceHandle: 'true' },
      { id: 'e3', source: 'condition_1', target: 'action_4', sourceHandle: 'false' },
      { id: 'e4', source: 'parallel_1', target: 'action_1', sourceHandle: 'branch-0' },
      { id: 'e5', source: 'parallel_1', target: 'action_2', sourceHandle: 'branch-1' },
      { id: 'e6', source: 'parallel_1', target: 'action_3', sourceHandle: 'branch-2' }
    ]
  },
  {
    id: 'appointment-booking-flow',
    name: 'Intelligent Appointment Booking',
    description: 'Smart appointment booking workflow with availability checking, reminders, and follow-up sequences.',
    category: 'operations',
    complexity: 'intermediate',
    tags: ['appointments', 'scheduling', 'reminders', 'availability'],
    estimatedExecutionTime: '1-7 days',
    usageCount: 1120,
    rating: 4.5,
    features: [
      'Availability checking',
      'Automated reminders',
      'Rescheduling handling',
      'No-show follow-up',
      'Confirmation sequences'
    ],
    nodes: [
      {
        id: 'trigger_1',
        type: 'trigger',
        position: { x: 100, y: 100 },
        data: {
          label: 'Appointment Request',
          icon: '📅',
          config: { source: 'booking_form' }
        }
      },
      {
        id: 'condition_1',
        type: 'condition',
        position: { x: 300, y: 100 },
        data: {
          label: 'Availability Check',
          icon: '🗓️',
          config: {
            conditionType: 'time_based',
            timeType: 'business_hours',
            startTime: '09:00',
            endTime: '17:00'
          }
        }
      },
      {
        id: 'action_1',
        type: 'action',
        position: { x: 500, y: 50 },
        data: {
          label: 'Confirm Appointment',
          icon: '✅',
          config: { templateId: 'appointment-confirmation' }
        }
      },
      {
        id: 'action_2',
        type: 'action',
        position: { x: 500, y: 150 },
        data: {
          label: 'Suggest Alternatives',
          icon: '🔄',
          config: { templateId: 'alternative-times' }
        }
      },
      {
        id: 'delay_1',
        type: 'delay',
        position: { x: 700, y: 50 },
        data: {
          label: '24h Before Reminder',
          icon: '⏰',
          config: {
            baseDelay: { value: 24, unit: 'hours' },
            conditions: []
          }
        }
      },
      {
        id: 'action_3',
        type: 'action',
        position: { x: 900, y: 50 },
        data: {
          label: 'Send Reminder',
          icon: '📱',
          config: { templateId: 'appointment-reminder' }
        }
      }
    ],
    edges: [
      { id: 'e1', source: 'trigger_1', target: 'condition_1' },
      { id: 'e2', source: 'condition_1', target: 'action_1', sourceHandle: 'true' },
      { id: 'e3', source: 'condition_1', target: 'action_2', sourceHandle: 'false' },
      { id: 'e4', source: 'action_1', target: 'delay_1' },
      { id: 'e5', source: 'delay_1', target: 'action_3' }
    ]
  }
]

export function WorkflowTemplates({ onClose, onSelectTemplate }: WorkflowTemplatesProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedComplexity, setSelectedComplexity] = useState<string>('all')
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null)

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'lead_nurture', label: 'Lead Nurturing' },
    { value: 'client_onboarding', label: 'Client Onboarding' },
    { value: 'retention', label: 'Retention' },
    { value: 'sales', label: 'Sales' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'operations', label: 'Operations' }
  ]

  const complexityLevels = [
    { value: 'all', label: 'All Levels' },
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' }
  ]

  const filteredTemplates = workflowTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    const matchesComplexity = selectedComplexity === 'all' || template.complexity === selectedComplexity
    
    return matchesSearch && matchesCategory && matchesComplexity
  })

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'beginner': return 'text-green-400'
      case 'intermediate': return 'text-yellow-400'
      case 'advanced': return 'text-red-400'
      default: return 'text-gray-400'
    }
  }

  const getComplexityIcon = (complexity: string) => {
    switch (complexity) {
      case 'beginner': return '🟢'
      case 'intermediate': return '🟡'
      case 'advanced': return '🔴'
      default: return '⚪'
    }
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'lead_nurture': return '🌱'
      case 'client_onboarding': return '🚀'
      case 'retention': return '🤝'
      case 'sales': return '💰'
      case 'marketing': return '📢'
      case 'operations': return '⚙️'
      default: return '📋'
    }
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-3 h-3 ${i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-400'}`}
      />
    ))
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-white">Workflow Templates</h2>
            <p className="text-gray-400 mt-1">Choose from pre-built workflows to get started quickly</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl"
          >
            ×
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mt-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
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
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-purple-500"
          >
            {complexityLevels.map(level => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Template List */}
        <div className="w-1/2 border-r border-gray-700 overflow-y-auto">
          <div className="p-6 space-y-4">
            {filteredTemplates.length === 0 ? (
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
              filteredTemplates.map(template => (
                <div
                  key={template.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'border-purple-500 bg-purple-900/20'
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{getCategoryIcon(template.category)}</span>
                      <h3 className="font-medium text-white">{template.name}</h3>
                    </div>
                    <div className="flex items-center gap-1">
                      {renderStars(template.rating)}
                      <span className="text-xs text-gray-400 ml-1">({template.usageCount})</span>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-400 mb-3">{template.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-xs">
                      <span className={`flex items-center gap-1 ${getComplexityColor(template.complexity)}`}>
                        {getComplexityIcon(template.complexity)} {template.complexity}
                      </span>
                      <span className="text-gray-400">⏱️ {template.estimatedExecutionTime}</span>
                    </div>
                    <div className="flex gap-1">
                      {template.tags.slice(0, 2).map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                      {template.tags.length > 2 && (
                        <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                          +{template.tags.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Template Preview */}
        <div className="w-1/2 overflow-y-auto">
          {selectedTemplate ? (
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{getCategoryIcon(selectedTemplate.category)}</span>
                  <h2 className="text-xl font-bold text-white">{selectedTemplate.name}</h2>
                </div>
                <p className="text-gray-400">{selectedTemplate.description}</p>
              </div>

              {/* Template Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-400">Complexity</div>
                  <div className={`font-medium ${getComplexityColor(selectedTemplate.complexity)}`}>
                    {getComplexityIcon(selectedTemplate.complexity)} {selectedTemplate.complexity}
                  </div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-400">Estimated Time</div>
                  <div className="text-white font-medium">{selectedTemplate.estimatedExecutionTime}</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-400">Usage Count</div>
                  <div className="text-white font-medium">{selectedTemplate.usageCount.toLocaleString()}</div>
                </div>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-400">Rating</div>
                  <div className="flex items-center gap-1">
                    {renderStars(selectedTemplate.rating)}
                    <span className="text-white font-medium ml-1">{selectedTemplate.rating}</span>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="mb-6">
                <h3 className="font-medium text-white mb-3">Key Features</h3>
                <div className="space-y-2">
                  {selectedTemplate.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-purple-400 rounded-full" />
                      <span className="text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="mb-6">
                <h3 className="font-medium text-white mb-3">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedTemplate.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-purple-600 text-white rounded-full text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Workflow Preview */}
              <div className="mb-6">
                <h3 className="font-medium text-white mb-3">Workflow Structure</h3>
                <div className="bg-gray-700 rounded-lg p-4">
                  <div className="text-sm text-gray-300">
                    <div className="mb-2">📍 <strong>{selectedTemplate.nodes.length}</strong> nodes</div>
                    <div className="mb-2">🔗 <strong>{selectedTemplate.edges.length}</strong> connections</div>
                    <div>
                      Node types: {Array.from(new Set(selectedTemplate.nodes.map(n => n.type))).join(', ')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={() => onSelectTemplate(selectedTemplate)}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                >
                  <Copy className="w-4 h-4" />
                  Use This Template
                </button>
                <button
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  onClick={() => {
                    // Preview functionality could be implemented here
                    console.log('Preview template:', selectedTemplate)
                  }}
                >
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
              <div className="text-center">
                <div className="text-6xl mb-4">📋</div>
                <p>Select a template to see details and preview</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}