'use client'

import React from 'react'
import { ComponentProps } from '../types'
import { sanitizeHtml } from '@/app/lib/security/sanitize'

interface TextProps extends ComponentProps {
  content?: string
  fontSize?: 'small' | 'base' | 'large' | 'xl' | '2xl'
  fontWeight?: 'normal' | 'medium' | 'semibold' | 'bold'
  textAlign?: 'left' | 'center' | 'right' | 'justify'
  textColor?: string
  lineHeight?: 'tight' | 'normal' | 'relaxed'
  maxWidth?: 'none' | 'prose' | 'screen'
}

export const TextComponent: React.FC<TextProps> = ({
  content = 'Enter your text content here...',
  fontSize = 'base',
  fontWeight = 'normal',
  textAlign = 'left',
  textColor = '#374151',
  lineHeight = 'normal',
  maxWidth = 'prose',
  className = ''
}) => {
  // ✅ SECURITY FIX: Sanitize HTML to prevent XSS attacks
  const sanitizedContent = sanitizeHtml(content)
  const sizeMap = {
    small: 'text-sm',
    base: 'text-base',
    large: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl'
  }

  const weightMap = {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold'
  }

  const alignMap = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
    justify: 'text-justify'
  }

  const lineHeightMap = {
    tight: 'leading-tight',
    normal: 'leading-normal',
    relaxed: 'leading-relaxed'
  }

  const maxWidthMap = {
    none: '',
    prose: 'max-w-prose',
    screen: 'max-w-screen-xl'
  }

  return (
    <div
      className={`
        ${sizeMap[fontSize]}
        ${weightMap[fontWeight]}
        ${alignMap[textAlign]}
        ${lineHeightMap[lineHeight]}
        ${maxWidthMap[maxWidth]}
        ${textAlign === 'center' && maxWidth !== 'none' ? 'mx-auto' : ''}
        ${className}
      `}
      style={{ color: textColor }}
      dangerouslySetInnerHTML={{ __html: sanitizedContent }}
    />
  )
}