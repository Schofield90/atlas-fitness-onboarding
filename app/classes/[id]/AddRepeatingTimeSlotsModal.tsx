'use client'

import { useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { X, Plus, Trash2 } from 'lucide-react'
import { getCurrentUserOrganization } from '@/app/lib/services/membership-service'
import InstructorSelect from '@/app/components/InstructorSelect'

interface AddRepeatingTimeSlotsModalProps {
  onClose: () => void
  onSuccess: () => void
  programId: string
}

interface TimeSlot {
  id: string
  time: string
  instructor: string
  capacity: string
  location: string
}

const DAYS_OF_WEEK = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 0, label: 'Sunday' }
]

export default function AddRepeatingTimeSlotsModal({ onClose, onSuccess, programId }: AddRepeatingTimeSlotsModalProps) {
  const [loading, setLoading] = useState(false)
  const [selectedDays, setSelectedDays] = useState<number[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([
    { id: '1', time: '', instructor: '', capacity: '15', location: 'Harrogate' }
  ])
  const [duration, setDuration] = useState('60')
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState('')
  const [isIndefinite, setIsIndefinite] = useState(false)

  const addTimeSlot = () => {
    setTimeSlots([
      ...timeSlots,
      { 
        id: Date.now().toString(), 
        time: '', 
        instructor: '', 
        capacity: '15', 
        location: 'Harrogate' 
      }
    ])
  }

  const removeTimeSlot = (id: string) => {
    setTimeSlots(timeSlots.filter(slot => slot.id !== id))
  }

  const updateTimeSlot = (id: string, field: keyof TimeSlot, value: string) => {
    setTimeSlots(timeSlots.map(slot => 
      slot.id === id ? { ...slot, [field]: value } : slot
    ))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedDays.length === 0 || timeSlots.every(slot => !slot.time)) {
      alert('Please select at least one day and add at least one time slot')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { organizationId, error: orgError } = await getCurrentUserOrganization()
      
      if (orgError || !organizationId) {
        throw new Error(orgError || 'Organization not found')
      }

      const sessionsToCreate = []
      const start = new Date(startDate)
      const end = isIndefinite ? new Date(start.getTime() + (365 * 24 * 60 * 60 * 1000)) : new Date(endDate) // 1 year if indefinite
      
      // Ensure end date is valid
      if (!isIndefinite && (!endDate || end < start)) {
        alert('Please select a valid end date')
        setLoading(false)
        return
      }

      // Generate sessions for each day in the date range
      const currentDate = new Date(start)
      while (currentDate <= end) {
        const dayOfWeek = currentDate.getDay()
        
        // Check if this day is selected
        if (selectedDays.includes(dayOfWeek)) {
          // For each time slot on this day
          for (const slot of timeSlots) {
            if (!slot.time || !slot.instructor) continue

            // Create session for this date and time
            const sessionDate = new Date(currentDate)
            const [hours, minutes] = slot.time.split(':').map(Number)
            sessionDate.setHours(hours, minutes, 0, 0)

            // Only add if the session time hasn't passed
            if (sessionDate >= new Date()) {
              // Calculate end time
              const endTime = new Date(sessionDate)
              endTime.setMinutes(endTime.getMinutes() + parseInt(duration))
              
              sessionsToCreate.push({
                organization_id: organizationId,
                program_id: programId,
                start_time: sessionDate.toISOString(),
                end_time: endTime.toISOString(),
                duration_minutes: parseInt(duration),
                capacity: parseInt(slot.capacity),
                location: slot.location,
                instructor_name: slot.instructor
              })
            }
          }
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1)
      }

      // Insert all sessions
      if (sessionsToCreate.length === 0) {
        alert('No sessions to create. All selected time slots are in the past.')
        setLoading(false)
        return
      }

      const { error } = await supabase
        .from('class_sessions')
        .insert(sessionsToCreate)

      if (error) throw error

      alert(`Successfully created ${sessionsToCreate.length} sessions`)
      onSuccess()
    } catch (error: any) {
      console.error('Error creating time slots:', error)
      alert(error.message || 'Failed to create time slots')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Add Repeating Time Slots</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Days Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select Days:
            </label>
            <div className="grid grid-cols-7 gap-2">
              {DAYS_OF_WEEK.map(day => (
                <label key={day.value} className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={selectedDays.includes(day.value)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDays([...selectedDays, day.value])
                      } else {
                        setSelectedDays(selectedDays.filter(d => d !== day.value))
                      }
                    }}
                  />
                  <div className={`
                    px-3 py-2 rounded-lg border-2 cursor-pointer text-center transition-colors
                    ${selectedDays.includes(day.value) 
                      ? 'border-blue-600 bg-blue-50 text-blue-600' 
                      : 'border-gray-300 hover:border-gray-400 text-gray-900'
                    }
                  `}>
                    {day.label}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Duration and Date Range */}
          <div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Class Duration (minutes):
                </label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date:
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date:
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={isIndefinite}
                  required={!isIndefinite}
                />
              </div>
            </div>
            <label className="flex items-center text-gray-900">
              <input
                type="checkbox"
                checked={isIndefinite}
                onChange={(e) => setIsIndefinite(e.target.checked)}
                className="mr-2"
              />
              Generate indefinitely
            </label>
          </div>

          {/* Time Slots */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <label className="block text-sm font-medium text-gray-700">
                Time Slots:
              </label>
              <button
                type="button"
                onClick={addTimeSlot}
                className="text-blue-600 hover:text-blue-700 flex items-center gap-1 text-sm"
              >
                <Plus className="h-4 w-4" />
                Add Time Slot
              </button>
            </div>
            
            <div className="space-y-3">
              {timeSlots.map((slot, index) => (
                <div key={slot.id} className="grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-2">
                    <input
                      type="time"
                      value={slot.time}
                      onChange={(e) => updateTimeSlot(slot.id, 'time', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="col-span-4">
                    <InstructorSelect
                      value={slot.instructor}
                      onChange={(value) => updateTimeSlot(slot.id, 'instructor', value)}
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <input
                      type="number"
                      value={slot.capacity}
                      onChange={(e) => updateTimeSlot(slot.id, 'capacity', e.target.value)}
                      placeholder="Capacity"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <input
                      type="text"
                      value={slot.location}
                      onChange={(e) => updateTimeSlot(slot.id, 'location', e.target.value)}
                      placeholder="Location"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="col-span-1">
                    {timeSlots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTimeSlot(slot.id)}
                        className="text-red-600 hover:text-red-700 p-2"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Time Slots'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}