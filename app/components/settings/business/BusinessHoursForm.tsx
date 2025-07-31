'use client'

import { useState } from 'react'
import { Clock } from 'lucide-react'

interface BusinessHoursFormProps {
  settings: any
  onUpdate: (updates: any) => Promise<any>
}

const defaultHours = {
  monday: { open: "06:00", close: "22:00", closed: false },
  tuesday: { open: "06:00", close: "22:00", closed: false },
  wednesday: { open: "06:00", close: "22:00", closed: false },
  thursday: { open: "06:00", close: "22:00", closed: false },
  friday: { open: "06:00", close: "22:00", closed: false },
  saturday: { open: "07:00", close: "20:00", closed: false },
  sunday: { open: "08:00", close: "18:00", closed: false }
}

export default function BusinessHoursForm({ settings, onUpdate }: BusinessHoursFormProps) {
  const [businessHours, setBusinessHours] = useState(settings?.business_hours || defaultHours)
  const [saving, setSaving] = useState(false)

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const dayLabels: Record<string, string> = {
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    const result = await onUpdate({ business_hours: businessHours })
    
    if (result.success) {
      // Show success message
    }
    
    setSaving(false)
  }

  const updateDayHours = (day: string, field: string, value: any) => {
    setBusinessHours({
      ...businessHours,
      [day]: {
        ...businessHours[day],
        [field]: value
      }
    })
  }

  const copyToAllWeekdays = () => {
    const mondayHours = businessHours.monday
    const updatedHours = { ...businessHours }
    
    days.slice(0, 5).forEach(day => {
      updatedHours[day] = { ...mondayHours }
    })
    
    setBusinessHours(updatedHours)
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 lg:col-span-2">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-white">Business Hours</h2>
        </div>
        <button
          type="button"
          onClick={copyToAllWeekdays}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          Copy Monday to weekdays
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {days.map((day) => (
          <div key={day} className="flex items-center gap-4">
            <div className="w-24 text-sm font-medium text-gray-400">
              {dayLabels[day]}
            </div>
            
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={!businessHours[day].closed}
                onChange={(e) => updateDayHours(day, 'closed', !e.target.checked)}
                className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-300">Open</span>
            </label>

            {!businessHours[day].closed && (
              <>
                <input
                  type="time"
                  value={businessHours[day].open}
                  onChange={(e) => updateDayHours(day, 'open', e.target.value)}
                  className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                
                <span className="text-gray-500">to</span>
                
                <input
                  type="time"
                  value={businessHours[day].close}
                  onChange={(e) => updateDayHours(day, 'close', e.target.value)}
                  className="px-3 py-1 bg-gray-700 border border-gray-600 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </>
            )}

            {businessHours[day].closed && (
              <span className="text-sm text-gray-500">Closed</span>
            )}
          </div>
        ))}

        <div className="pt-4">
          <button
            type="submit"
            disabled={saving}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving...' : 'Save Hours'}
          </button>
        </div>
      </form>
    </div>
  )
}