import { Suspense } from 'react'
import { createAdminClient } from '@/app/lib/supabase/admin'
import BillingOverview from './components/BillingOverview'
import RevenueChart from './components/RevenueChart'
import SubscriptionMetrics from './components/SubscriptionMetrics'
import PaymentProcessorStats from './components/PaymentProcessorStats'

export default async function AdminBillingPage() {
  const supabase = createAdminClient()

  // Fetch financial overview
  const { data: overview } = await supabase
    .from('admin_financial_overview')
    .select('*')
    .single()

  // Fetch subscription breakdown
  const { data: subscriptions } = await supabase
    .from('billing_subscriptions')
    .select(`
      status,
      plan_key,
      billing_plans(amount)
    `)
    .eq('is_primary', true)

  // Aggregate subscription data
  const subscriptionStats = subscriptions?.reduce((acc, sub) => {
    const status = sub.status || 'unknown'
    const plan = sub.plan_key || 'unknown'
    
    acc.byStatus[status] = (acc.byStatus[status] || 0) + 1
    acc.byPlan[plan] = (acc.byPlan[plan] || 0) + 1
    
    if (sub.status === 'active' && sub.billing_plans?.amount) {
      acc.totalMRR += sub.billing_plans.amount / 100
    }
    
    return acc
  }, {
    byStatus: {} as Record<string, number>,
    byPlan: {} as Record<string, number>,
    totalMRR: 0
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Billing & Revenue</h1>
        <p className="mt-1 text-sm text-gray-500">
          Platform-wide billing and payment processing overview
        </p>
      </div>

      <Suspense fallback={<div className="animate-pulse h-32 bg-gray-200 rounded-lg" />}>
        <BillingOverview overview={overview} />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<div className="animate-pulse h-64 bg-gray-200 rounded-lg" />}>
          <RevenueChart />
        </Suspense>

        <Suspense fallback={<div className="animate-pulse h-64 bg-gray-200 rounded-lg" />}>
          <SubscriptionMetrics stats={subscriptionStats} />
        </Suspense>
      </div>

      <Suspense fallback={<div className="animate-pulse h-96 bg-gray-200 rounded-lg" />}>
        <PaymentProcessorStats />
      </Suspense>
    </div>
  )
}