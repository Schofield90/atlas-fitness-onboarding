'use client'

import React, { useState, useCallback } from 'react'
import { Handle, Position, NodeProps } from 'reactflow'
import { Mail, Settings, Sparkles, Clock, Users, TrendingUp, Zap, Eye, Brain, Target, Calendar } from 'lucide-react'
import type { AdvancedWorkflowNode } from '../../../lib/types/advanced-automation'

interface EmailActionNodeData {
  label: string
  emailTemplate?: {
    id: string
    name: string
    subject: string
    isAIGenerated: boolean
  }
  contentGeneration: {
    enabled: boolean
    provider: 'openai' | 'anthropic'
    personalizationLevel: 'basic' | 'advanced' | 'deep'
    contentType: 'promotional' | 'nurture' | 'transactional' | 'follow_up'
  }
  sendingStrategy: 'immediate' | 'optimal_time' | 'ai_determined' | 'scheduled'
  scheduledTime?: string
  personalization: {
    enabled: boolean
    dataPoints: string[]
    aiPersonalization: boolean
    dynamicContent: boolean
  }
  abTesting: {
    enabled: boolean
    variants: number
    testMetric: 'open_rate' | 'click_rate' | 'conversion_rate'
    sampleSize: number
  }
  deliverability: {
    reputation_check: boolean
    spam_scoring: boolean
    send_limit: number
    retry_failed: boolean
  }
  tracking: {
    opens: boolean
    clicks: boolean
    unsubscribes: boolean
    replies: boolean
  }
  config: any
}

export function EnhancedEmailActionNode({ 
  data, 
  isConnectable, 
  selected 
}: NodeProps<EmailActionNodeData>) {
  const [stats, setStats] = useState({
    sent: 1247,
    delivered: 1198,
    opened: 732,
    clicked: 156,
    openRate: 61.1,
    clickRate: 12.5
  })

  const [showPreview, setShowPreview] = useState(false)

  const getNodeStatus = () => {
    if (!data.emailTemplate) return { status: 'warning', message: 'No template selected' }
    if (data.sendingStrategy === 'scheduled' && !data.scheduledTime) {
      return { status: 'warning', message: 'Schedule not configured' }
    }
    return { status: 'ready', message: 'Ready to send' }
  }

  const getSendingIcon = () => {
    switch (data.sendingStrategy) {
      case 'immediate': return <Zap className="w-4 h-4 text-green-600" />
      case 'optimal_time': return <TrendingUp className="w-4 h-4 text-blue-600" />
      case 'ai_determined': return <Brain className="w-4 h-4 text-purple-600" />
      case 'scheduled': return <Calendar className="w-4 h-4 text-orange-600" />
      default: return <Clock className="w-4 h-4 text-gray-600" />
    }
  }

  const { status, message } = getNodeStatus()

  return (
    <div className={`bg-white rounded-lg border-2 shadow-lg min-w-[340px] ${
      selected 
        ? 'border-blue-500 shadow-blue-200' 
        : status === 'ready' 
        ? 'border-green-400' 
        : 'border-orange-400'
    }`}>
      {/* Node Header */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${
            status === 'ready' ? 'bg-green-100' : 'bg-orange-100'
          }`}>
            <Mail className={`w-5 h-5 ${
              status === 'ready' ? 'text-green-600' : 'text-orange-600'
            }`} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 flex items-center">
              {data.label || 'Email Action'}
              {data.contentGeneration?.enabled && (
                <Sparkles className="w-4 h-4 ml-2 text-purple-600" />
              )}
            </h3>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>{message}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {data.emailTemplate && (
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4" />
            </button>
          )}
          <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white rounded-lg transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Email Template Info */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Email Template</span>
          {data.emailTemplate?.isAIGenerated && (
            <div className="flex items-center space-x-1">
              <Sparkles className="w-3 h-3 text-purple-600" />
              <span className="text-xs text-purple-600">AI Generated</span>
            </div>
          )}
        </div>
        
        {data.emailTemplate ? (
          <div className="space-y-2">
            <div className="font-medium text-gray-900">{data.emailTemplate.name}</div>
            <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded">
              Subject: {data.emailTemplate.subject}
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-500 italic bg-gray-50 px-3 py-2 rounded">
            No template selected
          </div>
        )}
      </div>

      {/* Sending Strategy */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Sending Strategy</span>
          {getSendingIcon()}
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 capitalize">
            {data.sendingStrategy?.replace('_', ' ') || 'Immediate'}
          </span>
          {data.scheduledTime && (
            <span className="text-xs text-gray-500">
              {new Date(data.scheduledTime).toLocaleDateString()}
            </span>
          )}
        </div>
        
        {data.sendingStrategy === 'ai_determined' && (
          <div className="mt-2 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
            AI will determine optimal send time
          </div>
        )}
      </div>

      {/* Personalization & Features */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <span className="text-gray-500">Personalization:</span>
            <div className="flex items-center mt-1">
              {data.personalization?.aiPersonalization && (
                <Brain className="w-3 h-3 text-purple-600 mr-1" />
              )}
              <span className="font-medium text-gray-700 capitalize">
                {data.contentGeneration?.personalizationLevel || 'Basic'}
              </span>
            </div>
          </div>
          
          <div>
            <span className="text-gray-500">Content Type:</span>
            <div className="font-medium text-gray-700 capitalize mt-1">
              {data.contentGeneration?.contentType || 'Standard'}
            </div>
          </div>
        </div>

        {/* Feature Indicators */}
        <div className="flex items-center space-x-4 mt-3 text-xs">
          {data.abTesting?.enabled && (
            <div className="flex items-center text-blue-600">
              <Target className="w-3 h-3 mr-1" />
              A/B Testing
            </div>
          )}
          {data.personalization?.dynamicContent && (
            <div className="flex items-center text-green-600">
              <Zap className="w-3 h-3 mr-1" />
              Dynamic
            </div>
          )}
          {data.deliverability?.spam_scoring && (
            <div className="flex items-center text-orange-600">
              <span className="w-3 h-3 rounded-full bg-orange-400 mr-1" />
              Spam Check
            </div>
          )}
        </div>
      </div>

      {/* Performance Stats */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className="text-center">
            <div className="text-lg font-bold text-gray-900">{stats.sent.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Sent</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-green-600">{stats.delivered.toLocaleString()}</div>
            <div className="text-xs text-gray-500">Delivered</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-blue-50 px-3 py-2 rounded-lg text-center">
            <div className="text-sm font-bold text-blue-800">{stats.openRate}%</div>
            <div className="text-xs text-blue-600">Open Rate</div>
          </div>
          <div className="bg-green-50 px-3 py-2 rounded-lg text-center">
            <div className="text-sm font-bold text-green-800">{stats.clickRate}%</div>
            <div className="text-xs text-green-600">Click Rate</div>
          </div>
        </div>
      </div>

      {/* A/B Testing Info */}
      {data.abTesting?.enabled && (
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-gray-700">A/B Test</span>
            </div>
            <span className="text-xs text-gray-500">
              {data.abTesting.variants} variants
            </span>
          </div>
          
          <div className="text-xs text-gray-600">
            Testing: {data.abTesting.testMetric?.replace('_', ' ')} • 
            Sample: {data.abTesting.sampleSize}%
          </div>
        </div>
      )}

      {/* Preview Panel */}
      {showPreview && data.emailTemplate && (
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Email Preview</span>
            <button
              onClick={() => setShowPreview(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="bg-white border rounded-lg p-3 text-sm">
            <div className="border-b pb-2 mb-2">
              <div className="font-medium text-gray-900">
                Subject: {data.emailTemplate.subject}
              </div>
            </div>
            <div className="text-gray-600 text-xs">
              Preview content would be rendered here with personalization tokens replaced...
            </div>
          </div>
        </div>
      )}

      {/* Advanced Features Indicator */}
      <div className="px-4 py-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded-b-lg">
        <div className="flex items-center justify-center space-x-4 text-xs">
          {data.contentGeneration?.enabled && (
            <div className="flex items-center text-purple-600">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Content
            </div>
          )}
          {data.personalization?.enabled && (
            <div className="flex items-center text-blue-600">
              <Users className="w-3 h-3 mr-1" />
              Personalized
            </div>
          )}
          {data.tracking?.opens && (
            <div className="flex items-center text-green-600">
              <Eye className="w-3 h-3 mr-1" />
              Tracked
            </div>
          )}
        </div>
      </div>

      {/* React Flow Handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="email-input"
        style={{
          background: '#3B82F6',
          width: 12,
          height: 12,
          border: '2px solid white'
        }}
        isConnectable={isConnectable}
      />
      
      <Handle
        type="source"
        position={Position.Right}
        id="email-sent"
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
        id="email-opened"
        style={{
          background: '#F59E0B',
          width: 12,
          height: 12,
          border: '2px solid white',
          left: '33%'
        }}
        isConnectable={isConnectable}
      />
      
      <Handle
        type="source"
        position={Position.Bottom}
        id="email-clicked"
        style={{
          background: '#8B5CF6',
          width: 12,
          height: 12,
          border: '2px solid white',
          left: '66%'
        }}
        isConnectable={isConnectable}
      />
    </div>
  )
}

// Configuration Panel Component
export function EmailActionConfigPanel({
  node,
  onUpdate,
  onClose
}: {
  node: AdvancedWorkflowNode
  onUpdate: (data: Partial<EmailActionNodeData>) => void
  onClose: () => void
}) {
  const [activeTab, setActiveTab] = useState<'template' | 'content' | 'personalization' | 'sending' | 'testing' | 'tracking'>('template')
  const data = node.data as EmailActionNodeData

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-4xl bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              <Mail className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Email Action Configuration
              </h2>
              <p className="text-sm text-gray-600">
                Configure advanced email sending with AI content generation and personalization
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
          <nav className="-mb-px flex space-x-8 px-6 overflow-x-auto" aria-label="Tabs">
            {[
              { id: 'template', label: 'Template', icon: Mail },
              { id: 'content', label: 'AI Content', icon: Sparkles },
              { id: 'personalization', label: 'Personalization', icon: Users },
              { id: 'sending', label: 'Sending', icon: Clock },
              { id: 'testing', label: 'A/B Testing', icon: Target },
              { id: 'tracking', label: 'Tracking', icon: Eye }
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
          {activeTab === 'template' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Email Template Selection</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Choose an existing template or create a new one with AI assistance.
                </p>
              </div>

              {/* Email Selector would be integrated here */}
              <div className="bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg p-8 text-center">
                <Mail className="mx-auto h-12 w-12 text-blue-400" />
                <h3 className="mt-2 text-sm font-medium text-blue-900">Email Template Selector</h3>
                <p className="mt-1 text-sm text-blue-700">
                  The EmailSelector component will be integrated here
                </p>
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">AI Content Generation</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Configure AI-powered content generation and optimization settings.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Sparkles className="w-8 h-8 text-purple-600" />
                    <div>
                      <div className="font-medium text-gray-900">AI Content Generation</div>
                      <div className="text-sm text-gray-500">Generate personalized email content using AI</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.contentGeneration?.enabled || false}
                      onChange={(e) => onUpdate({
                        contentGeneration: {
                          ...data.contentGeneration,
                          enabled: e.target.checked
                        }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  </label>
                </div>

                {data.contentGeneration?.enabled && (
                  <div className="bg-purple-50 p-4 rounded-lg space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          AI Provider
                        </label>
                        <select
                          value={data.contentGeneration?.provider || 'openai'}
                          onChange={(e) => onUpdate({
                            contentGeneration: {
                              ...data.contentGeneration,
                              provider: e.target.value as 'openai' | 'anthropic'
                            }
                          })}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="openai">OpenAI (GPT-4)</option>
                          <option value="anthropic">Anthropic (Claude)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Content Type
                        </label>
                        <select
                          value={data.contentGeneration?.contentType || 'nurture'}
                          onChange={(e) => onUpdate({
                            contentGeneration: {
                              ...data.contentGeneration,
                              contentType: e.target.value as any
                            }
                          })}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="promotional">Promotional</option>
                          <option value="nurture">Nurture</option>
                          <option value="transactional">Transactional</option>
                          <option value="follow_up">Follow-up</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Personalization Level
                      </label>
                      <div className="flex space-x-4">
                        {['basic', 'advanced', 'deep'].map((level) => (
                          <label key={level} className="flex items-center">
                            <input
                              type="radio"
                              name="personalizationLevel"
                              value={level}
                              checked={data.contentGeneration?.personalizationLevel === level}
                              onChange={(e) => onUpdate({
                                contentGeneration: {
                                  ...data.contentGeneration,
                                  personalizationLevel: e.target.value as any
                                }
                              })}
                              className="rounded-full border-gray-300 text-purple-600"
                            />
                            <span className="ml-2 text-sm text-gray-700 capitalize">{level}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'personalization' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Personalization Settings</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Configure how emails are personalized for each recipient.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Users className="w-8 h-8 text-blue-600" />
                    <div>
                      <div className="font-medium text-gray-900">Email Personalization</div>
                      <div className="text-sm text-gray-500">Customize content for each recipient</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.personalization?.enabled || false}
                      onChange={(e) => onUpdate({
                        personalization: {
                          ...data.personalization,
                          enabled: e.target.checked
                        }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {data.personalization?.enabled && (
                  <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Data Points for Personalization
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                          'first_name', 'last_name', 'company', 'job_title', 
                          'industry', 'location', 'interests', 'lead_score',
                          'last_activity', 'referral_source'
                        ].map((dataPoint) => (
                          <label key={dataPoint} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={data.personalization?.dataPoints?.includes(dataPoint) || false}
                              onChange={(e) => {
                                const currentPoints = data.personalization?.dataPoints || []
                                const newPoints = e.target.checked
                                  ? [...currentPoints, dataPoint]
                                  : currentPoints.filter(p => p !== dataPoint)
                                onUpdate({
                                  personalization: {
                                    ...data.personalization,
                                    dataPoints: newPoints
                                  }
                                })
                              }}
                              className="rounded border-gray-300 text-blue-600"
                            />
                            <span className="ml-2 text-sm text-gray-700 capitalize">
                              {dataPoint.replace('_', ' ')}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="border-t pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">AI-Powered Personalization</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={data.personalization?.aiPersonalization || false}
                            onChange={(e) => onUpdate({
                              personalization: {
                                ...data.personalization,
                                aiPersonalization: e.target.checked
                              }
                            })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Dynamic Content Blocks</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={data.personalization?.dynamicContent || false}
                            onChange={(e) => onUpdate({
                              personalization: {
                                ...data.personalization,
                                dynamicContent: e.target.checked
                              }
                            })}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'sending' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Sending Strategy</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Configure when and how emails are sent for optimal engagement.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Sending Strategy
                  </label>
                  <div className="space-y-3">
                    {[
                      { 
                        value: 'immediate', 
                        label: 'Send Immediately', 
                        description: 'Send as soon as the workflow triggers',
                        icon: Zap 
                      },
                      { 
                        value: 'optimal_time', 
                        label: 'Optimal Time', 
                        description: 'Send during recipient\'s optimal engagement hours',
                        icon: TrendingUp 
                      },
                      { 
                        value: 'ai_determined', 
                        label: 'AI-Determined', 
                        description: 'Let AI analyze and choose the best send time',
                        icon: Brain 
                      },
                      { 
                        value: 'scheduled', 
                        label: 'Scheduled Time', 
                        description: 'Send at a specific date and time',
                        icon: Calendar 
                      }
                    ].map(({ value, label, description, icon: Icon }) => (
                      <label key={value} className="flex items-start p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                        <input
                          type="radio"
                          name="sendingStrategy"
                          value={value}
                          checked={data.sendingStrategy === value}
                          onChange={(e) => onUpdate({ sendingStrategy: e.target.value as any })}
                          className="mt-1 rounded-full border-gray-300 text-blue-600"
                        />
                        <div className="ml-3 flex-1">
                          <div className="flex items-center">
                            <Icon className="w-4 h-4 mr-2 text-gray-600" />
                            <span className="font-medium text-gray-900">{label}</span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">{description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {data.sendingStrategy === 'scheduled' && (
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Scheduled Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={data.scheduledTime || ''}
                      onChange={(e) => onUpdate({ scheduledTime: e.target.value })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                  </div>
                )}

                {data.sendingStrategy === 'ai_determined' && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center mb-2">
                      <Brain className="w-5 h-5 text-purple-600 mr-2" />
                      <span className="font-medium text-purple-900">AI Send Time Optimization</span>
                    </div>
                    <p className="text-sm text-purple-700">
                      AI will analyze recipient behavior patterns, time zones, and historical engagement 
                      data to determine the optimal send time for maximum open and click rates.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'testing' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">A/B Testing</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Set up A/B tests to optimize email performance and engagement.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Target className="w-8 h-8 text-blue-600" />
                    <div>
                      <div className="font-medium text-gray-900">Enable A/B Testing</div>
                      <div className="text-sm text-gray-500">Test different versions to optimize performance</div>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={data.abTesting?.enabled || false}
                      onChange={(e) => onUpdate({
                        abTesting: {
                          ...data.abTesting,
                          enabled: e.target.checked
                        }
                      })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {data.abTesting?.enabled && (
                  <div className="bg-blue-50 p-4 rounded-lg space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Number of Variants
                        </label>
                        <select
                          value={data.abTesting?.variants || 2}
                          onChange={(e) => onUpdate({
                            abTesting: {
                              ...data.abTesting,
                              variants: parseInt(e.target.value)
                            }
                          })}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value={2}>2 Variants (A/B)</option>
                          <option value={3}>3 Variants (A/B/C)</option>
                          <option value={4}>4 Variants (A/B/C/D)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Test Metric
                        </label>
                        <select
                          value={data.abTesting?.testMetric || 'open_rate'}
                          onChange={(e) => onUpdate({
                            abTesting: {
                              ...data.abTesting,
                              testMetric: e.target.value as any
                            }
                          })}
                          className="block w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="open_rate">Open Rate</option>
                          <option value="click_rate">Click Rate</option>
                          <option value="conversion_rate">Conversion Rate</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Test Sample Size: {data.abTesting?.sampleSize || 20}%
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="10"
                        value={data.abTesting?.sampleSize || 20}
                        onChange={(e) => onUpdate({
                          abTesting: {
                            ...data.abTesting,
                            sampleSize: parseInt(e.target.value)
                          }
                        })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>10%</span>
                        <span>100%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'tracking' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Email Tracking</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Configure which email interactions to track and analyze.
                </p>
              </div>

              <div className="space-y-4">
                {[
                  { 
                    key: 'opens', 
                    label: 'Track Opens', 
                    description: 'Monitor when recipients open emails',
                    icon: Eye 
                  },
                  { 
                    key: 'clicks', 
                    label: 'Track Clicks', 
                    description: 'Track clicks on links and CTAs',
                    icon: Target 
                  },
                  { 
                    key: 'unsubscribes', 
                    label: 'Track Unsubscribes', 
                    description: 'Monitor unsubscribe requests',
                    icon: Users 
                  },
                  { 
                    key: 'replies', 
                    label: 'Track Replies', 
                    description: 'Monitor email replies and responses',
                    icon: Mail 
                  }
                ].map(({ key, label, description, icon: Icon }) => (
                  <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Icon className="w-6 h-6 text-gray-600" />
                      <div>
                        <div className="font-medium text-gray-900">{label}</div>
                        <div className="text-sm text-gray-500">{description}</div>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.tracking?.[key as keyof typeof data.tracking] || false}
                        onChange={(e) => onUpdate({
                          tracking: {
                            ...data.tracking,
                            [key]: e.target.checked
                          }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                    </label>
                  </div>
                ))}
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <div className="flex items-center mb-2">
                  <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
                  <span className="font-medium text-green-900">Analytics & Reporting</span>
                </div>
                <p className="text-sm text-green-700">
                  All tracked interactions will be available in detailed analytics reports with 
                  real-time updates and performance insights.
                </p>
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