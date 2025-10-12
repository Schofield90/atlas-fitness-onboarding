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
  backgroundColor?: string
  textColor?: string
  buttonColor?: string // NEW: Color for CTA buttons
}

export const PricingComponent: React.FC<PricingProps> = ({
  title = 'Simple, transparent pricing',
  subtitle = 'Choose the plan that fits your needs',
  plans = [
    { name: 'Starter', price: '$19', period: '/mo', features: ['Basic builder', 'Email support'], ctaText: 'Get Starter', ctaUrl: '#', highlighted: false },
    { name: 'Pro', price: '$49', period: '/mo', features: ['All Starter features', 'AI import', 'Custom domains'], ctaText: 'Get Pro', ctaUrl: '#', highlighted: true },
    { name: 'Business', price: '$99', period: '/mo', features: ['Everything in Pro', 'Team collaboration', 'Priority support'], ctaText: 'Get Business', ctaUrl: '#', highlighted: false }
  ],
  className = '',
  backgroundColor = '#ffffff',
  textColor = '#111827',
  buttonColor // NEW: Extract buttonColor prop
}) => {
  return (
    <section className={`py-12 ${className}`} style={{ backgroundColor, color: textColor }}>
      <div className="container mx-auto px-4">
        {title && <h2 className="text-3xl md:text-4xl font-bold text-center mb-4" style={{ color: textColor }}>{title}</h2>}
        {subtitle && <p className="text-xl text-center mb-10 max-w-2xl mx-auto opacity-80" style={{ color: textColor }}>{subtitle}</p>}

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, idx) => (
            <div key={idx} className={`border rounded-lg p-6 bg-white shadow-sm ${plan.highlighted ? 'ring-2' : ''}`} style={{
              borderColor: plan.highlighted ? (buttonColor || '#3B82F6') : '#E5E7EB',
              ringColor: plan.highlighted ? (buttonColor || '#3B82F6') : undefined
            }}>
              <div className="flex items-baseline justify-between mb-4">
                <h3 className="text-xl font-semibold" style={{ color: textColor }}>{plan.name}</h3>
                <div className="text-3xl font-bold" style={{ color: textColor }}>{plan.price}<span className="text-base font-normal opacity-60">{plan.period}</span></div>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features.map((f, i) => (
                  <li key={i} style={{ color: textColor }}>• {f}</li>
                ))}
              </ul>
              <a
                href={plan.ctaUrl || '#'}
                className="block text-center px-4 py-2 rounded transition-colors"
                style={{
                  backgroundColor: buttonColor || '#3B82F6',
                  color: '#FFFFFF'
                }}
              >
                {plan.ctaText || 'Choose plan'}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

