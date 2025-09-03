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
import { useToast } from '@/app/lib/hooks/useToast'
import { isFeatureEnabled } from '@/app/lib/feature-flags'

function BillingContent() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [activeTab, setActiveTab] = useState('subscription')
  const [organization, setOrganization] = useState<any>(null)
  const [useMockData, setUseMockData] = useState(false)
  const searchParams = useSearchParams()
  const supabase = createClient()
  const toast = useToast()
  
  useEffect(() => {
    fetchOrganization()
    
    // Check for checkout success
    if (searchParams.get('success') === 'true') {
      // Show success message
      const sessionId = searchParams.get('session_id')
      console.log('Checkout successful:', sessionId)
    } else if (searchParams.get('canceled') === 'true') {
      console.log('Checkout canceled')
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
      if (!user) {
        if (isFeatureEnabled('billingMswStub') && process.env.NODE_ENV === 'development') {
          // Use mock data in development
          setOrganization({
            id: 'mock-org-id',
            name: 'Demo Gym',
            subscription_status: 'active',
            plan_name: 'Pro Plan'
          })
          setUseMockData(true)
          // Align with tests expecting toast.error and 'Demo Data' copy
          toast.error('Live API failed, using demo data')
          return
        }
        // No user and no mock -> show error state
        setError(true)
        return
      }
      
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id, organizations(*)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()
      
      if (userOrg) {
        setOrganization(userOrg.organizations)
      } else {
        throw new Error('No organization found')
      }
    } catch (error) {
      console.error('Error fetching organization:', error)
      
      if (isFeatureEnabled('billingMswStub') && process.env.NODE_ENV === 'development') {
        // Fallback to mock data
        setOrganization({
          id: 'mock-org-id',
          name: 'Demo Gym',
          subscription_status: 'trial',
          plan_name: 'Free Trial'
        })
        setUseMockData(true)
        toast.error('Live API failed, using demo data')
      } else {
        setError(true)
      }
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
              <div role="status" aria-hidden="true" className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
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
          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-800 rounded-lg p-8 text-center border border-gray-700">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-200 mb-3">Billing System Temporarily Unavailable</h3>
              <p className="text-gray-400 mb-6 leading-relaxed">
                We're unable to connect to our billing system right now. This could be due to:
              </p>
              <div className="bg-gray-700 rounded-lg p-4 mb-6 text-left">
                <ul className="space-y-2 text-sm text-gray-300">
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    Scheduled maintenance on payment systems
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    Temporary network connectivity issues
                  </li>
                  <li className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    Your subscription may need renewal
                  </li>
                </ul>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {isFeatureEnabled('billingRetryButton') && (
                  <button 
                    onClick={() => {
                      setError(false)
                      setLoading(true)
                      fetchOrganization()
                    }}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Try Again
                  </button>
                )}
                <a 
                  href="mailto:support@atlasfitness.com?subject=Billing System Issue"
                  className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Contact Support
                </a>
              </div>
              <div className="mt-8 pt-6 border-t border-gray-700">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>System Status: </span>
                  <a href="https://status.atlasfitness.com" className="text-blue-400 hover:text-blue-300 underline">
                    Check Service Health
                  </a>
                </div>
              </div>
            </div>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h4 className="text-white font-medium mb-2">Need to Update Payment?</h4>
                <p className="text-gray-400 text-sm mb-3">If your card has expired or you need to update billing details</p>
                <button className="text-blue-400 hover:text-blue-300 text-sm underline">
                  Payment FAQ
                </button>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <h4 className="text-white font-medium mb-2">Billing Questions?</h4>
                <p className="text-gray-400 text-sm mb-3">Common billing issues and how to resolve them</p>
                <button className="text-blue-400 hover:text-blue-300 text-sm underline">
                  View Help Center
                </button>
              </div>
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
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Billing & Subscription</h2>
                <p className="text-gray-400 mt-1">Manage your subscription, payments, and billing settings</p>
              </div>
              {useMockData && (
                <div className="flex items-center gap-2">
                  <div className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Demo Data
                  </div>
                  <button 
                    onClick={() => {
                      setUseMockData(false)
                      fetchOrganization()
                    }}
                    className="text-xs text-yellow-400 hover:text-yellow-300 underline"
                  >
                    Try Live Connection
                  </button>
                </div>
              )}
            </div>
          </div>
          
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
          
          {activeTab === 'subscription' && <SaasBillingDashboard />}
          
          {activeTab === 'revenue' && (
            <div className="space-y-6">
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
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
