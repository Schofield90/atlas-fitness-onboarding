'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Clock, CheckCircle, XCircle, AlertCircle, PlayCircle, RefreshCw, Search, Filter, Download } from 'lucide-react'
import { format, formatDistanceToNow } from 'date-fns'
import toast from '@/app/lib/toast'

interface WorkflowExecution {
  id: string
  workflow_id: string
  workflow?: {
    name: string
    description?: string
  }
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  trigger_data?: any
  started_at?: string
  completed_at?: string
  error_message?: string
  steps?: WorkflowExecutionStep[]
  context?: any
  created_at: string
}

interface WorkflowExecutionStep {
  id: string
  node_id: string
  node_type: string
  action_type?: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  started_at?: string
  completed_at?: string
  input_data?: any
  output_data?: any
  error_message?: string
}

interface TriggerHistoryProps {
  workflowId?: string
  compact?: boolean
}

export default function TriggerHistory({ workflowId, compact = false }: TriggerHistoryProps) {
  const [executions, setExecutions] = useState<WorkflowExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedExecution, setSelectedExecution] = useState<WorkflowExecution | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchExecutions()
    
    // Set up real-time subscription
    const channel = supabase
      .channel('workflow-executions')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'workflow_executions',
        filter: workflowId ? `workflow_id=eq.${workflowId}` : undefined
      }, () => {
        fetchExecutions()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [workflowId, filterStatus])

  const fetchExecutions = async () => {
    try {
      let query = supabase
        .from('workflow_executions')
        .select(`
          *,
          workflow:workflows(name, description),
          steps:workflow_execution_steps(*)
        `)
        .order('created_at', { ascending: false })
        .limit(compact ? 10 : 100)

      if (workflowId) {
        query = query.eq('workflow_id', workflowId)
      }

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      const { data, error } = await query

      if (error) throw error
      setExecutions(data || [])
    } catch (error) {
      console.error('Error fetching executions:', error)
      toast.error('Failed to load trigger history')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchExecutions()
    setRefreshing(false)
    toast.success('Trigger history refreshed')
  }

  const handleRetry = async (execution: WorkflowExecution) => {
    try {
      const response = await fetch('/api/workflows/retry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ executionId: execution.id })
      })

      if (!response.ok) throw new Error('Failed to retry workflow')
      
      toast.success('Workflow execution retried')
      fetchExecutions()
    } catch (error) {
      console.error('Error retrying workflow:', error)
      toast.error('Failed to retry workflow')
    }
  }

  const exportHistory = () => {
    const csv = [
      ['Workflow', 'Status', 'Triggered At', 'Duration', 'Error'],
      ...executions.map(e => [
        e.workflow?.name || 'Unknown',
        e.status,
        e.created_at,
        e.completed_at && e.started_at 
          ? `${Math.round((new Date(e.completed_at).getTime() - new Date(e.started_at).getTime()) / 1000)}s`
          : 'N/A',
        e.error_message || ''
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trigger-history-${new Date().toISOString()}.csv`
    a.click()
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'running':
        return <PlayCircle className="w-4 h-4 text-blue-500 animate-pulse" />
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'cancelled':
        return <AlertCircle className="w-4 h-4 text-gray-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-900 text-green-300'
      case 'failed':
        return 'bg-red-900 text-red-300'
      case 'running':
        return 'bg-blue-900 text-blue-300'
      case 'pending':
        return 'bg-yellow-900 text-yellow-300'
      case 'cancelled':
        return 'bg-gray-700 text-gray-300'
      default:
        return 'bg-gray-700 text-gray-300'
    }
  }

  const filteredExecutions = executions.filter(e => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        e.workflow?.name?.toLowerCase().includes(query) ||
        e.status.toLowerCase().includes(query) ||
        e.error_message?.toLowerCase().includes(query)
      )
    }
    return true
  })

  if (loading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-10 bg-gray-700 rounded"></div>
            <div className="h-10 bg-gray-700 rounded"></div>
            <div className="h-10 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-800 rounded-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-white">
              {compact ? 'Recent Triggers' : 'Trigger History'}
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Track all workflow executions and their results
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!compact && (
              <>
                <button
                  onClick={exportHistory}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm transition-colors flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <button
                  onClick={handleRefresh}
                  className={`px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors flex items-center gap-2 ${
                    refreshing ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={refreshing}
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </>
            )}
          </div>
        </div>

        {!compact && (
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search executions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="failed">Failed</option>
                <option value="running">Running</option>
                <option value="pending">Pending</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Executions List */}
      <div className="divide-y divide-gray-700">
        {filteredExecutions.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No trigger history found</p>
            {filterStatus !== 'all' && (
              <button
                onClick={() => setFilterStatus('all')}
                className="mt-2 text-sm text-blue-400 hover:text-blue-300"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          filteredExecutions.slice(0, compact ? 5 : undefined).map((execution) => (
            <div
              key={execution.id}
              className="p-4 hover:bg-gray-750 transition-colors cursor-pointer"
              onClick={() => setSelectedExecution(execution)}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(execution.status)}
                    <div>
                      <h4 className="text-sm font-medium text-white">
                        {execution.workflow?.name || 'Unknown Workflow'}
                      </h4>
                      <p className="text-xs text-gray-400">
                        {formatDistanceToNow(new Date(execution.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>

                  {execution.error_message && (
                    <div className="mt-2 p-2 bg-red-900 bg-opacity-20 border border-red-800 rounded text-xs text-red-400">
                      {execution.error_message}
                    </div>
                  )}

                  {!compact && execution.steps && execution.steps.length > 0 && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                      <span>{execution.steps.filter(s => s.status === 'completed').length}/{execution.steps.length} steps completed</span>
                      {execution.started_at && execution.completed_at && (
                        <span>• {Math.round((new Date(execution.completed_at).getTime() - new Date(execution.started_at).getTime()) / 1000)}s duration</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(execution.status)}`}>
                    {execution.status}
                  </span>
                  {execution.status === 'failed' && !compact && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleRetry(execution)
                      }}
                      className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Execution Details Modal */}
      {selectedExecution && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Execution Details</h3>
                <button
                  onClick={() => setSelectedExecution(null)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
              {/* Execution Info */}
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Workflow</h4>
                <p className="text-white">{selectedExecution.workflow?.name}</p>
                {selectedExecution.workflow?.description && (
                  <p className="text-sm text-gray-400 mt-1">{selectedExecution.workflow.description}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Status</h4>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(selectedExecution.status)}
                    <span className={`text-sm px-2 py-1 rounded-full ${getStatusColor(selectedExecution.status)}`}>
                      {selectedExecution.status}
                    </span>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Triggered</h4>
                  <p className="text-white text-sm">
                    {format(new Date(selectedExecution.created_at), 'PPpp')}
                  </p>
                </div>
              </div>

              {/* Trigger Data */}
              {selectedExecution.trigger_data && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Trigger Data</h4>
                  <pre className="bg-gray-900 rounded-lg p-3 text-xs text-gray-300 overflow-x-auto">
                    {JSON.stringify(selectedExecution.trigger_data, null, 2)}
                  </pre>
                </div>
              )}

              {/* Execution Steps */}
              {selectedExecution.steps && selectedExecution.steps.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-3">Execution Steps</h4>
                  <div className="space-y-2">
                    {selectedExecution.steps.map((step, index) => (
                      <div key={step.id} className="bg-gray-900 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getStatusIcon(step.status)}
                            <span className="text-sm font-medium text-white">
                              Step {index + 1}: {step.action_type || step.node_type}
                            </span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(step.status)}`}>
                            {step.status}
                          </span>
                        </div>

                        {step.error_message && (
                          <div className="mt-2 p-2 bg-red-900 bg-opacity-20 border border-red-800 rounded text-xs text-red-400">
                            {step.error_message}
                          </div>
                        )}

                        {(step.input_data || step.output_data) && (
                          <details className="mt-2">
                            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-300">
                              View step data
                            </summary>
                            <div className="mt-2 space-y-2">
                              {step.input_data && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Input:</p>
                                  <pre className="bg-gray-800 rounded p-2 text-xs text-gray-300 overflow-x-auto">
                                    {JSON.stringify(step.input_data, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {step.output_data && (
                                <div>
                                  <p className="text-xs text-gray-500 mb-1">Output:</p>
                                  <pre className="bg-gray-800 rounded p-2 text-xs text-gray-300 overflow-x-auto">
                                    {JSON.stringify(step.output_data, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </details>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Error Details */}
              {selectedExecution.error_message && (
                <div className="mt-6">
                  <h4 className="text-sm font-medium text-gray-400 mb-2">Error Details</h4>
                  <div className="bg-red-900 bg-opacity-20 border border-red-800 rounded-lg p-4">
                    <p className="text-sm text-red-400">{selectedExecution.error_message}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}