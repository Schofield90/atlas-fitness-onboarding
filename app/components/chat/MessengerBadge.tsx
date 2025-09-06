'use client'

import { MessageCircle } from 'lucide-react'

interface MessengerBadgeProps {
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export default function MessengerBadge({ size = 'md', showLabel = false }: MessengerBadgeProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  return (
    <div className="flex items-center gap-1">
      <div className="relative">
        <div className="bg-gradient-to-br from-blue-400 via-blue-500 to-purple-600 rounded-full p-0.5">
          <MessageCircle className={`${sizeClasses[size]} text-white fill-white`} />
        </div>
      </div>
      {showLabel && (
        <span className="text-xs text-gray-500">Messenger</span>
      )}
    </div>
  )
}