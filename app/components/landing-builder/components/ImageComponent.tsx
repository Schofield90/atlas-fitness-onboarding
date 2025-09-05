'use client'

import React from 'react'
import Image from 'next/image'
import { ComponentProps } from '../types'

interface ImageComponentProps extends ComponentProps {
  src?: string
  alt?: string
  width?: number
  height?: number
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  rounded?: 'none' | 'small' | 'medium' | 'large' | 'full'
  shadow?: 'none' | 'small' | 'medium' | 'large'
  caption?: string
}

export const ImageComponent: React.FC<ImageComponentProps> = ({
  src = '/placeholder-image.jpg',
  alt = 'Image',
  width = 800,
  height = 600,
  objectFit = 'cover',
  rounded = 'none',
  shadow = 'none',
  caption,
  className = ''
}) => {
  const roundedMap = {
    none: '',
    small: 'rounded',
    medium: 'rounded-lg',
    large: 'rounded-xl',
    full: 'rounded-full'
  }

  const shadowMap = {
    none: '',
    small: 'shadow-sm',
    medium: 'shadow-md',
    large: 'shadow-xl'
  }

  return (
    <figure className={`${className}`}>
      <div className={`relative overflow-hidden ${roundedMap[rounded]} ${shadowMap[shadow]}`}>
        {src.startsWith('http') || src.startsWith('/') ? (
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            className="w-full h-auto"
            style={{ objectFit }}
          />
        ) : (
          <div 
            className="bg-gray-200 flex items-center justify-center"
            style={{ width, height }}
          >
            <span className="text-gray-500">Image Placeholder</span>
          </div>
        )}
      </div>
      {caption && (
        <figcaption className="text-center text-sm text-gray-600 mt-2">
          {caption}
        </figcaption>
      )}
    </figure>
  )
}