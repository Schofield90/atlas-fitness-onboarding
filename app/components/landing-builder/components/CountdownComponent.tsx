'use client'

import React, { useEffect, useState } from 'react'
import { ComponentProps } from '../types'

interface CountdownProps extends ComponentProps {
  targetDate?: string // ISO string
  showLabels?: boolean
}

const getTimeRemaining = (target: number) => {
  const total = Math.max(0, target - Date.now())
  const seconds = Math.floor((total / 1000) % 60)
  const minutes = Math.floor((total / 1000 / 60) % 60)
  const hours = Math.floor((total / (1000 * 60 * 60)) % 24)
  const days = Math.floor(total / (1000 * 60 * 60 * 24))
  return { total, days, hours, minutes, seconds }
}

export const CountdownComponent: React.FC<CountdownProps> = ({
  targetDate = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(),
  showLabels = true,
  className = ''
}) => {
  const targetMs = new Date(targetDate).getTime()
  const [time, setTime] = useState(() => getTimeRemaining(targetMs))

  useEffect(() => {
    const interval = setInterval(() => setTime(getTimeRemaining(targetMs)), 1000)
    return () => clearInterval(interval)
  }, [targetMs])

  const box = (value: number, label: string) => (
    <div className="text-center">
      <div className="text-4xl font-bold bg-white border border-gray-200 rounded-lg px-4 py-3 shadow-sm min-w-[72px]">{value.toString().padStart(2, '0')}</div>
      {showLabels && <div className="text-xs text-gray-500 mt-1">{label}</div>}
    </div>
  )

  return (
    <section className={`py-8 ${className}`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-4">
          {box(time.days, 'Days')}
          <div className="text-3xl text-gray-400">:</div>
          {box(time.hours, 'Hours')}
          <div className="text-3xl text-gray-400">:</div>
          {box(time.minutes, 'Minutes')}
          <div className="text-3xl text-gray-400">:</div>
          {box(time.seconds, 'Seconds')}
        </div>
      </div>
    </section>
  )
}

