'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, ArrowRight, Loader2 } from 'lucide-react'
import { Suspense } from 'react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [loading, setLoading] = useState(true)
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null)

  useEffect(() => {
    if (sessionId) {
      verifySession()
    }
  }, [sessionId])

  const verifySession = async () => {
    try {
      const response = await fetch(`/api/billing/verify-session?session_id=${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        setSubscriptionDetails(data)
      }
    } catch (error) {
      console.error('Error verifying session:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex items-center justify-center">
      <div className="max-w-md w-full px-6">
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          {loading ? (
            <>
              <Loader2 className="w-16 h-16 text-orange-500 mx-auto mb-4 animate-spin" />
              <h1 className="text-2xl font-bold mb-2">Processing your subscription...</h1>
              <p className="text-gray-400">Please wait while we set up your account.</p>
            </>
          ) : (
            <>
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h1 className="text-2xl font-bold mb-2">Welcome to GymLeadHub!</h1>
              <p className="text-gray-400 mb-6">
                Your subscription has been activated successfully.
              </p>
              
              {subscriptionDetails && (
                <div className="bg-gray-700 rounded-lg p-4 mb-6 text-left">
                  <h3 className="font-semibold mb-2">Subscription Details:</h3>
                  <div className="text-sm text-gray-300 space-y-1">
                    <p>Plan: {subscriptionDetails.planName}</p>
                    <p>Billing: {subscriptionDetails.billingPeriod}</p>
                    <p>Trial ends: {subscriptionDetails.trialEnd}</p>
                  </div>
                </div>
              )}
              
              <div className="space-y-3">
                <Link
                  href="/dashboard"
                  className="flex items-center justify-center gap-2 w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  Go to Dashboard
                  <ArrowRight className="w-4 h-4" />
                </Link>
                
                <Link
                  href="/billing"
                  className="block w-full bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg font-semibold transition-colors"
                >
                  View Billing Details
                </Link>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-700">
                <p className="text-sm text-gray-400">
                  You have a 14-day free trial. You can cancel anytime from your billing settings.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function BillingSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}