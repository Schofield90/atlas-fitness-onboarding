'use client'

import React from 'react'
import { ComponentProps } from '../types'

interface VideoProps extends ComponentProps {
  url?: string
}

function getEmbedUrl(url: string): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtube.com')) {
      const id = u.searchParams.get('v')
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.replace('/', '')
      return id ? `https://www.youtube.com/embed/${id}` : null
    }
    if (u.hostname.includes('vimeo.com')) {
      const id = u.pathname.split('/').filter(Boolean).pop()
      return id ? `https://player.vimeo.com/video/${id}` : null
    }
    return url
  } catch {
    return null
  }
}

export const VideoComponent: React.FC<VideoProps> = ({
  url = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  className = ''
}) => {
  const embed = getEmbedUrl(url)
  return (
    <section className={`py-8 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="aspect-w-16 aspect-h-9 w-full max-w-3xl mx-auto">
          {embed ? (
            <iframe
              src={embed}
              className="w-full h-full rounded-lg border border-gray-200"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center text-gray-600">
              Invalid video URL
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

