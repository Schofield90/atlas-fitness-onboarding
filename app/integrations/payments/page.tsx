'use client'

import { useState, useEffect, Suspense } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import DashboardLayout from '@/app/components/DashboardLayout'
import { Card } from '@/app/components/ui/Card'
import Button from '@/app/components/ui/Button'
import { CreditCard, Building2, CheckCircle, XCircle, AlertCircle, ExternalLink } from 'lucide-react'

function PaymentIntegrationsContent() {
  const [loading, setLoading] = useState(true)
  const [stripeStatus, setStripeStatus] = useState<'not_connected' | 'pending' | 'active'>('not_connected')
  const [goCardlessStatus, setGoCardlessStatus] = useState<'not_connected' | 'pending' | 'active'>('not_connected')
  const [connectedAccounts, setConnectedAccounts] = useState<any>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  
  useEffect(() => {
    fetchConnectedAccounts()
    
    // Check for connection callbacks
    if (searchParams.get('stripe') === 'connected') {
      // Show success message
      console.log('Stripe connected successfully')
    }
    if (searchParams.get('success') === 'GoCardless connected successfully') {
      console.log('GoCardless connected successfully')
    }
  }, [searchParams])
  
  const fetchConnectedAccounts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      // Get user's organization
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()
      
      if (!userOrg) return
      
      // Get connected accounts
      const { data: accounts } = await supabase
        .from('connected_accounts')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .single()
      
      if (accounts) {
        setConnectedAccounts(accounts)
        
        // Set Stripe status
        if (accounts.stripe_account_id) {
          setStripeStatus(accounts.stripe_charges_enabled ? 'active' : 'pending')
        }
        
        // Set GoCardless status
        if (accounts.gc_organization_id) {
          setGoCardlessStatus(accounts.gc_enabled ? 'active' : 'pending')
        }
      }
    } catch (error) {
      console.error('Error fetching connected accounts:', error)
    } finally {
      setLoading(false)
    }
  }
  
  const handleStripeConnect = async () => {
    try {
      const response = await fetch('/api/connect/stripe')
      const data = await response.json()
      
      if (data.url) {
        window.location.href = data.url
      }
    } catch (error) {
      console.error('Error connecting Stripe:', error)
    }
  }
  
  const handleStripeRefresh = async () => {
    window.location.href = '/api/connect/stripe/refresh'
  }
  
  const handleGoCardlessConnect = async () => {
    try {
      const response = await fetch('/api/connect/gocardless')
      const data = await response.json()
      
      if (data.authUrl) {
        window.location.href = data.authUrl
      }
    } catch (error) {
      console.error('Error connecting GoCardless:', error)
    }
  }
  
  const handleDisconnect = async (provider: 'stripe' | 'gocardless') => {
    if (!confirm(`Are you sure you want to disconnect ${provider === 'stripe' ? 'Stripe' : 'GoCardless'}?`)) {
      return
    }
    
    try {
      const endpoint = provider === 'stripe' 
        ? '/api/connect/stripe'
        : '/api/connect/gocardless'
        
      await fetch(endpoint, { method: 'DELETE' })
      await fetchConnectedAccounts()
    } catch (error) {
      console.error(`Error disconnecting ${provider}:`, error)
    }
  }
  
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />
      default:
        return <XCircle className="h-5 w-5 text-gray-400" />
    }
  }
  
  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Connected'
      case 'pending':
        return 'Pending Verification'
      default:
        return 'Not Connected'
    }
  }
  
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Payment Integrations</h2>
            <p className="text-gray-400 mt-1">Connect payment providers to accept payments from your clients</p>
          </div>
          
          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Stripe Card */}
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <CreditCard className="h-6 w-6 text-purple-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Stripe</h3>
                    <p className="text-sm text-gray-400">Accept card payments</p>
                  </div>
                </div>
                {getStatusIcon(stripeStatus)}
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-t border-gray-700">
                  <span className="text-sm text-gray-400">Status</span>
                  <span className="text-sm font-medium">{getStatusText(stripeStatus)}</span>
                </div>
                
                {stripeStatus === 'active' && connectedAccounts && (
                  <>
                    <div className="flex items-center justify-between py-2 border-t border-gray-700">
                      <span className="text-sm text-gray-400">Account ID</span>
                      <span className="text-sm font-mono">{connectedAccounts.stripe_account_id}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-t border-gray-700">
                      <span className="text-sm text-gray-400">Payouts</span>
                      <span className="text-sm">{connectedAccounts.stripe_payouts_enabled ? 'Enabled' : 'Disabled'}</span>
                    </div>
                  </>
                )}
                
                <div className="pt-4 space-y-2">
                  {stripeStatus === 'not_connected' && (
                    <Button onClick={handleStripeConnect} className="w-full">
                      Connect Stripe Account
                    </Button>
                  )}
                  {stripeStatus === 'pending' && (
                    <>
                      <Button onClick={handleStripeRefresh} className="w-full">
                        Complete Onboarding
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={() => handleDisconnect('stripe')} 
                        className="w-full"
                      >
                        Disconnect
                      </Button>
                    </>
                  )}
                  {stripeStatus === 'active' && (
                    <>
                      <Button 
                        variant="ghost" 
                        onClick={() => window.open('https://dashboard.stripe.com', '_blank')}
                        className="w-full"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open Stripe Dashboard
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={() => handleDisconnect('stripe')} 
                        className="w-full text-red-500 hover:text-red-400"
                      >
                        Disconnect
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
            
            {/* GoCardless Card */}
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Building2 className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">GoCardless</h3>
                    <p className="text-sm text-gray-400">Accept direct debits</p>
                  </div>
                </div>
                {getStatusIcon(goCardlessStatus)}
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-t border-gray-700">
                  <span className="text-sm text-gray-400">Status</span>
                  <span className="text-sm font-medium">{getStatusText(goCardlessStatus)}</span>
                </div>
                
                {goCardlessStatus === 'active' && connectedAccounts && (
                  <>
                    <div className="flex items-center justify-between py-2 border-t border-gray-700">
                      <span className="text-sm text-gray-400">Organization</span>
                      <span className="text-sm font-mono">{connectedAccounts.gc_organization_id}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-t border-gray-700">
                      <span className="text-sm text-gray-400">Creditor ID</span>
                      <span className="text-sm">{connectedAccounts.gc_creditor_id || 'Not set'}</span>
                    </div>
                  </>
                )}
                
                <div className="pt-4 space-y-2">
                  {goCardlessStatus === 'not_connected' && (
                    <Button onClick={handleGoCardlessConnect} className="w-full">
                      Connect GoCardless Account
                    </Button>
                  )}
                  {goCardlessStatus === 'pending' && (
                    <>
                      <Button onClick={handleGoCardlessConnect} className="w-full">
                        Complete Verification
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={() => handleDisconnect('gocardless')} 
                        className="w-full"
                      >
                        Disconnect
                      </Button>
                    </>
                  )}
                  {goCardlessStatus === 'active' && (
                    <>
                      <Button 
                        variant="ghost" 
                        onClick={() => window.open('https://manage.gocardless.com', '_blank')}
                        className="w-full"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open GoCardless Dashboard
                      </Button>
                      <Button 
                        variant="ghost" 
                        onClick={() => handleDisconnect('gocardless')} 
                        className="w-full text-red-500 hover:text-red-400"
                      >
                        Disconnect
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          </div>
          
          {/* Information Section */}
          <Card className="p-6">
            <h3 className="font-semibold mb-3">Payment Processing Information</h3>
            <div className="space-y-3 text-sm text-gray-400">
              <p>
                <strong className="text-gray-300">Stripe:</strong> Accept card payments globally. 
                Stripe handles PCI compliance and supports 135+ currencies. Transaction fees apply.
              </p>
              <p>
                <strong className="text-gray-300">GoCardless:</strong> Accept direct debit payments 
                in the UK and Europe. Lower transaction fees than cards, ideal for recurring payments.
              </p>
              <p className="pt-2 border-t border-gray-700">
                <strong className="text-gray-300">Platform Fees:</strong> A small platform fee is 
                applied to transactions to support the Atlas Fitness platform. Current rate: 2.5% per transaction.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function PaymentIntegrationsPage() {
  return (
    <Suspense fallback={
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-500">Loading payment integrations...</div>
        </div>
      </DashboardLayout>
    }>
      <PaymentIntegrationsContent />
    </Suspense>
  )
}