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
  const [error, setError] = useState(false)
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
      setError(true)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading billing information...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    )
  }
  
  if (error) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-200 mb-2">Unable to Load Billing Information</h3>
              <p className="text-gray-400 max-w-sm mb-4">
                We couldn't fetch your billing details right now. This might be a temporary issue.
              </p>
              <button 
                onClick={() => {
                  setError(false)
                  setLoading(true)
                  fetchOrganization()
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </button>
            </div>
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
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-200 mb-2">Loading Billing Information</h3>
            <p className="text-gray-400 max-w-sm">
              We're fetching your subscription and payment details. This will just take a moment.
            </p>
          </div>
        </div>
      </DashboardLayout>
    }>
      <BillingContent />
    </Suspense>
  )
}
