'use client'

import { useState, useEffect } from 'react'
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts'
import { 
  TrendingUp, Users, MousePointer, Clock, 
  CheckCircle, XCircle, AlertCircle, Eye,
  Target, Activity, Percent
} from 'lucide-react'

interface FormAnalyticsProps {
  formId?: string
  formName?: string
}

export default function FormAnalytics({ formId, formName = 'Lead Capture Form' }: FormAnalyticsProps) {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')
  const [compareMode, setCompareMode] = useState(false)

  useEffect(() => {
    fetchAnalytics()
  }, [formId, timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      // Use mock data for demonstration
      setAnalytics(generateMockAnalytics())
      setLoading(false)
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setAnalytics(generateMockAnalytics())
      setLoading(false)
    }
  }

  const generateMockAnalytics = () => ({
    overview: {
      views: 3456,
      submissions: 234,
      conversionRate: 6.8,
      avgTimeToComplete: '2m 45s',
      abandonmentRate: 32.5,
      bounceRate: 18.2,
      completionRate: 67.5
    },
    fieldAnalytics: [
      { field: 'Name', completionRate: 98, avgTime: 8, dropoffs: 2 },
      { field: 'Email', completionRate: 95, avgTime: 12, dropoffs: 5 },
      { field: 'Phone', completionRate: 78, avgTime: 15, dropoffs: 22 },
      { field: 'Fitness Goals', completionRate: 65, avgTime: 45, dropoffs: 35 },
      { field: 'Preferred Time', completionRate: 58, avgTime: 20, dropoffs: 42 }
    ],
    conversionFunnel: [
      { stage: 'Form Viewed', value: 3456, percentage: 100 },
      { stage: 'Started Filling', value: 2890, percentage: 83.6 },
      { stage: '50% Complete', value: 1678, percentage: 48.6 },
      { stage: '75% Complete', value: 890, percentage: 25.8 },
      { stage: 'Submitted', value: 234, percentage: 6.8 }
    ],
    timeAnalysis: [
      { time: '0-30s', users: 890, conversions: 12 },
      { time: '30s-1m', users: 1234, conversions: 45 },
      { time: '1-2m', users: 789, conversions: 89 },
      { time: '2-3m', users: 456, conversions: 67 },
      { time: '3m+', users: 87, conversions: 21 }
    ],
    deviceBreakdown: [
      { device: 'Desktop', views: 1567, submissions: 134, rate: 8.5 },
      { device: 'Mobile', views: 1456, submissions: 78, rate: 5.4 },
      { device: 'Tablet', views: 433, submissions: 22, rate: 5.1 }
    ],
    sourceAnalysis: [
      { source: 'Facebook Ads', views: 1234, conversions: 89, cost: 156, cpa: 1.75 },
      { source: 'Google Ads', views: 890, conversions: 67, cost: 234, cpa: 3.49 },
      { source: 'Organic', views: 789, conversions: 45, cost: 0, cpa: 0 },
      { source: 'Instagram', views: 543, conversions: 33, cost: 89, cpa: 2.70 }
    ],
    dailyTrend: [
      { date: '2025-08-21', views: 456, submissions: 28 },
      { date: '2025-08-22', views: 512, submissions: 35 },
      { date: '2025-08-23', views: 489, submissions: 31 },
      { date: '2025-08-24', views: 523, submissions: 38 },
      { date: '2025-08-25', views: 478, submissions: 29 },
      { date: '2025-08-26', views: 501, submissions: 36 },
      { date: '2025-08-27', views: 497, submissions: 37 }
    ],
    errorAnalysis: {
      validationErrors: [
        { field: 'Email', count: 45, message: 'Invalid email format' },
        { field: 'Phone', count: 32, message: 'Invalid phone number' },
        { field: 'Name', count: 12, message: 'Name too short' }
      ],
      technicalErrors: 3,
      timeoutErrors: 7
    }
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  const COLORS = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#F59E0B']

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Form Analytics</h2>
          <p className="text-gray-400 mt-1">{formName}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setCompareMode(!compareMode)}
            className={`px-4 py-2 rounded-lg ${
              compareMode ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300'
            }`}
          >
            Compare Periods
          </button>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="bg-gray-700 text-white px-4 py-2 rounded-lg"
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Eye className="h-5 w-5 text-blue-500" />
            <span className="text-xs text-green-400">+15.3%</span>
          </div>
          <p className="text-gray-400 text-sm">Form Views</p>
          <p className="text-2xl font-bold text-white">{analytics.overview.views.toLocaleString()}</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-xs text-green-400">+8.7%</span>
          </div>
          <p className="text-gray-400 text-sm">Submissions</p>
          <p className="text-2xl font-bold text-white">{analytics.overview.submissions}</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Percent className="h-5 w-5 text-orange-500" />
            <span className="text-xs text-red-400">-2.1%</span>
          </div>
          <p className="text-gray-400 text-sm">Conversion Rate</p>
          <p className="text-2xl font-bold text-white">{analytics.overview.conversionRate}%</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Clock className="h-5 w-5 text-purple-500" />
            <span className="text-xs text-gray-400">Avg</span>
          </div>
          <p className="text-gray-400 text-sm">Time to Complete</p>
          <p className="text-2xl font-bold text-white">{analytics.overview.avgTimeToComplete}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Conversion Funnel</h3>
          <ResponsiveContainer width="100%" height={300}>
            <FunnelChart>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                labelStyle={{ color: '#9CA3AF' }}
              />
              <Funnel
                dataKey="value"
                data={analytics.conversionFunnel}
                isAnimationActive
              >
                <LabelList position="center" fill="#fff" />
                {analytics.conversionFunnel.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            {analytics.conversionFunnel.map((stage: any, index: number) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-gray-400">{stage.stage}</span>
                <span className="text-white">{stage.value} ({stage.percentage}%)</span>
              </div>
            ))}
          </div>
        </div>

        {/* Field Performance */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Field Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.fieldAnalytics} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9CA3AF" />
              <YAxis dataKey="field" type="category" stroke="#9CA3AF" width={100} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                labelStyle={{ color: '#9CA3AF' }}
              />
              <Legend />
              <Bar dataKey="completionRate" fill="#10B981" name="Completion %" />
              <Bar dataKey="dropoffs" fill="#EF4444" name="Drop-offs" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Trend */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Daily Performance Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={analytics.dailyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
              labelStyle={{ color: '#9CA3AF' }}
            />
            <Legend />
            <Area 
              type="monotone" 
              dataKey="views" 
              stackId="1" 
              stroke="#3B82F6" 
              fill="#3B82F6" 
              fillOpacity={0.3} 
            />
            <Area 
              type="monotone" 
              dataKey="submissions" 
              stackId="1" 
              stroke="#10B981" 
              fill="#10B981" 
              fillOpacity={0.3} 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Device Breakdown */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Device Performance</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={analytics.deviceBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ device, rate }) => `${device}: ${rate}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="submissions"
              >
                {analytics.deviceBreakdown.map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                labelStyle={{ color: '#9CA3AF' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Time Analysis */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Completion Time</h3>
          <div className="space-y-3">
            {analytics.timeAnalysis.map((time: any) => (
              <div key={time.time}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-400">{time.time}</span>
                  <span className="text-white">{time.users} users</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-orange-500 h-2 rounded-full"
                    style={{ width: `${(time.conversions / time.users) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Error Analysis */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Error Analysis</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Validation Errors</span>
              <span className="text-red-400 font-medium">
                {analytics.errorAnalysis.validationErrors.reduce((sum: number, e: any) => sum + e.count, 0)}
              </span>
            </div>
            {analytics.errorAnalysis.validationErrors.map((error: any) => (
              <div key={error.field} className="ml-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">{error.field}</span>
                  <span className="text-gray-300">{error.count}</span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2 border-t border-gray-700">
              <span className="text-gray-400">Technical Errors</span>
              <span className="text-yellow-400 font-medium">{analytics.errorAnalysis.technicalErrors}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Timeout Errors</span>
              <span className="text-yellow-400 font-medium">{analytics.errorAnalysis.timeoutErrors}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Source Analysis Table */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Traffic Source Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400">Source</th>
                <th className="text-right py-3 px-4 text-gray-400">Views</th>
                <th className="text-right py-3 px-4 text-gray-400">Conversions</th>
                <th className="text-right py-3 px-4 text-gray-400">Conv. Rate</th>
                <th className="text-right py-3 px-4 text-gray-400">Cost</th>
                <th className="text-right py-3 px-4 text-gray-400">CPA</th>
                <th className="text-right py-3 px-4 text-gray-400">ROI</th>
              </tr>
            </thead>
            <tbody>
              {analytics.sourceAnalysis.map((source: any) => (
                <tr key={source.source} className="border-b border-gray-700">
                  <td className="py-3 px-4 text-white">{source.source}</td>
                  <td className="text-right py-3 px-4 text-gray-300">{source.views}</td>
                  <td className="text-right py-3 px-4 text-gray-300">{source.conversions}</td>
                  <td className="text-right py-3 px-4 text-gray-300">
                    {((source.conversions / source.views) * 100).toFixed(1)}%
                  </td>
                  <td className="text-right py-3 px-4 text-gray-300">£{source.cost}</td>
                  <td className="text-right py-3 px-4 text-gray-300">
                    {source.cpa > 0 ? `£${source.cpa}` : '-'}
                  </td>
                  <td className="text-right py-3 px-4">
                    <span className={source.cpa > 2 ? 'text-red-400' : 'text-green-400'}>
                      {source.cpa === 0 ? '∞' : `${((source.conversions * 50 - source.cost) / source.cost * 100).toFixed(0)}%`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-between items-center">
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
            Export Report
          </button>
          <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
            Schedule Report
          </button>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
            A/B Test Form
          </button>
          <button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg">
            Optimize Form
          </button>
        </div>
      </div>
    </div>
  )
}