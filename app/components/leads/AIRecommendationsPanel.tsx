'use client'

import { useState, useEffect } from 'react'

interface Recommendation {
  id: string
  insight_type: string
  confidence_score: number
  insight_data: any
  created_at: string
}

interface AIRecommendationsPanelProps {
  leadId?: string
  className?: string
  showDashboard?: boolean
}

export function AIRecommendationsPanel({ 
  leadId, 
  className = '', 
  showDashboard = false 
}: AIRecommendationsPanelProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('action_recommendations')
  
  useEffect(() => {
    if (showDashboard) {
      fetchDashboardData()
    } else if (leadId) {
      fetchRecommendations()
    }
  }, [leadId, showDashboard])
  
  const fetchRecommendations = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/ai/insights/recommendations?leadId=${leadId}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch recommendations')
      }
      
      setRecommendations(data.recommendations || [])
    } catch (error) {
      console.error('Error fetching recommendations:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }
  
  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/ai/insights/recommendations')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch dashboard data')
      }
      
      setDashboardData(data.dashboard)
    } catch (error) {
      console.error('Error fetching dashboard:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }
  
  const generateRecommendations = async () => {
    if (!leadId) return
    
    try {
      setGenerating(true)
      setError(null)
      
      const response = await fetch('/api/ai/insights/recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          insightTypes: ['action_recommendations', 'next_steps', 'optimization_tips']
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate recommendations')
      }
      
      // Refresh recommendations after generation
      await fetchRecommendations()
    } catch (error) {
      console.error('Error generating recommendations:', error)
      setError(error instanceof Error ? error.message : 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }
  
  const renderActionRecommendations = (data: any) => {
    if (!data || !data.actions) return <div className="text-gray-400">No action recommendations available</div>
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-white">Action Recommendations</h4>
          <span className={`text-xs px-2 py-1 rounded-full ${
            data.priority === 'high' ? 'bg-red-500/20 text-red-400' :
            data.priority === 'medium' ? 'bg-orange-500/20 text-orange-400' :
            'bg-blue-500/20 text-blue-400'
          }`}>
            {data.priority} priority
          </span>
        </div>
        
        <div className="space-y-3">
          {data.actions.map((action: any, idx: number) => (
            <div key={idx} className="bg-gray-900/50 rounded-lg p-3">
              <div className="flex items-start justify-between mb-2">
                <h5 className="font-medium text-orange-400">{action.action}</h5>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  action.urgency === 'immediate' ? 'bg-red-500/20 text-red-400' :
                  action.urgency === 'today' ? 'bg-orange-500/20 text-orange-400' :
                  action.urgency === 'this_week' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {action.urgency.replace('_', ' ')}
                </span>
              </div>
              <p className="text-sm text-gray-300 mb-2">{action.reason}</p>
              <p className="text-xs text-gray-400">Expected: {action.expected_outcome}</p>
            </div>
          ))}
        </div>
        
        {data.opportunities && data.opportunities.length > 0 && (
          <div className="mt-4">
            <h5 className="text-sm font-medium text-green-400 mb-2">Opportunities</h5>
            <div className="flex flex-wrap gap-2">
              {data.opportunities.map((opp: string, idx: number) => (
                <span key={idx} className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                  {opp}
                </span>
              ))}
            </div>
          </div>
        )}
        
        {data.warning_signs && data.warning_signs.length > 0 && (
          <div className="mt-4">
            <h5 className="text-sm font-medium text-red-400 mb-2">Warning Signs</h5>
            <div className="flex flex-wrap gap-2">
              {data.warning_signs.map((warning: string, idx: number) => (
                <span key={idx} className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                  {warning}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }
  
  const renderNextSteps = (data: any) => {
    if (!data || !data.immediate_next_steps) return <div className="text-gray-400">No next steps available</div>
    
    return (
      <div className="space-y-4">
        <h4 className="font-medium text-white">Next Steps</h4>
        
        {/* Immediate Next Steps */}
        <div className="space-y-3">
          <h5 className="text-sm font-medium text-orange-400">Immediate Actions</h5>
          {data.immediate_next_steps.map((step: any, idx: number) => (
            <div key={idx} className="bg-gray-900/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-white">{step.step}</span>
                <span className="text-xs text-gray-400">{step.timing}</span>
              </div>
              <p className="text-sm text-gray-300 mb-1">{step.method}</p>
              <p className="text-xs text-gray-400">Goal: {step.goal}</p>
            </div>
          ))}
        </div>
        
        {/* Follow-up Sequence */}
        {data.follow_up_sequence && data.follow_up_sequence.length > 0 && (
          <div className="space-y-3">
            <h5 className="text-sm font-medium text-blue-400">Follow-up Sequence</h5>
            <div className="space-y-2">
              {data.follow_up_sequence.map((followUp: any, idx: number) => (
                <div key={idx} className="flex items-start space-x-3 p-2 bg-gray-900/30 rounded">
                  <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {followUp.day}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-sm font-medium text-white">{followUp.action}</span>
                      <span className="text-xs bg-gray-700 text-gray-300 px-2 py-0.5 rounded">
                        {followUp.channel}
                      </span>
                    </div>
                    {followUp.content_suggestion && (
                      <p className="text-xs text-gray-400 italic">\"{followUp.content_suggestion}\"</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Milestone Goals */}
        {data.milestone_goals && (
          <div className="space-y-2">
            <h5 className="text-sm font-medium text-purple-400">Milestone Goals</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {['short_term', 'medium_term', 'long_term'].map((term) => (
                <div key={term} className="bg-gray-900/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 uppercase mb-1">{term.replace('_', ' ')}</div>
                  <div className="text-sm text-white">{data.milestone_goals[term]}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }
  
  const renderOptimizationTips = (data: any) => {
    if (!data || !data.score_improvement_tips) return <div className="text-gray-400">No optimization tips available</div>
    
    return (
      <div className="space-y-4">
        <h4 className="font-medium text-white">Optimization Tips</h4>
        
        {/* Score Improvement Tips */}
        <div className="space-y-3">
          <h5 className="text-sm font-medium text-orange-400">Score Improvement</h5>
          {data.score_improvement_tips.map((tip: any, idx: number) => (
            <div key={idx} className="bg-gray-900/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white capitalize">{tip.factor}</span>
                <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded">
                  {tip.potential_impact}
                </span>
              </div>
              <div className="space-y-1">
                {tip.improvement_actions.map((action: string, actionIdx: number) => (
                  <div key={actionIdx} className="flex items-start space-x-2">
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 flex-shrink-0"></div>
                    <span className="text-sm text-gray-300">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {/* Engagement Optimization */}
        {data.engagement_optimization && (
          <div className="space-y-3">
            <h5 className="text-sm font-medium text-blue-400">Engagement Optimization</h5>
            <div className="bg-gray-900/50 rounded-lg p-3 space-y-3">
              {data.engagement_optimization.best_contact_times && (
                <div>
                  <span className="text-xs text-gray-400">Best Contact Times:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {data.engagement_optimization.best_contact_times.map((time: string, idx: number) => (
                      <span key={idx} className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">
                        {time.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {data.engagement_optimization.preferred_channels && (
                <div>
                  <span className="text-xs text-gray-400">Preferred Channels:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {data.engagement_optimization.preferred_channels.map((channel: string, idx: number) => (
                      <span key={idx} className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                        {channel}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {data.engagement_optimization.content_preferences && (
                <div>
                  <span className="text-xs text-gray-400">Content Preferences:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {data.engagement_optimization.content_preferences.map((pref: string, idx: number) => (
                      <span key={idx} className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded">
                        {pref.replace('_', ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Conversion Accelerators */}
        {data.conversion_accelerators && data.conversion_accelerators.length > 0 && (
          <div className="space-y-3">
            <h5 className="text-sm font-medium text-green-400">Conversion Accelerators</h5>
            {data.conversion_accelerators.map((accelerator: any, idx: number) => (
              <div key={idx} className="bg-gray-900/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-green-400">{accelerator.strategy}</span>
                  <span className="text-xs text-gray-400">{accelerator.expected_timeline}</span>
                </div>
                <p className="text-sm text-gray-300">{accelerator.implementation}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400'
    if (confidence >= 0.6) return 'text-orange-400'
    return 'text-red-400'
  }
  
  if (showDashboard) {
    // Render dashboard view
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Dashboard content */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">AI Recommendations Dashboard</h3>
          {/* Dashboard implementation would go here */}
        </div>
      </div>
    )
  }
  
  // Render single lead view
  const tabs = [
    { id: 'action_recommendations', label: 'Actions', icon: '⚡' },
    { id: 'next_steps', label: 'Next Steps', icon: '📋' },
    { id: 'optimization_tips', label: 'Optimization', icon: '🎯' }
  ]
  
  const currentRecommendation = recommendations.find(r => r.insight_type === activeTab)
  
  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <span>🤖</span>
          <span>AI Recommendations</span>
        </h3>
        <button
          onClick={generateRecommendations}
          disabled={generating || !leadId}
          className="text-sm bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white px-3 py-1 rounded transition-colors flex items-center space-x-2"
        >
          {generating && (
            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
          )}
          <span>{generating ? 'Generating...' : 'Generate'}</span>
        </button>
      </div>
      
      {/* Tabs */}
      <div className="flex space-x-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 rounded-lg text-sm transition-colors flex items-center space-x-2 ${
              activeTab === tab.id
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      
      {loading ? (
        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-600 rounded w-1/2 mb-2"></div>
            <div className="h-20 bg-gray-700 rounded"></div>
          </div>
        </div>
      ) : error ? (
        <div className="text-center text-red-400 py-6">
          <span>⚠️</span>
          <p className="font-medium">Error loading recommendations</p>
          <p className="text-sm text-gray-500">{error}</p>
          <button
            onClick={generateRecommendations}
            className="mt-2 text-sm text-orange-400 hover:text-orange-300"
          >
            Try generating new recommendations
          </button>
        </div>
      ) : currentRecommendation ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Generated {formatDate(currentRecommendation.created_at)}</span>
            <span className={getConfidenceColor(currentRecommendation.confidence_score)}>
              {Math.round(currentRecommendation.confidence_score * 100)}% confidence
            </span>
          </div>
          
          {activeTab === 'action_recommendations' && renderActionRecommendations(currentRecommendation.insight_data)}
          {activeTab === 'next_steps' && renderNextSteps(currentRecommendation.insight_data)}
          {activeTab === 'optimization_tips' && renderOptimizationTips(currentRecommendation.insight_data)}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <span className="text-4xl mb-4 block">🤖</span>
          <p className="font-medium">No recommendations available</p>
          <p className="text-sm">Click 'Generate' to create AI-powered recommendations for this lead</p>
        </div>
      )}
    </div>
  )
}