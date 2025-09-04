'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/app/components/ui/Card'
import Button from '@/app/components/ui/Button'
import { CreditCard, CheckCircle, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react'
import { formatBritishCurrency } from '@/app/lib/utils/british-format'

interface StripeConnectProps {
  organizationId: string
}

export default function StripeConnect({ organizationId }: StripeConnectProps) {
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [accountData, setAccountData] = useState<any>(null)
  const [paymentSettings, setPaymentSettings] = useState<any>(null)
  const [stripeConfigured, setStripeConfigured] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  
  useEffect(() => {
    fetchAccountStatus()
  }, [])
  
  const fetchAccountStatus = async () => {
    try {
      const response = await fetch('/api/billing/stripe-connect/status')
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch account status')
      }
      
      const data = await response.json()
      setAccountData(data.account)
      setPaymentSettings(data.settings)
      setStripeConfigured(data.stripeConfigured !== false)
      setError(null)
    } catch (error) {
      console.error('Error fetching Stripe account:', error)
      setError(error instanceof Error ? error.message : 'Failed to load payment settings')
    } finally {
      setLoading(false)
    }
  }
  
  const handleConnect = async () => {
    try {
      setConnecting(true)
      
      if (!stripeConfigured) {
        alert('Stripe is not configured. Please contact your administrator.')
        return
      }
      
      // Create or retrieve Stripe Connect onboarding link
      const response = await fetch('/api/billing/stripe-connect/onboard', {
        method: 'POST'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create onboarding link')
      }
      
      const { url } = await response.json()
      
      // Redirect to Stripe onboarding
      window.location.href = url
    } catch (error) {
      console.error('Error connecting Stripe:', error)
      alert(`Failed to connect Stripe account: ${error instanceof Error ? error.message : 'Please try again.'}`)
    } finally {
      setConnecting(false)
    }
  }
  
  const handleDashboard = async () => {
    try {
      // Create login link for Stripe Express dashboard
      const response = await fetch('/api/billing/stripe-connect/dashboard', {
        method: 'POST'
      })
      
      if (!response.ok) throw new Error('Failed to create dashboard link')
      
      const { url } = await response.json()
      
      // Open in new tab
      window.open(url, '_blank')
    } catch (error) {
      console.error('Error accessing dashboard:', error)
      alert('Failed to access Stripe dashboard. Please try again.')
    }
  }
  
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </Card>
    )
  }
  
  if (error) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800">Payment System Unavailable</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
          </div>
          <Button onClick={fetchAccountStatus} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </div>
      </Card>
    )
  }
  
  if (!stripeConfigured) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-800">Payment Processing Not Configured</h3>
              <p className="text-sm text-yellow-700 mt-1">
                Stripe payment processing is not set up for this environment. Contact your administrator to configure payment processing.
              </p>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-medium text-yellow-800 mb-2">What you can do:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Contact support to enable payment processing</li>
              <li>• Manage existing memberships and bookings</li>
              <li>• View customer information and reports</li>
            </ul>
          </div>
        </div>
      </Card>
    )
  }
  
  const isConnected = accountData?.charges_enabled && accountData?.payouts_enabled
  const isOnboarding = accountData?.stripe_account_id && !isConnected
  const platformCommission = paymentSettings?.platform_commission_rate || 0.03
  
  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Stripe Payment Processing</h3>
          {isConnected && (
            <span className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Connected
            </span>
          )}
        </div>
        
        {!accountData?.stripe_account_id ? (
          // Not connected
          <div className="space-y-4">
            <p className="text-gray-600">
              Connect your Stripe account to accept payments from your gym members.
            </p>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Accept card payments online and in-person</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Automatic payouts to your bank account</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Manage subscriptions and recurring payments</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                <span>Platform fee: {(platformCommission * 100).toFixed(1)}% per transaction</span>
              </li>
            </ul>
            <Button onClick={handleConnect} disabled={connecting} className="w-full">
              <CreditCard className="h-4 w-4 mr-2" />
              Connect Stripe Account
            </Button>
          </div>
        ) : isOnboarding ? (
          // Onboarding in progress
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-yellow-800">Onboarding Incomplete</p>
                  <p className="text-sm text-yellow-700 mt-1">
                    Please complete your Stripe account setup to start accepting payments.
                  </p>
                </div>
              </div>
            </div>
            <Button onClick={handleConnect} variant="outline" className="w-full">
              Continue Setup
            </Button>
          </div>
        ) : (
          // Fully connected
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Account ID</p>
                <p className="font-mono text-sm">{accountData.stripe_account_id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Platform Fee</p>
                <p className="font-semibold">{(platformCommission * 100).toFixed(1)}%</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <Button onClick={handleDashboard} variant="outline" className="flex-1">
                <ExternalLink className="h-4 w-4 mr-2" />
                Stripe Dashboard
              </Button>
              <Button onClick={fetchAccountStatus} variant="outline">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
      
      {/* Payment Methods */}
      {isConnected && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Payment Methods</h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={paymentSettings?.payment_methods_enabled?.card !== false}
                onChange={() => {}}
                className="h-4 w-4"
              />
              <div>
                <p className="font-medium">Card Payments</p>
                <p className="text-sm text-gray-600">Accept credit and debit cards</p>
              </div>
            </label>
            
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={paymentSettings?.payment_methods_enabled?.direct_debit === true}
                onChange={() => {}}
                className="h-4 w-4"
              />
              <div>
                <p className="font-medium">Direct Debit (via GoCardless)</p>
                <p className="text-sm text-gray-600">For recurring membership payments</p>
              </div>
            </label>
          </div>
        </Card>
      )}
      
      {/* Recent Payouts */}
      {isConnected && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Payouts</h3>
          <div className="text-center py-8 text-gray-500">
            <p>No payouts yet</p>
            <p className="text-sm mt-2">Payouts will appear here once you start processing payments</p>
          </div>
        </Card>
      )}
    </div>
  )
}