'use client'

import React from 'react'
import { ComponentProps } from '../types'

interface CTAProps extends ComponentProps {
  title?: string
  description?: string
  primaryButton?: { label: string; href: string }
  secondaryButton?: { label: string; href: string }
  backgroundColor?: string
  textColor?: string
  pattern?: 'none' | 'dots' | 'gradient'
  isEditing?: boolean
}

export const CTAComponent: React.FC<CTAProps> = ({
  title = 'Ready to Get Started?',
  description = 'Join thousands of satisfied customers using our product',
  primaryButton = { label: 'Get Started', href: '#' },
  secondaryButton,
  backgroundColor = '#1e40af',
  textColor = '#ffffff',
  pattern = 'none',
  className = '',
  isEditing = false
}) => {
  const patternStyles = {
    none: '',
    dots: 'bg-dots-pattern',
    gradient: 'bg-gradient-to-br from-blue-600 to-purple-600'
  }

  return (
    <section
      className={`py-16 ${patternStyles[pattern]} ${className}`}
      style={{
        backgroundColor: pattern === 'none' ? backgroundColor : undefined,
        color: textColor
      }}
    >
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {title}
          </h2>
          
          {description && (
            <p className="text-xl mb-8 opacity-90">
              {description}
            </p>
          )}
          
          <div className="flex gap-4 justify-center flex-wrap">
            {primaryButton && (
              <a
                href={isEditing ? undefined : primaryButton.href}
                onClick={isEditing ? (e) => e.preventDefault() : undefined}
                className="bg-white text-blue-600 px-8 py-4 rounded-lg font-semibold hover:bg-gray-100 transition-colors inline-block cursor-pointer"
              >
                {primaryButton.label}
              </a>
            )}

            {secondaryButton && (
              <a
                href={isEditing ? undefined : secondaryButton.href}
                onClick={isEditing ? (e) => e.preventDefault() : undefined}
                className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors inline-block cursor-pointer"
              >
                {secondaryButton.label}
              </a>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}