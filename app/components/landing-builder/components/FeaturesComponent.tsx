'use client'

import React from 'react'
import { ComponentProps } from '../types'

interface Feature {
  icon?: string
  title: string
  description: string
}

interface FeaturesProps extends ComponentProps {
  title?: string
  subtitle?: string
  features?: Feature[]
  columns?: 2 | 3 | 4
  layout?: 'grid' | 'list'
}

export const FeaturesComponent: React.FC<FeaturesProps> = ({
  title = 'Our Features',
  subtitle = 'Everything you need to succeed',
  features = [
    {
      icon: '🚀',
      title: 'Fast Performance',
      description: 'Lightning-fast load times and smooth interactions'
    },
    {
      icon: '🔒',
      title: 'Secure',
      description: 'Your data is safe with enterprise-grade security'
    },
    {
      icon: '📱',
      title: 'Mobile Friendly',
      description: 'Works perfectly on all devices and screen sizes'
    }
  ],
  columns = 3,
  layout = 'grid',
  className = ''
}) => {
  const columnClass = {
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4'
  }

  return (
    <section className={`py-12 ${className}`}>
      <div className="container mx-auto px-4">
        {title && (
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4">
            {title}
          </h2>
        )}
        {subtitle && (
          <p className="text-xl text-gray-600 text-center mb-12 max-w-2xl mx-auto">
            {subtitle}
          </p>
        )}
        
        <div className={`
          ${layout === 'grid' 
            ? `grid gap-8 ${columnClass[columns]}`
            : 'space-y-8 max-w-3xl mx-auto'
          }
        `}>
          {features.map((feature, index) => (
            <div
              key={index}
              className={`
                ${layout === 'list' ? 'flex gap-4' : 'text-center'}
              `}
            >
              {feature.icon && (
                <div className={`
                  text-4xl mb-4
                  ${layout === 'list' ? 'flex-shrink-0' : ''}
                `}>
                  {feature.icon}
                </div>
              )}
              <div>
                <h3 className="text-xl font-semibold mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}