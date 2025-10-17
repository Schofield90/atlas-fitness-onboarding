'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Building2, 
  Users, 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  CheckCircle,
  Calendar,
  Download,
  Mail,
  RefreshCw,
  Clock,
  BarChart3,
  PieChart,
  Shield
} from 'lucide-react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart as RechartsPieChart, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface WeeklyBriefData {
  kpis: {
    mrr: { current: number; change: number; trend: 'up' | 'down' }
    churn: { current: number; change: number; trend: 'up' | 'down' }
    newSignups: { current: number; change: number; trend: 'up' | 'down' }
    activeUsers: { current: number; change: number; trend: 'up' | 'down' }
  }
  revenue: {
    total: number
    growth: number
    forecast: number
    trends: Array<{ date: string; amount: number; forecast?: number }>
  }
  tenants: {
    topPerforming: Array<{ id: string; name: string; revenue: number; growth: number }>
    atRisk: Array<{ id: string; name: string; issue: string; severity: 'low' | 'medium' | 'high' }>
  }
  incidents: Array<{ 
    id: string; 
    title: string; 
    status: 'resolved' | 'investigating' | 'monitoring'
    impact: 'low' | 'medium' | 'high'
    resolvedAt?: string
  }>
  integrations: {
    overall: 'healthy' | 'degraded' | 'down'
    services: Array<{ name: string; status: 'up' | 'down' | 'degraded'; uptime: number }>
  }
  actionItems: Array<{
    id: string
    title: string
    owner: string
    deadline: string
    priority: 'low' | 'medium' | 'high'
    status: 'pending' | 'in_progress' | 'completed'
  }>
}

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

export default function WeeklyBriefPage() {
  const [briefData, setBriefData] = useState<WeeklyBriefData | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [lastGenerated, setLastGenerated] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuthAndLoadBrief()
  }, [])

  const checkAuthAndLoadBrief = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      
      if (error || !user) {
        router.push('/login')
        return
      }

      setUser(user)

      // Check authorization
      const authorizedEmails = ['sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk']
      const isAuth = authorizedEmails.includes(user.email?.toLowerCase() || '')
      
      if (!isAuth) {
        setLoading(false)
        return
      }

      setIsAuthorized(true)
      await loadWeeklyBrief()
    } catch (error) {
      console.error('Error checking auth:', error)
      setLoading(false)
    }
  }

  const loadWeeklyBrief = async () => {
    try {
      const response = await fetch('/api/saas-admin/weekly-brief')
      if (response.ok) {
        const data = await response.json()
        setBriefData(data.briefData)
        setLastGenerated(data.generatedAt)
      }
    } catch (error) {
      console.error('Error loading brief:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateNewBrief = async () => {
    setIsGenerating(true)
    try {
      const response = await fetch('/api/saas-admin/weekly-brief/generate', {
        method: 'POST'
      })
      if (response.ok) {
        await loadWeeklyBrief()
      }
    } catch (error) {
      console.error('Error generating brief:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const exportToPDF = async () => {
    try {
      const response = await fetch('/api/saas-admin/weekly-brief/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format: 'pdf' })
      })
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `weekly-brief-${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error exporting PDF:', error)
    }
  }

  const sendEmail = async () => {
    try {
      await fetch('/api/saas-admin/weekly-brief/send', {
        method: 'POST'
      })
      alert('Weekly brief sent via email!')
    } catch (error) {
      console.error('Error sending email:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading weekly executive brief...</p>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center bg-gray-800 p-8 rounded-lg max-w-md">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400 mb-6">You don't have permission to access the executive brief.</p>
          <button
            onClick={() => router.push('/saas-admin')}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            Back to Admin Dashboard
          </button>
        </div>
      </div>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercent = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`
  }

  const getTrendIcon = (trend: 'up' | 'down') => {
    return trend === 'up' ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    )
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-400'
      case 'medium': return 'text-yellow-400'
      default: return 'text-green-400'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-400'
      case 'in_progress': return 'text-blue-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-purple-500">Weekly Executive Brief</h1>
            <p className="text-sm text-gray-400">
              {lastGenerated ? `Last updated: ${new Date(lastGenerated).toLocaleString()}` : 'No brief generated yet'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={generateNewBrief}
              disabled={isGenerating}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Generating...' : 'Generate New'}
            </button>
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </button>
            <button
              onClick={sendEmail}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Mail className="h-4 w-4" />
              Send Email
            </button>
            <button
              onClick={() => router.push('/saas-admin')}
              className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
            >
              Back
            </button>
          </div>
        </div>
      </header>

      {!briefData ? (
        <div className="p-6">
          <div className="text-center bg-gray-800 rounded-lg p-12">
            <BarChart3 className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">No Brief Available</h2>
            <p className="text-gray-400 mb-6">Generate your first weekly executive brief to get started.</p>
            <button
              onClick={generateNewBrief}
              disabled={isGenerating}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 mx-auto"
            >
              <RefreshCw className={`h-5 w-5 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Generating Brief...' : 'Generate Weekly Brief'}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <DollarSign className="w-6 h-6 text-green-500" />
                </div>
                {getTrendIcon(briefData.kpis.mrr.trend)}
              </div>
              <div className="text-2xl font-bold mb-1">{formatCurrency(briefData.kpis.mrr.current)}</div>
              <div className="text-sm text-gray-400">Monthly Recurring Revenue</div>
              <div className={`text-sm ${briefData.kpis.mrr.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                {formatPercent(briefData.kpis.mrr.change)} from last week
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-red-500/10">
                  <TrendingDown className="w-6 h-6 text-red-500" />
                </div>
                {getTrendIcon(briefData.kpis.churn.trend)}
              </div>
              <div className="text-2xl font-bold mb-1">{briefData.kpis.churn.current.toFixed(1)}%</div>
              <div className="text-sm text-gray-400">Churn Rate</div>
              <div className={`text-sm ${briefData.kpis.churn.trend === 'down' ? 'text-green-400' : 'text-red-400'}`}>
                {formatPercent(briefData.kpis.churn.change)} from last week
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
                {getTrendIcon(briefData.kpis.newSignups.trend)}
              </div>
              <div className="text-2xl font-bold mb-1">{briefData.kpis.newSignups.current}</div>
              <div className="text-sm text-gray-400">New Signups</div>
              <div className={`text-sm ${briefData.kpis.newSignups.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                {formatPercent(briefData.kpis.newSignups.change)} from last week
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Activity className="w-6 h-6 text-purple-500" />
                </div>
                {getTrendIcon(briefData.kpis.activeUsers.trend)}
              </div>
              <div className="text-2xl font-bold mb-1">{briefData.kpis.activeUsers.current.toLocaleString()}</div>
              <div className="text-sm text-gray-400">Active Users</div>
              <div className={`text-sm ${briefData.kpis.activeUsers.trend === 'up' ? 'text-green-400' : 'text-red-400'}`}>
                {formatPercent(briefData.kpis.activeUsers.change)} from last week
              </div>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Revenue Trends & Forecast
            </h2>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={briefData.revenue.trends}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="date" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip 
                    formatter={(value: any) => [formatCurrency(value), 'Revenue']}
                    labelStyle={{ color: '#000' }}
                    contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.3} />
                  <Area type="monotone" dataKey="forecast" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.1} strokeDasharray="5 5" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Performing Tenants */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-green-500" />
                Top Performing Tenants
              </h2>
              <div className="space-y-4">
                {briefData.tenants.topPerforming.map((tenant) => (
                  <div key={tenant.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium">{tenant.name}</div>
                      <div className="text-sm text-gray-400">{formatCurrency(tenant.revenue)} revenue</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-green-400">{formatPercent(tenant.growth)}</div>
                      <div className="text-xs text-gray-500">growth</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* At-Risk Tenants */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                At-Risk Tenants
              </h2>
              <div className="space-y-4">
                {briefData.tenants.atRisk.map((tenant) => (
                  <div key={tenant.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div>
                      <div className="font-medium">{tenant.name}</div>
                      <div className="text-sm text-gray-400">{tenant.issue}</div>
                    </div>
                    <div className={`px-2 py-1 rounded text-xs font-medium ${
                      tenant.severity === 'high' ? 'bg-red-900 text-red-300' :
                      tenant.severity === 'medium' ? 'bg-yellow-900 text-yellow-300' :
                      'bg-green-900 text-green-300'
                    }`}>
                      {tenant.severity}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Integration Health */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-500" />
              Integration Health Summary
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {briefData.integrations.services.map((service) => (
                <div key={service.name} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium text-sm">{service.name}</div>
                    <div className={`w-2 h-2 rounded-full ${
                      service.status === 'up' ? 'bg-green-500' :
                      service.status === 'degraded' ? 'bg-yellow-500' :
                      'bg-red-500'
                    }`}></div>
                  </div>
                  <div className="text-xs text-gray-400">{service.uptime.toFixed(1)}% uptime</div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Items */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-500" />
              Action Items
            </h2>
            <div className="space-y-3">
              {briefData.actionItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{item.title}</div>
                    <div className="text-sm text-gray-400">Owner: {item.owner}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={`text-sm ${getPriorityColor(item.priority)}`}>
                      {item.priority.toUpperCase()}
                    </div>
                    <div className="text-sm text-gray-400">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      {new Date(item.deadline).toLocaleDateString()}
                    </div>
                    <div className={`px-2 py-1 rounded text-xs ${getStatusColor(item.status)}`}>
                      {item.status.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}