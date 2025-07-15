'use client'

import { useState } from 'react'
import { Play, Pause, Settings, RefreshCw, Zap } from 'lucide-react'
import { useAIJobStatus, useManageAIJob } from '@/hooks/use-ai'

export function AIJobManager() {
  const { data: jobStatus, isLoading } = useAIJobStatus()
  const manageJob = useManageAIJob()
  const [showConfig, setShowConfig] = useState(false)
  
  const jobStatusData = jobStatus as any

  const handleJobAction = (action: string, config?: any) => {
    manageJob.mutate({ action, config })
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Zap className="w-5 h-5 text-purple-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">AI Job Manager</h3>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${
              jobStatusData?.isRunning ? 'bg-green-500' : 'bg-gray-400'
            }`}></div>
            <span className="text-sm text-gray-600">
              {jobStatusData?.isRunning ? 'Running' : 'Stopped'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Status */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Current Status</h4>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Status:</span>
                <span className={`ml-2 font-medium ${
                  jobStatusData?.isRunning ? 'text-green-600' : 'text-gray-600'
                }`}>
                  {jobStatusData?.isRunning ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div>
                <span className="text-gray-600">Interval:</span>
                <span className="ml-2 font-medium">
                  {jobStatusData?.config?.intervalMinutes || 30} minutes
                </span>
              </div>
              <div>
                <span className="text-gray-600">Batch Size:</span>
                <span className="ml-2 font-medium">
                  {jobStatusData?.config?.batchSize || 5} leads
                </span>
              </div>
              <div>
                <span className="text-gray-600">Daily Limit:</span>
                <span className="ml-2 font-medium">
                  {jobStatusData?.config?.maxDailyAnalysis || 100} analyses
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Controls</h4>
          <div className="flex flex-wrap gap-3">
            {jobStatusData?.isRunning ? (
              <button
                onClick={() => handleJobAction('stop')}
                disabled={manageJob.isPending}
                className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <Pause className="w-4 h-4 mr-2" />
                Stop Job
              </button>
            ) : (
              <button
                onClick={() => handleJobAction('start')}
                disabled={manageJob.isPending}
                className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Job
              </button>
            )}

            <button
              onClick={() => handleJobAction('restart')}
              disabled={manageJob.isPending}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Restart
            </button>

            <button
              onClick={() => handleJobAction('run_manual')}
              disabled={manageJob.isPending}
              className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <Zap className="w-4 h-4 mr-2" />
              Run Now
            </button>

            <button
              onClick={() => setShowConfig(!showConfig)}
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configure
            </button>
          </div>
        </div>

        {/* Configuration */}
        {showConfig && (
          <div>
            <h4 className="font-medium text-gray-900 mb-3">Configuration</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Interval (minutes)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="1440"
                    defaultValue={jobStatusData?.config?.intervalMinutes || 30}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batch Size
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    defaultValue={jobStatusData?.config?.batchSize || 5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Daily Analysis Limit
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="1000"
                    defaultValue={jobStatusData?.config?.maxDailyAnalysis || 100}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Re-analyze After (days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    defaultValue={jobStatusData?.config?.reanalyzeAfterDays || 7}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    // Implement config save logic
                    setShowConfig(false)
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="text-sm text-gray-600 bg-blue-50 rounded-lg p-4">
          <p className="font-medium text-blue-900 mb-1">About AI Auto-Analysis</p>
          <p>
            The AI job automatically analyzes new leads and re-analyzes existing leads 
            based on your configuration. It helps maintain up-to-date lead scores and 
            qualification status without manual intervention.
          </p>
        </div>
      </div>
    </div>
  )
}