'use client'

import React from 'react'
import { ComponentProps } from '../types'

interface HTMLProps extends ComponentProps {
  html?: string
}

export const HTMLComponent: React.FC<HTMLProps> = ({
  html = '<div style="padding:16px;border:1px dashed #d1d5db;border-radius:8px;background:#fafafa">Custom HTML block</div>',
  className = ''
}) => {
  return (
    <section className={`py-4 ${className}`}>
      <div className="container mx-auto px-4">
        <div
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </section>
  )
}

