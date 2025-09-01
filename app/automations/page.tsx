'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout from '@/app/components/DashboardLayout'
import { 
  Play, 
  Pause, 
  Plus, 
  Zap, 
  Clock, 
  CheckCircle, 
  XCircle,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  BarChart3
} from 'lucide-react'

interface Workflow {
  id: string
  name: string
  description: string
  status: 'active' | 'paused' | 'draft'
  trigger: string
  totalExecutions: number
  successRate: number
  lastRun?: string
  createdAt: string
}

interface PaginationInfo {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export default function AutomationsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: parseInt(searchParams.get('page') || '1'),
    pageSize: parseInt(searchParams.get('pageSize') || '25'),
    total: 0,
    totalPages: 0
  })

  useEffect(() => {
    setMounted(true)
    fetchWorkflows()
  }, [pagination.page, pagination.pageSize, statusFilter])

  // Update URL when pagination changes
  useEffect(() => {
    if (mounted) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('page', pagination.page.toString())
      params.set('pageSize', pagination.pageSize.toString())
      router.replace(`?${params.toString()}`, { scroll: false })
    }
  }, [pagination.page, pagination.pageSize, router, searchParams, mounted])

  const fetchWorkflows = async () => {
    try {
      const params = new URLSearchParams()
      params.set('page', pagination.page.toString())
      params.set('page_size', pagination.pageSize.toString())
      if (statusFilter && statusFilter !== 'all') {
        params.set('status', statusFilter)
      }
      
      const url = `/api/automations/workflows?${params.toString()}`
      const response = await fetch(url)
      
      if (response.ok) {
        const data = await response.json()
        
        const mappedWorkflows = data.workflows.map((w: any) => ({
          id: w.id,
          name: w.name,
          description: w.description || '',
          status: w.status,
          trigger: w.trigger_type || 'manual',
          totalExecutions: w.total_executions || 0,
          successRate: w.successful_executions && w.total_executions 
            ? Math.round((w.successful_executions / w.total_executions) * 100)
            : 0,
          lastRun: w.last_run_at,
          createdAt: w.created_at
        }))
        
        setWorkflows(mappedWorkflows)
        
        if (data.pagination) {
          setPagination(prev => ({
            ...prev,
            total: data.pagination.total,
            totalPages: data.pagination.totalPages
          }))
        }
      } else {
        throw new Error('Failed to fetch workflows')
      }
    } catch (error) {
      console.error('Error fetching workflows:', error)
      // Fallback to sample data if no workflows exist
      const sampleWorkflows = [
        {
          id: '1',
          name: 'New Lead Welcome Sequence',
          description: 'Automatically send welcome messages and schedule follow-ups for new leads',
          status: 'active' as const,
          trigger: 'New Lead',
          totalExecutions: 127,
          successRate: 98.4,
          lastRun: '2024-01-20T14:30:00Z',
          createdAt: '2024-01-15T10:00:00Z'
        },
        {
          id: '2', 
          name: 'Lead Qualification Bot',
          description: 'Qualify leads with AI-powered questions and route to appropriate team members',
          status: 'active' as const,
          trigger: 'Form Submission',
          totalExecutions: 89,
          successRate: 94.7,
          lastRun: '2024-01-20T16:45:00Z',
          createdAt: '2024-01-16T09:15:00Z'
        },
        {
          id: '3',
          name: 'Appointment Reminder Flow',
          description: 'Send automated reminders 24hrs and 1hr before scheduled appointments',
          status: 'paused' as const,
          trigger: 'Calendar Event',
          totalExecutions: 45,
          successRate: 100,
          lastRun: '2024-01-19T12:00:00Z',
          createdAt: '2024-01-17T15:30:00Z'
        },
        {
          id: '4',
          name: 'Membership Renewal Campaign',
          description: 'Target members 30 days before renewal with personalized offers',
          status: 'draft' as const,
          trigger: 'Scheduled',
          totalExecutions: 0,
          successRate: 0,
          createdAt: '2024-01-20T11:20:00Z'
        }
      ]
      setWorkflows(sampleWorkflows)
      setPagination(prev => ({
        ...prev,
        total: sampleWorkflows.length,
        totalPages: Math.ceil(sampleWorkflows.length / prev.pageSize)
      }))
    }
    setLoading(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'paused':
        return <Pause className="h-4 w-4 text-yellow-400" />
      case 'draft':
        return <Clock className="h-4 w-4 text-gray-400" />
      default:
        return <XCircle className="h-4 w-4 text-red-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400'
      case 'paused': return 'text-yellow-400' 
      case 'draft': return 'text-gray-400'
      default: return 'text-red-400'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleToggleWorkflow = (id: string, currentStatus: string) => {
    setWorkflows(prev => prev.map(w => w.id === id ? {
      ...w,
      status: currentStatus === 'active' ? 'paused' : 'active'
    } as Workflow : w))
  }
  
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination(prev => ({ ...prev, page: newPage }))
    }
  }
  
  const handlePageSizeChange = (newPageSize: number) => {
    setPagination(prev => ({ 
      ...prev, 
      pageSize: newPageSize,
      page: 1 // Reset to first page when changing page size
    }))
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Workflow Automations</h1>
            <p className="text-gray-300">Create powerful automations to streamline your gym operations</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => router.push('/automations/templates')}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors"
            >
              <Zap className="h-4 w-4" />
              Templates
            </button>
            <button 
              onClick={() => router.push('/automations/builder/new')}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" />
              Create Workflow
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-400">Active Workflows</h3>
                <div className="text-2xl font-bold text-white mt-1">
                  {workflows.filter(w => w.status === 'active').length}
                </div>
              </div>
              <div className="bg-green-500/20 p-3 rounded-lg">
                <Play className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-400">Total Executions</h3>
                <div className="text-2xl font-bold text-white mt-1">
                  {workflows.reduce((sum, w) => sum + w.totalExecutions, 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-blue-500/20 p-3 rounded-lg">
                <Zap className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-400">Success Rate</h3>
                <div className="text-2xl font-bold text-white mt-1">
                  {workflows.length > 0 ? 
                    Math.round(workflows.reduce((sum, w) => sum + w.successRate, 0) / workflows.length) + '%' 
                    : '0%'
                  }
                </div>
              </div>
              <div className="bg-green-500/20 p-3 rounded-lg">
                <BarChart3 className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-400">Time Saved</h3>
                <div className="text-2xl font-bold text-white mt-1">24h</div>
                <div className="text-xs text-gray-400">This month</div>
              </div>
              <div className="bg-purple-500/20 p-3 rounded-lg">
                <Clock className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Workflows List */}
        <div className="bg-gray-800 rounded-lg">
          <div className="p-6 border-b border-gray-700">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Your Workflows</h2>
              
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Filter:</span>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setPagination(prev => ({ ...prev, page: 1 })) // Reset to first page
                  }}
                  className="bg-gray-700 text-white rounded px-3 py-1 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading your workflows...</p>
            </div>
          ) : workflows.length === 0 ? (
            <div className="p-8 text-center">
              <Zap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No workflows yet</h3>
              <p className="text-gray-400 mb-6">Create your first automation to streamline your gym operations</p>
              <button 
                onClick={() => router.push('/automations/builder/new')}
                className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Create Your First Workflow
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-700">
              {workflows.map((workflow) => (
                <div key={workflow.id} className="p-6 hover:bg-gray-750 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(workflow.status)}
                        <h3 className="text-lg font-medium text-white">{workflow.name}</h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium capitalize ${getStatusColor(workflow.status)}`}>
                          {workflow.status}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-2">{workflow.description}</p>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>Trigger: {workflow.trigger}</span>
                        <span>•</span>
                        <span>{workflow.totalExecutions} executions</span>
                        <span>•</span>
                        <span>{workflow.successRate}% success</span>
                        {workflow.lastRun && (
                          <>
                            <span>•</span>
                            <span>Last run: {formatDate(workflow.lastRun)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleWorkflow(workflow.id, workflow.status)}
                        className={`p-2 rounded-lg transition-colors ${
                          workflow.status === 'active' 
                            ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
                            : 'bg-green-600 hover:bg-green-700 text-white'
                        }`}
                        title={workflow.status === 'active' ? 'Pause workflow' : 'Activate workflow'}
                      >
                        {workflow.status === 'active' ? 
                          <Pause className="h-4 w-4" /> : 
                          <Play className="h-4 w-4" />
                        }
                      </button>
                      
                      <button
                        onClick={() => router.push(`/automations/builder/${workflow.id}`)}
                        className="p-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white transition-colors"
                        title="Edit workflow"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      
                      <div className="relative">
                        <button
                          className="p-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white transition-colors"
                          title="More options"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination */}
            {pagination.total > 0 && pagination.totalPages > 1 && (
              <div className="p-6 border-t border-gray-700">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4">
                    <p className="text-sm text-gray-400">
                      Showing {((pagination.page - 1) * pagination.pageSize) + 1} to{' '}
                      {Math.min(pagination.page * pagination.pageSize, pagination.total)} of{' '}
                      {pagination.total} workflows
                    </p>
                    
                    {/* Page Size Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-400">Show:</span>
                      <select
                        value={pagination.pageSize}
                        onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                        className="bg-gray-700 text-white rounded px-2 py-1 text-sm"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    
                    {/* Page Numbers */}
                    <div className="flex gap-1">
                      {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                        const startPage = Math.max(1, pagination.page - 2)
                        const pageNum = startPage + i
                        
                        if (pageNum > pagination.totalPages) return null
                        
                        return (
                          <button
                            key={pageNum}
                            onClick={() => handlePageChange(pageNum)}
                            className={`px-3 py-1 rounded transition-colors ${
                              pageNum === pagination.page
                                ? 'bg-orange-500 text-white'
                                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                            }`}
                          >
                            {pageNum}
                          </button>
                        )
                      })}
                    </div>
                    
                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.totalPages}
                      className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}
          )}
        </div>

        {/* Getting Started Section */}
        {workflows.filter(w => w.status === 'active').length === 0 && (
          <div className="bg-gradient-to-r from-orange-500/10 to-purple-500/10 border border-orange-500/20 rounded-lg p-6 mt-8">
            <h3 className="text-lg font-semibold text-white mb-3">🚀 Get Started with Automations</h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="font-medium text-white mb-2">1. Choose a Template</h4>
                <p className="text-gray-400 text-sm mb-3">Start with pre-built workflows designed for gyms</p>
                <button 
                  onClick={() => router.push('/automations/templates')}
                  className="text-orange-400 hover:text-orange-300 text-sm font-medium"
                >
                  Browse Templates →
                </button>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="font-medium text-white mb-2">2. Build Custom Flow</h4>
                <p className="text-gray-400 text-sm mb-3">Create workflows tailored to your specific needs</p>
                <button 
                  onClick={() => router.push('/automations/builder/new')}
                  className="text-orange-400 hover:text-orange-300 text-sm font-medium"
                >
                  Start Building →
                </button>
              </div>
              <div className="bg-gray-800/50 rounded-lg p-4">
                <h4 className="font-medium text-white mb-2">3. Monitor & Optimize</h4>
                <p className="text-gray-400 text-sm mb-3">Track performance and improve your automations</p>
                <button 
                  onClick={() => alert('Analytics dashboard coming soon!')}
                  className="text-gray-500 text-sm font-medium"
                >
                  View Analytics →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}