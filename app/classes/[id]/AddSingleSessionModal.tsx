'use client'

import { useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { X } from 'lucide-react'
import { getCurrentUserOrganization } from '@/app/lib/organization-client'
import InstructorSelect from '@/app/components/InstructorSelect'

interface AddSingleSessionModalProps {
  onClose: () => void
  onSuccess: () => void
  programId: string
}

export default function AddSingleSessionModal({ onClose, onSuccess, programId }: AddSingleSessionModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    time: '',
    duration: '60',
    instructor: '',
    capacity: '15',
    location: 'Harrogate'
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.time) {
      alert('Please select a time')
      return
    }

    setLoading(true)
    try {
      const supabase = createClient()
      const { organizationId, error: orgError } = await getCurrentUserOrganization()
      
      if (orgError || !organizationId) {
        throw new Error(orgError || 'Organization not found')
      }

      // Create the session datetime
      const sessionDate = new Date(formData.date)
      const [hours, minutes] = formData.time.split(':').map(Number)
      sessionDate.setHours(hours, minutes, 0, 0)

      // Calculate end time
      const endTime = new Date(sessionDate)
      endTime.setMinutes(endTime.getMinutes() + parseInt(formData.duration))

      // Insert the single session
      const { error } = await supabase
        .from('class_sessions')
        .insert({
          organization_id: organizationId,
          program_id: programId,
          start_time: sessionDate.toISOString(),
          end_time: endTime.toISOString(),
          duration_minutes: parseInt(formData.duration),
          capacity: parseInt(formData.capacity),
          location: formData.location,
          instructor_name: formData.instructor
        })

      if (error) throw error

      onSuccess()
    } catch (error: any) {
      console.error('Error creating session:', error)
      alert(error.message || 'Failed to create session')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-white">Add Single Session</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Date:
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Time:
            </label>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData({ ...formData, time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Duration (minutes):
            </label>
            <input
              type="number"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Instructor:
            </label>
            <InstructorSelect
              value={formData.instructor}
              onChange={(value) => setFormData({ ...formData, instructor: value })}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Capacity:
            </label>
            <input
              type="number"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Location:
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Location"
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Session'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}