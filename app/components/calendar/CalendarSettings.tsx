'use client'

import { useState } from 'react'
import { Calendar, Clock, Link as LinkIcon, Settings } from 'lucide-react'
import Link from 'next/link'

export function CalendarSettings() {
  const [workingHours, setWorkingHours] = useState({
    monday: { enabled: true, start: '09:00', end: '17:00' },
    tuesday: { enabled: true, start: '09:00', end: '17:00' },
    wednesday: { enabled: true, start: '09:00', end: '17:00' },
    thursday: { enabled: true, start: '09:00', end: '17:00' },
    friday: { enabled: true, start: '09:00', end: '17:00' },
    saturday: { enabled: false, start: '09:00', end: '13:00' },
    sunday: { enabled: false, start: '09:00', end: '13:00' },
  })
  const [slotDuration, setSlotDuration] = useState(30)
  const [bufferTime, setBufferTime] = useState(0)

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  return (
    <div className="space-y-6">
      {/* Working Hours */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Working Hours
        </h3>
        
        <div className="space-y-4">
          {days.map((day) => (
            <div key={day} className="flex items-center gap-4">
              <label className="flex items-center gap-2 w-32">
                <input
                  type="checkbox"
                  checked={workingHours[day].enabled}
                  onChange={(e) => setWorkingHours({
                    ...workingHours,
                    [day]: { ...workingHours[day], enabled: e.target.checked }
                  })}
                  className="w-4 h-4 text-orange-500 rounded"
                />
                <span className="text-white capitalize">{day}</span>
              </label>
              
              {workingHours[day].enabled && (
                <>
                  <input
                    type="time"
                    value={workingHours[day].start}
                    onChange={(e) => setWorkingHours({
                      ...workingHours,
                      [day]: { ...workingHours[day], start: e.target.value }
                    })}
                    className="px-3 py-2 bg-gray-700 rounded-lg text-white"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="time"
                    value={workingHours[day].end}
                    onChange={(e) => setWorkingHours({
                      ...workingHours,
                      [day]: { ...workingHours[day], end: e.target.value }
                    })}
                    className="px-3 py-2 bg-gray-700 rounded-lg text-white"
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Booking Settings */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Booking Settings
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Time Slot Duration
            </label>
            <select
              value={slotDuration}
              onChange={(e) => setSlotDuration(Number(e.target.value))}
              className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={45}>45 minutes</option>
              <option value={60}>1 hour</option>
              <option value={90}>1.5 hours</option>
              <option value={120}>2 hours</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Buffer Time Between Appointments
            </label>
            <select
              value={bufferTime}
              onChange={(e) => setBufferTime(Number(e.target.value))}
              className="w-full px-4 py-2 bg-gray-700 rounded-lg text-white"
            >
              <option value={0}>No buffer</option>
              <option value={5}>5 minutes</option>
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
            </select>
          </div>
        </div>
      </div>

      {/* Google Calendar Integration */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-bold mb-4 text-white flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Google Calendar Integration
        </h3>
        
        <p className="text-gray-400 mb-4">
          Sync your bookings with Google Calendar to keep everything in one place.
        </p>
        
        <Link
          href="/calendar-sync"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <LinkIcon className="h-4 w-4" />
          Manage Google Calendar Sync
        </Link>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={() => alert('Settings saved! (Feature coming soon)')}
          className="px-6 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
        >
          Save Settings
        </button>
      </div>
    </div>
  )
}