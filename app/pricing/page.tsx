'use client'

import Link from 'next/link'
import { ArrowLeft, Check } from 'lucide-react'
import { TRIAL_CTA_TEXT } from '@/app/lib/constants'

export default function PricingPage() {
  const plans = [
    {
      name: 'Starter',
      price: '£99',
      description: 'Perfect for small gyms just getting started',
      features: [
        'Up to 100 active members',
        'Basic lead management',
        'Email & SMS messaging',
        'Class scheduling',
        'Basic reporting'
      ]
    },
    {
      name: 'Professional',
      price: '£299',
      description: 'For growing gyms that need more power',
      popular: true,
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
      price: 'Custom',
      description: 'For large gyms and chains',
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
  ]

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
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.price !== 'Custom' && <span className="text-gray-400">/month</span>}
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
                href="/signup"
                className={`block text-center py-3 rounded-lg font-semibold transition-colors ${
                  plan.popular
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-gray-700 hover:bg-gray-600 text-white'
                }`}
              >
                {plan.price === 'Custom' ? 'Contact Sales' : TRIAL_CTA_TEXT}
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