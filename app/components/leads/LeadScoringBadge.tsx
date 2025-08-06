'use client'

import { useState, useEffect } from 'react'

interface LeadScoringBadgeProps {
  score: number
  showBreakdown?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function LeadScoringBadge({ 
  score, 
  showBreakdown = false, 
  className = '', 
  size = 'md' 
}: LeadScoringBadgeProps) {
  const [isHovered, setIsHovered] = useState(false)
  
  const getTemperature = (score: number) => {
    if (score >= 80) return 'hot'
    if (score >= 60) return 'warm'
    if (score >= 40) return 'lukewarm'
    return 'cold'
  }
  
  const getTemperatureColor = (temperature: string) => {
    switch (temperature) {
      case 'hot': return 'bg-red-500 text-white'
      case 'warm': return 'bg-orange-500 text-white'
      case 'lukewarm': return 'bg-yellow-500 text-black'
      case 'cold': return 'bg-blue-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }
  
  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm': return 'text-xs px-2 py-1 min-w-[40px]'
      case 'lg': return 'text-lg px-4 py-2 min-w-[60px]'
      default: return 'text-sm px-3 py-1.5 min-w-[50px]'
    }
  }
  
  const temperature = getTemperature(score)
  const colorClass = getTemperatureColor(temperature)
  const sizeClass = getSizeClasses(size)
  
  return (
    <div className="relative inline-block">
      <div
        className={`
          ${colorClass} ${sizeClass} ${className}
          rounded-full font-bold text-center cursor-pointer
          transition-all duration-200 hover:shadow-lg
          flex items-center justify-center
        `}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={`Lead Score: ${score}/100 (${temperature})`}
      >
        {score}
      </div>
      
      {isHovered && showBreakdown && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-48">
          <div className="bg-gray-800 text-white p-3 rounded-lg shadow-xl border border-gray-600">
            <div className="text-xs font-medium mb-2">Lead Temperature</div>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span>Score:</span>
                <span className="font-medium">{score}/100</span>
              </div>
              <div className="flex justify-between">
                <span>Temperature:</span>
                <span className={`font-medium capitalize ${
                  temperature === 'hot' ? 'text-red-400' :
                  temperature === 'warm' ? 'text-orange-400' :
                  temperature === 'lukewarm' ? 'text-yellow-400' :
                  'text-blue-400'
                }`}>
                  {temperature}
                </span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-gray-600 text-xs text-gray-300">
              Click for detailed breakdown
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface ScoreProgressBarProps {
  score: number
  maxScore?: number
  label?: string
  className?: string
  showValue?: boolean
}

export function ScoreProgressBar({ 
  score, 
  maxScore = 100, 
  label, 
  className = '',
  showValue = true 
}: ScoreProgressBarProps) {
  const percentage = Math.min(100, (score / maxScore) * 100)
  
  const getBarColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-red-500'
    if (percentage >= 60) return 'bg-orange-500'
    if (percentage >= 40) return 'bg-yellow-500'
    return 'bg-blue-500'
  }
  
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-300">{label}</span>
          {showValue && (
            <span className="text-xs text-gray-400">
              {score}/{maxScore}
            </span>
          )}
        </div>
      )}
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${getBarColor(percentage)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

interface TemperatureIndicatorProps {
  temperature: string
  className?: string
}

export function TemperatureIndicator({ temperature, className = '' }: TemperatureIndicatorProps) {
  const getIcon = (temp: string) => {
    switch (temp) {
      case 'hot':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.71 19c.75 0 1.34-.6 1.34-1.34 0-.74-.6-1.34-1.34-1.34-.75 0-1.34.6-1.34 1.34 0 .74.6 1.34 1.34 1.34M11.71 7.11C10.08 7.11 8.75 8.44 8.75 10.07c0 1.63 1.33 2.96 2.96 2.96 1.63 0 2.96-1.33 2.96-2.96 0-1.63-1.33-2.96-2.96-2.96M11.71 2c3.9 0 7.04 3.14 7.04 7.04 0 2.04-.88 3.88-2.28 5.16l-.02.02c-.37.31-.85.78-.85 1.32v1.8c0 .37-.31.68-.68.68h-7.42c-.37 0-.68-.31-.68-.68v-1.8c0-.54-.48-1.01-.85-1.32l-.02-.02c-1.4-1.28-2.28-3.12-2.28-5.16C4.67 5.14 7.81 2 11.71 2z"/>
          </svg>
        )
      case 'warm':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        )
      case 'lukewarm':
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        )
      default:
        return (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
          </svg>
        )
    }
  }
  
  const getColorClass = (temp: string) => {
    switch (temp) {
      case 'hot': return 'text-red-500'
      case 'warm': return 'text-orange-500'
      case 'lukewarm': return 'text-yellow-500'
      case 'cold': return 'text-blue-500'
      default: return 'text-gray-500'
    }
  }
  
  return (
    <div className={`inline-flex items-center space-x-1 ${className}`}>
      <div className={getColorClass(temperature)}>
        {getIcon(temperature)}
      </div>
      <span className={`text-sm capitalize ${getColorClass(temperature)}`}>
        {temperature}
      </span>
    </div>
  )
}