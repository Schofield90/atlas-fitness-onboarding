'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { X } from 'lucide-react'

interface EditDatesModalProps {
  onClose: () => void
  onSuccess: () => void
  programId: string
  dayOfWeek: string
  timeSlot: string
  instructor: string
  location: string
  capacity: number
}

export default function EditDatesModal({ 
  onClose, 
  onSuccess,
  programId,
  dayOfWeek,
  timeSlot,
  instructor,
  location,
  capacity
}: EditDatesModalProps) {
  const [loading, setLoading] = useState(false)
  const [sessions, setSessions] = useState<any[]>([])
  const [formData, setFormData] = useState({
    startDate: '',
    endDate: '',
    action: 'future' // 'future' or 'all'
  })

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('class_sessions')
        .select('*')
        .eq('program_id', programId)
        .order('start_time', { ascending: true })

      if (error) throw error

      // Filter sessions matching this pattern
      const filtered = data?.filter(session => {
        const sessionDate = new Date(session.start_time)
        const sessionDayName = sessionDate.toLocaleDateString('en-GB', { weekday: 'long' })
        const sessionTime = sessionDate.toTimeString().slice(0, 5)
        
        return sessionDayName === dayOfWeek &&
               sessionTime === timeSlot &&
               session.instructor_name === instructor &&
               session.location === location &&
               session.capacity === capacity
      }) || []

      setSessions(filtered)

      // Set default dates
      if (filtered.length > 0) {
        const firstDate = new Date(filtered[0].start_time).toISOString().split('T')[0]
        const lastDate = new Date(filtered[filtered.length - 1].start_time).toISOString().split('T')[0]
        setFormData(prev => ({
          ...prev,
          startDate: firstDate,
          endDate: lastDate
        }))
      }
    } catch (error) {
      console.error('Error loading sessions:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      const startDate = new Date(formData.startDate)
      const endDate = new Date(formData.endDate)
      
      // Delete sessions outside the new date range
      const sessionsToDelete = sessions.filter(session => {
        const sessionDate = new Date(session.start_time)
        const isOutsideRange = sessionDate < startDate || sessionDate > endDate
        const isFuture = sessionDate >= new Date()
        
        if (formData.action === 'future') {
          return isOutsideRange && isFuture
        } else {
          return isOutsideRange
        }
      })

      if (sessionsToDelete.length > 0) {
        const { error } = await supabase
          .from('class_sessions')
          .delete()
          .in('id', sessionsToDelete.map(s => s.id))

        if (error) throw error
      }

      alert(`Successfully updated date range. ${sessionsToDelete.length} sessions removed.`)
      onSuccess()
    } catch (error: any) {
      console.error('Error updating dates:', error)
      alert(error.message || 'Failed to update dates')
    } finally {
      setLoading(false)
    }
  }

  const futureSessions = sessions.filter(s => new Date(s.start_time) >= new Date())
  const pastSessions = sessions.filter(s => new Date(s.start_time) < new Date())

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Edit Date Range</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-gray-600">
            {dayOfWeek}s at {timeSlot} with {instructor}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {futureSessions.length} upcoming sessions, {pastSessions.length} past sessions
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date:
            </label>
            <input
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
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
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              min={formData.startDate}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Apply changes to:
            </label>
            <div className="space-y-2">
              <label className="flex items-center text-gray-900">
                <input
                  type="radio"
                  name="action"
                  value="future"
                  checked={formData.action === 'future'}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                  className="mr-2"
                />
                <span>Future sessions only</span>
              </label>
              <label className="flex items-center text-gray-900">
                <input
                  type="radio"
                  name="action"
                  value="all"
                  checked={formData.action === 'all'}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                  className="mr-2"
                />
                <span>All sessions (including past)</span>
              </label>
            </div>
          </div>

          <div className="bg-yellow-50 p-3 rounded-md">
            <p className="text-sm text-yellow-800">
              <strong>Warning:</strong> Sessions outside the selected date range will be permanently deleted.
            </p>
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
              {loading ? 'Updating...' : 'Update Date Range'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}