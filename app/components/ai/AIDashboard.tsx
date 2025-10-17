'use client'

import { useState, useEffect } from 'react'
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Lightbulb,
  Brain,
  Activity,
  Users,
  DollarSign,
  Calendar,
  Target,
  Zap
} from 'lucide-react'
import { AIAssistant } from './AIAssistant'
import { cn } from '@/app/lib/utils'

interface Insight {
  id: string
  type: 'urgent' | 'important' | 'opportunity' | 'trend'
  title: string
  description: string
  impact?: string
  confidence: number
  actions?: string[]
  icon: any
  color: string
}

interface Metric {
  label: string
  value: string
  change: number
  trend: 'up' | 'down' | 'stable'
  insight?: string
}

interface AIDashboardProps {
  organizationId: string
}

interface ModelStatus {
  currentModel: string
  gpt5: {
    available: boolean
    message: string
  }
}

export function AIDashboard({ organizationId }: AIDashboardProps) {
  const [insights, setInsights] = useState<Insight[]>([])
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedInsight, setSelectedInsight] = useState<Insight | null>(null)
  const [showAssistant, setShowAssistant] = useState(false)
  const [modelStatus, setModelStatus] = useState<ModelStatus | null>(null)
  
  useEffect(() => {
    loadInsights()
    loadMetrics()
    loadModelStatus()
  }, [organizationId])
  
  const loadInsights = async () => {
    try {
      const response = await fetch('/api/ai/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId })
      })
      
      if (!response.ok) throw new Error('Failed to load insights')
      
      const data = await response.json()
      
      // Transform insights for display
      const displayInsights: Insight[] = data.insights.map((insight: any) => ({
        id: insight.id || Date.now().toString(),
        type: getInsightType(insight),
        title: insight.answer.split('\n')[0].replace(/[⚠️🎯💡📈]/g, '').trim(),
        description: insight.answer,
        impact: insight.impact,
        confidence: insight.confidence,
        actions: insight.recommendations,
        icon: getInsightIcon(insight),
        color: getInsightColor(insight)
      }))
      
      setInsights(displayInsights)
    } catch (error) {
      console.error('Error loading insights:', error)
    } finally {
      setIsLoading(false)
    }
  }
  
  const loadMetrics = async () => {
    try {
      const response = await fetch('/api/ai/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId })
      })
      
      if (!response.ok) throw new Error('Failed to load metrics')
      
      const data = await response.json()
      setMetrics(data.metrics)
    } catch (error) {
      console.error('Error loading metrics:', error)
    }
  }
  
  const loadModelStatus = async () => {
    try {
      const response = await fetch('/api/ai/model-status')
      if (!response.ok) throw new Error('Failed to load model status')
      
      const data = await response.json()
      setModelStatus(data)
    } catch (error) {
      console.error('Error loading model status:', error)
    }
  }
  
  const getInsightType = (insight: any): Insight['type'] => {
    if (insight.answer.includes('⚠️') || insight.answer.includes('risk')) return 'urgent'
    if (insight.answer.includes('💡') || insight.answer.includes('opportunity')) return 'opportunity'
    if (insight.answer.includes('📈') || insight.answer.includes('trend')) return 'trend'
    return 'important'
  }
  
  const getInsightIcon = (insight: any) => {
    const type = getInsightType(insight)
    switch (type) {
      case 'urgent': return AlertTriangle
      case 'opportunity': return Lightbulb
      case 'trend': return TrendingUp
      default: return Sparkles
    }
  }
  
  const getInsightColor = (insight: any) => {
    const type = getInsightType(insight)
    switch (type) {
      case 'urgent': return 'text-red-400 bg-red-900/20 border border-red-800/50'
      case 'opportunity': return 'text-green-400 bg-green-900/20 border border-green-800/50'
      case 'trend': return 'text-blue-400 bg-blue-900/20 border border-blue-800/50'
      default: return 'text-purple-400 bg-purple-900/20 border border-purple-800/50'
    }
  }
  
  const handleInsightAction = async (insight: Insight, action: string) => {
    // Handle insight actions
    console.log('Executing action:', action, 'for insight:', insight.id)
  }
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="h-8 w-8 text-orange-600" />
          <div>
            <h2 className="text-2xl font-bold">AI Intelligence Dashboard</h2>
            <p className="text-gray-400">
              Real-time insights powered by your unified AI brain
            </p>
            {modelStatus && (
              <p className="text-sm text-gray-500 mt-1">
                Using {modelStatus.currentModel} • {modelStatus.gpt5.message}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowAssistant(true)}
          className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2"
        >
          <Sparkles className="h-4 w-4" />
          Ask AI Assistant
        </button>
      </div>
      
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {metrics.map((metric, index) => (
          <div
            key={index}
            className="bg-gray-800 rounded-lg p-4 border border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-400">{metric.label}</p>
              {metric.trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : metric.trend === 'down' ? (
                <TrendingDown className="h-4 w-4 text-red-600" />
              ) : (
                <Activity className="h-4 w-4 text-gray-400" />
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-bold">{metric.value}</p>
              <span className={cn(
                "text-sm",
                metric.change > 0 ? "text-green-600" : "text-red-600"
              )}>
                {metric.change > 0 ? '+' : ''}{metric.change}%
              </span>
            </div>
            {metric.insight && (
              <p className="text-xs text-gray-400 mt-2">
                {metric.insight}
              </p>
            )}
          </div>
        ))}
      </div>
      
      {/* Proactive Insights */}
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            Proactive Insights
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            AI-detected patterns and opportunities requiring your attention
          </p>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-4" />
            <p className="text-gray-500">Analyzing your data...</p>
          </div>
        ) : insights.length === 0 ? (
          <div className="p-8 text-center">
            <Sparkles className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No new insights at the moment</p>
            <p className="text-sm text-gray-400 mt-2">
              The AI is continuously monitoring your data
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-700">
            {insights.map((insight) => (
              <div
                key={insight.id}
                className="p-6 hover:bg-gray-700/50 cursor-pointer transition-colors"
                onClick={() => setSelectedInsight(insight)}
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "p-3 rounded-lg",
                    insight.color
                  )}>
                    <insight.icon className="h-5 w-5" />
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium mb-1">{insight.title}</h4>
                    <p className="text-sm text-gray-400 line-clamp-2">
                      {insight.description}
                    </p>
                    
                    {insight.impact && (
                      <p className="text-sm font-medium text-orange-600 mt-2">
                        Impact: {insight.impact}
                      </p>
                    )}
                    
                    <div className="flex items-center gap-4 mt-3">
                      <div className="flex items-center gap-1">
                        <div className="w-20 bg-gray-700 rounded-full h-1">
                          <div
                            className="bg-green-600 h-1 rounded-full"
                            style={{ width: `${insight.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {Math.round(insight.confidence * 100)}% confidence
                        </span>
                      </div>
                      
                      {insight.actions && insight.actions.length > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleInsightAction(insight, insight.actions![0])
                          }}
                          className="text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700"
                        >
                          Take Action
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Insight Detail Modal */}
      {selectedInsight && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden border border-gray-700">
            <div className="p-6 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <selectedInsight.icon className="h-5 w-5" />
                {selectedInsight.title}
              </h3>
              <button
                onClick={() => setSelectedInsight(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                ×
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <p className="text-gray-300 whitespace-pre-wrap mb-4">
                {selectedInsight.description}
              </p>
              
              {selectedInsight.impact && (
                <div className="bg-orange-900/20 rounded-lg p-4 mb-4 border border-orange-800/50">
                  <p className="text-sm font-medium text-orange-300">
                    Estimated Impact
                  </p>
                  <p className="text-sm text-orange-400 mt-1">
                    {selectedInsight.impact}
                  </p>
                </div>
              )}
              
              {selectedInsight.actions && selectedInsight.actions.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">Recommended Actions</h4>
                  <div className="space-y-2">
                    {selectedInsight.actions.map((action, index) => (
                      <button
                        key={index}
                        onClick={() => handleInsightAction(selectedInsight, action)}
                        className="w-full text-left p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors border border-gray-600"
                      >
                        <p className="text-sm">{action}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* AI Assistant Modal */}
      {showAssistant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg w-full max-w-3xl h-[80vh] mx-4 border border-gray-700">
            <AIAssistant
              organizationId={organizationId}
              className="h-full"
            />
            <button
              onClick={() => setShowAssistant(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}