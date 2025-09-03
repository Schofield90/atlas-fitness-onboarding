'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { CreditCard, CheckCircle, AlertCircle, Loader2, Shield, ExternalLink } from 'lucide-react'
import SettingsHeader from '@/app/components/settings/SettingsHeader'

export default function PaymentIntegrationPage() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [connected, setConnected] = useState(false)
  const [accountStatus, setAccountStatus] = useState<any>(null)
  const [successMessage, setSuccessMessage] = useState('')
  const supabase = createClient()

  useEffect(() => {
    // Check for Stripe success/refresh params
    const params = new URLSearchParams(window.location.search)
    if (params.get('stripe_success') === 'true') {
      setSuccessMessage('Stripe account connected successfully!')
      // Clear the URL params
      window.history.replaceState({}, document.title, window.location.pathname)
    }
    
    fetchSettings()
    checkStripeConnection()
  }, [])

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) return

      // Get payment settings
      const { data: paymentSettings } = await supabase
        .from('organization_payment_settings')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .single()

      if (paymentSettings) {
        setSettings(paymentSettings)
        setConnected(!!paymentSettings.stripe_account_id)
      } else {
        // Create default settings
        const defaultSettings = {
          organization_id: userOrg.organization_id,
          payment_provider: 'stripe',
          enabled: false,
          currency: 'gbp',
          tax_rate: 20,
          payment_methods: ['card'],
          webhook_endpoint: `${window.location.origin}/api/webhooks/stripe`
        }
        setSettings(defaultSettings)
      }
    } catch (error) {
      console.error('Error fetching payment settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const checkStripeConnection = async () => {
    try {
      const response = await fetch('/api/billing/stripe-connect/status')
      if (response.ok) {
        const data = await response.json()
        setAccountStatus(data)
        setConnected(data.connected)
      }
    } catch (error) {
      console.error('Error checking Stripe connection:', error)
    }
  }

  const handleConnectStripe = async () => {
    try {
      const response = await fetch('/api/billing/stripe-connect/onboard', {
        method: 'POST'
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.url) {
          window.location.href = data.url
        } else {
          console.error('No URL in response:', data)
          alert('Failed to get Stripe onboarding URL')
        }
      } else {
        const errorData = await response.json().catch(() => null)
        console.error('Stripe Connect error:', errorData)
        alert(errorData?.error || 'Failed to start Stripe Connect onboarding')
      }
    } catch (error) {
      console.error('Error connecting Stripe:', error)
      alert('Failed to connect Stripe account. Please check your internet connection and try again.')
    }
  }

  const handleOpenDashboard = async () => {
    try {
      const response = await fetch('/api/billing/stripe-connect/dashboard', {
        method: 'POST'
      })
      
      if (response.ok) {
        const { url } = await response.json()
        window.open(url, '_blank')
      }
    } catch (error) {
      console.error('Error opening dashboard:', error)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const updates = {
        enabled: settings.enabled,
        currency: settings.currency,
        tax_rate: settings.tax_rate,
        payment_methods: settings.payment_methods,
        updated_at: new Date().toISOString()
      }

      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('organization_payment_settings')
          .update(updates)
          .eq('id', settings.id)

        if (error) throw error
      } else {
        // Create new settings
        const { error } = await supabase
          .from('organization_payment_settings')
          .insert({ ...settings, ...updates })

        if (error) throw error
        await fetchSettings()
      }
    } catch (error) {
      console.error('Error saving payment settings:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsHeader 
        title="Payment Processing"
        description="Accept payments from your customers with Stripe"
        icon={<CreditCard className="h-6 w-6" />}
        action={
          <button
            onClick={handleSave}
            disabled={saving || !connected}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Shield className="h-4 w-4" />
            )}
            Save Changes
          </button>
        }
      />

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <p className="text-green-400">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Stripe Connect Status */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Stripe Account Status</h3>
          <div className="flex items-center gap-2">
            {connected ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="text-green-500">Connected</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <span className="text-yellow-500">Not Connected</span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm">
              {connected 
                ? 'Your Stripe account is connected and ready to accept payments'
                : 'Connect your Stripe account to start accepting payments'
              }
            </p>
            {accountStatus && accountStatus.charges_enabled === false && (
              <p className="text-yellow-400 text-xs mt-1">
                Complete your Stripe onboarding to enable payments
              </p>
            )}
          </div>
          {connected ? (
            <button
              onClick={handleOpenDashboard}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Open Stripe Dashboard
              <ExternalLink className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleConnectStripe}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Connect Stripe Account
            </button>
          )}
        </div>
      </div>

      {connected && (
        <>
          {/* Payment Settings */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Payment Settings</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-medium">Enable Payments</p>
                  <p className="text-gray-400 text-sm">Accept payments from customers</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings?.enabled || false}
                    onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Currency
                </label>
                <select
                  value={settings?.currency || 'gbp'}
                  onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="gbp">GBP - British Pound (£)</option>
                  <option value="eur">EUR - Euro (€)</option>
                  <option value="usd">USD - US Dollar ($)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Default Tax Rate (%)
                </label>
                <input
                  type="number"
                  value={settings?.tax_rate || 20}
                  onChange={(e) => setSettings({ ...settings, tax_rate: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  min="0"
                  max="100"
                  step="0.01"
                />
              </div>

              <div>
                <p className="text-sm font-medium text-gray-400 mb-2">Accepted Payment Methods</p>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings?.payment_methods?.includes('card') || false}
                      onChange={(e) => {
                        const methods = settings?.payment_methods || []
                        if (e.target.checked) {
                          setSettings({ ...settings, payment_methods: [...methods, 'card'] })
                        } else {
                          setSettings({ ...settings, payment_methods: methods.filter((m: string) => m !== 'card') })
                        }
                      }}
                      className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-300">Credit/Debit Cards</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={settings?.payment_methods?.includes('bacs_debit') || false}
                      onChange={(e) => {
                        const methods = settings?.payment_methods || []
                        if (e.target.checked) {
                          setSettings({ ...settings, payment_methods: [...methods, 'bacs_debit'] })
                        } else {
                          setSettings({ ...settings, payment_methods: methods.filter((m: string) => m !== 'bacs_debit') })
                        }
                      }}
                      className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-gray-300">Direct Debit (UK)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Webhook Configuration */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-4">Webhook Configuration</h3>
            <div className="bg-gray-700 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-2">Webhook Endpoint URL</p>
              <code className="text-xs text-gray-300 break-all">
                {settings?.webhook_endpoint}
              </code>
              <p className="text-xs text-gray-500 mt-2">
                Configure this URL in your Stripe webhook settings to receive payment events
              </p>
            </div>
          </div>
        </>
      )}

      {/* Platform Fee Notice */}
      <div className="bg-gray-900 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-400 mb-2">Platform Fees</h4>
        <p className="text-xs text-gray-500">
          Atlas Fitness charges a 3% platform fee on all transactions processed through your account. 
          This fee is automatically deducted from each payment.
        </p>
      </div>
    </div>
  )
}