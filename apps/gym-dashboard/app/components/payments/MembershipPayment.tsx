'use client'

import { useState } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js'
import Button from '@/app/components/ui/Button'
import { Card } from '@/app/components/ui/Card'
import { formatBritishCurrency } from '@/app/lib/utils/british-format'
import { Loader2 } from 'lucide-react'

interface MembershipPaymentProps {
  membership: {
    id: string
    contact_id: string
    membership_plan: {
      name: string
      price: number
      billing_period: string
    }
  }
  onSuccess: () => void
  onCancel: () => void
}

function PaymentForm({ membership, onSuccess, onCancel }: MembershipPaymentProps) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!stripe || !elements) return
    
    setProcessing(true)
    setError(null)
    
    // Confirm the payment
    const { error: confirmError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payments/success`,
      },
      redirect: 'if_required'
    })
    
    if (confirmError) {
      setError(confirmError.message || 'Payment failed')
      setProcessing(false)
    } else {
      // Payment succeeded
      onSuccess()
    }
  }
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">
          {membership.membership_plan.name} Membership
        </h3>
        <p className="text-2xl font-bold">
          {formatBritishCurrency(membership.membership_plan.price)}
          <span className="text-sm font-normal text-gray-600">
            /{membership.membership_plan.billing_period}
          </span>
        </p>
      </div>
      
      <PaymentElement className="mb-6" />
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}
      
      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={!stripe || processing}
          className="flex-1"
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            'Pay Now'
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={processing}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}

export function MembershipPayment({ membership, onSuccess, onCancel }: MembershipPaymentProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [stripePromise, setStripePromise] = useState<Promise<any> | null>(null)
  
  // Create payment intent when component mounts
  useState(() => {
    const createPaymentIntent = async () => {
      try {
        const response = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: membership.membership_plan.price,
            customerId: membership.contact_id,
            membershipId: membership.id,
            description: `${membership.membership_plan.name} membership payment`,
            type: 'membership_payment'
          })
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to create payment')
        }
        
        const data = await response.json()
        setClientSecret(data.clientSecret)
        
        // Get organization's connected account details to load Stripe
        const settingsResponse = await fetch('/api/billing/stripe-connect/public-key')
        if (settingsResponse.ok) {
          const { publishableKey, connectedAccountId } = await settingsResponse.json()
          setStripePromise(
            loadStripe(publishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!, {
              stripeAccount: connectedAccountId
            })
          )
        } else {
          // Fallback to platform Stripe
          setStripePromise(loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!))
        }
      } catch (err) {
        console.error('Error creating payment:', err)
        setError(err instanceof Error ? err.message : 'Failed to initialize payment')
      } finally {
        setLoading(false)
      }
    }
    
    createPaymentIntent()
  })
  
  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </Card>
    )
  }
  
  if (error || !clientSecret || !stripePromise) {
    return (
      <Card className="p-6">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || 'Failed to initialize payment'}</p>
          <Button variant="outline" onClick={onCancel}>Go Back</Button>
        </div>
      </Card>
    )
  }
  
  return (
    <Card className="p-6">
      <Elements
        stripe={stripePromise}
        options={{
          clientSecret,
          appearance: {
            theme: 'stripe',
            variables: {
              colorPrimary: '#FF6B00',
            },
          },
        }}
      >
        <PaymentForm
          membership={membership}
          onSuccess={onSuccess}
          onCancel={onCancel}
        />
      </Elements>
    </Card>
  )
}