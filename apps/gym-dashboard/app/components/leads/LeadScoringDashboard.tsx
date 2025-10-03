'use client'

import { useState, useEffect } from 'react'
import { LeadScoringBadge, TemperatureIndicator } from './LeadScoringBadge'

interface LeadWithScoring {
  id: string
  name: string
  email: string
  phone: string
  source: string
  status: string
  lead_score: number
  temperature: string
  created_at: string
  updated_at: string
  score_updated_at: string
}

interface ScoringStats {
  totalLeads: number
  hot: number
  warm: number
  lukewarm: number
  cold: number
  averageScore: number
  scoringCoverage: number
  recentChanges: any[]
}

interface LeadScoringDashboardProps {
  className?: string
}

export function LeadScoringDashboard({ className = '' }: LeadScoringDashboardProps) {
  const [leads, setLeads] = useState<LeadWithScoring[]>([])
  const [stats, setStats] = useState<ScoringStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [temperatureFilter, setTemperatureFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('score_desc')
  
  useEffect(() => {
    fetchScoringDashboard()
  }, [])
  
  const fetchScoringDashboard = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/leads/scoring')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch scoring dashboard')
      }
      
      setLeads(data.leads || [])
      setStats(data.stats || null)
    } catch (error) {
      console.error('Error fetching scoring dashboard:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }
  
  const triggerBulkRecalculation = async () => {
    try {
      const response = await fetch('/api/leads/scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recalculate_organization'
        })
      })
      
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to recalculate scores')
      }
      
      // Refresh dashboard after recalculation
      await fetchScoringDashboard()
    } catch (error) {
      console.error('Error recalculating scores:', error)
    }
  }
  
  const filteredAndSortedLeads = () => {
    let filtered = leads
    
    // Apply temperature filter
    if (temperatureFilter !== 'all') {
      filtered = filtered.filter(lead => lead.temperature === temperatureFilter)
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'score_desc':
          return b.lead_score - a.lead_score
        case 'score_asc':
          return a.lead_score - b.lead_score
        case 'name_asc':
          return a.name.localeCompare(b.name)
        case 'created_desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        case 'updated_desc':
          return new Date(b.score_updated_at || b.updated_at).getTime() - 
                 new Date(a.score_updated_at || a.updated_at).getTime()
        default:
          return 0
      }
    })
    
    return filtered
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  const temperatureOptions = [
    { value: 'all', label: 'All Leads', count: leads.length },
    { value: 'hot', label: 'Hot', count: stats?.hot || 0 },
    { value: 'warm', label: 'Warm', count: stats?.warm || 0 },
    { value: 'lukewarm', label: 'Lukewarm', count: stats?.lukewarm || 0 },
    { value: 'cold', label: 'Cold', count: stats?.cold || 0 }
  ]
  
  if (loading) {
    return (
      <div className={`bg-gray-800 rounded-lg p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-600 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-20 bg-gray-700 rounded"></div>
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} className="h-12 bg-gray-700 rounded"></div>
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
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.86-.833-2.632 0L3.5 16.5C2.73 17.333 3.692 19 5.232 19z" />
          </svg>
          <p className="font-medium text-lg">Error loading scoring dashboard</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={fetchScoringDashboard}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Leads</p>
                <p className="text-2xl font-bold text-white">{stats.totalLeads}</p>
              </div>
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Average Score</p>
                <p className="text-2xl font-bold text-white">{stats.averageScore}</p>
              </div>
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Hot Leads</p>
                <p className="text-2xl font-bold text-red-400">{stats.hot}</p>
              </div>
              <div className="p-2 bg-red-500/20 rounded-lg">
                <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.71 19c.75 0 1.34-.6 1.34-1.34 0-.74-.6-1.34-1.34-1.34-.75 0-1.34.6-1.34 1.34 0 .74.6 1.34 1.34 1.34M11.71 7.11C10.08 7.11 8.75 8.44 8.75 10.07c0 1.63 1.33 2.96 2.96 2.96 1.63 0 2.96-1.33 2.96-2.96 0-1.63-1.33-2.96-2.96-2.96M11.71 2c3.9 0 7.04 3.14 7.04 7.04 0 2.04-.88 3.88-2.28 5.16l-.02.02c-.37.31-.85.78-.85 1.32v1.8c0 .37-.31.68-.68.68h-7.42c-.37 0-.68-.31-.68-.68v-1.8c0-.54-.48-1.01-.85-1.32l-.02-.02c-1.4-1.28-2.28-3.12-2.28-5.16C4.67 5.14 7.81 2 11.71 2z"/>
                </svg>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Coverage</p>
                <p className="text-2xl font-bold text-white">{stats.scoringCoverage}%</p>
              </div>
              <div className="p-2 bg-green-500/20 rounded-lg">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Controls */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
            {/* Temperature Filter */}
            <div className="flex space-x-2">
              {temperatureOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTemperatureFilter(option.value)}
                  className={`px-3 py-1 rounded-full text-sm transition-colors ${
                    temperatureFilter === option.value
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                  }`}
                >
                  {option.label} ({option.count})
                </button>
              ))}
            </div>
            
            {/* Sort Options */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-gray-700 text-white rounded px-3 py-1 text-sm"
            >
              <option value="score_desc">Score (High to Low)</option>
              <option value="score_asc">Score (Low to High)</option>
              <option value="name_asc">Name (A to Z)</option>
              <option value="created_desc">Recently Created</option>
              <option value="updated_desc">Recently Updated</option>
            </select>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={fetchScoringDashboard}
              className="text-sm bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded transition-colors"
            >
              Refresh
            </button>
            <button
              onClick={triggerBulkRecalculation}
              className="text-sm bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded transition-colors"
            >
              Recalculate All
            </button>
          </div>
        </div>
      </div>
      
      {/* Leads Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Lead</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Score</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Temperature</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Updated</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredAndSortedLeads().map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-white">{lead.name}</div>
                      <div className="text-sm text-gray-400">{lead.email}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <LeadScoringBadge score={lead.lead_score} showBreakdown />
                  </td>
                  <td className="px-4 py-3">
                    <TemperatureIndicator temperature={lead.temperature} />
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-300 capitalize">
                      {lead.source.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400">
                      {lead.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-400">
                      {formatDate(lead.score_updated_at || lead.updated_at)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex space-x-2">
                      <button 
                        className="text-gray-400 hover:text-white"
                        title="View Details"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button 
                        className="text-gray-400 hover:text-orange-400"
                        title="Analyze with AI"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredAndSortedLeads().length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <svg className="w-12 h-12 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p>No leads found for the selected filter</p>
          </div>
        )}
      </div>
    </div>
  )
}