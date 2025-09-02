'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  SaasPlan, 
  CreatePlanRequest, 
  FEATURE_CATEGORIES,
  BillingCycle,
  PlanTier 
} from '@/app/lib/types/plans'
import { 
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  Star,
  Users,
  Settings,
  Loader2,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Calendar,
  Zap,
  Shield,
  ArrowUpDown,
  Filter,
  Search,
  Download
} from 'lucide-react'
import PlanEditor from '@/app/components/saas-admin/PlanEditor'
import SubscriptionAssignment from '@/app/components/saas-admin/SubscriptionAssignment'

interface PlanStats {
  total_plans: number
  active_plans: number
  total_subscriptions: number
  monthly_revenue: number
}

export default function PlansManagementPage() {
  const [plans, setPlans] = useState<SaasPlan[]>([])
  const [stats, setStats] = useState<PlanStats>({
    total_plans: 0,
    active_plans: 0,
    total_subscriptions: 0,
    monthly_revenue: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActive, setFilterActive] = useState<boolean | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingPlan, setEditingPlan] = useState<SaasPlan | null>(null)
  const [processingPlanId, setProcessingPlanId] = useState<string | null>(null)
  const [showSubscriptionAssignment, setShowSubscriptionAssignment] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    checkAuthAndLoadData()
  }, [])

  const checkAuthAndLoadData = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        router.push('/login')
        return
      }

      const authorizedEmails = ['sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk']
      if (!authorizedEmails.includes(user.email?.toLowerCase() || '')) {
        router.push('/saas-admin')
        return
      }

      await Promise.all([
        loadPlans(),
        loadStats()
      ])
    } catch (error) {
      console.error('Auth check failed:', error)
      setError('Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  const loadPlans = async () => {
    try {
      const params = new URLSearchParams()
      if (filterActive !== null) params.set('active', filterActive.toString())
      
      const response = await fetch(`/api/saas-admin/plans?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load plans')
      }

      setPlans(data.plans)
    } catch (error: any) {
      console.error('Error loading plans:', error)
      setError(error.message)
    }
  }

  const loadStats = async () => {
    try {
      // Load basic stats - in a real implementation, you'd have dedicated endpoints
      const [plansResponse, subscriptionsResponse] = await Promise.all([
        fetch('/api/saas-admin/plans'),
        fetch('/api/saas-admin/subscriptions')
      ])

      const plansData = await plansResponse.json()
      const subscriptionsData = await subscriptionsResponse.json()

      if (plansResponse.ok && subscriptionsResponse.ok) {
        const activePlans = plansData.plans.filter((p: SaasPlan) => p.is_active).length
        const totalRevenue = subscriptionsData.subscriptions
          .filter((s: any) => s.status === 'active')
          .reduce((sum: number, s: any) => sum + (s.amount || 0), 0)

        setStats({
          total_plans: plansData.plans.length,
          active_plans: activePlans,
          total_subscriptions: subscriptionsData.subscriptions.length,
          monthly_revenue: totalRevenue
        })
      }
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleTogglePlanStatus = async (planId: string, currentStatus: boolean) => {
    if (processingPlanId) return

    setProcessingPlanId(planId)
    try {
      const response = await fetch(`/api/saas-admin/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to update plan')
      }

      await loadPlans()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setProcessingPlanId(null)
    }
  }

  const handleDeletePlan = async (planId: string, planName: string) => {
    if (!confirm(`Are you sure you want to delete the plan "${planName}"? This action cannot be undone.`)) {
      return
    }

    if (processingPlanId) return

    setProcessingPlanId(planId)
    try {
      const response = await fetch(`/api/saas-admin/plans/${planId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete plan')
      }

      await loadPlans()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setProcessingPlanId(null)
    }
  }

  const formatPrice = (priceInPence: number) => {
    return `£${(priceInPence / 100).toFixed(2)}`
  }

  const formatRevenue = (revenueInPence: number) => {
    const pounds = revenueInPence / 100
    if (pounds >= 1000000) {
      return `£${(pounds / 1000000).toFixed(1)}M`
    } else if (pounds >= 1000) {
      return `£${(pounds / 1000).toFixed(1)}K`
    }
    return `£${pounds.toFixed(0)}`
  }

  const filteredPlans = plans.filter(plan => {
    const matchesSearch = plan.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.slug.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterActive === null || plan.is_active === filterActive
    
    return matchesSearch && matchesFilter
  })

  const getTierColor = (tier: PlanTier) => {
    switch (tier) {
      case 'starter': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'professional': return 'bg-purple-100 text-purple-800 border-purple-200'
      case 'enterprise': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'custom': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-8 w-8 text-purple-500 mx-auto mb-4" />
          <p className="text-gray-400">Loading plans management...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-purple-500">Plans Management</h1>
            <p className="text-sm text-gray-400">Manage subscription plans and pricing</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/saas-admin')}
              className="px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-sm"
            >
              Back to Admin
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              <Plus className="h-4 w-4" />
              Create Plan
            </button>
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Error Banner */}
        {error && (
          <div className="mb-6 bg-red-900/50 border border-red-700 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
            <div>
              <p className="text-red-200">{error}</p>
              <button
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-300 text-sm underline mt-1"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Settings className="w-6 h-6 text-blue-500" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.total_plans}</div>
            <div className="text-sm text-gray-400">Total Plans</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.active_plans}</div>
            <div className="text-sm text-gray-400">Active Plans</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <Users className="w-6 h-6 text-purple-500" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{stats.total_subscriptions}</div>
            <div className="text-sm text-gray-400">Subscriptions</div>
          </div>

          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-orange-500/10">
                <DollarSign className="w-6 h-6 text-orange-500" />
              </div>
            </div>
            <div className="text-3xl font-bold mb-1">{formatRevenue(stats.monthly_revenue)}</div>
            <div className="text-sm text-gray-400">Monthly Revenue</div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-gray-800 rounded-lg p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search plans..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <select
                value={filterActive === null ? 'all' : filterActive.toString()}
                onChange={(e) => {
                  const value = e.target.value
                  setFilterActive(value === 'all' ? null : value === 'true')
                }}
                className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Plans</option>
                <option value="true">Active Only</option>
                <option value="false">Inactive Only</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={loadPlans}
                disabled={loading}
                className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUpDown className="h-4 w-4" />}
              </button>
              <button className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
                <Download className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Plans Table */}
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                    Tier
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                    Pricing
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                    Features
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {filteredPlans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                      {searchTerm || filterActive !== null ? 'No plans match your filters' : 'No plans found'}
                    </td>
                  </tr>
                ) : (
                  filteredPlans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-gray-700/50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                            {plan.is_popular && (
                              <Star className="h-4 w-4 text-yellow-500 fill-current" />
                            )}
                          </div>
                          <p className="text-sm text-gray-400">{plan.slug}</p>
                          {plan.description && (
                            <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getTierColor(plan.tier)}`}>
                          {plan.tier}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm">
                          <div className="text-white font-medium">
                            {formatPrice(plan.price_monthly)}/month
                          </div>
                          <div className="text-gray-400">
                            {formatPrice(plan.price_yearly)}/year
                          </div>
                          {plan.price_setup && (
                            <div className="text-gray-500 text-xs">
                              Setup: {formatPrice(plan.price_setup)}
                            </div>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-400">
                          {Object.keys(plan.features).length} features
                          <br />
                          {Object.keys(plan.limits).length} limits
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTogglePlanStatus(plan.id, plan.is_active)}
                            disabled={processingPlanId === plan.id}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              plan.is_active 
                                ? 'bg-green-100 text-green-800 border-green-200' 
                                : 'bg-red-100 text-red-800 border-red-200'
                            } ${processingPlanId === plan.id ? 'opacity-50' : 'hover:opacity-80'}`}
                          >
                            {processingPlanId === plan.id ? (
                              <Loader2 className="h-3 w-3 animate-spin mr-1" />
                            ) : plan.is_active ? (
                              <Eye className="h-3 w-3 mr-1" />
                            ) : (
                              <EyeOff className="h-3 w-3 mr-1" />
                            )}
                            {plan.is_active ? 'Active' : 'Inactive'}
                          </button>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingPlan(plan)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                            title="Edit Plan"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePlan(plan.id, plan.name)}
                            disabled={processingPlanId === plan.id}
                            className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                            title="Delete Plan"
                          >
                            {processingPlanId === plan.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => router.push('/saas-admin/plans/comparison')}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 rounded-lg hover:bg-purple-700 transition-colors text-sm"
            >
              <Zap className="h-4 w-4" />
              Plan Comparison
            </button>
            <button
              onClick={() => setShowSubscriptionAssignment(true)}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Users className="h-4 w-4" />
              Assign Subscription
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-sm">
              <Calendar className="h-4 w-4" />
              Usage Reports
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 rounded-lg hover:bg-orange-700 transition-colors text-sm">
              <Shield className="h-4 w-4" />
              Feature Flags
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <PlanEditor
        plan={editingPlan}
        isOpen={showCreateModal || editingPlan !== null}
        onClose={() => {
          setShowCreateModal(false)
          setEditingPlan(null)
        }}
        onSave={() => {
          loadPlans()
          loadStats()
        }}
      />

      <SubscriptionAssignment
        isOpen={showSubscriptionAssignment}
        onClose={() => setShowSubscriptionAssignment(false)}
        onAssigned={() => {
          loadStats()
        }}
      />
    </div>
  )
}