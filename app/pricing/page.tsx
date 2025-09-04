'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ArrowLeft, Check } from 'lucide-react'

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')

  const plans = [
    {
      name: 'Trial',
      monthly: 0,
      annual: 0,
      description: 'Explore Atlas with full access for 14 days',
      cta: 'Start 14-Day Free Trial',
      ctaHref: '/signup',
      features: [
        'Full platform access for 14 days',
        'No credit card required',
        'Onboarding checklist',
        'Email & chat support'
      ]
    },
    {
      name: 'Professional',
      monthly: 299,
      annual: 2990, // ~2 months free
      description: 'For growing gyms that need more power',
      popular: true,
      cta: 'Book a Demo',
      ctaHref: '/demo',
      features: [
        'Up to 500 active members',
        'AI-powered lead scoring',
        'WhatsApp integration',
        'Advanced automation',
        'Google Calendar sync',
        'Custom booking pages',
        'Priority support'
      ]
    },
    {
      name: 'Enterprise',
      monthly: null,
      annual: null,
      description: 'For large gyms and multi-location chains',
      cta: 'Book a Demo',
      ctaHref: '/demo',
      features: [
        'Unlimited members',
        'Multi-location support',
        'Custom integrations',
        'Dedicated account manager',
        'Custom training',
        'SLA guarantee',
        'White-label options'
      ]
    }
  ] as const

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <div className="container mx-auto px-6 py-12">
        <Link href="/landing" className="inline-flex items-center text-gray-400 hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </Link>
        
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Simple, Transparent Pricing</h1>
          <p className="text-xl text-gray-300 mb-6">
            Choose the plan that fits your gym's needs
          </p>
          <div className="inline-flex items-center bg-gray-800 rounded-full p-1">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                billingCycle === 'monthly' ? 'bg-orange-500 text-white' : 'text-gray-300'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                billingCycle === 'annual' ? 'bg-orange-500 text-white' : 'text-gray-300'
              }`}
            >
              Annual
            </button>
          </div>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-gray-800 rounded-lg p-8 ${
                plan.popular ? 'ring-2 ring-orange-500 relative' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    Most Popular
                  </span>
                </div>
              )}
              
              <h2 className="text-2xl font-bold mb-2">{plan.name}</h2>
              <div className="mb-4">
                {plan.monthly === null ? (
                  <span className="text-4xl font-bold">Custom</span>
                ) : (
                  <>
                    <span className="text-4xl font-bold">£{billingCycle === 'monthly' ? plan.monthly : plan.annual}</span>
                    <span className="text-gray-400">/{billingCycle === 'monthly' ? 'month' : 'year'}</span>
                  </>
                )}
              </div>
              <p className="text-gray-400 mb-6">{plan.description}</p>
              
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start">
                    <Check className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Link
                href={plan.ctaHref}
                className={`block text-center py-3 rounded-lg font-semibold transition-colors ${
                  plan.popular
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
        
        <div className="mt-16 text-center">
          <p className="text-gray-400 mb-4">All plans include:</p>
          <div className="flex flex-wrap justify-center gap-4">
            <span className="text-gray-300">✓ 14-day free trial</span>
            <span className="text-gray-300">✓ No setup fees</span>
            <span className="text-gray-300">✓ Cancel anytime</span>
            <span className="text-gray-300">✓ Data export</span>
          </div>
        </div>
      </div>
    </div>
  )
}