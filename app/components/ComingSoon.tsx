'use client'

import { RocketIcon, CalendarIcon, AlertCircleIcon } from 'lucide-react'

interface ComingSoonProps {
  feature: string
  description?: string
  estimatedDate?: string
  showIcon?: boolean
  variant?: 'full' | 'inline' | 'banner'
}

export default function ComingSoon({ 
  feature, 
  description, 
  estimatedDate,
  showIcon = true,
  variant = 'full'
}: ComingSoonProps) {
  if (variant === 'banner') {
    return (
      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <AlertCircleIcon className="h-5 w-5 text-yellow-500 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-yellow-500">Feature in Development</p>
            <p className="text-sm text-gray-400 mt-1">
              {description || `${feature} is currently being developed and will be available soon.`}
            </p>
          </div>
        </div>
      </div>
    )
  }
  
  if (variant === 'inline') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-700 rounded text-xs text-gray-400">
        <RocketIcon className="h-3 w-3" />
        Coming Soon
      </span>
    )
  }
  
  // Full variant - centered message
  return (
    <div className="text-center py-12">
      {showIcon && (
        <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <RocketIcon className="h-8 w-8 text-white" />
        </div>
      )}
      <h3 className="text-lg font-semibold text-white mb-2">
        {feature} Coming Soon
      </h3>
      <p className="text-gray-400 max-w-md mx-auto mb-4">
        {description || "We're working hard to bring you this feature. Stay tuned for updates!"}
      </p>
      {estimatedDate && (
        <div className="inline-flex items-center gap-2 text-sm text-gray-500">
          <CalendarIcon className="h-4 w-4" />
          <span>Expected: {estimatedDate}</span>
        </div>
      )}
    </div>
  )
}

export function BetaBadge() {
  return (
    <span className="ml-2 px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full font-medium">
      BETA
    </span>
  )
}

export function ComingSoonBadge() {
  return (
    <span className="ml-2 px-2 py-0.5 bg-gray-600 text-gray-400 text-xs rounded-full font-medium">
      SOON
    </span>
  )
}