'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Zap, Plus, Trash2, Play, Pause, Edit2, Check, X, Loader2, Copy, Calendar, MessageSquare, Mail, Phone, Users, DollarSign, Target } from 'lucide-react'
import SettingsHeader from '@/app/components/settings/SettingsHeader'
import Link from 'next/link'

interface Workflow {
  id: string
  name: string
  description?: string
  trigger_type: 'manual' | 'event' | 'schedule' | 'webhook'
  trigger_config: any
  actions: any[]
  is_active: boolean
  last_run?: string
  run_count: number
  created_at: string
  updated_at: string
}

const workflowTemplates = [
  {
    name: 'New Lead Welcome',
    description: 'Automatically welcome new leads with email and SMS',
    icon: <Users className="h-5 w-5" />,
    trigger: 'event',
    actions: ['Send Welcome Email', 'Send Welcome SMS', 'Add to CRM']
  },
  {
    name: 'Booking Reminder',
    description: 'Send reminders 24 hours before class bookings',
    icon: <Calendar className="h-5 w-5" />,
    trigger: 'schedule',
    actions: ['Check Upcoming Bookings', 'Send SMS Reminder', 'Send Email Reminder']
  },
  {
    name: 'Payment Failed',
    description: 'Handle failed payment attempts with automated follow-up',
    icon: <DollarSign className="h-5 w-5" />,
    trigger: 'event',
    actions: ['Send Payment Failed Email', 'Send SMS Alert', 'Create Task for Staff']
  },
  {
    name: 'Lead Nurturing',
    description: 'Multi-step lead nurturing campaign over 7 days',
    icon: <Target className="h-5 w-5" />,
    trigger: 'manual',
    actions: ['Day 1: Welcome Email', 'Day 3: Follow-up SMS', 'Day 7: Special Offer']
  }
]

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [showTemplates, setShowTemplates] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const fetchWorkflows = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) return

      // In a real app, you'd fetch workflows from the database
      // For now, we'll simulate some data
      const mockWorkflows: Workflow[] = [
        {
          id: '1',
          name: 'Welcome New Members',
          description: 'Send welcome email and SMS to new gym members',
          trigger_type: 'event',
          trigger_config: { event: 'member.created' },
          actions: [
            { type: 'email', template: 'welcome_member' },
            { type: 'sms', message: 'Welcome to Atlas Fitness!' },
            { type: 'wait', duration: '24h' },
            { type: 'email', template: 'getting_started' }
          ],
          is_active: true,
          last_run: new Date(Date.now() - 3600000).toISOString(),
          run_count: 156,
          created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 3600000).toISOString()
        },
        {
          id: '2',
          name: 'Class Reminder',
          description: 'Send reminder 2 hours before booked classes',
          trigger_type: 'schedule',
          trigger_config: { schedule: '0 * * * *' }, // Every hour
          actions: [
            { type: 'query', data: 'upcoming_bookings' },
            { type: 'filter', condition: 'starts_in_2h' },
            { type: 'sms', message: 'Your class starts in 2 hours!' }
          ],
          is_active: true,
          last_run: new Date(Date.now() - 1800000).toISOString(),
          run_count: 823,
          created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1800000).toISOString()
        },
        {
          id: '3',
          name: 'Expired Membership Alert',
          description: 'Alert members 7 days before membership expires',
          trigger_type: 'schedule',
          trigger_config: { schedule: '0 9 * * *' }, // Daily at 9am
          actions: [
            { type: 'query', data: 'expiring_memberships' },
            { type: 'email', template: 'membership_expiring' },
            { type: 'create_task', assignee: 'staff', title: 'Follow up on expiring membership' }
          ],
          is_active: false,
          run_count: 45,
          created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
        }
      ]

      setWorkflows(mockWorkflows)
    } catch (error) {
      console.error('Error fetching workflows:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggleWorkflow = async (workflowId: string, isActive: boolean) => {
    setWorkflows(workflows.map(w => 
      w.id === workflowId ? { ...w, is_active: !isActive } : w
    ))
  }

  const handleDeleteWorkflow = async (workflowId: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) return
    setWorkflows(workflows.filter(w => w.id !== workflowId))
  }

  const getTriggerIcon = (type: string) => {
    switch (type) {
      case 'event': return <Zap className="h-4 w-4" />
      case 'schedule': return <Calendar className="h-4 w-4" />
      case 'webhook': return <MessageSquare className="h-4 w-4" />
      case 'manual': return <Play className="h-4 w-4" />
      default: return <Zap className="h-4 w-4" />
    }
  }

  const getTriggerLabel = (workflow: Workflow) => {
    switch (workflow.trigger_type) {
      case 'event': 
        return `On ${workflow.trigger_config.event}`
      case 'schedule':
        return `Schedule: ${workflow.trigger_config.schedule}`
      case 'webhook':
        return `Webhook: ${workflow.trigger_config.url}`
      case 'manual':
        return 'Manual trigger'
      default:
        return workflow.trigger_type
    }
  }

  const formatLastRun = (date?: string) => {
    if (!date) return 'Never'
    const diff = Date.now() - new Date(date).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return `${minutes}m ago`
  }

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
        title="Workflows"
        description="Automate your gym operations with custom workflows"
        icon={<Zap className="h-6 w-6" />}
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
            >
              Templates
            </button>
            <Link
              href="/automations/builder"
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create Workflow
            </Link>
          </div>
        }
      />

      {/* Templates */}
      {showTemplates && (
        <div className="bg-gray-800 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-medium text-white mb-4">Workflow Templates</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {workflowTemplates.map((template, index) => (
              <div key={index} className="p-4 bg-gray-700 rounded-lg hover:bg-gray-700/80 cursor-pointer transition-colors">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-gray-600 rounded-lg text-blue-400">
                    {template.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-white font-medium">{template.name}</h4>
                    <p className="text-sm text-gray-400 mt-1">{template.description}</p>
                    <div className="mt-3 space-y-1">
                      {template.actions.map((action, idx) => (
                        <div key={idx} className="text-xs text-gray-500 flex items-center gap-1">
                          <div className="w-1 h-1 bg-gray-500 rounded-full" />
                          {action}
                        </div>
                      ))}
                    </div>
                    <button className="mt-3 text-sm text-blue-400 hover:text-blue-300">
                      Use Template →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Workflows */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-medium text-white">Active Workflows</h3>
        </div>
        <div className="divide-y divide-gray-700">
          {workflows.map((workflow) => (
            <div key={workflow.id} className="p-6 hover:bg-gray-750">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="text-lg font-medium text-white">{workflow.name}</h4>
                    {workflow.is_active ? (
                      <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs rounded-full">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-gray-600/20 text-gray-400 text-xs rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  {workflow.description && (
                    <p className="text-sm text-gray-400 mt-1">{workflow.description}</p>
                  )}
                  
                  <div className="flex items-center gap-6 mt-4 text-sm">
                    <div className="flex items-center gap-2 text-gray-400">
                      {getTriggerIcon(workflow.trigger_type)}
                      <span>{getTriggerLabel(workflow)}</span>
                    </div>
                    <div className="text-gray-500">
                      {workflow.actions.length} actions
                    </div>
                    <div className="text-gray-500">
                      Last run: {formatLastRun(workflow.last_run)}
                    </div>
                    <div className="text-gray-500">
                      {workflow.run_count} runs
                    </div>
                  </div>

                  {/* Action Preview */}
                  <div className="flex items-center gap-2 mt-3">
                    {workflow.actions.slice(0, 3).map((action, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <div className={`px-2 py-1 rounded text-xs ${
                          action.type === 'email' ? 'bg-blue-600/20 text-blue-400' :
                          action.type === 'sms' ? 'bg-green-600/20 text-green-400' :
                          action.type === 'wait' ? 'bg-yellow-600/20 text-yellow-400' :
                          'bg-gray-600/20 text-gray-400'
                        }`}>
                          {action.type}
                        </div>
                        {idx < workflow.actions.length - 1 && idx < 2 && (
                          <span className="text-gray-600">→</span>
                        )}
                      </div>
                    ))}
                    {workflow.actions.length > 3 && (
                      <span className="text-sm text-gray-500">
                        +{workflow.actions.length - 3} more
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={workflow.is_active}
                      onChange={() => handleToggleWorkflow(workflow.id, workflow.is_active)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
                  <Link
                    href={`/automations/builder/${workflow.id}`}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                  >
                    <Edit2 className="h-4 w-4" />
                  </Link>
                  <button
                    onClick={() => handleDeleteWorkflow(workflow.id)}
                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {workflows.length === 0 && (
          <div className="p-12 text-center">
            <Zap className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">No workflows created yet</p>
            <Link
              href="/automations/builder"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              Create Your First Workflow
            </Link>
          </div>
        )}
      </div>

      {/* Workflow Stats */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-400 mb-3">Workflow Performance</h4>
        <div className="grid md:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-white">{workflows.filter(w => w.is_active).length}</p>
            <p className="text-xs text-gray-500">Active Workflows</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">
              {workflows.reduce((sum, w) => sum + w.run_count, 0)}
            </p>
            <p className="text-xs text-gray-500">Total Runs</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">1,247</p>
            <p className="text-xs text-gray-500">Actions Executed</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-white">98.5%</p>
            <p className="text-xs text-gray-500">Success Rate</p>
          </div>
        </div>
      </div>
    </div>
  )
}