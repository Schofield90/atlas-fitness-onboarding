'use client'

import React, { useState, useEffect } from 'react'
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw, 
  Activity, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  Zap,
  TrendingUp,
  BarChart3,
  Timer,
  Target,
  ChevronDown,
  ChevronUp,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react'
import { WorkflowNode } from '@/app/lib/types/automation'
import { Edge } from 'reactflow'

interface ExecutionStep {
  id: string
  nodeId: string
  nodeName: string
  nodeType: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
  startTime?: Date
  endTime?: Date
  duration?: number
  inputData?: any
  outputData?: any
  error?: string
  metrics?: {
    memoryUsage?: number
    apiCalls?: number
    dataProcessed?: number
  }
}

interface ExecutionSession {
  id: string
  workflowId: string
  status: 'running' | 'completed' | 'failed' | 'paused' | 'cancelled'
  startTime: Date
  endTime?: Date
  totalDuration?: number
  steps: ExecutionStep[]
  triggerData?: any
  context?: any
  metrics: {
    totalNodes: number
    completedNodes: number
    failedNodes: number
    skippedNodes: number
    totalDuration: number
    avgNodeDuration: number
  }
}

interface ExecutionVisualizationProps {
  nodes: WorkflowNode[]
  edges: Edge[]
  executionSession?: ExecutionSession
  onExecute?: () => void
  onPause?: () => void
  onStop?: () => void
  onRetry?: () => void
  className?: string
}

const ExecutionMetrics: React.FC<{ session: ExecutionSession }> = ({ session }) => {
  const { metrics } = session
  const successRate = metrics.totalNodes > 0 
    ? ((metrics.completedNodes / metrics.totalNodes) * 100).toFixed(1)
    : '0'

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`
  }

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Success Rate</p>
            <p className="text-2xl font-bold text-green-600">{successRate}%</p>
          </div>
          <Target className="w-8 h-8 text-green-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Total Duration</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatDuration(metrics.totalDuration)}
            </p>
          </div>
          <Timer className="w-8 h-8 text-blue-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Avg Node Time</p>
            <p className="text-2xl font-bold text-purple-600">
              {formatDuration(metrics.avgNodeDuration)}
            </p>
          </div>
          <BarChart3 className="w-8 h-8 text-purple-500" />
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-600">Nodes Processed</p>
            <p className="text-2xl font-bold text-gray-700">
              {metrics.completedNodes}/{metrics.totalNodes}
            </p>
          </div>
          <Activity className="w-8 h-8 text-gray-500" />
        </div>
      </div>
    </div>
  )
}

const ExecutionTimeline: React.FC<{ steps: ExecutionStep[] }> = ({ steps }) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())

  const toggleStep = (stepId: string) => {
    const newExpanded = new Set(expandedSteps)
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId)
    } else {
      newExpanded.add(stepId)
    }
    setExpandedSteps(newExpanded)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'skipped':
        return <AlertCircle className="w-4 h-4 text-gray-400" />
      default:
        return <Clock className="w-4 h-4 text-gray-300" />
    }
  }

  const getStatusBorder = (status: string) => {
    switch (status) {
      case 'running':
        return 'border-blue-200 bg-blue-50'
      case 'completed':
        return 'border-green-200 bg-green-50'
      case 'failed':
        return 'border-red-200 bg-red-50'
      case 'skipped':
        return 'border-gray-200 bg-gray-50'
      default:
        return 'border-gray-200 bg-white'
    }
  }

  return (
    <div className="space-y-2">
      {steps.map((step, index) => {
        const isExpanded = expandedSteps.has(step.id)
        const duration = step.duration || 0

        return (
          <div
            key={step.id}
            className={`border rounded-lg p-4 transition-all ${getStatusBorder(step.status)}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-200 text-sm font-medium">
                  {index + 1}
                </div>
                {getStatusIcon(step.status)}
                <div>
                  <p className="font-medium text-gray-900">{step.nodeName}</p>
                  <p className="text-sm text-gray-500 capitalize">{step.nodeType} node</p>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                {duration > 0 && (
                  <div className="text-sm text-gray-600">
                    {duration < 1000 ? `${duration}ms` : `${(duration / 1000).toFixed(1)}s`}
                  </div>
                )}
                
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  step.status === 'completed' ? 'bg-green-100 text-green-700' :
                  step.status === 'failed' ? 'bg-red-100 text-red-700' :
                  step.status === 'running' ? 'bg-blue-100 text-blue-700' :
                  step.status === 'skipped' ? 'bg-gray-100 text-gray-700' :
                  'bg-gray-100 text-gray-500'
                }`}>
                  {step.status}
                </div>

                <button
                  onClick={() => toggleStep(step.id)}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  {isExpanded ? 
                    <ChevronUp className="w-4 h-4" /> : 
                    <ChevronDown className="w-4 h-4" />
                  }
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="mt-4 border-t pt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Input/Output Data */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Data Flow</h4>
                  {step.inputData && (
                    <div className="mb-2">
                      <p className="text-sm text-gray-600 mb-1">Input:</p>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(step.inputData, null, 2)}
                      </pre>
                    </div>
                  )}
                  {step.outputData && (
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Output:</p>
                      <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
                        {JSON.stringify(step.outputData, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>

                {/* Metrics and Timing */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Execution Details</h4>
                  <div className="space-y-2 text-sm">
                    {step.startTime && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Started:</span>
                        <span>{step.startTime.toLocaleTimeString()}</span>
                      </div>
                    )}
                    {step.endTime && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Completed:</span>
                        <span>{step.endTime.toLocaleTimeString()}</span>
                      </div>
                    )}
                    {step.metrics && (
                      <>
                        {step.metrics.memoryUsage && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Memory:</span>
                            <span>{step.metrics.memoryUsage} MB</span>
                          </div>
                        )}
                        {step.metrics.apiCalls && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">API Calls:</span>
                            <span>{step.metrics.apiCalls}</span>
                          </div>
                        )}
                        {step.metrics.dataProcessed && (
                          <div className="flex justify-between">
                            <span className="text-gray-600">Data Processed:</span>
                            <span>{step.metrics.dataProcessed} records</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {step.error && (
                    <div className="mt-3">
                      <p className="text-sm text-gray-600 mb-1">Error:</p>
                      <div className="text-sm text-red-700 bg-red-50 p-2 rounded">
                        {step.error}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

const LiveExecutionStatus: React.FC<{ session: ExecutionSession }> = ({ session }) => {
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  const elapsedTime = session.startTime 
    ? currentTime.getTime() - session.startTime.getTime()
    : 0

  const formatElapsed = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  const currentStep = session.steps.find(step => step.status === 'running')
  const progress = (session.metrics.completedNodes / session.metrics.totalNodes) * 100

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full animate-pulse ${
            session.status === 'running' ? 'bg-blue-500' :
            session.status === 'completed' ? 'bg-green-500' :
            session.status === 'failed' ? 'bg-red-500' :
            'bg-gray-400'
          }`}></div>
          <h3 className="font-semibold text-gray-900">
            {session.status === 'running' ? 'Execution In Progress' :
             session.status === 'completed' ? 'Execution Completed' :
             session.status === 'failed' ? 'Execution Failed' :
             'Execution Paused'
            }
          </h3>
        </div>
        <div className="text-sm text-gray-600">
          Elapsed: {formatElapsed(elapsedTime)}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-sm text-gray-600 mb-1">
          <span>Progress: {session.metrics.completedNodes}/{session.metrics.totalNodes} nodes</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              session.status === 'failed' ? 'bg-red-500' :
              session.status === 'completed' ? 'bg-green-500' :
              'bg-blue-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {currentStep && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
            <span className="text-sm font-medium text-blue-900">
              Currently executing: {currentStep.nodeName}
            </span>
          </div>
          <div className="text-xs text-blue-700 mt-1">
            {currentStep.nodeType} node • Started {
              currentStep.startTime 
                ? Math.floor((currentTime.getTime() - currentStep.startTime.getTime()) / 1000)
                : 0
            }s ago
          </div>
        </div>
      )}
    </div>
  )
}

export default function ExecutionVisualization({
  nodes,
  edges,
  executionSession,
  onExecute,
  onPause,
  onStop,
  onRetry,
  className = ''
}: ExecutionVisualizationProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'metrics'>('overview')

  const canExecute = nodes.length > 0 && (!executionSession || 
    ['completed', 'failed', 'cancelled'].includes(executionSession.status))
  
  const canPause = executionSession?.status === 'running'
  const canStop = executionSession && ['running', 'paused'].includes(executionSession.status)
  const canRetry = executionSession?.status === 'failed'

  return (
    <div className={`bg-gray-50 ${className}`}>
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Activity className="w-5 h-5 mr-2" />
            Execution Monitor
          </h2>

          <div className="flex items-center space-x-2">
            <button
              onClick={onExecute}
              disabled={!canExecute}
              className="flex items-center space-x-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Play className="w-4 h-4" />
              <span>Execute</span>
            </button>

            {canPause && (
              <button
                onClick={onPause}
                className="flex items-center space-x-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                <Pause className="w-4 h-4" />
                <span>Pause</span>
              </button>
            )}

            {canStop && (
              <button
                onClick={onStop}
                className="flex items-center space-x-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                <Square className="w-4 h-4" />
                <span>Stop</span>
              </button>
            )}

            {canRetry && (
              <button
                onClick={onRetry}
                className="flex items-center space-x-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Retry</span>
              </button>
            )}

            <button
              className="p-2 text-gray-600 hover:text-gray-800"
              title="Export execution data"
            >
              <Download className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-6 mt-4 border-b border-gray-200">
          {[
            { id: 'overview', label: 'Overview', icon: Eye },
            { id: 'timeline', label: 'Timeline', icon: Clock },
            { id: 'metrics', label: 'Metrics', icon: TrendingUp }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 pb-3 border-b-2 transition-colors ${
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
      <div className="p-6">
        {!executionSession ? (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Execution Data
            </h3>
            <p className="text-gray-600 mb-4">
              Execute your workflow to see real-time monitoring and metrics
            </p>
            <button
              onClick={onExecute}
              disabled={!canExecute}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed mx-auto"
            >
              <Play className="w-5 h-5" />
              <span>Start Execution</span>
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <LiveExecutionStatus session={executionSession} />
                <ExecutionMetrics session={executionSession} />
              </div>
            )}

            {activeTab === 'timeline' && (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Execution Timeline
                  </h3>
                  <p className="text-gray-600">
                    Step-by-step execution details with timing and data flow
                  </p>
                </div>
                <ExecutionTimeline steps={executionSession.steps} />
              </div>
            )}

            {activeTab === 'metrics' && (
              <div>
                <ExecutionMetrics session={executionSession} />
                
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    Detailed Metrics
                  </h3>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Total Nodes:</p>
                      <p className="font-semibold">{executionSession.metrics.totalNodes}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Completed:</p>
                      <p className="font-semibold text-green-600">{executionSession.metrics.completedNodes}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Failed:</p>
                      <p className="font-semibold text-red-600">{executionSession.metrics.failedNodes}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Skipped:</p>
                      <p className="font-semibold text-gray-600">{executionSession.metrics.skippedNodes}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}