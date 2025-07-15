'use client'

import { useState } from 'react'
import { Brain, TrendingUp, Target, Lightbulb, RefreshCw } from 'lucide-react'
import { useAIInsights } from '@/hooks/use-ai'

export function AIInsightsCard() {
  const { data: insights, isLoading, refetch } = useAIInsights()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refetch()
    setIsRefreshing(false)
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-gray-200 rounded w-32"></div>
          <div className="h-8 w-8 bg-gray-200 rounded"></div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!insights || !(insights as any).metrics) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">
          <Brain className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p>No AI insights available</p>
        </div>
      </div>
    )
  }

  const insightsData = insights as any

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Brain className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900">AI Insights</h3>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{insightsData.metrics.total_leads}</div>
            <div className="text-xs text-gray-600">Total Leads</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{insightsData.metrics.conversion_rate}%</div>
            <div className="text-xs text-gray-600">Conversion Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{insightsData.metrics.avg_lead_score}</div>
            <div className="text-xs text-gray-600">Avg Score</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{insightsData.metrics.high_score_leads}</div>
            <div className="text-xs text-gray-600">High Score</div>
          </div>
        </div>

        {/* Trends */}
        {insightsData.insights.trends.length > 0 && (
          <div>
            <div className="flex items-center mb-3">
              <TrendingUp className="w-4 h-4 text-green-600 mr-2" />
              <h4 className="font-semibold text-gray-900">Trends</h4>
            </div>
            <ul className="space-y-2">
              {insightsData.insights.trends.slice(0, 3).map((trend: string, index: number) => (
                <li key={index} className="text-sm text-gray-700 flex items-start">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  {trend}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommendations */}
        {insightsData.insights.recommendations.length > 0 && (
          <div>
            <div className="flex items-center mb-3">
              <Target className="w-4 h-4 text-blue-600 mr-2" />
              <h4 className="font-semibold text-gray-900">Recommendations</h4>
            </div>
            <ul className="space-y-2">
              {insightsData.insights.recommendations.slice(0, 3).map((rec: string, index: number) => (
                <li key={index} className="text-sm text-gray-700 flex items-start">
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Optimization Tips */}
        {insightsData.insights.optimization_tips.length > 0 && (
          <div>
            <div className="flex items-center mb-3">
              <Lightbulb className="w-4 h-4 text-yellow-600 mr-2" />
              <h4 className="font-semibold text-gray-900">Optimization Tips</h4>
            </div>
            <ul className="space-y-2">
              {insightsData.insights.optimization_tips.slice(0, 3).map((tip: string, index: number) => (
                <li key={index} className="text-sm text-gray-700 flex items-start">
                  <span className="w-1.5 h-1.5 bg-yellow-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Source Performance */}
        {Object.keys(insightsData.source_performance).length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Source Performance</h4>
            <div className="space-y-2">
              {Object.entries(insightsData.source_performance)
                .sort(([,a], [,b]) => (b as any).conversion_rate - (a as any).conversion_rate)
                .slice(0, 3)
                .map(([source, data]: [string, any]) => {
                  const performance = data as any
                  return (
                    <div key={source} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <span className="text-sm font-medium text-gray-900 capitalize">{source}</span>
                        <span className="text-xs text-gray-600 ml-2">{performance.total} leads</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium text-gray-900">{performance.conversion_rate}%</div>
                        <div className="text-xs text-gray-600">Score: {performance.avg_score}</div>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 text-center pt-4 border-t border-gray-200">
          Based on {insightsData.period === '30_days' ? 'last 30 days' : 'recent activity'}
        </div>
      </div>
    </div>
  )
}