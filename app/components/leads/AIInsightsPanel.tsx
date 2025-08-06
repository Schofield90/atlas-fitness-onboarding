'use client'

import { useState, useEffect } from 'react'

interface AIInsight {
  id: string
  insight_type: string
  confidence_score: number
  insight_data: any
  created_at: string
  expires_at: string | null
}

interface AIInsightsPanelProps {
  leadId: string
  className?: string
}

export function AIInsightsPanel({ leadId, className = '' }: AIInsightsPanelProps) {
  const [insights, setInsights] = useState<AIInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedInsightType, setSelectedInsightType] = useState<string>('all')
  
  useEffect(() => {
    fetchInsights()
  }, [leadId, selectedInsightType])
  
  const fetchInsights = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        leadId,
        ...(selectedInsightType !== 'all' && { type: selectedInsightType })
      })
      
      const response = await fetch(`/api/ai/lead-scoring?${params}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch insights')
      }
      
      setInsights(data.insights || [])
    } catch (error) {
      console.error('Error fetching AI insights:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }
  
  const triggerAIAnalysis = async () => {
    try {
      setAnalyzing(true)
      setError(null)
      
      const response = await fetch('/api/ai/lead-scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          forceRefresh: true
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze lead')
      }
      
      // Refresh insights after analysis
      await fetchInsights()
    } catch (error) {
      console.error('Error analyzing lead:', error)
      setError(error instanceof Error ? error.message : 'Analysis failed')
    } finally {
      setAnalyzing(false)
    }
  }
  
  const renderBuyingSignals = (insight: AIInsight) => {
    const data = insight.insight_data
    
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-white">Buying Signals</h4>
          <span className={`text-xs px-2 py-1 rounded-full ${
            data.strength === 'high' ? 'bg-red-500/20 text-red-400' :
            data.strength === 'medium' ? 'bg-orange-500/20 text-orange-400' :
            'bg-blue-500/20 text-blue-400'
          }`}>
            {data.strength} strength
          </span>
        </div>
        
        {data.signals && data.signals.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs text-gray-400">Detected Signals:</span>
            <ul className="text-sm space-y-1">
              {data.signals.map((signal: string, idx: number) => (
                <li key={idx} className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full mt-2 flex-shrink-0"></div>
                  <span className="text-gray-300">{signal}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {data.explanation && (
          <div className="text-sm text-gray-400 bg-gray-900/50 rounded-lg p-3">
            {data.explanation}
          </div>
        )}
      </div>
    )
  }
  
  const renderSentimentAnalysis = (insight: AIInsight) => {
    const data = insight.insight_data
    
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-white">Sentiment Analysis</h4>
          <span className={`text-xs px-2 py-1 rounded-full ${
            data.overall === 'positive' ? 'bg-green-500/20 text-green-400' :
            data.overall === 'negative' ? 'bg-red-500/20 text-red-400' :
            'bg-gray-500/20 text-gray-400'
          }`}>
            {data.overall}
          </span>
        </div>
        
        {data.indicators && data.indicators.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs text-gray-400">Key Indicators:</span>
            <div className="flex flex-wrap gap-1">
              {data.indicators.map((indicator: string, idx: number) => (
                <span 
                  key={idx}
                  className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded"
                >
                  {indicator}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }
  
  const renderConversionLikelihood = (insight: AIInsight) => {
    const data = insight.insight_data
    
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-white">Conversion Likelihood</h4>
          <span className="text-lg font-bold text-orange-400">
            {data.percentage}%
          </span>
        </div>
        
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-red-500 via-orange-500 to-green-500"
            style={{ width: `${data.percentage}%` }}
          />
        </div>
        
        {data.timeline && (
          <div className="flex items-center space-x-2 text-sm">
            <span className="text-gray-400">Timeline:</span>
            <span className={`px-2 py-1 rounded text-xs ${
              data.timeline === 'immediate' ? 'bg-red-500/20 text-red-400' :
              data.timeline === 'short_term' ? 'bg-orange-500/20 text-orange-400' :
              data.timeline === 'long_term' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {data.timeline.replace('_', ' ')}
            </span>
          </div>
        )}
        
        {data.reasoning && (
          <div className="text-sm text-gray-400 bg-gray-900/50 rounded-lg p-3">
            {data.reasoning}
          </div>
        )}
      </div>
    )
  }
  
  const renderInsightContent = (insight: AIInsight) => {
    switch (insight.insight_type) {
      case 'buying_signals':
        return renderBuyingSignals(insight)
      case 'sentiment_analysis':
        return renderSentimentAnalysis(insight)
      case 'conversion_likelihood':
        return renderConversionLikelihood(insight)
      default:
        return (
          <div className="space-y-2">
            <h4 className="font-medium text-white capitalize">
              {insight.insight_type.replace('_', ' ')}
            </h4>
            <pre className="text-sm text-gray-400 whitespace-pre-wrap">
              {JSON.stringify(insight.insight_data, null, 2)}
            </pre>
          </div>
        )
    }
  }
  
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'text-green-400'
    if (confidence >= 0.6) return 'text-orange-400'
    return 'text-red-400'
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  const insightTypes = [
    { value: 'all', label: 'All Insights' },
    { value: 'buying_signals', label: 'Buying Signals' },
    { value: 'sentiment_analysis', label: 'Sentiment' },
    { value: 'conversion_likelihood', label: 'Conversion' }
  ]
  
  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center space-x-2">
          <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span>AI Insights</span>
        </h3>
        <button
          onClick={triggerAIAnalysis}
          disabled={analyzing}
          className="text-sm bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 text-white px-3 py-1 rounded transition-colors flex items-center space-x-2"
        >
          {analyzing && (
            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
          )}
          <span>{analyzing ? 'Analyzing...' : 'Analyze'}</span>
        </button>
      </div>
      
      {/* Filter Tabs */}
      <div className="flex space-x-2 mb-4 overflow-x-auto">
        {insightTypes.map((type) => (
          <button
            key={type.value}
            onClick={() => setSelectedInsightType(type.value)}
            className={`px-3 py-1 rounded-full text-xs whitespace-nowrap transition-colors ${
              selectedInsightType === type.value
                ? 'bg-orange-600 text-white'
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {type.label}
          </button>
        ))}
      </div>
      
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 bg-gray-600 rounded w-1/2 mb-2"></div>
              <div className="h-20 bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center text-red-400 py-6">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.86-.833-2.632 0L3.5 16.5C2.73 17.333 3.692 19 5.232 19z" />
          </svg>
          <p className="font-medium">Error loading insights</p>
          <p className="text-sm text-gray-500">{error}</p>
          <button
            onClick={fetchInsights}
            className="mt-2 text-sm text-orange-400 hover:text-orange-300"
          >
            Try again
          </button>
        </div>
      ) : insights.length > 0 ? (
        <div className="space-y-6">
          {insights.map((insight) => (
            <div key={insight.id} className="border border-gray-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2 text-xs text-gray-400">
                  <span>{formatDate(insight.created_at)}</span>
                  <span>•</span>
                  <span className={`${getConfidenceColor(insight.confidence_score)}`}>
                    {Math.round(insight.confidence_score * 100)}% confidence
                  </span>
                </div>
                {insight.expires_at && (
                  <span className="text-xs text-yellow-400">
                    Expires {formatDate(insight.expires_at)}
                  </span>
                )}
              </div>
              
              {renderInsightContent(insight)}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <p className="font-medium">No AI insights available</p>
          <p className="text-sm">Click 'Analyze' to generate insights for this lead</p>
        </div>
      )}
    </div>
  )
}