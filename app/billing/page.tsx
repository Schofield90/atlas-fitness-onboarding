'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useSearchParams } from 'next/navigation'
import DashboardLayout from '../components/DashboardLayout'
import { SaasBillingDashboard } from '@/app/components/saas/SaasBillingDashboard'
import StripeConnect from '@/app/components/billing/StripeConnect'
import Button from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import { formatBritishCurrency } from '@/app/lib/utils/british-format'

function BillingContent() {
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('subscription')
  const [organization, setOrganization] = useState<any>(null)
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  useEffect(() => {
    fetchOrganization()
    
    // Check for checkout success
    if (searchParams.get('success') === 'true') {
      // Show success message
      const sessionId = searchParams.get('session_id')
      console.log('Checkout successful:', sessionId)
      // TODO: Show success toast
    } else if (searchParams.get('canceled') === 'true') {
      console.log('Checkout canceled')
      // TODO: Show canceled message
    }
    
    // Check for Stripe Connect success
    if (searchParams.get('stripe_success') === 'true') {
      console.log('Stripe Connect successful')
      setActiveTab('payments')
    } else if (searchParams.get('stripe_refresh') === 'true') {
      console.log('Stripe Connect needs refresh')
      setActiveTab('payments')
    }
  }, [searchParams])
  
  const fetchOrganization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id, organizations(*)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()
      
      if (userOrg) {
        setOrganization(userOrg.organizations)
      }
    } catch (error) {
      console.error('Error fetching organization:', error)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-center">
            Loading billing information...
          </div>
        </div>
      </DashboardLayout>
    )
  }
  
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Billing & Subscription</h2>
            <p className="text-gray-400 mt-1">Manage your subscription, payments, and billing settings</p>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6">
            <Button
              variant={activeTab === 'subscription' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('subscription')}
            >
              Subscription
            </Button>
            <Button
              variant={activeTab === 'revenue' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('revenue')}
            >
              Revenue
            </Button>
            <Button
              variant={activeTab === 'payments' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('payments')}
            >
              Payment Settings
            </Button>
          </div>
          
          {/* Tab Content */}
          {activeTab === 'subscription' && <SaasBillingDashboard />}
          
          {activeTab === 'revenue' && (
            <div className="space-y-6">
              {/* Revenue Overview */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6">
                  <p className="text-gray-400 text-sm mb-2">Monthly Revenue</p>
                  <p className="text-3xl font-bold">£0</p>
                  <p className="text-sm text-gray-400 mt-2">No data yet</p>
                </Card>
                <Card className="p-6">
                  <p className="text-gray-400 text-sm mb-2">Outstanding</p>
                  <p className="text-3xl font-bold">£0</p>
                  <p className="text-sm text-gray-400 mt-2">0 invoices</p>
                </Card>
                <Card className="p-6">
                  <p className="text-gray-400 text-sm mb-2">Failed Payments</p>
                  <p className="text-3xl font-bold">£0</p>
                  <p className="text-sm text-gray-400 mt-2">0 payments</p>
                </Card>
                <Card className="p-6">
                  <p className="text-gray-400 text-sm mb-2">Active Subscriptions</p>
                  <p className="text-3xl font-bold">0</p>
                  <p className="text-sm text-gray-400 mt-2">£0 MRR</p>
                </Card>
              </div>
              
              {/* Recent Transactions */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
                <div className="text-center py-8">
                  <p className="text-gray-400">No transactions yet</p>
                  <p className="text-sm text-gray-500 mt-2">Transactions will appear here once you start processing payments</p>
                </div>
              </Card>
            </div>
          )}
          
          {activeTab === 'payments' && (
            <StripeConnect organizationId={organization?.id || ''} />
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function BillingPage() {
  return (
    <Suspense fallback={<DashboardLayout><div className="flex items-center justify-center min-h-screen"><div className="text-gray-500">Loading billing information...</div></div></DashboardLayout>}>
      <BillingContent />
    </Suspense>
  )
}
