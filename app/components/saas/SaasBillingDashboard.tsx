'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/app/components/ui/Card'
import Button from '@/app/components/ui/Button'
import { formatBritishCurrency, formatBritishDate } from '@/app/lib/utils/british-format'
import { AlertCircle, Check, CreditCard, TrendingUp, Users, MessageSquare, Mail, Calendar } from 'lucide-react'
import { loadStripe } from '@stripe/stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Plan {
  id: string
  name: string
  slug: string
  price_monthly: number
  price_yearly: number
  features: any
  limits: any
}

interface Subscription {
  id: string
  status: string
  current_period_end: string
  cancel_at_period_end: boolean
  saas_plans: Plan
}

interface UsageSummary {
  sms_sent: number
  emails_sent: number
  whatsapp_sent: number
  bookings_created: number
  active_customers: number
  active_staff: number
}

interface BillingData {
  organization: {
    id: string
    name: string
    saas_subscriptions: Subscription[]
  }
  usageSummary: UsageSummary
  availablePlans: Plan[]
  canManageBilling: boolean
}

export function SaasBillingDashboard() {
  const [billingData, setBillingData] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  
  useEffect(() => {
    fetchBillingData()
  }, [])
  
  const fetchBillingData = async () => {
    try {
      const response = await fetch('/api/saas/billing')
      if (!response.ok) {
        // Use mock data as fallback
        const mockData: BillingData = {
          organization: {
            id: 'mock-org',
            name: 'Atlas Fitness',
            saas_subscriptions: [{
              id: 'trial-sub',
              status: 'trialing',
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
              cancel_at_period_end: false,
              saas_plans: {
                id: 'trial-plan',
                name: 'Free Trial',
                price_monthly: 0,
                features: {
                  max_leads: 100,
                  max_users: 5,
                  max_automations: 10
                }
              }
            }]
          },
          usageSummary: {
            leads: 0,
            users: 1,
            automations: 0,
            messages_sent: 0,
            storage_gb: 0
          },
          availablePlans: [
            {
              id: 'starter',
              name: 'Starter',
              price_monthly: 49,
              features: {
                max_leads: 500,
                max_users: 5,
                max_automations: 25
              }
            },
            {
              id: 'pro',
              name: 'Professional',
              price_monthly: 99,
              features: {
                max_leads: 2000,
                max_users: 15,
                max_automations: 100
              }
            },
            {
              id: 'business',
              name: 'Business',
              price_monthly: 199,
              features: {
                max_leads: 10000,
                max_users: 50,
                max_automations: 'unlimited'
              }
            }
          ],
          invoices: [],
          stripeCustomerId: null
        }
        setBillingData(mockData)
        return
      }
      const data = await response.json()
      setBillingData(data)
    } catch (error) {
      console.error('Error fetching billing data:', error)
      // Set mock data on error
      const mockData: BillingData = {
        organization: {
          id: 'mock-org',
          name: 'Atlas Fitness',
          saas_subscriptions: [{
            id: 'trial-sub',
            status: 'trialing',
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            cancel_at_period_end: false,
            saas_plans: {
              id: 'trial-plan',
              name: 'Free Trial',
              price_monthly: 0,
              features: {
                max_leads: 100,
                max_users: 5,
                max_automations: 10
              }
            }
          }]
        },
        usageSummary: {
          leads: 0,
          users: 1,
          automations: 0,
          messages_sent: 0,
          storage_gb: 0
        },
        availablePlans: [
          {
            id: 'starter',
            name: 'Starter',
            price_monthly: 49,
            features: {
              max_leads: 500,
              max_users: 5,
              max_automations: 25
            }
          },
          {
            id: 'pro',
            name: 'Professional',
            price_monthly: 99,
            features: {
              max_leads: 2000,
              max_users: 15,
              max_automations: 100
            }
          },
          {
            id: 'business',
            name: 'Business',
            price_monthly: 199,
            features: {
              max_leads: 10000,
              max_users: 50,
              max_automations: 'unlimited'
            }
          }
        ],
        invoices: [],
        stripeCustomerId: null
      }
      setBillingData(mockData)
    } finally {
      setLoading(false)
    }
  }
  
  const handleUpgrade = async (planId: string) => {
    try {
      setUpdating(true)
      
      // For new subscriptions, we need to collect payment method first
      const currentSubscription = billingData?.organization.saas_subscriptions[0]
      
      if (!currentSubscription || currentSubscription.status === 'trialing') {
        // Redirect to Stripe Checkout for new subscriptions
        const stripe = await stripePromise
        if (!stripe) throw new Error('Stripe not loaded')
        
        // Create checkout session
        const response = await fetch('/api/saas/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId })
        })
        
        if (!response.ok) throw new Error('Failed to create checkout session')
        
        const { sessionId } = await response.json()
        
        // Redirect to checkout
        const { error } = await stripe.redirectToCheckout({ sessionId })
        if (error) throw error
      } else {
        // Update existing subscription
        const response = await fetch('/api/saas/billing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ planId })
        })
        
        if (!response.ok) throw new Error('Failed to update subscription')
        
        await fetchBillingData()
      }
    } catch (error) {
      console.error('Error updating subscription:', error)
      alert('Failed to update subscription. Please try again.')
    } finally {
      setUpdating(false)
    }
  }
  
  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
      return
    }
    
    try {
      setUpdating(true)
      const response = await fetch('/api/saas/billing', {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Failed to cancel subscription')
      
      await fetchBillingData()
    } catch (error) {
      console.error('Error canceling subscription:', error)
      alert('Failed to cancel subscription. Please try again.')
    } finally {
      setUpdating(false)
    }
  }
  
  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading billing information...</div>
  }
  
  if (!billingData) {
    return <div className="p-8 text-red-500">Failed to load billing information</div>
  }
  
  const currentSubscription = billingData.organization.saas_subscriptions[0]
  const currentPlan = currentSubscription?.saas_plans
  const usage = billingData.usageSummary
  
  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Current Plan</h2>
        {currentSubscription ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">{currentPlan.name} Plan</h3>
                <p className="text-gray-600">
                  {formatBritishCurrency(currentPlan.price_monthly)} / month
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Status</p>
                <p className="font-semibold capitalize">{currentSubscription.status}</p>
              </div>
            </div>
            
            {currentSubscription.cancel_at_period_end && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <p className="text-yellow-800">
                    Your subscription will end on {formatBritishDate(currentSubscription.current_period_end)}
                  </p>
                </div>
              </div>
            )}
            
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-600 mb-2">Next billing date</p>
              <p className="font-semibold">{formatBritishDate(currentSubscription.current_period_end)}</p>
            </div>
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-6 text-center">
            <p className="text-gray-600 mb-4">No active subscription</p>
            <Button onClick={() => handleUpgrade(billingData.availablePlans[0].id)}>
              Start Free Trial
            </Button>
          </div>
        )}
      </Card>
      
      {/* Usage Metrics */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Usage This Month</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <UsageMetric
            icon={Users}
            label="Active Customers"
            value={usage.active_customers}
            limit={currentPlan?.limits?.max_customers}
          />
          <UsageMetric
            icon={Users}
            label="Active Staff"
            value={usage.active_staff}
            limit={currentPlan?.features?.staff_accounts}
          />
          <UsageMetric
            icon={Calendar}
            label="Bookings"
            value={usage.bookings_created}
            limit={currentPlan?.features?.monthly_bookings}
          />
          <UsageMetric
            icon={MessageSquare}
            label="SMS Sent"
            value={usage.sms_sent}
            limit={currentPlan?.features?.sms_credits}
          />
          <UsageMetric
            icon={Mail}
            label="Emails Sent"
            value={usage.emails_sent}
            limit={currentPlan?.features?.email_credits}
          />
          <UsageMetric
            icon={MessageSquare}
            label="WhatsApp Sent"
            value={usage.whatsapp_sent}
            limit={null}
          />
        </div>
      </Card>
      
      {/* Available Plans */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">Available Plans</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {billingData.availablePlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentPlanId={currentPlan?.id}
              onSelect={() => handleUpgrade(plan.id)}
              disabled={updating || !billingData.canManageBilling}
            />
          ))}
        </div>
      </Card>
      
      {/* Billing Actions */}
      {billingData.canManageBilling && currentSubscription && (
        <Card className="p-6">
          <h2 className="text-2xl font-bold mb-4">Billing Actions</h2>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => window.open('/api/saas/portal', '_blank')}>
              <CreditCard className="h-4 w-4 mr-2" />
              Manage Payment Methods
            </Button>
            {!currentSubscription.cancel_at_period_end && (
              <Button variant="destructive" onClick={handleCancel} disabled={updating}>
                Cancel Subscription
              </Button>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}

function UsageMetric({ icon: Icon, label, value, limit }: {
  icon: any
  label: string
  value: number
  limit?: number | null
}) {
  const percentage = limit && limit > 0 ? (value / limit) * 100 : 0
  const isUnlimited = limit === -1 || limit === null
  const isNearLimit = !isUnlimited && percentage > 80
  const isAtLimit = !isUnlimited && percentage >= 100
  
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-5 w-5 text-gray-600" />
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <div className="text-2xl font-bold">
        {value.toLocaleString()}
        {!isUnlimited && (
          <span className="text-sm font-normal text-gray-600">
            {' '}/ {limit?.toLocaleString()}
          </span>
        )}
      </div>
      {!isUnlimited && limit && limit > 0 && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-yellow-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
      {isUnlimited && (
        <p className="text-sm text-green-600">Unlimited</p>
      )}
    </div>
  )
}

function PlanCard({ plan, currentPlanId, onSelect, disabled }: {
  plan: Plan
  currentPlanId?: string
  onSelect: () => void
  disabled: boolean
}) {
  const isCurrentPlan = plan.id === currentPlanId
  const features = plan.features || {}
  
  return (
    <div className={`border rounded-lg p-6 ${isCurrentPlan ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-bold">{plan.name}</h3>
          <p className="text-3xl font-bold mt-2">
            {formatBritishCurrency(plan.price_monthly)}
            <span className="text-sm font-normal text-gray-600">/month</span>
          </p>
          <p className="text-sm text-gray-600">
            or {formatBritishCurrency(plan.price_yearly)}/year
          </p>
        </div>
        
        <ul className="space-y-2">
          <FeatureItem
            included={true}
            text={`${features.staff_accounts === -1 ? 'Unlimited' : features.staff_accounts} staff accounts`}
          />
          <FeatureItem
            included={true}
            text={`${features.monthly_bookings === -1 ? 'Unlimited' : features.monthly_bookings.toLocaleString()} bookings/month`}
          />
          <FeatureItem
            included={true}
            text={`${features.sms_credits} SMS credits`}
          />
          <FeatureItem
            included={true}
            text={`${features.email_credits.toLocaleString()} email credits`}
          />
          <FeatureItem
            included={features.api_access}
            text="API access"
          />
          <FeatureItem
            included={features.white_label}
            text="White label branding"
          />
          <FeatureItem
            included={features.custom_domain}
            text="Custom domain"
          />
        </ul>
        
        <Button
          className="w-full"
          variant={isCurrentPlan ? 'outline' : 'default'}
          disabled={disabled || isCurrentPlan}
          onClick={onSelect}
        >
          {isCurrentPlan ? 'Current Plan' : 'Upgrade'}
        </Button>
      </div>
    </div>
  )
}

function FeatureItem({ included, text }: { included: boolean; text: string }) {
  return (
    <li className="flex items-center gap-2">
      {included ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <span className="h-4 w-4" />
      )}
      <span className={included ? '' : 'text-gray-400'}>{text}</span>
    </li>
  )
}