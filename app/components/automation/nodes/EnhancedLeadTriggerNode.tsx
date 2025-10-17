'use client'

import React, { useState, useCallback } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Settings, Users, Filter, Sparkles, AlertCircle, Check, TrendingUp, Eye, Brain, Zap } from 'lucide-react'
import type { AdvancedWorkflowNode, SmartCondition } from '../../../lib/types/advanced-automation'

interface LeadTriggerNodeData {
  label: string
  sources: string[]
  qualificationCriteria: SmartCondition[]
  enrichmentEnabled: boolean
  scoringModel: 'basic' | 'advanced' | 'ai_powered' | 'custom'
  filters: LeadFilter[]
  aiSettings: {
    enabled: boolean
    model: string
    qualificationPrompt: string
    confidence: number
  }
  realTimeProcessing: boolean
  batchSize: number
  rateLimit: number
  config: any
}

interface LeadFilter {
  id: string
  field: string
  operator: string
  value: any
  enabled: boolean
  description: string
}

export function EnhancedLeadTriggerNode({ 
  data, 
  isConnectable, 
  selected 
}: NodeProps<LeadTriggerNodeData>) {
  const [isConfigOpen, setIsConfigOpen] = useState(false)
  const [stats, setStats] = useState({
    totalLeads: 1247,
    qualifiedLeads: 342,
    recentActivity: 23,
    qualificationRate: 27.4
  })

  const handleConfigClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsConfigOpen(true)
  }, [])

  const getTriggerStatus = () => {
    if (!data.sources?.length) return { status: 'warning', message: 'No sources configured' }
    if (!data.qualificationCriteria?.length) return { status: 'warning', message: 'No qualification criteria' }
    return { status: 'active', message: 'Monitoring for leads' }
  }

  const getSourceIcon = (source: string) => {
    const icons: Record<string, string> = {
      website: '🌐',
      facebook: '📘',
      google: '🔍',
      referral: '👥',
      offline: '📍',
      api: '🔌',
      webhook: '🪝'
    }
    return icons[source] || '📊'
  }

  const { status, message } = getTriggerStatus()

  return (
    <div className={`bg-white rounded-lg border-2 shadow-lg min-w-[320px] ${
      selected 
        ? 'border-blue-500 shadow-blue-200' 
        : status === 'active' 
        ? 'border-green-400' 
        : 'border-orange-400'
    }`}>
      {/* Node Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${
            status === 'active' ? 'bg-green-100' : 'bg-orange-100'
          }`}>
            <Users className={`w-5 h-5 ${
              status === 'active' ? 'text-green-600' : 'text-orange-600'
            }`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center">
              {data.label || 'Lead Trigger'}
              {data.aiSettings?.enabled && (
                <Sparkles className="w-4 h-4 ml-2 text-purple-600" />
              )}
            </h3>
            <div className="flex items-center space-x-2 text-sm">
              {status === 'active' ? (
                <Check className="w-3 h-3 text-green-600" />
              ) : (
                <AlertCircle className="w-3 h-3 text-orange-600" />
              )}
              <span className="text-gray-600">{message}</span>
            </div>
          </div>
        </div>
        
        <button
          onClick={handleConfigClick}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Sources Display */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Lead Sources</span>
          <span className="text-xs text-gray-500">
            {data.sources?.length || 0} configured
          </span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {data.sources?.length > 0 ? (
            data.sources.slice(0, 4).map((source, index) => (
              <div
                key={index}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
              >
                <span className="mr-1">{getSourceIcon(source)}</span>
                {source}
              </div>
            ))
          ) : (
            <span className="text-xs text-gray-500 italic">No sources configured</span>
          )}
          
          {data.sources?.length > 4 && (
            <div className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
              +{data.sources.length - 4} more
            </div>
          )}
        </div>
      </div>

      {/* Qualification Criteria */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Qualification</span>
          </div>
          {data.aiSettings?.enabled && (
            <div className="flex items-center space-x-1">
              <Brain className="w-3 h-3 text-purple-600" />
              <span className="text-xs text-purple-600">AI Powered</span>
            </div>
          )}
        </div>
        
        <div className="space-y-2">
          {data.qualificationCriteria?.length > 0 ? (
            data.qualificationCriteria.slice(0, 2).map((criteria, index) => (
              <div key={index} className="bg-gray-50 px-3 py-2 rounded text-xs">
                <div className="font-medium text-gray-700">
                  {criteria.field} {criteria.operator} {criteria.value}
                </div>
                {criteria.aiEvaluation?.enabled && (
                  <div className="text-purple-600 mt-1">
                    AI confidence: {Math.round((criteria.aiEvaluation.confidenceThreshold || 0.8) * 100)}%
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-xs text-gray-500 italic bg-gray-50 px-3 py-2 rounded">
              No qualification criteria set
            </div>
          )}
          
          {data.qualificationCriteria?.length > 2 && (
            <div className="text-xs text-gray-500 text-center">
              +{data.qualificationCriteria.length - 2} more criteria
            </div>
          )}
        </div>
      </div>

      {/* Processing Settings */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-gray-500">Scoring Model:</span>
            <div className="flex items-center mt-1">
              {data.scoringModel === 'ai_powered' && (
                <Sparkles className="w-3 h-3 text-purple-600 mr-1" />
              )}
              <span className="font-medium text-gray-700 capitalize">
                {data.scoringModel?.replace('_', ' ') || 'Basic'}
              </span>
            </div>
          </div>
          
          <div>
            <span className="text-gray-500">Processing:</span>
            <div className="flex items-center mt-1">
              {data.realTimeProcessing ? (
                <Zap className="w-3 h-3 text-green-600 mr-1" />
              ) : (
                <div className="w-3 h-3 rounded-full bg-orange-400 mr-1" />
              )}
              <span className="font-medium text-gray-700">
                {data.realTimeProcessing ? 'Real-time' : 'Batch'}
              </span>
            </div>
          </div>
        </div>
        
        {data.enrichmentEnabled && (
          <div className="mt-2 flex items-center text-xs">
            <div className="w-2 h-2 rounded-full bg-blue-400 mr-2" />
            <span className="text-gray-600">Data enrichment enabled</span>
          </div>
        )}
      </div>

      {/* Stats Display */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{stats.totalLeads.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Total Leads</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{stats.qualifiedLeads}</div>
            <div className="text-xs text-gray-500">Qualified</div>
          </div>
        </div>
        
        <div className="mt-3 bg-green-50 px-3 py-2 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                {stats.qualificationRate}% Qualification Rate
              </span>
            </div>
            <div className="text-xs text-green-600">
              {stats.recentActivity} recent
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Features Indicator */}
      {(data.aiSettings?.enabled || data.enrichmentEnabled || data.filters?.length > 0) && (
        <div className="px-4 py-2 bg-gradient-to-r from-purple-50 to-blue-50 rounded-b-lg border-t">
          <div className="flex items-center justify-center space-x-4 text-xs">
            {data.aiSettings?.enabled && (
              <div className="flex items-center text-purple-600">
                <Brain className="w-3 h-3 mr-1" />
                AI Enhanced
              </div>
            )}
            {data.enrichmentEnabled && (
              <div className="flex items-center text-blue-600">
                <Zap className="w-3 h-3 mr-1" />
                Auto-Enrich
              </div>
            )}
            {data.filters?.length > 0 && (
              <div className="flex items-center text-green-600">
                <Filter className="w-3 h-3 mr-1" />
                {data.filters.length} Filters
              </div>
            )}
          </div>
        </div>
      )}

      {/* React Flow Handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="lead-output"
        style={{
          background: '#10B981',
          width: 12,
          height: 12,
          border: '2px solid white'
        }}
        isConnectable={isConnectable}
      />
      
      <Handle
        type="source"
        position={Position.Bottom}
        id="qualified-leads"
        style={{
          background: '#3B82F6',
          width: 12,
          height: 12,
          border: '2px solid white',
          left: '25%'
        }}
        isConnectable={isConnectable}
      />
      
      <Handle
        type="source"
        position={Position.Bottom}
        id="unqualified-leads"
        style={{
          background: '#EF4444',
          width: 12,
          height: 12,
          border: '2px solid white',
          left: '75%'
        }}
        isConnectable={isConnectable}
      />
    </div>
  )
}

// Configuration Panel Component
export function LeadTriggerConfigPanel({
  node,
  onUpdate,
  onClose
}: {
  node: AdvancedWorkflowNode
  onUpdate: (data: Partial<LeadTriggerNodeData>) => void
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = useState<'sources' | 'qualification' | 'ai' | 'processing'>('sources')
  const data = node.data as LeadTriggerNodeData

  const availableSources = [
    { id: 'website', label: 'Website Forms', icon: '🌐', description: 'Contact forms, landing pages' },
    { id: 'facebook', label: 'Facebook Leads', icon: '📘', description: 'Facebook lead ads' },
    { id: 'google', label: 'Google Ads', icon: '🔍', description: 'Google lead forms' },
    { id: 'linkedin', label: 'LinkedIn', icon: '💼', description: 'LinkedIn lead gen forms' },
    { id: 'referral', label: 'Referrals', icon: '👥', description: 'Partner referrals' },
    { id: 'offline', label: 'Offline Sources', icon: '📍', description: 'Walk-ins, phone calls' },
    { id: 'api', label: 'API Integration', icon: '🔌', description: 'Third-party APIs' },
    { id: 'webhook', label: 'Webhooks', icon: '🪝', description: 'Custom webhook endpoints' }
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-3xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Lead Trigger Configuration
              </h2>
              <p className="text-sm text-gray-600">
                Configure advanced lead detection and qualification
              </p>
            </div>
          </div>
          
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {[
              { id: 'sources', label: 'Lead Sources', icon: Users },
              { id: 'qualification', label: 'Qualification', icon: Filter },
              { id: 'ai', label: 'AI Settings', icon: Brain },
              { id: 'processing', label: 'Processing', icon: Settings }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'sources' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Select Lead Sources</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Choose which sources this trigger should monitor for new leads.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {availableSources.map((source) => (
                  <label
                    key={source.id}
                    className={`relative flex items-start p-4 border rounded-lg cursor-pointer hover:bg-gray-50 ${
                      data.sources?.includes(source.id) 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center h-5">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        checked={data.sources?.includes(source.id) || false}
                        onChange={(e) => {
                          const newSources = e.target.checked
                            ? [...(data.sources || []), source.id]
                            : (data.sources || []).filter(s => s !== source.id)
                          onUpdate({ sources: newSources })
                        }}
                      />
                    </div>
                    <div className="ml-3 flex-1">
                      <div className="flex items-center">
                        <span className="text-lg mr-2">{source.icon}</span>
                        <span className="font-medium text-gray-900">{source.label}</span>
                      </div>
                      <p className="text-sm text-gray-500">{source.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'qualification' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Qualification Criteria</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Set criteria to automatically qualify leads based on their properties and behavior.
                </p>
              </div>

              {/* Qualification criteria configuration would go here */}
              <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Filter className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Configure Qualification Rules</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Advanced condition builder will be integrated here
                </p>
              </div>
            </div>
          )}

          {activeTab === 'ai' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">AI Enhancement Settings</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Configure AI-powered lead qualification and enrichment features.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Brain className="w-8 h-8 text-purple-600" />
                    <div>
                      <div className="font-medium text-gray-900">AI Lead Qualification</div>
                      <div className="text-sm text-gray-500">Use AI to intelligently qualify leads</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.aiSettings?.enabled || false}
                      onChange={(e) => onUpdate({
                        aiSettings: {
                          ...data.aiSettings,
                          enabled: e.target.checked
                        }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {data.aiSettings?.enabled && (
                  <div className="bg-purple-50 p-4 rounded-lg space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        AI Model
                      </label>
                      <select
                        value={data.aiSettings?.model || 'gpt-4'}
                        onChange={(e) => onUpdate({
                          aiSettings: {
                            ...data.aiSettings,
                            model: e.target.value
                          }
                        })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="gpt-4">GPT-4 (Recommended)</option>
                        <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                        <option value="claude-3">Claude 3</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Qualification Prompt
                      </label>
                      <textarea
                        value={data.aiSettings?.qualificationPrompt || ''}
                        onChange={(e) => onUpdate({
                          aiSettings: {
                            ...data.aiSettings,
                            qualificationPrompt: e.target.value
                          }
                        })}
                        rows={4}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Describe how AI should qualify leads..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Confidence Threshold: {Math.round((data.aiSettings?.confidence || 0.8) * 100)}%
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={data.aiSettings?.confidence || 0.8}
                        onChange={(e) => onUpdate({
                          aiSettings: {
                            ...data.aiSettings,
                            confidence: parseFloat(e.target.value)
                          }
                        })}
                        className="w-full"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'processing' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Processing Settings</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Configure how leads are processed and handled by the system.
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Scoring Model</h4>
                    <select
                      value={data.scoringModel || 'basic'}
                      onChange={(e) => onUpdate({ scoringModel: e.target.value as any })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="basic">Basic Scoring</option>
                      <option value="advanced">Advanced Rules</option>
                      <option value="ai_powered">AI-Powered</option>
                      <option value="custom">Custom Model</option>
                    </select>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Processing Mode</h4>
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={data.realTimeProcessing || false}
                        onChange={(e) => onUpdate({ realTimeProcessing: e.target.checked })}
                        className="rounded border-gray-300 text-blue-600"
                      />
                      <span className="text-sm text-gray-700">Real-time Processing</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                      Process leads immediately as they arrive
                    </p>
                  </div>
                </div>

                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">Data Enrichment</h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.enrichmentEnabled || false}
                        onChange={(e) => onUpdate({ enrichmentEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>
                  <p className="text-sm text-gray-600">
                    Automatically enrich lead data with additional information from external sources
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Batch Size
                    </label>
                    <input
                      type="number"
                      value={data.batchSize || 100}
                      onChange={(e) => onUpdate({ batchSize: parseInt(e.target.value) })}
                      min="1"
                      max="1000"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Rate Limit (per minute)
                    </label>
                    <input
                      type="number"
                      value={data.rateLimit || 60}
                      onChange={(e) => onUpdate({ rateLimit: parseInt(e.target.value) })}
                      min="1"
                      max="1000"
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 px-6 py-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  )
}