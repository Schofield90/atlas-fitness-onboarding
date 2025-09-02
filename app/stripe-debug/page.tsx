'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { CheckCircle, XCircle, AlertCircle, CreditCard, Zap, RefreshCw } from 'lucide-react'
import { Suspense } from 'react'

function StripeDebugContent() {
  const searchParams = useSearchParams()
  const [checks, setChecks] = useState({
    publicKey: { status: 'checking', message: 'Checking public key...' },
    stripeJs: { status: 'checking', message: 'Loading Stripe.js...' },
    apiConnection: { status: 'checking', message: 'Testing API connection...' },
    webhookEndpoint: { status: 'checking', message: 'Checking webhook endpoint...' },
    testPayment: { status: 'idle', message: 'Ready to test payment' }
  })
  
  const [stripeInstance, setStripeInstance] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [recentEvents, setRecentEvents] = useState<any[]>([])

  // Check for success/cancel params
  const isSuccess = searchParams.get('success') === 'true'
  const isCanceled = searchParams.get('canceled') === 'true'
  const sessionId = searchParams.get('session_id')

  useEffect(() => {
    runDiagnostics()
    if (isSuccess || isCanceled) {
      fetchRecentEvents()
    }
  }, [isSuccess, isCanceled])

  const runDiagnostics = async () => {
    // Check public key
    const publicKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
    if (publicKey) {
      setChecks(prev => ({
        ...prev,
        publicKey: { 
          status: 'success', 
          message: `Public key found: ${publicKey.substring(0, 20)}...` 
        }
      }))
      
      // Try to load Stripe.js
      try {
        const stripe = await loadStripe(publicKey)
        if (stripe) {
          setStripeInstance(stripe)
          setChecks(prev => ({
            ...prev,
            stripeJs: { status: 'success', message: 'Stripe.js loaded successfully' }
          }))
        } else {
          setChecks(prev => ({
            ...prev,
            stripeJs: { status: 'error', message: 'Failed to initialize Stripe.js' }
          }))
        }
      } catch (error) {
        setChecks(prev => ({
          ...prev,
          stripeJs: { status: 'error', message: `Error: ${error}` }
        }))
      }
    } else {
      setChecks(prev => ({
        ...prev,
        publicKey: { status: 'error', message: 'No public key found in environment' }
      }))
    }

    // Test API connection
    try {
      const response = await fetch('/api/stripe/test-connection', {
        method: 'POST'
      })
      const data = await response.json()
      
      if (data.success) {
        setChecks(prev => ({
          ...prev,
          apiConnection: { 
            status: 'success', 
            message: `API connected! Account: ${data.accountId || 'Connected'}` 
          }
        }))
      } else {
        setChecks(prev => ({
          ...prev,
          apiConnection: { status: 'error', message: data.error || 'API connection failed' }
        }))
      }
    } catch (error) {
      setChecks(prev => ({
        ...prev,
        apiConnection: { status: 'error', message: `Connection error: ${error}` }
      }))
    }

    // Check webhook endpoint
    try {
      const response = await fetch('/api/webhooks/stripe', {
        method: 'GET'
      })
      
      if (response.ok) {
        setChecks(prev => ({
          ...prev,
          webhookEndpoint: { status: 'success', message: 'Webhook endpoint is accessible' }
        }))
      } else {
        setChecks(prev => ({
          ...prev,
          webhookEndpoint: { 
            status: 'warning', 
            message: `Webhook returned ${response.status} - this is normal if GET is not allowed` 
          }
        }))
      }
    } catch (error) {
      setChecks(prev => ({
        ...prev,
        webhookEndpoint: { status: 'error', message: `Webhook check failed: ${error}` }
      }))
    }
  }

  const fetchRecentEvents = async () => {
    try {
      const response = await fetch('/api/stripe/list-recent-events')
      const data = await response.json()
      if (data.success) {
        setRecentEvents(data.events || [])
      }
    } catch (error) {
      console.error('Failed to fetch events:', error)
    }
  }

  const testPayment = async () => {
    setLoading(true)
    setChecks(prev => ({
      ...prev,
      testPayment: { status: 'checking', message: 'Creating test checkout session...' }
    }))

    try {
      const response = await fetch('/api/stripe/create-test-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceAmount: 1000, // £10.00
          productName: 'Test Product'
        })
      })

      const data = await response.json()

      if (data.sessionId && stripeInstance) {
        setChecks(prev => ({
          ...prev,
          testPayment: { status: 'success', message: 'Redirecting to checkout...' }
        }))
        
        // Redirect to Stripe Checkout
        const { error } = await stripeInstance.redirectToCheckout({
          sessionId: data.sessionId
        })
        
        if (error) {
          setChecks(prev => ({
            ...prev,
            testPayment: { status: 'error', message: error.message }
          }))
        }
      } else if (data.url) {
        // Alternative: direct URL redirect
        window.location.href = data.url
      } else {
        setChecks(prev => ({
          ...prev,
          testPayment: { status: 'error', message: data.error || 'Failed to create session' }
        }))
      }
    } catch (error) {
      setChecks(prev => ({
        ...prev,
        testPayment: { status: 'error', message: `Error: ${error}` }
      }))
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />
      case 'checking':
        return <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-900 border-green-700'
      case 'error':
        return 'bg-red-900 border-red-700'
      case 'warning':
        return 'bg-yellow-900 border-yellow-700'
      case 'checking':
        return 'bg-blue-900 border-blue-700'
      default:
        return 'bg-gray-800 border-gray-700'
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <CreditCard className="w-8 h-8 text-orange-500" />
          <h1 className="text-3xl font-bold">Stripe Integration Debug</h1>
        </div>

        {/* Payment Result Banner */}
        {isSuccess && (
          <div className="bg-green-900 border border-green-700 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <div>
                <h3 className="font-semibold">Payment Successful!</h3>
                <p className="text-sm text-green-300">
                  Test payment completed successfully. Session ID: {sessionId}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {isCanceled && (
          <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-400" />
              <div>
                <h3 className="font-semibold">Payment Canceled</h3>
                <p className="text-sm text-yellow-300">
                  The checkout session was canceled by the user.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Diagnostic Checks
          </h2>
          
          <div className="space-y-3">
            {Object.entries(checks).map(([key, check]) => (
              <div 
                key={key}
                className={`p-4 rounded-lg border ${getStatusColor(check.status)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    {getStatusIcon(check.status)}
                    <div>
                      <h3 className="font-medium capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </h3>
                      <p className="text-sm text-gray-400 mt-1">{check.message}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Payment Flow</h2>
          <p className="text-gray-400 mb-6">
            Click below to test a complete payment flow with Stripe Checkout. 
            This will create a test checkout session for £10.00.
          </p>
          
          <button
            onClick={testPayment}
            disabled={loading || !stripeInstance}
            className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                Creating Session...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" />
                Test Checkout (£10.00)
              </>
            )}
          </button>
          
          {!stripeInstance && (
            <p className="text-yellow-500 text-sm mt-3">
              ⚠️ Stripe.js not loaded. Check your public key configuration.
            </p>
          )}
        </div>

        <div className="bg-blue-900 bg-opacity-20 border border-blue-800 rounded-lg p-6">
          <h3 className="font-semibold mb-3">Test Card Numbers</h3>
          <div className="space-y-2 text-sm">
            <p><code className="bg-gray-800 px-2 py-1 rounded">4242 4242 4242 4242</code> - Successful payment</p>
            <p><code className="bg-gray-800 px-2 py-1 rounded">4000 0000 0000 9995</code> - Declined payment</p>
            <p><code className="bg-gray-800 px-2 py-1 rounded">4000 0025 0000 3155</code> - Requires authentication</p>
          </div>
          <p className="text-gray-400 text-sm mt-4">
            Use any future date for expiry and any 3 digits for CVC.
          </p>
        </div>

        {/* Recent Events Section */}
        {recentEvents.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Recent Stripe Events</h2>
            <div className="space-y-2">
              {recentEvents.slice(0, 5).map((event) => (
                <div key={event.id} className="bg-gray-900 rounded p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-medium text-sm">{event.type}</span>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(event.created).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className={`text-xs px-2 py-1 rounded ${
                        event.livemode ? 'bg-red-900 text-red-300' : 'bg-blue-900 text-blue-300'
                      }`}>
                        {event.livemode ? 'Live' : 'Test'}
                      </span>
                      {event.pending_webhooks > 0 && (
                        <p className="text-xs text-yellow-500 mt-1">
                          {event.pending_webhooks} pending webhooks
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={fetchRecentEvents}
              className="text-orange-500 hover:text-orange-400 text-sm flex items-center gap-2 mt-4"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Events
            </button>
          </div>
        )}

        <div className="mt-8 text-center">
          <button
            onClick={runDiagnostics}
            className="text-orange-500 hover:text-orange-400 text-sm flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Re-run Diagnostics
          </button>
        </div>
      </div>
    </div>
  )
}

export default function StripeDebugPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-900 text-white p-8 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    }>
      <StripeDebugContent />
    </Suspense>
  )
}