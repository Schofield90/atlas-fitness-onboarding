'use client'

import Link from 'next/link'
import { ArrowLeft, Check } from 'lucide-react'
import { TRIAL_CTA_TEXT } from '@/lib/constants'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface BillingPlan {
  id: string
  name: string
  description: string
  is_public: boolean
  price_monthly: number | null
  price_yearly: number | null
  stripe_price_id_monthly: string | null
  stripe_price_id_yearly: string | null
  max_members: number | null
  max_ai_credits_per_month: number | null
  max_emails_per_month: number | null
  max_sms_per_month: number | null
  has_dedicated_email_server: boolean
  features: any
  sort_order: number
  recommended: boolean
}

export default function PricingPage() {
  const [plans, setPlans] = useState<BillingPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'yearly'>('monthly')
  const [useStaticPlans, setUseStaticPlans] = useState(false)
  const supabase = createClient()

  // Static plans as fallback
  const staticPlans = [
    {
      id: 'starter',
      name: 'Starter',
      price_monthly: 99,
      price_yearly: 950,
      description: 'Perfect for small gyms just getting started',
      recommended: false,
      max_members: 100,
      max_ai_credits_per_month: 1000,
      max_emails_per_month: 5000,
      max_sms_per_month: 500,
      has_dedicated_email_server: false,
      features: {
        'Basic lead management': true,
        'Email & SMS messaging': true,
        'Class scheduling': true,
        'Basic reporting': true
      },
      stripe_price_id_monthly: null,
      stripe_price_id_yearly: null,
      is_public: true,
      sort_order: 1
    },
    {
      id: 'professional',
      name: 'Professional',
      price_monthly: 299,
      price_yearly: 2870,
      description: 'For growing gyms that need more power',
      recommended: true,
      max_members: 500,
      max_ai_credits_per_month: 5000,
      max_emails_per_month: 20000,
      max_sms_per_month: 2000,
      has_dedicated_email_server: false,
      features: {
        'AI-powered lead scoring': true,
        'WhatsApp integration': true,
        'Advanced automation': true,
        'Google Calendar sync': true,
        'Custom booking pages': true,
        'Priority support': true
      },
      stripe_price_id_monthly: null,
      stripe_price_id_yearly: null,
      is_public: true,
      sort_order: 2
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price_monthly: null,
      price_yearly: null,
      description: 'For large gyms and chains',
      recommended: false,
      max_members: null,
      max_ai_credits_per_month: null,
      max_emails_per_month: null,
      max_sms_per_month: null,
      has_dedicated_email_server: true,
      features: {
        'Unlimited members': true,
        'Multi-location support': true,
        'Custom integrations': true,
        'Dedicated account manager': true,
        'Custom training': true,
        'SLA guarantee': true,
        'White-label options': true
      },
      stripe_price_id_monthly: null,
      stripe_price_id_yearly: null,
      is_public: true,
      sort_order: 3
    }
  ]

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('billing_plans')
        .select('*')
        .eq('is_public', true)
        .order('sort_order', { ascending: true })

      if (error || !data || data.length === 0) {
        // Use static plans if database plans aren't available
        setUseStaticPlans(true)
        setPlans(staticPlans as any)
      } else {
        setPlans(data)
      }
    } catch (error) {
      console.error('Error loading plans:', error)
      setUseStaticPlans(true)
      setPlans(staticPlans as any)
    } finally {
      setLoading(false)
    }
  }

  const formatFeatures = (plan: BillingPlan): string[] => {
    const features: string[] = []
    
    if (plan.max_members) {
      features.push(`Up to ${plan.max_members.toLocaleString()} active members`)
    } else {
      features.push('Unlimited members')
    }
    
    if (plan.max_ai_credits_per_month) {
      features.push(`${plan.max_ai_credits_per_month.toLocaleString()} AI credits/month`)
    } else {
      features.push('Unlimited AI usage')
    }
    
    if (plan.max_emails_per_month) {
      features.push(`${plan.max_emails_per_month.toLocaleString()} emails/month`)
    } else {
      features.push('Unlimited emails')
    }
    
    if (plan.max_sms_per_month) {
      features.push(`${plan.max_sms_per_month.toLocaleString()} SMS/month`)
    } else {
      features.push('Unlimited SMS')
    }
    
    if (plan.has_dedicated_email_server) {
      features.push('Dedicated email server')
    }
    
    if (plan.features && typeof plan.features === 'object') {
      Object.entries(plan.features).forEach(([key, value]) => {
        if (value === true) {
          // Clean up the feature name
          const featureName = key.replace(/_/g, ' ')
          if (!features.some(f => f.toLowerCase() === featureName.toLowerCase())) {
            features.push(featureName)
          }
        } else if (typeof value === 'string' || typeof value === 'number') {
          features.push(`${key.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')}: ${value}`)
        }
      })
    }
    
    return features
  }

  const getPrice = (plan: BillingPlan) => {
    const price = billingPeriod === 'monthly' ? plan.price_monthly : plan.price_yearly
    if (!price) return 'Custom'
    
    if (billingPeriod === 'yearly') {
      const monthlyEquivalent = price / 12
      return `£${monthlyEquivalent.toFixed(0)}`
    }
    
    return `£${price}`
  }

  const getCheckoutUrl = (plan: BillingPlan) => {
    if (!plan.price_monthly && !plan.price_yearly) {
      return '/contact-sales'
    }
    
    // Use static plans checkout for now if using static data
    if (useStaticPlans) {
      return '/signup'
    }
    
    return `/api/billing/create-checkout-session?planId=${plan.id}&billing=${billingPeriod}`
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading pricing plans...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-6 py-12">
        <Link href="/landing" className="inline-flex items-center text-gray-400 hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-300">
            Choose the plan that fits your gym's needs
          </p>
          
          <div className="mt-6 inline-flex items-center bg-gray-800 rounded-lg p-1">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-4 py-2 rounded-md transition-all ${
                billingPeriod === 'monthly'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('yearly')}
              className={`px-4 py-2 rounded-md transition-all ${
                billingPeriod === 'yearly'
                  ? 'bg-orange-500 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="ml-2 text-xs bg-green-500 text-white px-2 py-1 rounded">Save 20%</span>
            </button>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.length === 0 ? (
            <div className="col-span-3 text-center py-12">
              <p className="text-gray-400">No pricing plans available. Please contact support.</p>
            </div>
          ) : (
            plans.map((plan) => {
              const price = getPrice(plan)
              const features = formatFeatures(plan)
              
              return (
                <div
                  key={plan.id}
                  className={`bg-gray-800 rounded-lg p-8 ${
                    plan.recommended ? 'ring-2 ring-orange-500 relative' : ''
                  }`}
                >
                  {plan.recommended && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <span className="bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                        Most Popular
                      </span>
                    </div>
                  )}
                  
                  <h2 className="text-2xl font-bold mb-2">{plan.name}</h2>
                  <div className="mb-4">
                    <span className="text-4xl font-bold">{price}</span>
                    {price !== 'Custom' && (
                      <span className="text-gray-400">/{billingPeriod === 'yearly' ? 'mo' : 'month'}</span>
                    )}
                    {billingPeriod === 'yearly' && plan.price_yearly && (
                      <div className="text-sm text-gray-500 mt-1">
                        £{plan.price_yearly} billed annually
                      </div>
                    )}
                  </div>
                  <p className="text-gray-400 mb-6">{plan.description}</p>
                  
                  <ul className="space-y-3 mb-8">
                    {features.map((feature) => (
                      <li key={feature} className="flex items-start">
                        <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <Link
                    href={getCheckoutUrl(plan)}
                    className={`block text-center py-3 rounded-lg font-semibold transition-colors ${
                      plan.recommended
                        ? 'bg-orange-500 hover:bg-orange-600 text-white'
                        : 'bg-gray-700 hover:bg-gray-600 text-white'
                    }`}
                  >
                    {price === 'Custom' ? 'Contact Sales' : useStaticPlans ? TRIAL_CTA_TEXT : 'Start Free Trial'}
                  </Link>
                </div>
              )
            })
          )}
        </div>
        
        <div className="mt-16 text-center">
          <p className="text-gray-400 mb-4">All plans include:</p>
          <div className="flex flex-wrap justify-center gap-4">
            <span className="text-gray-300">✓ 14-day free trial</span>
            <span className="text-gray-300">✓ No setup fees</span>
            <span className="text-gray-300">✓ Cancel anytime</span>
            <span className="text-gray-300">✓ Data export</span>
            <span className="text-gray-300">✓ 24/7 Support</span>
            <span className="text-gray-300">✓ SSL Security</span>
          </div>
          
          {billingPeriod === 'yearly' && (
            <div className="mt-8 p-4 bg-green-900/20 border border-green-500/30 rounded-lg max-w-md mx-auto">
              <p className="text-green-400 font-semibold">🎉 Annual Billing Discount</p>
              <p className="text-gray-300 text-sm mt-1">
                Save 20% when you pay annually. That's 2 months free!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}