'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts'
import { 
  TrendingUp, Users, MessageSquare, Clock, 
  CheckCircle, XCircle, AlertCircle 
} from 'lucide-react'

interface SurveyAnalyticsProps {
  surveyId?: string
  surveyData?: any
}

export default function SurveyAnalytics({ surveyId, surveyData }: SurveyAnalyticsProps) {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')

  useEffect(() => {
    if (surveyId) {
      fetchAnalytics()
    } else {
      // Use mock data for demonstration
      setAnalytics(generateMockAnalytics())
      setLoading(false)
    }
  }, [surveyId, timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/surveys/${surveyId}/analytics?range=${timeRange}`)
      if (response.ok) {
        const data = await response.json()
        setAnalytics(data)
      } else {
        // Fallback to mock data
        setAnalytics(generateMockAnalytics())
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setAnalytics(generateMockAnalytics())
    } finally {
      setLoading(false)
    }
  }

  const generateMockAnalytics = () => ({
    overview: {
      totalResponses: surveyData?.responses || 147,
      completionRate: surveyData?.completionRate || 78.5,
      avgCompletionTime: '4m 32s',
      satisfactionScore: 4.2,
      npsScore: 42
    },
    responseTimeline: [
      { date: '2025-08-21', responses: 12 },
      { date: '2025-08-22', responses: 18 },
      { date: '2025-08-23', responses: 25 },
      { date: '2025-08-24', responses: 22 },
      { date: '2025-08-25', responses: 28 },
      { date: '2025-08-26', responses: 20 },
      { date: '2025-08-27', responses: 22 }
    ],
    questionBreakdown: [
      { question: 'Overall satisfaction', avgScore: 4.3, responses: 147 },
      { question: 'Facility cleanliness', avgScore: 4.5, responses: 145 },
      { question: 'Equipment quality', avgScore: 4.1, responses: 143 },
      { question: 'Staff friendliness', avgScore: 4.6, responses: 147 },
      { question: 'Value for money', avgScore: 3.9, responses: 140 }
    ],
    demographics: {
      age: [
        { range: '18-24', count: 25, percentage: 17 },
        { range: '25-34', count: 48, percentage: 33 },
        { range: '35-44', count: 38, percentage: 26 },
        { range: '45-54', count: 22, percentage: 15 },
        { range: '55+', count: 14, percentage: 9 }
      ],
      membershipType: [
        { type: 'Monthly', count: 65, percentage: 44 },
        { type: 'Annual', count: 52, percentage: 35 },
        { type: 'Day Pass', count: 20, percentage: 14 },
        { type: 'Trial', count: 10, percentage: 7 }
      ]
    },
    sentimentAnalysis: {
      positive: 62,
      neutral: 28,
      negative: 10
    },
    topKeywords: [
      { word: 'clean', count: 45 },
      { word: 'friendly', count: 38 },
      { word: 'equipment', count: 35 },
      { word: 'spacious', count: 28 },
      { word: 'expensive', count: 15 }
    ]
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Survey Analytics</h2>
        <div className="flex gap-2">
          {['24h', '7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1 rounded ${
                timeRange === range 
                  ? 'bg-orange-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Responses</p>
              <p className="text-2xl font-bold text-white">{analytics.overview.totalResponses}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Completion Rate</p>
              <p className="text-2xl font-bold text-white">{analytics.overview.completionRate}%</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Avg. Time</p>
              <p className="text-2xl font-bold text-white">{analytics.overview.avgCompletionTime}</p>
            </div>
            <Clock className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Satisfaction</p>
              <p className="text-2xl font-bold text-white">
                {analytics.overview.satisfactionScore}/5
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-500" />
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">NPS Score</p>
              <p className="text-2xl font-bold text-white">{analytics.overview.npsScore}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Response Timeline */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Response Timeline</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={analytics.responseTimeline}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
              labelStyle={{ color: '#9CA3AF' }}
            />
            <Line 
              type="monotone" 
              dataKey="responses" 
              stroke="#F97316" 
              strokeWidth={2}
              dot={{ fill: '#F97316' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Question Breakdown */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Question Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.questionBreakdown} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9CA3AF" />
              <YAxis dataKey="question" type="category" stroke="#9CA3AF" width={120} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                labelStyle={{ color: '#9CA3AF' }}
              />
              <Bar dataKey="avgScore" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Sentiment Analysis */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Sentiment Analysis</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={[
                  { name: 'Positive', value: analytics.sentimentAnalysis.positive },
                  { name: 'Neutral', value: analytics.sentimentAnalysis.neutral },
                  { name: 'Negative', value: analytics.sentimentAnalysis.negative }
                ]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                <Cell fill="#10B981" />
                <Cell fill="#6B7280" />
                <Cell fill="#EF4444" />
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                labelStyle={{ color: '#9CA3AF' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Demographics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Age Distribution</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={analytics.demographics.age}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="range" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                labelStyle={{ color: '#9CA3AF' }}
              />
              <Bar dataKey="count" fill="#8B5CF6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Top Keywords</h3>
          <div className="space-y-3">
            {analytics.topKeywords.map((keyword: any, index: number) => (
              <div key={keyword.word} className="flex items-center justify-between">
                <span className="text-gray-300">{keyword.word}</span>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full"
                      style={{ width: `${(keyword.count / analytics.topKeywords[0].count) * 100}%` }}
                    />
                  </div>
                  <span className="text-gray-400 text-sm w-10 text-right">{keyword.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="flex justify-end gap-3">
        <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
          Export PDF
        </button>
        <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
          Export CSV
        </button>
        <button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg">
          Share Report
        </button>
      </div>
    </div>
  )
}