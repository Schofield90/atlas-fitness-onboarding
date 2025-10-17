'use client'

import React from 'react'
import { ComponentProps } from '../types'

type SocialPlatform = 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'youtube' | 'tiktok' | 'github'

interface SocialLink {
  platform: SocialPlatform
  url: string
}

interface SocialIconsProps extends ComponentProps {
  links?: SocialLink[]
}

const platformLabel: Record<SocialPlatform, string> = {
  twitter: 'Twitter',
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  github: 'GitHub'
}

export const SocialIconsComponent: React.FC<SocialIconsProps> = ({
  links = [
    { platform: 'twitter', url: '#' },
    { platform: 'facebook', url: '#' },
    { platform: 'instagram', url: '#' },
    { platform: 'linkedin', url: '#' }
  ],
  className = ''
}) => {
  return (
    <section className={`py-6 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-4">
          {links.map((link, idx) => (
            <a
              key={idx}
              href={link.url}
              className="px-3 py-1.5 border border-gray-300 rounded-full text-sm text-gray-700 hover:bg-gray-50"
              target="_blank"
              rel="noopener noreferrer"
            >
              {platformLabel[link.platform]}
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}

