'use client'

import { useState, useEffect } from 'react'
import { Clock, Calendar, Sun, Moon, AlertCircle } from 'lucide-react'

interface WaitActionConfigProps {
  config: any
  onChange: (config: any) => void
}

export default function WaitActionConfig({ config, onChange }: WaitActionConfigProps) {
  const [waitType, setWaitType] = useState(config.type || 'duration')
  const [duration, setDuration] = useState(config.duration || { value: 1, unit: 'hours' })
  const [specificTime, setSpecificTime] = useState(config.specificTime || { time: '09:00', timezone: 'Europe/London' })
  const [businessHours, setBusinessHours] = useState(config.businessHours || {
    enabled: false,
    start: '08:00',
    end: '20:00',
    days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  })

  const handleWaitTypeChange = (type: string) => {
    setWaitType(type)
    onChange({
      ...config,
      type,
      duration: type === 'duration' ? duration : undefined,
      specificTime: type === 'specific_time' ? specificTime : undefined,
      businessHours: businessHours
    })
  }

  const handleDurationChange = (field: 'value' | 'unit', value: any) => {
    const updated = { ...duration, [field]: value }
    setDuration(updated)
    if (waitType === 'duration') {
      onChange({ ...config, duration: updated })
    }
  }

  const handleSpecificTimeChange = (field: string, value: any) => {
    const updated = { ...specificTime, [field]: value }
    setSpecificTime(updated)
    if (waitType === 'specific_time') {
      onChange({ ...config, specificTime: updated })
    }
  }

  const handleBusinessHoursChange = (field: string, value: any) => {
    const updated = { ...businessHours, [field]: value }
    setBusinessHours(updated)
    onChange({ ...config, businessHours: updated })
  }

  const toggleDay = (day: string) => {
    const days = businessHours.days.includes(day)
      ? businessHours.days.filter((d: string) => d !== day)
      : [...businessHours.days, day]
    handleBusinessHoursChange('days', days)
  }

  const weekDays = [
    { value: 'monday', label: 'Mon' },
    { value: 'tuesday', label: 'Tue' },
    { value: 'wednesday', label: 'Wed' },
    { value: 'thursday', label: 'Thu' },
    { value: 'friday', label: 'Fri' },
    { value: 'saturday', label: 'Sat' },
    { value: 'sunday', label: 'Sun' }
  ]

  const getWaitDescription = () => {
    if (waitType === 'duration') {
      const unitLabel = duration.value === 1 ? duration.unit.slice(0, -1) : duration.unit
      return `Wait ${duration.value} ${unitLabel}`
    } else if (waitType === 'specific_time') {
      return `Wait until ${specificTime.time}`
    }
    return 'Configure wait time'
  }

  return (
    <div className="space-y-6">
      {/* Wait Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Wait Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleWaitTypeChange('duration')}
            className={`px-4 py-2 rounded-lg border flex items-center justify-center ${
              waitType === 'duration'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Clock className="w-4 h-4 mr-2" />
            Duration
          </button>
          <button
            type="button"
            onClick={() => handleWaitTypeChange('specific_time')}
            className={`px-4 py-2 rounded-lg border flex items-center justify-center ${
              waitType === 'specific_time'
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Specific Time
          </button>
        </div>
      </div>

      {/* Duration Configuration */}
      {waitType === 'duration' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Wait Duration
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              min="1"
              max="999"
              value={duration.value}
              onChange={(e) => handleDurationChange('value', parseInt(e.target.value) || 1)}
              className="w-24 px-3 py-2 border border-gray-300 rounded-md"
            />
            <select
              value={duration.unit}
              onChange={(e) => handleDurationChange('unit', e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
            </select>
          </div>
          <p className="mt-1 text-sm text-gray-500">{getWaitDescription()}</p>
        </div>
      )}

      {/* Specific Time Configuration */}
      {waitType === 'specific_time' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wait Until Time
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="time"
                value={specificTime.time}
                onChange={(e) => handleSpecificTimeChange('time', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md"
              />
              <select
                value={specificTime.timezone}
                onChange={(e) => handleSpecificTimeChange('timezone', e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="America/New_York">America/New York (EST)</option>
                <option value="America/Los_Angeles">America/Los Angeles (PST)</option>
              </select>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Will wait until the next occurrence of {specificTime.time}
            </p>
          </div>
        </div>
      )}

      {/* Business Hours Configuration */}
      <div>
        <label className="flex items-center space-x-2 mb-3">
          <input
            type="checkbox"
            checked={businessHours.enabled}
            onChange={(e) => handleBusinessHoursChange('enabled', e.target.checked)}
            className="rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm font-medium text-gray-700">
            Only send during business hours
          </span>
        </label>

        {businessHours.enabled && (
          <div className="ml-6 space-y-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Business Hours
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="time"
                  value={businessHours.start}
                  onChange={(e) => handleBusinessHoursChange('start', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
                <span className="text-gray-500">to</span>
                <input
                  type="time"
                  value={businessHours.end}
                  onChange={(e) => handleBusinessHoursChange('end', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">
                Business Days
              </label>
              <div className="flex flex-wrap gap-2">
                {weekDays.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleDay(day.value)}
                    className={`px-3 py-1 rounded-full text-sm ${
                      businessHours.days.includes(day.value)
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="p-3 bg-blue-50 rounded-lg">
        <div className="flex items-start">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 mr-2" />
          <div className="text-sm text-blue-800">
            <p className="font-medium">How this wait works:</p>
            <ul className="mt-1 space-y-1">
              {waitType === 'duration' && (
                <li>• Lead will wait {duration.value} {duration.unit} before continuing</li>
              )}
              {waitType === 'specific_time' && (
                <li>• Lead will wait until {specificTime.time} (next occurrence)</li>
              )}
              {businessHours.enabled && (
                <>
                  <li>• Actions will only execute between {businessHours.start} and {businessHours.end}</li>
                  <li>• Only on: {businessHours.days.join(', ')}</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}