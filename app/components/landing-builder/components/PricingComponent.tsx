'use client'

import React from 'react'
import { ComponentProps } from '../types'

interface PricingFeaturePlan {
  name: string
  price: string
  period?: string
  features: string[]
  ctaText?: string
  ctaUrl?: string
  highlighted?: boolean
}

interface PricingProps extends ComponentProps {
  title?: string
  subtitle?: string
  plans?: PricingFeaturePlan[]
}

export const PricingComponent: React.FC<PricingProps> = ({
  title = 'Simple, transparent pricing',
  subtitle = 'Choose the plan that fits your needs',
  plans = [
    { name: 'Starter', price: '$19', period: '/mo', features: ['Basic builder', 'Email support'], ctaText: 'Get Starter', ctaUrl: '#', highlighted: false },
    { name: 'Pro', price: '$49', period: '/mo', features: ['All Starter features', 'AI import', 'Custom domains'], ctaText: 'Get Pro', ctaUrl: '#', highlighted: true },
    { name: 'Business', price: '$99', period: '/mo', features: ['Everything in Pro', 'Team collaboration', 'Priority support'], ctaText: 'Get Business', ctaUrl: '#', highlighted: false }
  ],
  className = ''
}) => {
  return (
    <section className={`py-12 ${className}`}>
      <div className="container mx-auto px-4">
        {title && <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">{title}</h2>}
        {subtitle && <p className="text-xl text-gray-600 text-center mb-10 max-w-2xl mx-auto">{subtitle}</p>}

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, idx) => (
            <div key={idx} className={`border rounded-lg p-6 bg-white shadow-sm ${plan.highlighted ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'}`}>
              <div className="flex items-baseline justify-between mb-4">
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <div className="text-3xl font-bold">{plan.price}<span className="text-base font-normal text-gray-500">{plan.period}</span></div>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} className="text-gray-700">• {f}</li>
                ))}
              </ul>
              <a href={plan.ctaUrl || '#'} className={`block text-center px-4 py-2 rounded ${plan.highlighted ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>
                {plan.ctaText || 'Choose plan'}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

