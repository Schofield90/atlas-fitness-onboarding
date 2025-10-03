'use client'

import React from 'react'
import Link from 'next/link'
import { ComponentProps } from '../types'

interface ButtonProps extends ComponentProps {
  label?: string
  href?: string
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'small' | 'medium' | 'large'
  fullWidth?: boolean
  icon?: string
  iconPosition?: 'left' | 'right'
  disabled?: boolean
}

export const ButtonComponent: React.FC<ButtonProps> = ({
  label = 'Click Me',
  href,
  onClick,
  variant = 'primary',
  size = 'medium',
  fullWidth = false,
  icon,
  iconPosition = 'left',
  disabled = false,
  className = ''
}) => {
  const variantStyles = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 disabled:bg-gray-300',
    outline: 'border-2 border-blue-600 text-blue-600 hover:bg-blue-50 disabled:border-gray-300 disabled:text-gray-300',
    ghost: 'text-blue-600 hover:bg-blue-50 disabled:text-gray-300'
  }

  const sizeStyles = {
    small: 'px-4 py-2 text-sm',
    medium: 'px-6 py-3 text-base',
    large: 'px-8 py-4 text-lg'
  }

  const buttonClasses = `
    ${variantStyles[variant]}
    ${sizeStyles[size]}
    ${fullWidth ? 'w-full' : ''}
    inline-flex items-center justify-center
    font-semibold rounded-lg
    transition-colors
    disabled:cursor-not-allowed
    ${className}
  `

  const content = (
    <>
      {icon && iconPosition === 'left' && (
        <span className="mr-2">{icon}</span>
      )}
      {label}
      {icon && iconPosition === 'right' && (
        <span className="ml-2">{icon}</span>
      )}
    </>
  )

  if (href) {
    return (
      <Link href={href} className={buttonClasses}>
        {content}
      </Link>
    )
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={buttonClasses}
    >
      {content}
    </button>
  )
}