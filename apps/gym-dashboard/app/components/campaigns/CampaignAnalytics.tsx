'use client'

import { useState, useEffect } from 'react'
import { 
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, RadarChart, RadarAxis, PolarGrid, Radar
} from 'recharts'
import { 
  TrendingUp, DollarSign, Users, Target, MousePointer,
  Eye, Calendar, Activity, ArrowUp, ArrowDown
} from 'lucide-react'

interface CampaignAnalyticsProps {
  campaignId?: string
  campaignData?: any
}

export default function CampaignAnalytics({ campaignId, campaignData }: CampaignAnalyticsProps) {
  const [analytics, setAnalytics] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState('7d')
  const [compareMode, setCompareMode] = useState(false)

  useEffect(() => {
    fetchAnalytics()
  }, [campaignId, timeRange])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      // Use mock data for now
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
      impressions: 45678,
      clicks: 1234,
      ctr: 2.7,
      conversions: 89,
      conversionRate: 7.2,
      spend: 567.89,
      revenue: 4567.00,
      roas: 8.04,
      cpc: 0.46,
      cpm: 12.43
    },
    performance: [
      { date: '2025-08-21', impressions: 5234, clicks: 145, conversions: 8, spend: 67.50 },
      { date: '2025-08-22', impressions: 6789, clicks: 189, conversions: 12, spend: 78.90 },
      { date: '2025-08-23', impressions: 7234, clicks: 201, conversions: 15, spend: 82.40 },
      { date: '2025-08-24', impressions: 6890, clicks: 178, conversions: 11, spend: 79.20 },
      { date: '2025-08-25', impressions: 7456, clicks: 215, conversions: 18, spend: 89.30 },
      { date: '2025-08-26', impressions: 6234, clicks: 167, conversions: 13, spend: 76.80 },
      { date: '2025-08-27', impressions: 6841, clicks: 139, conversions: 12, spend: 93.79 }
    ],
    demographics: {
      age: [
        { range: '18-24', impressions: 8234, clicks: 234, conversions: 15 },
        { range: '25-34', impressions: 15678, clicks: 456, conversions: 35 },
        { range: '35-44', impressions: 12345, clicks: 345, conversions: 28 },
        { range: '45-54', impressions: 6789, clicks: 156, conversions: 9 },
        { range: '55+', impressions: 2632, clicks: 43, conversions: 2 }
      ],
      gender: [
        { type: 'Male', value: 58 },
        { type: 'Female', value: 38 },
        { type: 'Other', value: 4 }
      ]
    },
    platforms: [
      { platform: 'Facebook', impressions: 23456, clicks: 678, conversions: 45, spend: 234.56 },
      { platform: 'Instagram', impressions: 18234, clicks: 456, conversions: 32, spend: 189.23 },
      { platform: 'Messenger', impressions: 3988, clicks: 100, conversions: 12, spend: 144.10 }
    ],
    adSets: [
      { name: 'Lookalike 1%', clicks: 456, conversions: 34, ctr: 3.2, spend: 156.78 },
      { name: 'Interest: Fitness', clicks: 345, conversions: 28, ctr: 2.8, spend: 134.56 },
      { name: 'Retargeting', clicks: 234, conversions: 19, ctr: 4.5, spend: 123.45 },
      { name: 'Broad Audience', clicks: 199, conversions: 8, ctr: 1.9, spend: 153.10 }
    ],
    hourlyPerformance: Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      clicks: Math.floor(Math.random() * 100) + 10,
      conversions: Math.floor(Math.random() * 10)
    }))
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  const COLORS = ['#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444']

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">Campaign Performance</h2>
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Eye className="h-5 w-5 text-blue-500" />
            <span className="text-xs text-green-400">+12.5%</span>
          </div>
          <p className="text-gray-400 text-sm">Impressions</p>
          <p className="text-2xl font-bold text-white">{analytics.overview.impressions.toLocaleString()}</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <MousePointer className="h-5 w-5 text-purple-500" />
            <span className="text-xs text-green-400">+8.3%</span>
          </div>
          <p className="text-gray-400 text-sm">Clicks</p>
          <p className="text-2xl font-bold text-white">{analytics.overview.clicks.toLocaleString()}</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Target className="h-5 w-5 text-green-500" />
            <span className="text-xs text-red-400">-2.1%</span>
          </div>
          <p className="text-gray-400 text-sm">CTR</p>
          <p className="text-2xl font-bold text-white">{analytics.overview.ctr}%</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <Users className="h-5 w-5 text-orange-500" />
            <span className="text-xs text-green-400">+15.7%</span>
          </div>
          <p className="text-gray-400 text-sm">Conversions</p>
          <p className="text-2xl font-bold text-white">{analytics.overview.conversions}</p>
        </div>

        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="h-5 w-5 text-yellow-500" />
            <span className="text-xs text-green-400">+23.4%</span>
          </div>
          <p className="text-gray-400 text-sm">ROAS</p>
          <p className="text-2xl font-bold text-white">{analytics.overview.roas}x</p>
        </div>
      </div>

      {/* Performance Chart */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Performance Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={analytics.performance}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
              labelStyle={{ color: '#9CA3AF' }}
            />
            <Legend />
            <Area type="monotone" dataKey="impressions" stackId="1" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
            <Area type="monotone" dataKey="clicks" stackId="2" stroke="#F97316" fill="#F97316" fillOpacity={0.3} />
            <Area type="monotone" dataKey="conversions" stackId="3" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Performance */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Platform Performance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics.platforms}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="platform" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip 
                contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
                labelStyle={{ color: '#9CA3AF' }}
              />
              <Legend />
              <Bar dataKey="clicks" fill="#F97316" />
              <Bar dataKey="conversions" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Demographics */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Audience Demographics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={analytics.demographics.gender}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name}: ${value}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {analytics.demographics.gender.map((entry: any, index: number) => (
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
      </div>

      {/* Ad Sets Performance */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Ad Set Performance</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400">Ad Set</th>
                <th className="text-right py-3 px-4 text-gray-400">Clicks</th>
                <th className="text-right py-3 px-4 text-gray-400">Conversions</th>
                <th className="text-right py-3 px-4 text-gray-400">CTR</th>
                <th className="text-right py-3 px-4 text-gray-400">Spend</th>
                <th className="text-right py-3 px-4 text-gray-400">Performance</th>
              </tr>
            </thead>
            <tbody>
              {analytics.adSets.map((adSet: any, index: number) => (
                <tr key={index} className="border-b border-gray-700">
                  <td className="py-3 px-4 text-white">{adSet.name}</td>
                  <td className="text-right py-3 px-4 text-gray-300">{adSet.clicks}</td>
                  <td className="text-right py-3 px-4 text-gray-300">{adSet.conversions}</td>
                  <td className="text-right py-3 px-4 text-gray-300">{adSet.ctr}%</td>
                  <td className="text-right py-3 px-4 text-gray-300">£{adSet.spend}</td>
                  <td className="text-right py-3 px-4">
                    <div className="flex items-center justify-end gap-1">
                      {adSet.ctr > 3 ? (
                        <ArrowUp className="h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowDown className="h-4 w-4 text-red-500" />
                      )}
                      <span className={adSet.ctr > 3 ? 'text-green-500' : 'text-red-500'}>
                        {adSet.ctr > 3 ? 'Good' : 'Needs Work'}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hourly Performance Heatmap */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Best Times to Run Ads</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={analytics.hourlyPerformance}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="hour" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1F2937', border: 'none' }}
              labelStyle={{ color: '#9CA3AF' }}
            />
            <Bar dataKey="conversions" fill="#10B981" />
          </BarChart>
        </ResponsiveContainer>
        <p className="text-sm text-gray-400 mt-2">
          Peak performance: 6-9 PM (18:00-21:00)
        </p>
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
            Optimize Campaign
          </button>
          <button className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg">
            Duplicate Campaign
          </button>
        </div>
      </div>
    </div>
  )
}