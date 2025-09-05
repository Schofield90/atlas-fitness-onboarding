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
}

export const HeaderComponent: React.FC<HeaderProps> = ({
  logo,
  logoText = 'Your Brand',
  menuItems = [],
  ctaButton,
  style = 'split',
  className = ''
}) => {
  const headerStyles = {
    minimal: 'justify-between',
    centered: 'justify-center',
    split: 'justify-between'
  }

  return (
    <header className={`w-full bg-white shadow-sm ${className}`}>
      <div className="container mx-auto px-4 py-4">
        <div className={`flex items-center ${headerStyles[style]}`}>
          {/* Logo */}
          <div className="flex items-center">
            {logo ? (
              <img src={logo} alt={logoText} className="h-10" />
            ) : (
              <span className="text-2xl font-bold text-gray-900">{logoText}</span>
            )}
          </div>

          {/* Navigation */}
          {menuItems.length > 0 && (
            <nav className="hidden md:flex items-center space-x-8">
              {menuItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className="text-gray-700 hover:text-blue-600 transition-colors"
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
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {ctaButton.label}
            </Link>
          )}

          {/* Mobile menu button */}
          <button className="md:hidden">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}