'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { LeadScoringBadge, TemperatureIndicator } from '../../components/leads/LeadScoringBadge'
import { LeadScoringBreakdown } from '../../components/leads/LeadScoringBreakdown'
import { AIInsightsPanel } from '../../components/leads/AIInsightsPanel'
import { AIRecommendationsPanel } from '../../components/leads/AIRecommendationsPanel'

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  source: string
  status: string
  lead_score: number
  created_at: string
  updated_at: string
  metadata: any
  assigned_to: string | null
  qualification_notes: string | null
}

export function LeadDetailPage() {
  const params = useParams()
  const leadId = params.id as string
  
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>('overview')
  const [refreshKey, setRefreshKey] = useState(0)
  
  useEffect(() => {
    if (leadId) {
      fetchLeadDetails()
    }
  }, [leadId, refreshKey])
  
  const fetchLeadDetails = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/leads/${leadId}`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch lead details')
      }
      
      setLead(data.lead)
    } catch (error) {
      console.error('Error fetching lead details:', error)
      setError(error instanceof Error ? error.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }
  
  const updateLeadScore = async () => {
    try {
      const response = await fetch('/api/leads/scoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'recalculate_single',
          leadId
        })
      })
      
      if (response.ok) {
        setRefreshKey(prev => prev + 1) // Trigger refresh
      }
    } catch (error) {
      console.error('Error updating lead score:', error)
    }
  }
  
  const recordActivity = async (activityType: string, value = 1.0) => {
    try {
      await fetch('/api/leads/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId,
          activityType,
          activityValue: value,
          metadata: { source: 'manual_entry' }
        })
      })
      
      // Refresh lead data to show updated score
      setRefreshKey(prev => prev + 1)
    } catch (error) {
      console.error('Error recording activity:', error)
    }
  }
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  const getTemperature = (score: number) => {
    if (score >= 80) return 'hot'
    if (score >= 60) return 'warm'
    if (score >= 40) return 'lukewarm'
    return 'cold'
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    )
  }
  
  if (error || !lead) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-red-400">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.86-.833-2.632 0L3.5 16.5C2.73 17.333 3.692 19 5.232 19z" />
          </svg>
          <p className="text-xl font-semibold mb-2">Error Loading Lead</p>
          <p className="text-gray-500 mb-4">{error || 'Lead not found'}</p>
          <button
            onClick={fetchLeadDetails}
            className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }
  
  const tabs = [
    { id: 'overview', label: 'Overview', icon: '👤' },
    { id: 'scoring', label: 'Lead Scoring', icon: '📊' },
    { id: 'insights', label: 'AI Insights', icon: '🤖' },
    { id: 'recommendations', label: 'Recommendations', icon: '💡' },
    { id: 'activity', label: 'Activity', icon: '📈' }
  ]
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-orange-600 rounded-full flex items-center justify-center text-xl font-bold">
                {lead.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold">{lead.name}</h1>
                <div className="flex items-center space-x-4 text-sm text-gray-400">
                  <span>{lead.email}</span>
                  {lead.phone && <span>{lead.phone}</span>}
                  <span className="capitalize">{lead.source.replace('_', ' ')}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-400">Lead Score</div>
                <LeadScoringBadge score={lead.lead_score || 0} size="lg" showBreakdown />
              </div>
              
              <div className="text-right">
                <div className="text-sm text-gray-400">Temperature</div>
                <div className="mt-1">
                  <TemperatureIndicator temperature={getTemperature(lead.lead_score || 0)} />
                </div>
              </div>
              
              <div className="flex space-x-2">
                <button
                  onClick={updateLeadScore}
                  className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded transition-colors flex items-center space-x-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh Score</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Navigation Tabs */}
      <div className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
      
      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Lead Information */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Lead Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">Name</label>
                    <p className="font-medium">{lead.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Email</label>
                    <p className="font-medium">{lead.email}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Phone</label>
                    <p className="font-medium">{lead.phone || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Source</label>
                    <p className="font-medium capitalize">{lead.source.replace('_', ' ')}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Status</label>
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400">
                      {lead.status}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">Created</label>
                    <p className="font-medium">{formatDate(lead.created_at)}</p>
                  </div>
                </div>
                
                {lead.qualification_notes && (
                  <div className="mt-4">
                    <label className="text-sm text-gray-400">Notes</label>
                    <p className="mt-1 p-3 bg-gray-900/50 rounded">{lead.qualification_notes}</p>
                  </div>
                )}
              </div>
              
              {/* Quick Actions */}
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    { type: 'email_open', label: 'Email Opened', icon: '📧', value: 2 },
                    { type: 'email_click', label: 'Email Clicked', icon: '🔗', value: 3 },
                    { type: 'website_visit', label: 'Website Visit', icon: '🌐', value: 2 },
                    { type: 'form_submission', label: 'Form Submitted', icon: '📋', value: 5 },
                    { type: 'call_answer', label: 'Call Answered', icon: '📞', value: 8 },
                    { type: 'sms_reply', label: 'SMS Reply', icon: '💬', value: 6 },
                    { type: 'booking_attempt', label: 'Booking Attempt', icon: '📅', value: 10 },
                    { type: 'social_engagement', label: 'Social Engagement', icon: '👍', value: 2 }
                  ].map((action) => (
                    <button
                      key={action.type}
                      onClick={() => recordActivity(action.type, action.value)}
                      className="p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-center"
                    >
                      <div className="text-2xl mb-1">{action.icon}</div>
                      <div className="text-xs font-medium">{action.label}</div>
                      <div className="text-xs text-orange-400">+{action.value} pts</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Score Breakdown</h3>
                <LeadScoringBreakdown leadId={leadId} />
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'scoring' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <LeadScoringBreakdown leadId={leadId} showHistory className="h-fit" />
            <div className="space-y-6">
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Scoring Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={updateLeadScore}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded transition-colors"
                  >
                    Recalculate Score
                  </button>
                  <button className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors">
                    View Score History
                  </button>
                  <button className="w-full bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded transition-colors">
                    Export Scoring Data
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'insights' && (
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
            <AIInsightsPanel leadId={leadId} />
          </div>
        )}
        
        {activeTab === 'recommendations' && (
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
            <AIRecommendationsPanel leadId={leadId} />
          </div>
        )}
        
        {activeTab === 'activity' && (
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Activity Timeline</h3>
            <p className="text-gray-400">Activity timeline will be displayed here...</p>
          </div>
        )}
      </div>
    </div>
  )
}