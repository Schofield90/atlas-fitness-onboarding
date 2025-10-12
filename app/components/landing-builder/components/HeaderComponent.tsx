'use client'

import React from 'react'
import Link from 'next/link'
import { ComponentProps } from '../types'

interface HeaderProps extends ComponentProps {
  logo?: string
  logoText?: string
  menuItems?: Array<{ label: string; href: string }>
  ctaButton?: { label: string; href: string }
  style?: 'minimal' | 'centered' | 'split'
  backgroundColor?: string
  textColor?: string
  buttonColor?: string // NEW: Color for CTA button
}

export const HeaderComponent: React.FC<HeaderProps> = ({
  logo,
  logoText = 'Your Brand',
  menuItems = [],
  ctaButton,
  style = 'split',
  className = '',
  backgroundColor = '#ffffff',
  textColor = '#111827',
  buttonColor
}) => {
  const headerStyles = {
    minimal: 'justify-between',
    centered: 'justify-center',
    split: 'justify-between'
  }

  return (
    <header className={`w-full shadow-sm ${className}`} style={{ backgroundColor }}>
      <div className="container mx-auto px-4 py-4">
        <div className={`flex items-center ${headerStyles[style]}`}>
          {/* Logo */}
          <div className="flex items-center">
            {logo ? (
              <img src={logo} alt={logoText} className="h-10" />
            ) : (
              <span className="text-2xl font-bold" style={{ color: textColor }}>{logoText}</span>
            )}
          </div>

          {/* Navigation */}
          {menuItems.length > 0 && (
            <nav className="hidden md:flex items-center space-x-8">
              {menuItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className="hover:opacity-80 transition-colors"
                  style={{ color: textColor }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          )}

          {/* CTA Button */}
          {ctaButton && (
            <Link
              href={ctaButton.href}
              className="px-6 py-2 rounded-lg transition-colors"
              style={{
                backgroundColor: buttonColor || '#3B82F6',
                color: '#FFFFFF'
              }}
            >
              {ctaButton.label}
            </Link>
          )}

          {/* Mobile menu button */}
          <button className="md:hidden" style={{ color: textColor }}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
