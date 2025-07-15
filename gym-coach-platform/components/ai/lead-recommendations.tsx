'use client'

import { useState } from 'react'
import { Clock, Phone, Mail, CheckCircle, AlertCircle, User } from 'lucide-react'
import { useAIRecommendations, useActOnRecommendation } from '@/hooks/use-ai'
import { cn } from '@/lib/utils'

export function LeadRecommendations() {
  const { data: recommendations, isLoading, refetch } = useAIRecommendations()
  const actOnRecommendation = useActOnRecommendation()
  const [actingOn, setActingOn] = useState<string | null>(null)
  
  const recommendationsData = recommendations as any

  const handleAction = async (leadId: string, actionType: string) => {
    setActingOn(leadId)
    try {
      await actOnRecommendation.mutateAsync({ lead_id: leadId, action_type: actionType })
      refetch()
    } finally {
      setActingOn(null)
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'medium':
        return <Clock className="w-4 h-4 text-yellow-500" />
      default:
        return <CheckCircle className="w-4 h-4 text-green-500" />
    }
  }

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'call_immediately':
      case 'urgent_follow_up':
      case 'welcome_contact':
        return <Phone className="w-4 h-4" />
      default:
        return <Mail className="w-4 h-4" />
    }
  }

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      call_immediately: 'Call Now',
      urgent_follow_up: 'Urgent Follow-up',
      welcome_contact: 'Welcome Call',
      initial_contact: 'Initial Contact',
      follow_up: 'Follow Up'
    }
    return labels[action] || 'Contact'
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4 animate-pulse"></div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div>
                  <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
              <div className="h-8 w-20 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!recommendationsData?.priority_leads.length) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Recommendations</h3>
        <div className="text-center text-gray-500 py-8">
          <User className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>No priority leads found</p>
          <p className="text-sm">All leads are up to date!</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">AI Recommendations</h3>
          <div className="text-sm text-gray-600">
            {recommendationsData.summary.high_priority} high priority
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="space-y-4">
          {recommendationsData.priority_leads.map((rec: any) => (
            <div
              key={rec.lead_id}
              className={cn(
                "flex items-center justify-between p-4 border rounded-lg transition-colors",
                rec.priority === 'high' ? 'border-red-200 bg-red-50' :
                rec.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                'border-green-200 bg-green-50'
              )}
            >
              <div className="flex items-center space-x-3">
                {getPriorityIcon(rec.priority)}
                <div>
                  <div className="font-medium text-gray-900">{rec.lead_name}</div>
                  <div className="text-sm text-gray-600">{rec.reason}</div>
                  <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                    <span>Score: {rec.lead_score}/100</span>
                    <span>Status: {rec.status}</span>
                    <span>{rec.days_since_created}d old</span>
                    {rec.interaction_count > 0 && (
                      <span>{rec.interaction_count} interactions</span>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleAction(rec.lead_id, rec.action)}
                disabled={actingOn === rec.lead_id}
                className={cn(
                  "flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  rec.priority === 'high' 
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-blue-600 hover:bg-blue-700 text-white",
                  "disabled:opacity-50 disabled:cursor-not-allowed"
                )}
              >
                {actingOn === rec.lead_id ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  getActionIcon(rec.action)
                )}
                <span>{getActionLabel(rec.action)}</span>
              </button>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-semibold text-gray-900">
                {recommendationsData.summary.total_recommendations}
              </div>
              <div className="text-xs text-gray-600">Total Actions</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-red-600">
                {recommendationsData.summary.high_priority}
              </div>
              <div className="text-xs text-gray-600">High Priority</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-600">
                {recommendationsData.requalification_needed.length}
              </div>
              <div className="text-xs text-gray-600">Need Re-analysis</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-green-600">
                {recommendationsData.summary.pending_tasks}
              </div>
              <div className="text-xs text-gray-600">Pending Tasks</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}