'use client'

import { useState } from 'react'
import { Brain, TrendingUp, Users, Target, AlertCircle, RefreshCw, Settings, Lock, Zap, BarChart3, MessageSquare, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface AIInsight {
  id: string
  type: 'lead_scoring' | 'member_retention' | 'revenue_optimization' | 'capacity_planning' | 'marketing'
  title: string
  description: string
  impact: 'high' | 'medium' | 'low'
  confidence: number
  action: string
  metrics?: {
    label: string
    value: string | number
    change?: number
  }[]
  createdAt: string
}

interface LeadScore {
  leadId: string
  name: string
  email: string
  score: number
  factors: string[]
  recommendation: string
  probability: number
}

const mockInsights: AIInsight[] = [
  {
    id: '1',
    type: 'lead_scoring',
    title: 'High-Value Lead Opportunity',
    description: 'Sarah Johnson shows strong conversion signals based on engagement patterns and demographics.',
    impact: 'high',
    confidence: 87,
    action: 'Schedule immediate follow-up call',
    metrics: [
      { label: 'Conversion Probability', value: '87%' },
      { label: 'Potential Value', value: '$2,400', change: 15 }
    ],
    createdAt: '2024-01-22T10:30:00'
  },
  {
    id: '2',
    type: 'member_retention',
    title: 'Retention Risk Alert',
    description: '23 members showing early warning signs of churn based on attendance patterns.',
    impact: 'high',
    confidence: 92,
    action: 'Launch targeted retention campaign',
    metrics: [
      { label: 'At-Risk Members', value: 23 },
      { label: 'Potential Revenue Loss', value: '$18,400' }
    ],
    createdAt: '2024-01-22T09:15:00'
  },
  {
    id: '3',
    type: 'revenue_optimization',
    title: 'Class Schedule Optimization',
    description: 'Peak hours analysis suggests adding 2 more evening HIIT classes could increase revenue by 12%.',
    impact: 'medium',
    confidence: 78,
    action: 'Consider adding evening classes',
    metrics: [
      { label: 'Revenue Increase', value: '+12%' },
      { label: 'Estimated Monthly Gain', value: '$3,200' }
    ],
    createdAt: '2024-01-22T08:45:00'
  },
  {
    id: '4',
    type: 'marketing',
    title: 'Campaign Performance Insight',
    description: 'Social media ads perform 40% better on weekends for your target demographic.',
    impact: 'medium',
    confidence: 85,
    action: 'Adjust ad scheduling',
    metrics: [
      { label: 'Weekend Performance', value: '+40%' },
      { label: 'Cost Per Lead', value: '$12.50', change: -25 }
    ],
    createdAt: '2024-01-22T07:20:00'
  }
]

const mockLeadScores: LeadScore[] = [
  {
    leadId: '1',
    name: 'Sarah Johnson',
    email: 'sarah@example.com',
    score: 87,
    factors: ['High engagement', 'Premium location', 'Fitness experience', 'Budget range'],
    recommendation: 'High priority - schedule immediate call',
    probability: 87
  },
  {
    leadId: '2',
    name: 'Mike Chen',
    email: 'mike@example.com',
    score: 72,
    factors: ['Consistent engagement', 'Referral source', 'Time flexibility'],
    recommendation: 'Good prospect - follow up within 24 hours',
    probability: 72
  },
  {
    leadId: '3',
    name: 'Emma Williams',
    email: 'emma@example.com',
    score: 45,
    factors: ['Initial interest', 'Budget concerns', 'Schedule constraints'],
    recommendation: 'Nurture lead - provide value-focused content',
    probability: 45
  }
]

export default function AIPage() {
  const [insights, setInsights] = useState<AIInsight[]>(mockInsights)
  const [leadScores, setLeadScores] = useState<LeadScore[]>(mockLeadScores)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  const handleRefreshInsights = async () => {
    setIsRefreshing(true)
    // Simulate API call
    setTimeout(() => {
      setIsRefreshing(false)
      setLastUpdate(new Date())
    }, 2000)
  }

  const handlePaidFeature = () => {
    setShowUpgradeDialog(true)
  }

  const getImpactColor = (impact: AIInsight['impact']) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'low':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getInsightIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'lead_scoring':
        return <Target className="w-5 h-5" />
      case 'member_retention':
        return <Users className="w-5 h-5" />
      case 'revenue_optimization':
        return <TrendingUp className="w-5 h-5" />
      case 'capacity_planning':
        return <BarChart3 className="w-5 h-5" />
      case 'marketing':
        return <MessageSquare className="w-5 h-5" />
      default:
        return <Brain className="w-5 h-5" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Intelligence</h1>
          <p className="text-gray-600">AI-powered insights to grow your gym business</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={handleRefreshInsights}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={handlePaidFeature} className="bg-blue-600 hover:bg-blue-700">
            <Settings className="w-4 h-4 mr-2" />
            AI Settings
          </Button>
        </div>
      </div>

      {hasError && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Unable to load AI insights. Please check your connection and try again.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Insights</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.length}</div>
            <p className="text-xs text-muted-foreground">+2 since yesterday</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Priority</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {insights.filter(i => i.impact === 'high').length}
            </div>
            <p className="text-xs text-muted-foreground">Require immediate action</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length)}%
            </div>
            <p className="text-xs text-muted-foreground">+5% from last week</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Updated</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
            <p className="text-xs text-muted-foreground">Auto-refresh enabled</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="insights" className="space-y-6">
        <TabsList>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
          <TabsTrigger value="lead-scoring">Lead Scoring</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
        </TabsList>

        <TabsContent value="insights" className="space-y-6">
          {insights.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Brain className="w-12 h-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No insights available</h3>
                <p className="text-gray-600 text-center mb-4">
                  AI insights will appear here once we have enough data to analyze
                </p>
                <Button onClick={handleRefreshInsights} className="bg-blue-600 hover:bg-blue-700">
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Check for Insights
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {insights.map((insight) => (
                <Card key={insight.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
                          {getInsightIcon(insight.type)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">{insight.title}</h3>
                            <Badge className={getImpactColor(insight.impact)}>
                              {insight.impact.charAt(0).toUpperCase() + insight.impact.slice(1)} Impact
                            </Badge>
                          </div>
                          <p className="text-gray-600 mb-3">{insight.description}</p>
                          
                          <div className="flex items-center space-x-4 mb-3">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-600">Confidence:</span>
                              <div className="flex items-center space-x-2">
                                <Progress value={insight.confidence} className="w-16 h-2" />
                                <span className="text-sm font-medium">{insight.confidence}%</span>
                              </div>
                            </div>
                            <span className="text-sm text-gray-500">
                              {new Date(insight.createdAt).toLocaleDateString()}
                            </span>
                          </div>

                          {insight.metrics && (
                            <div className="grid grid-cols-2 gap-4 mb-3">
                              {insight.metrics.map((metric, index) => (
                                <div key={index} className="bg-gray-50 rounded p-2">
                                  <p className="text-xs text-gray-600">{metric.label}</p>
                                  <div className="flex items-center space-x-1">
                                    <span className="text-sm font-semibold">{metric.value}</span>
                                    {metric.change && (
                                      <span className={`text-xs ${metric.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        ({metric.change > 0 ? '+' : ''}{metric.change}%)
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <p className="text-sm text-blue-800">
                              <strong>Recommended Action:</strong> {insight.action}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="lead-scoring" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Lead Scoring</CardTitle>
              <CardDescription>
                Automatically score and prioritize your leads based on conversion probability
              </CardDescription>
            </CardHeader>
            <CardContent>
              {leadScores.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Target className="w-12 h-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No leads to score</h3>
                  <p className="text-gray-600 text-center">
                    Lead scores will appear here once you have active leads
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {leadScores.map((lead) => (
                    <div key={lead.leadId} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-semibold text-gray-900">{lead.name}</h4>
                          <span className="text-sm text-gray-600">{lead.email}</span>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(lead.score)}`}>
                          Score: {lead.score}/100
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Contributing Factors:</p>
                          <div className="flex flex-wrap gap-1">
                            {lead.factors.map((factor) => (
                              <Badge key={factor} variant="outline" className="text-xs">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-sm text-gray-600 mb-2">Recommendation:</p>
                          <p className="text-sm text-gray-900">{lead.recommendation}</p>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-600">Conversion Probability:</span>
                            <Progress value={lead.probability} className="w-20 h-2" />
                            <span className="text-sm font-medium">{lead.probability}%</span>
                          </div>
                          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                            Take Action
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Predictions</CardTitle>
              <CardDescription>
                AI-powered forecasting and trend analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Lock className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Premium Feature</h3>
              <p className="text-gray-600 text-center mb-4">
                Upgrade to access advanced AI predictions and forecasting
              </p>
              <Button onClick={handlePaidFeature} className="bg-blue-600 hover:bg-blue-700">
                Upgrade Now
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upgrade to AI Pro</DialogTitle>
            <DialogDescription>
              Unlock the full power of AI for your gym business
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-gray-600 mb-4">
              Upgrade to access advanced AI features including:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
              <li>Advanced lead scoring algorithms</li>
              <li>Predictive analytics and forecasting</li>
              <li>Custom AI model training</li>
              <li>Automated action recommendations</li>
              <li>Churn prediction and prevention</li>
              <li>Revenue optimization insights</li>
              <li>Real-time data processing</li>
              <li>Custom reporting and alerts</li>
            </ul>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUpgradeDialog(false)}>
              Maybe Later
            </Button>
            <Button onClick={() => setShowUpgradeDialog(false)}>
              Upgrade Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}