'use client'

import { useState, useEffect } from 'react'
import { ScoreProgressBar } from './LeadScoringBadge'

interface ScoringFactor {
  factor_name: string
  score: number
  max_score: number
  percentage: number
}

interface LeadScoringBreakdownProps {
  leadId: string
  className?: string
  showHistory?: boolean
}

export function LeadScoringBreakdown({ 
  leadId, 
  className = '', 
  showHistory = false 
}: LeadScoringBreakdownProps) {
  const [breakdown, setBreakdown] = useState<ScoringFactor[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [totalScore, setTotalScore] = useState(0)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    fetchScoringData()
  }, [leadId])
  
  const fetchScoringData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const params = new URLSearchParams({
        leadId,
        includeBreakdown: 'true',
        includeHistory: showHistory.toString()
      })
      
      const response = await fetch(`/api/leads/scoring?${params}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch scoring data')
      }
      
      setBreakdown(data.breakdown || [])
      setTotalScore(data.currentScore || 0)
      
      if (showHistory && data.history) {
        setHistory(data.history)
      }
    } catch (error) {
      console.error('Error fetching scoring breakdown:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }
  
  const getFactorIcon = (factorName: string) => {
    switch (factorName.toLowerCase()) {
      case 'source quality':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        )
      case 'engagement':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        )
      case 'behavior':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        )
      case 'communication':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        )
      case 'completeness':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'recency':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
      case 'ai analysis':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        )
    }
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-600 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="h-4 w-4 bg-gray-600 rounded"></div>
                <div className="h-2 bg-gray-600 rounded flex-1"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className="text-center text-red-400">
          <svg className="w-8 h-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.86-.833-2.632 0L3.5 16.5C2.73 17.333 3.692 19 5.232 19z" />
          </svg>
          <p className="font-medium">Error loading scoring breakdown</p>
          <p className="text-sm text-gray-500">{error}</p>
          <button
            onClick={fetchScoringData}
            className="mt-2 text-sm text-orange-400 hover:text-orange-300"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">Lead Score Breakdown</h3>
        <div className="text-2xl font-bold text-orange-400">
          {totalScore}/100
        </div>
      </div>
      
      {breakdown.length > 0 ? (
        <div className="space-y-4">
          {breakdown.map((factor, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="text-gray-400">
                    {getFactorIcon(factor.factor_name)}
                  </div>
                  <span className="text-sm font-medium text-gray-300">
                    {factor.factor_name}
                  </span>
                </div>
                <span className="text-xs text-gray-500">
                  {factor.score}/{factor.max_score}
                </span>
              </div>
              <ScoreProgressBar
                score={factor.score}
                maxScore={factor.max_score}
                showValue={false}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center text-gray-500 py-8">
          <svg className="w-12 h-12 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          <p>No scoring data available</p>
          <p className="text-sm">Score will be calculated when activities are recorded</p>
        </div>
      )}
      
      {showHistory && history.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h4 className="text-md font-medium text-white mb-3">Score History</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {history.map((entry, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400">{formatDate(entry.created_at)}</span>
                  {entry.change_reason && (
                    <span className="text-xs text-gray-500">
                      - {entry.change_reason}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-gray-400">{entry.previous_score}</span>
                  <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <span className={`font-medium ${
                    entry.score_change > 0 ? 'text-green-400' :
                    entry.score_change < 0 ? 'text-red-400' : 'text-gray-400'
                  }`}>
                    {entry.new_score}
                  </span>
                  {entry.score_change !== 0 && (
                    <span className={`text-xs ${
                      entry.score_change > 0 ? 'text-green-400' :
                      'text-red-400'
                    }`}>
                      ({entry.score_change > 0 ? '+' : ''}{entry.score_change})
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <div className="mt-4 pt-4 border-t border-gray-700">
        <button
          onClick={fetchScoringData}
          className="w-full text-center text-sm text-orange-400 hover:text-orange-300 transition-colors"
        >
          Refresh Score Data
        </button>
      </div>
    </div>
  )
}