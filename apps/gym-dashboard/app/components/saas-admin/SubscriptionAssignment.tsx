'use client'

import { useState, useEffect } from 'react'
import { 
  SaasPlan, 
  SaasSubscription,
  CreateSubscriptionRequest,
  BillingCycle
} from '@/app/lib/types/plans'
import { 
  Search,
  Users,
  Calendar,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  ArrowRight,
  Building2,
  Mail,
  Phone,
  Star,
  Zap,
  Plus
} from 'lucide-react'

interface Organization {
  id: string
  name: string
  email?: string
  phone?: string
  created_at: string
  subscription?: SaasSubscription
}

interface SubscriptionAssignmentProps {
  isOpen: boolean
  onClose: () => void
  onAssigned: () => void
}

export default function SubscriptionAssignment({ isOpen, onClose, onAssigned }: SubscriptionAssignmentProps) {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [plans, setPlans] = useState<SaasPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [assigning, setAssigning] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string>('')
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly')
  const [trialDays, setTrialDays] = useState<number>(14)
  const [couponCode, setCouponCode] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  useEffect(() => {
    if (searchTerm.trim()) {
      const debounceTimer = setTimeout(() => {
        searchOrganizations()
      }, 300)
      return () => clearTimeout(debounceTimer)
    } else {
      loadOrganizations()
    }
  }, [searchTerm])

  const loadData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadOrganizations(),
        loadPlans()
      ])
    } catch (error) {
      console.error('Error loading data:', error)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const loadOrganizations = async () => {
    try {
      const response = await fetch('/api/saas-admin/organizations?with_subscriptions=true')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load organizations')
      }

      setOrganizations(data.organizations || [])
    } catch (error: any) {
      console.error('Error loading organizations:', error)
      setError(error.message)
    }
  }

  const loadPlans = async () => {
    try {
      const response = await fetch('/api/saas-admin/plans?active=true')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load plans')
      }

      setPlans(data.plans || [])
      
      // Auto-select first plan if none selected
      if (data.plans.length > 0 && !selectedPlan) {
        setSelectedPlan(data.plans[0].id)
      }
    } catch (error: any) {
      console.error('Error loading plans:', error)
      setError(error.message)
    }
  }

  const searchOrganizations = async () => {
    if (!searchTerm.trim()) return

    try {
      setSearching(true)
      const response = await fetch(`/api/saas-admin/organizations?search=${encodeURIComponent(searchTerm)}&with_subscriptions=true`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search organizations')
      }

      setOrganizations(data.organizations || [])
    } catch (error: any) {
      console.error('Error searching organizations:', error)
      setError(error.message)
    } finally {
      setSearching(false)
    }
  }

  const handleAssignSubscription = async () => {
    if (!selectedOrg || !selectedPlan) return

    const assignmentId = `${selectedOrg.id}-${selectedPlan}`
    setAssigning(assignmentId)
    setError(null)
    setSuccess(null)

    try {
      const requestData: CreateSubscriptionRequest = {
        organization_id: selectedOrg.id,
        plan_id: selectedPlan,
        billing_cycle: billingCycle,
        trial_days: trialDays,
        coupon_code: couponCode || undefined
      }

      const response = await fetch('/api/saas-admin/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to assign subscription')
      }

      setSuccess(`Subscription assigned to ${selectedOrg.name} successfully`)
      
      // Reset form
      setSelectedOrg(null)
      setSelectedPlan(plans[0]?.id || '')
      setBillingCycle('monthly')
      setTrialDays(14)
      setCouponCode('')
      
      // Refresh organizations list
      await loadOrganizations()
      
      // Notify parent
      setTimeout(() => {
        onAssigned()
        onClose()
      }, 2000)

    } catch (error: any) {
      setError(error.message)
    } finally {
      setAssigning(null)
    }
  }

  const formatPrice = (priceInPence: number) => {
    return `£${(priceInPence / 100).toFixed(2)}`
  }

  const getSubscriptionStatus = (subscription?: SaasSubscription) => {
    if (!subscription) return null

    const statusColors = {
      active: 'bg-green-100 text-green-800 border-green-200',
      trialing: 'bg-blue-100 text-blue-800 border-blue-200',
      past_due: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      canceled: 'bg-red-100 text-red-800 border-red-200',
      unpaid: 'bg-gray-100 text-gray-800 border-gray-200'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[subscription.status]}`}>
        {subscription.status}
      </span>
    )
  }

  const selectedPlanData = plans.find(p => p.id === selectedPlan)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-700">
            <h3 className="text-xl font-semibold text-white">
              Assign Subscription
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="mx-6 mt-4 bg-red-900/50 border border-red-700 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="mx-6 mt-4 bg-green-900/50 border border-green-700 rounded-lg p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
              <p className="text-green-200 text-sm">{success}</p>
            </div>
          )}

          <div className="p-6 overflow-y-auto max-h-[70vh]">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Organization Selection */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">1. Select Organization</h4>
                  
                  {/* Search */}
                  <div className="relative mb-4">
                    <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search organizations..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    {searching && (
                      <Loader2 className="h-4 w-4 text-gray-400 absolute right-3 top-1/2 transform -translate-y-1/2 animate-spin" />
                    )}
                  </div>

                  {/* Organization List */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {loading ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-purple-500 mx-auto mb-2" />
                        <p className="text-gray-400 text-sm">Loading organizations...</p>
                      </div>
                    ) : organizations.length === 0 ? (
                      <div className="text-center py-8 text-gray-400">
                        No organizations found
                      </div>
                    ) : (
                      organizations.map((org) => (
                        <div
                          key={org.id}
                          onClick={() => setSelectedOrg(org)}
                          className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                            selectedOrg?.id === org.id
                              ? 'border-purple-500 bg-purple-500/10'
                              : 'border-gray-600 hover:border-gray-500 bg-gray-700/50'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-gray-400" />
                                <h5 className="font-medium text-white">{org.name}</h5>
                              </div>
                              
                              <div className="mt-2 space-y-1">
                                {org.email && (
                                  <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <Mail className="h-3 w-3" />
                                    {org.email}
                                  </div>
                                )}
                                {org.phone && (
                                  <div className="flex items-center gap-2 text-sm text-gray-400">
                                    <Phone className="h-3 w-3" />
                                    {org.phone}
                                  </div>
                                )}
                                <div className="flex items-center gap-2 text-sm text-gray-400">
                                  <Calendar className="h-3 w-3" />
                                  Created {new Date(org.created_at).toLocaleDateString()}
                                </div>
                              </div>
                            </div>

                            <div className="ml-4">
                              {org.subscription ? (
                                <div className="space-y-2">
                                  {getSubscriptionStatus(org.subscription)}
                                  <div className="text-xs text-gray-400">
                                    {org.subscription.plan?.name}
                                  </div>
                                </div>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
                                  No Subscription
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Plan Selection & Configuration */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-white mb-4">2. Configure Subscription</h4>

                  {selectedOrg ? (
                    <div className="space-y-6">
                      {/* Selected Organization */}
                      <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                        <div className="flex items-center gap-2 mb-2">
                          <Building2 className="h-4 w-4 text-green-400" />
                          <span className="text-sm text-green-400">Selected Organization</span>
                        </div>
                        <h5 className="font-medium text-white">{selectedOrg.name}</h5>
                        {selectedOrg.subscription && (
                          <div className="mt-2 text-sm text-yellow-400">
                            ⚠️ This organization already has a subscription
                          </div>
                        )}
                      </div>

                      {/* Plan Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Plan
                        </label>
                        <select
                          value={selectedPlan}
                          onChange={(e) => {
                            setSelectedPlan(e.target.value)
                            // Reset trial days to plan default
                            const plan = plans.find(p => p.id === e.target.value)
                            if (plan?.config?.trial_days) {
                              setTrialDays(plan.config.trial_days)
                            }
                          }}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        >
                          <option value="">Select a plan...</option>
                          {plans.map((plan) => (
                            <option key={plan.id} value={plan.id}>
                              {plan.name} - {formatPrice(plan.price_monthly)}/month
                            </option>
                          ))}
                        </select>

                        {/* Plan Details */}
                        {selectedPlanData && (
                          <div className="mt-3 bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h5 className="font-medium text-white">{selectedPlanData.name}</h5>
                                  {selectedPlanData.is_popular && (
                                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                                  )}
                                </div>
                                {selectedPlanData.description && (
                                  <p className="text-sm text-gray-400 mt-1">{selectedPlanData.description}</p>
                                )}
                                <div className="mt-2 flex items-center gap-4 text-sm text-gray-300">
                                  <span>{formatPrice(selectedPlanData.price_monthly)}/month</span>
                                  <span>{formatPrice(selectedPlanData.price_yearly)}/year</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm text-gray-400">Features</div>
                                <div className="text-lg font-semibold text-white">
                                  {Object.keys(selectedPlanData.features).length}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Billing Configuration */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Billing Cycle
                          </label>
                          <select
                            value={billingCycle}
                            onChange={(e) => setBillingCycle(e.target.value as BillingCycle)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          >
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Trial Days
                          </label>
                          <input
                            type="number"
                            value={trialDays}
                            onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            min="0"
                            max="365"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Coupon Code (Optional)
                        </label>
                        <input
                          type="text"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="DISCOUNT20"
                        />
                      </div>

                      {/* Pricing Summary */}
                      {selectedPlanData && (
                        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-4">
                          <h5 className="font-medium text-white mb-2">Pricing Summary</h5>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-300">
                                {selectedPlanData.name} ({billingCycle})
                              </span>
                              <span className="text-white">
                                {formatPrice(billingCycle === 'yearly' ? selectedPlanData.price_yearly : selectedPlanData.price_monthly)}
                              </span>
                            </div>
                            {trialDays > 0 && (
                              <div className="flex justify-between text-green-400">
                                <span>Free trial</span>
                                <span>{trialDays} days</span>
                              </div>
                            )}
                            {couponCode && (
                              <div className="flex justify-between text-blue-400">
                                <span>Coupon: {couponCode}</span>
                                <span>Applied at checkout</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-400">
                      <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Select an organization to configure subscription</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 border-t border-gray-700">
            <div className="text-sm text-gray-400">
              {selectedOrg ? (
                <>
                  Assigning subscription to <strong>{selectedOrg.name}</strong>
                  {selectedOrg.subscription && (
                    <span className="text-yellow-400 ml-2">
                      (Will replace existing subscription)
                    </span>
                  )}
                </>
              ) : (
                'Select an organization and plan to continue'
              )}
            </div>

            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignSubscription}
                disabled={!selectedOrg || !selectedPlan || !!assigning}
                className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white rounded-lg transition-colors"
              >
                {assigning ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Assign Subscription
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}