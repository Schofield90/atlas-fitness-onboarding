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
  buttonColor?: string // NEW: Color for buttons
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
  buttonColor, // NEW: Extract buttonColor prop
  pattern = 'none',
  className = '',
  isEditing = false
}) => {
  // Remove gradient pattern since we're using dynamic colors
  const patternStyles = {
    none: '',
    dots: 'bg-dots-pattern',
    gradient: '' // Changed from hardcoded gradient
  }

  return (
    <section
      className={`py-16 ${patternStyles[pattern]} ${className}`}
      style={{
        backgroundColor: backgroundColor,
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
                className="px-8 py-4 rounded-lg font-semibold transition-colors inline-block cursor-pointer"
                style={{
                  backgroundColor: buttonColor || '#FFFFFF',
                  color: backgroundColor || '#1e40af'
                }}
              >
                {primaryButton.label}
              </a>
            )}

            {secondaryButton && (
              <a
                href={isEditing ? undefined : secondaryButton.href}
                onClick={isEditing ? (e) => e.preventDefault() : undefined}
                className="border-2 px-8 py-4 rounded-lg font-semibold transition-colors inline-block cursor-pointer"
                style={{
                  borderColor: buttonColor || textColor,
                  color: buttonColor || textColor
                }}
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