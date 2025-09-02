'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/app/lib/supabase/client'
import DashboardLayout from '../components/DashboardLayout'
import { SaasBillingDashboard } from '@/app/components/saas/SaasBillingDashboard'
import { 
  Building2, 
  Users, 
  CreditCard, 
  Settings, 
  BarChart3, 
  Shield,
  TrendingUp,
  Calendar,
  MessageSquare,
  DollarSign,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'

interface BusinessMetrics {
  revenue: number
  revenueGrowth: number
  activeMembers: number
  newLeads: number
  conversionRate: number
  churnRate: number
  avgClassAttendance: number
  upcomingClasses: number
  pendingPayments: number
  activeStaff: number
}

interface RecentActivity {
  id: string
  type: 'lead' | 'payment' | 'booking' | 'staff' | 'system'
  message: string
  timestamp: string
  status?: 'success' | 'warning' | 'error'
}

export default function BusinessManagementPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [organization, setOrganization] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'staff' | 'settings'>('overview')
  const [metrics, setMetrics] = useState<BusinessMetrics>({
    revenue: 0,
    revenueGrowth: 0,
    activeMembers: 0,
    newLeads: 0,
    conversionRate: 0,
    churnRate: 0,
    avgClassAttendance: 0,
    upcomingClasses: 0,
    pendingPayments: 0,
    activeStaff: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (organizationId) {
      fetchOrganizationData()
      fetchMetrics()
      fetchRecentActivity()
    }
  }, [organizationId])

  const checkAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      
      setUser(user)
      
      // Get user's organization
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .single()
      
      if (!userOrg) {
        // Try organization_members table
        const { data: memberOrg } = await supabase
          .from('organization_members')
          .select('organization_id, role')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single()
        
        if (memberOrg) {
          setOrganizationId(memberOrg.organization_id)
        }
      } else {
        setOrganizationId(userOrg.organization_id)
      }
    } catch (error) {
      console.error('Auth check error:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchOrganizationData = async () => {
    if (!organizationId) return
    
    try {
      const { data } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', organizationId)
        .single()
      
      setOrganization(data)
    } catch (error) {
      console.error('Error fetching organization:', error)
    }
  }

  const fetchMetrics = async () => {
    if (!organizationId) return
    
    try {
      // Fetch various metrics from different tables
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      
      // Active members count
      const { count: membersCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('status', 'active')
      
      // New leads this month
      const { count: leadsCount } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('created_at', startOfMonth.toISOString())
      
      // Upcoming classes
      const { count: classesCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .gte('start_time', now.toISOString())
        .lte('start_time', new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString())
      
      // Active staff
      const { count: staffCount } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .eq('is_active', true)
      
      // Calculate mock revenue and growth
      const mockRevenue = 5432
      const mockGrowth = 12.5
      const mockConversionRate = 23.4
      const mockChurnRate = 2.1
      const mockAttendance = 78
      const mockPendingPayments = 3
      
      setMetrics({
        revenue: mockRevenue,
        revenueGrowth: mockGrowth,
        activeMembers: membersCount || 0,
        newLeads: leadsCount || 0,
        conversionRate: mockConversionRate,
        churnRate: mockChurnRate,
        avgClassAttendance: mockAttendance,
        upcomingClasses: classesCount || 0,
        pendingPayments: mockPendingPayments,
        activeStaff: staffCount || 0
      })
    } catch (error) {
      console.error('Error fetching metrics:', error)
    }
  }

  const fetchRecentActivity = async () => {
    if (!organizationId) return
    
    // Mock recent activity
    const mockActivity: RecentActivity[] = [
      {
        id: '1',
        type: 'lead',
        message: 'New lead from Facebook: John Smith',
        timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
        status: 'success'
      },
      {
        id: '2',
        type: 'payment',
        message: 'Payment received: £45 from Emily Johnson',
        timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
        status: 'success'
      },
      {
        id: '3',
        type: 'booking',
        message: 'Class fully booked: Yoga with Sarah',
        timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        status: 'warning'
      },
      {
        id: '4',
        type: 'system',
        message: 'Facebook sync completed: 15 new leads imported',
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        status: 'success'
      },
      {
        id: '5',
        type: 'staff',
        message: 'Staff member clocked in: Mike Wilson',
        timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      }
    ]
    
    setRecentActivity(mockActivity)
  }

  const formatTimeAgo = (timestamp: string) => {
    const diff = Date.now() - new Date(timestamp).getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)
    
    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    return `${minutes}m ago`
  }

  const getActivityIcon = (type: RecentActivity['type'], status?: RecentActivity['status']) => {
    if (status === 'error') return <XCircle className="h-4 w-4 text-red-500" />
    if (status === 'warning') return <AlertCircle className="h-4 w-4 text-yellow-500" />
    if (status === 'success') return <CheckCircle className="h-4 w-4 text-green-500" />
    
    switch (type) {
      case 'lead': return <Users className="h-4 w-4 text-blue-500" />
      case 'payment': return <DollarSign className="h-4 w-4 text-green-500" />
      case 'booking': return <Calendar className="h-4 w-4 text-purple-500" />
      case 'staff': return <Users className="h-4 w-4 text-orange-500" />
      case 'system': return <Settings className="h-4 w-4 text-gray-500" />
      default: return <Activity className="h-4 w-4 text-gray-500" />
    }
  }

  if (loading) {
    return (
      <DashboardLayout userData={null}>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading business dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout userData={user}>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Building2 className="h-8 w-8 text-orange-500" />
                Business Management
              </h1>
              <p className="text-gray-400">
                {organization?.name || 'Your Business'} • {organization?.plan || 'Free Trial'}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => router.push('/settings/business')}
                className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Settings
              </button>
              <button
                onClick={() => router.push('/admin/dashboard')}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Admin Portal
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-gray-700">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 px-1 font-medium transition-colors relative ${
              activeTab === 'overview' 
                ? 'text-orange-500' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Overview
            {activeTab === 'overview' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('billing')}
            className={`pb-3 px-1 font-medium transition-colors relative ${
              activeTab === 'billing' 
                ? 'text-orange-500' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Billing & Plans
            {activeTab === 'billing' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`pb-3 px-1 font-medium transition-colors relative ${
              activeTab === 'staff' 
                ? 'text-orange-500' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Staff Management
            {activeTab === 'staff' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 px-1 font-medium transition-colors relative ${
              activeTab === 'settings' 
                ? 'text-orange-500' 
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            Integrations
            {activeTab === 'settings' && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500" />
            )}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <MetricCard
                title="Monthly Revenue"
                value={`£${metrics.revenue.toLocaleString()}`}
                change={`+${metrics.revenueGrowth}%`}
                trend="up"
                icon={<DollarSign className="h-5 w-5" />}
              />
              <MetricCard
                title="Active Members"
                value={metrics.activeMembers.toString()}
                subtitle={`${metrics.newLeads} new leads`}
                icon={<Users className="h-5 w-5" />}
              />
              <MetricCard
                title="Conversion Rate"
                value={`${metrics.conversionRate}%`}
                change={`-${metrics.churnRate}% churn`}
                trend="down"
                icon={<TrendingUp className="h-5 w-5" />}
              />
              <MetricCard
                title="Class Attendance"
                value={`${metrics.avgClassAttendance}%`}
                subtitle={`${metrics.upcomingClasses} upcoming`}
                icon={<Calendar className="h-5 w-5" />}
              />
            </div>

            {/* Business Health Score */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Business Health Score</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <HealthIndicator
                  label="Revenue Growth"
                  score={85}
                  status="good"
                  description="Revenue is growing steadily month over month"
                />
                <HealthIndicator
                  label="Customer Retention"
                  score={72}
                  status="moderate"
                  description="Some improvement needed in retention strategies"
                />
                <HealthIndicator
                  label="Operational Efficiency"
                  score={91}
                  status="excellent"
                  description="Classes and staff are well utilized"
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <QuickAction
                icon={<MessageSquare className="h-6 w-6" />}
                label="Send Campaign"
                onClick={() => router.push('/conversations')}
                color="blue"
              />
              <QuickAction
                icon={<Calendar className="h-6 w-6" />}
                label="Schedule Class"
                onClick={() => router.push('/classes/recurring')}
                color="green"
              />
              <QuickAction
                icon={<Users className="h-6 w-6" />}
                label="Import Leads"
                onClick={() => router.push('/leads/import')}
                color="purple"
              />
              <QuickAction
                icon={<BarChart3 className="h-6 w-6" />}
                label="View Reports"
                onClick={() => router.push('/analytics')}
                color="orange"
              />
            </div>

            {/* Recent Activity */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                    <div className="flex items-center gap-3">
                      {getActivityIcon(activity.type, activity.status)}
                      <span className="text-sm">{activity.message}</span>
                    </div>
                    <span className="text-xs text-gray-400">{formatTimeAgo(activity.timestamp)}</span>
                  </div>
                ))}
              </div>
              <button 
                onClick={() => router.push('/audit-logs')}
                className="mt-4 text-sm text-orange-500 hover:text-orange-400 transition-colors"
              >
                View all activity →
              </button>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <SaasBillingDashboard />
        )}

        {activeTab === 'staff' && (
          <div className="space-y-6">
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold">Staff Management</h2>
                <button
                  onClick={() => router.push('/staff')}
                  className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
                >
                  Manage Staff
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-gray-900 rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">Active Staff</p>
                  <p className="text-2xl font-bold">{metrics.activeStaff}</p>
                </div>
                <div className="p-4 bg-gray-900 rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">On Duty Now</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
                <div className="p-4 bg-gray-900 rounded-lg">
                  <p className="text-gray-400 text-sm mb-1">Avg Hours/Week</p>
                  <p className="text-2xl font-bold">32</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-400">Recent Staff Activity</p>
                <div className="space-y-2">
                  {['Mike Wilson - Clocked in at 9:00 AM', 'Sarah Johnson - Completed 3 PT sessions', 'Tom Brown - Updated availability'].map((activity, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm py-2 border-b border-gray-700 last:border-0">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span>{activity}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <IntegrationCard
              name="Facebook"
              description="Sync leads from Facebook Ads"
              connected={true}
              onClick={() => router.push('/settings/integrations/facebook')}
            />
            <IntegrationCard
              name="WhatsApp"
              description="Send automated messages"
              connected={true}
              onClick={() => router.push('/settings/integrations/whatsapp')}
            />
            <IntegrationCard
              name="Stripe"
              description="Process payments"
              connected={false}
              onClick={() => router.push('/settings/integrations/stripe')}
            />
            <IntegrationCard
              name="Google Calendar"
              description="Sync class schedules"
              connected={false}
              onClick={() => router.push('/settings/integrations/google')}
            />
            <IntegrationCard
              name="Mailchimp"
              description="Email marketing"
              connected={false}
              onClick={() => router.push('/settings/integrations/mailchimp')}
            />
            <IntegrationCard
              name="Zapier"
              description="Connect 5000+ apps"
              connected={false}
              onClick={() => router.push('/settings/integrations/zapier')}
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

function MetricCard({ title, value, change, trend, subtitle, icon }: any) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="text-gray-400">{icon}</div>
        {change && (
          <span className={`text-xs ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
            {change}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold mb-1">{value}</p>
      <p className="text-sm text-gray-400">{title}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  )
}

function HealthIndicator({ label, score, status, description }: any) {
  const getColor = () => {
    if (status === 'excellent') return 'text-green-500'
    if (status === 'good') return 'text-blue-500'
    if (status === 'moderate') return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium">{label}</span>
        <span className={`text-2xl font-bold ${getColor()}`}>{score}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${
            status === 'excellent' ? 'bg-green-500' :
            status === 'good' ? 'bg-blue-500' :
            status === 'moderate' ? 'bg-yellow-500' :
            'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">{description}</p>
    </div>
  )
}

function QuickAction({ icon, label, onClick, color }: any) {
  const getColorClasses = () => {
    switch (color) {
      case 'blue': return 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-500'
      case 'green': return 'bg-green-500/10 hover:bg-green-500/20 text-green-500'
      case 'purple': return 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-500'
      case 'orange': return 'bg-orange-500/10 hover:bg-orange-500/20 text-orange-500'
      default: return 'bg-gray-700 hover:bg-gray-600 text-gray-400'
    }
  }

  return (
    <button
      onClick={onClick}
      className={`p-4 rounded-lg transition-colors flex flex-col items-center gap-2 ${getColorClasses()}`}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}

function IntegrationCard({ name, description, connected, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:bg-gray-700 transition-colors text-left"
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold">{name}</h3>
        <span className={`text-xs px-2 py-1 rounded ${
          connected ? 'bg-green-500/20 text-green-500' : 'bg-gray-700 text-gray-400'
        }`}>
          {connected ? 'Connected' : 'Not Connected'}
        </span>
      </div>
      <p className="text-sm text-gray-400">{description}</p>
    </button>
  )
}