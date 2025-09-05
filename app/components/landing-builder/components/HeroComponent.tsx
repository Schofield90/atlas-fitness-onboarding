'use client'

import React from 'react'
import { ComponentProps } from '../types'

interface HeroProps extends ComponentProps {
  title?: string
  subtitle?: string
  description?: string
  primaryButton?: { label: string; href: string }
  secondaryButton?: { label: string; href: string }
  backgroundImage?: string
  backgroundColor?: string
  textColor?: string
  alignment?: 'left' | 'center' | 'right'
  height?: 'small' | 'medium' | 'large' | 'full'
}

export const HeroComponent: React.FC<HeroProps> = ({
  title = 'Welcome to Your Site',
  subtitle = 'Subheading text here',
  description = 'Add your compelling description here to engage visitors and explain your value proposition.',
  primaryButton,
  secondaryButton,
  backgroundImage,
  backgroundColor = '#f3f4f6',
  textColor = '#111827',
  alignment = 'center',
  height = 'large',
  className = ''
}) => {
  const heightMap = {
    small: 'min-h-[300px]',
    medium: 'min-h-[500px]',
    large: 'min-h-[700px]',
    full: 'min-h-screen'
  }

  const alignmentMap = {
    left: 'text-left items-start',
    center: 'text-center items-center',
    right: 'text-right items-end'
  }

  return (
    <section
      className={`relative ${heightMap[height]} flex items-center ${className}`}
      style={{
        backgroundColor: !backgroundImage ? backgroundColor : undefined,
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        color: textColor
      }}
    >
      {backgroundImage && (
        <div className="absolute inset-0 bg-black bg-opacity-40" />
      )}
      
      <div className="container mx-auto px-4 relative z-10">
        <div className={`max-w-3xl ${alignment === 'center' ? 'mx-auto' : alignment === 'right' ? 'ml-auto' : ''}`}>
          <div className={`flex flex-col ${alignmentMap[alignment]}`}>
            {subtitle && (
              <p className="text-lg mb-2 opacity-90">{subtitle}</p>
            )}
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              {title}
            </h1>
            
            {description && (
              <p className="text-xl mb-8 opacity-90 max-w-2xl">
                {description}
              </p>
            )}
            
            <div className="flex gap-4 flex-wrap">
              {primaryButton && (
                <a
                  href={primaryButton.href}
                  className="bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold hover:bg-blue-700 transition-colors inline-block"
                >
                  {primaryButton.label}
                </a>
              )}
              
              {secondaryButton && (
                <a
                  href={secondaryButton.href}
                  className="border-2 border-current px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-gray-900 transition-colors inline-block"
                >
                  {secondaryButton.label}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}