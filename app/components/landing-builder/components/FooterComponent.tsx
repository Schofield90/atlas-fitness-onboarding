'use client'

import React from 'react'
import { ComponentProps } from '../types'

interface FooterLink { label: string; url: string }

interface FooterProps extends ComponentProps {
  text?: string
  links?: FooterLink[]
}

export const FooterComponent: React.FC<FooterProps> = ({
  text = '© Your Company',
  links = [
    { label: 'Privacy', url: '#' },
    { label: 'Terms', url: '#' },
    { label: 'Contact', url: '#' }
  ],
  className = ''
}) => {
  return (
    <footer className={`py-8 bg-gray-50 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-gray-600">{text}</div>
          <div className="flex items-center gap-4 text-sm">
            {links.map((l, idx) => (
              <a key={idx} href={l.url} className="text-gray-600 hover:text-gray-900">
                {l.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

