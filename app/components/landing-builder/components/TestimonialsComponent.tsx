'use client'

import React from 'react'
import { ComponentProps } from '../types'

interface TestimonialItem {
  name: string
  role?: string
  quote: string
  avatarUrl?: string
}

interface TestimonialsProps extends ComponentProps {
  title?: string
  subtitle?: string
  testimonials?: TestimonialItem[]
  columns?: 2 | 3
}

export const TestimonialsComponent: React.FC<TestimonialsProps> = ({
  title = 'What our customers say',
  subtitle = 'Real stories from real users',
  testimonials = [
    { name: 'Alex Johnson', role: 'Founder, Acme Inc.', quote: 'This product transformed our marketing!', avatarUrl: '' },
    { name: 'Maria Garcia', role: 'Head of Growth', quote: 'Incredibly easy to use and very effective.', avatarUrl: '' },
    { name: 'Sam Patel', role: 'Entrepreneur', quote: 'Best landing page builder I have tried.', avatarUrl: '' }
  ],
  columns = 3,
  className = ''
}) => {
  const columnClass = columns === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'

  return (
    <section className={`py-12 ${className}`}>
      <div className="container mx-auto px-4">
        {title && (
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">{title}</h2>
        )}
        {subtitle && (
          <p className="text-xl text-gray-600 text-center mb-10 max-w-2xl mx-auto">{subtitle}</p>
        )}

        <div className={`grid gap-6 ${columnClass}`}>
          {testimonials.map((t, idx) => (
            <div key={idx} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
              {t.avatarUrl ? (
                <img src={t.avatarUrl} alt={t.name} className="w-12 h-12 rounded-full mb-4" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-200 mb-4" />
              )}
              <p className="text-gray-700 italic mb-4">“{t.quote}”</p>
              <div className="text-sm text-gray-900 font-medium">{t.name}</div>
              {t.role && <div className="text-sm text-gray-500">{t.role}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

