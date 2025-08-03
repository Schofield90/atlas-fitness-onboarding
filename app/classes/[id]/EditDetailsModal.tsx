'use client'

import { useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { X } from 'lucide-react'
import InstructorSelect from '@/app/components/InstructorSelect'

interface EditDetailsModalProps {
  onClose: () => void
  onSuccess: () => void
  programId: string
  dayOfWeek: string
  currentTime: string
  currentInstructor: string
  currentLocation: string
  currentCapacity: number
  currentDuration: number
}

export default function EditDetailsModal({ 
  onClose, 
  onSuccess,
  programId,
  dayOfWeek,
  currentTime,
  currentInstructor,
  currentLocation,
  currentCapacity,
  currentDuration
}: EditDetailsModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    time: currentTime,
    instructor: currentInstructor,
    location: currentLocation,
    capacity: currentCapacity.toString(),
    duration: currentDuration.toString()
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      
      // Get all sessions matching the current pattern
      const { data: sessions, error: fetchError } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('program_id', programId)

      if (fetchError) throw fetchError

      // Filter sessions matching the current pattern
      const matchingSessions = sessions?.filter(session => {
        const sessionDate = new Date(session.start_time)
        const sessionDayName = sessionDate.toLocaleDateString('en-GB', { weekday: 'long' })
        const sessionTime = sessionDate.toTimeString().slice(0, 5)
        
        return sessionDayName === dayOfWeek &&
               sessionTime === currentTime &&
               session.instructor_name === currentInstructor &&
               session.location === currentLocation &&
               session.capacity === currentCapacity
      }) || []

      // Update all matching sessions
      for (const session of matchingSessions) {
        const sessionDate = new Date(session.start_time)
        const [hours, minutes] = formData.time.split(':').map(Number)
        sessionDate.setHours(hours, minutes, 0, 0)
        
        const endTime = new Date(sessionDate)
        endTime.setMinutes(endTime.getMinutes() + parseInt(formData.duration))

        const { error } = await supabase
          .from('class_sessions')
          .update({
            start_time: sessionDate.toISOString(),
            end_time: endTime.toISOString(),
            duration_minutes: parseInt(formData.duration),
            instructor_name: formData.instructor,
            location: formData.location,
            capacity: parseInt(formData.capacity)
          })
          .eq('id', session.id)

        if (error) throw error
      }

      alert(`Successfully updated ${matchingSessions.length} sessions`)
      onSuccess()
    } catch (error: any) {
      console.error('Error updating sessions:', error)
      alert(error.message || 'Failed to update sessions')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Edit Time Slot Details</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <p className="text-gray-600 mb-4">
          Editing all {dayOfWeek} sessions at {currentTime}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Time:
            </label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Duration (minutes):
            </label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Instructor:
            </label>
            <InstructorSelect
              value={formData.instructor}
              onChange={(value) => setFormData({ ...formData, instructor: value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capacity:
            </label>
            <input
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location:
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Location"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
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
              {loading ? 'Updating...' : 'Update All Sessions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}