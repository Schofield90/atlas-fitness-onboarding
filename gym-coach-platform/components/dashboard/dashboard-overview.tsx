'use client'

import { Users, UserPlus, TrendingUp, DollarSign, Target, Calendar } from 'lucide-react'
import { MetricsCard } from './metrics-card'
import { AIInsightsCard } from '@/components/ai/ai-insights-card'
import { LeadRecommendations } from '@/components/ai/lead-recommendations'
import { IntegrationCardsDemo } from './integration-cards'
import { useDashboardMetrics } from '@/hooks/use-api'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

export function DashboardOverview() {
  const { data: metrics, isLoading, error } = useDashboardMetrics()
  const metricsData = metrics as any

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load dashboard metrics</p>
      </div>
    )
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
    }).format(value)
  }

  // Mock data for charts - in real app, this would come from API
  const leadTrendData = [
    { month: 'Jan', leads: 45, conversions: 12 },
    { month: 'Feb', leads: 52, conversions: 15 },
    { month: 'Mar', leads: 48, conversions: 14 },
    { month: 'Apr', leads: 61, conversions: 18 },
    { month: 'May', leads: 55, conversions: 16 },
    { month: 'Jun', leads: 67, conversions: 20 },
  ]

  const revenueData = [
    { month: 'Jan', revenue: 12450 },
    { month: 'Feb', revenue: 15200 },
    { month: 'Mar', revenue: 14800 },
    { month: 'Apr', revenue: 18900 },
    { month: 'May', revenue: 16700 },
    { month: 'Jun', revenue: 22100 },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
        <p className="text-gray-600">Welcome back! Here&apos;s what&apos;s happening with your gym.</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricsCard
          title="Total Leads"
          value={metricsData?.leads?.total || 0}
          icon={UserPlus}
          loading={isLoading}
        />
        <MetricsCard
          title="Active Clients"
          value={metricsData?.clients?.active || 0}
          icon={Users}
          loading={isLoading}
        />
        <MetricsCard
          title="Conversion Rate"
          value={`${metricsData?.conversion_rate || 0}%`}
          icon={Target}
          loading={isLoading}
        />
        <MetricsCard
          title="Total Revenue"
          value={formatCurrency(metricsData?.clients?.total_revenue || 0)}
          icon={DollarSign}
          loading={isLoading}
        />
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricsCard
          title="This Month's Leads"
          value={metricsData?.leads?.this_month || 0}
          icon={TrendingUp}
          loading={isLoading}
        />
        <MetricsCard
          title="New Clients"
          value={metricsData?.clients?.this_month || 0}
          icon={Calendar}
          loading={isLoading}
        />
        <MetricsCard
          title="Avg Lead Score"
          value={`${metricsData?.leads?.avg_score || 0}/100`}
          icon={Target}
          loading={isLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Conversion Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Lead Conversion Trends</h3>
          {isLoading ? (
            <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={leadTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Monthly Revenue</h3>
          {isLoading ? (
            <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Bar dataKey="revenue" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Lead Status Breakdown */}
      {metricsData?.leads && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Lead Status Breakdown</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{metricsData.leads.by_status.cold}</div>
              <div className="text-sm text-gray-600">Cold</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{metricsData.leads.by_status.warm}</div>
              <div className="text-sm text-gray-600">Warm</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{metricsData.leads.by_status.hot}</div>
              <div className="text-sm text-gray-600">Hot</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{metricsData.leads.by_status.converted}</div>
              <div className="text-sm text-gray-600">Converted</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{metricsData.leads.by_status.lost}</div>
              <div className="text-sm text-gray-600">Lost</div>
            </div>
          </div>
        </div>
      )}

      {/* Integrations Section */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Integrations</h2>
        <IntegrationCardsDemo />
      </div>

      {/* AI Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AIInsightsCard />
        <LeadRecommendations />
      </div>
    </div>
  )
}