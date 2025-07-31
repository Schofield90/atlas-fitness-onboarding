'use client'

import { useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { X } from 'lucide-react'
import { getCurrentUserOrganization } from '@/app/lib/organization-service'

interface AddClassModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function AddClassModal({ onClose, onSuccess }: AddClassModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    instructor_name: '',
    start_date: '',
    start_time: '',
    duration_minutes: '60',
    capacity: '20',
    price: '',
    location: 'Main Studio',
    description: '',
    recurring: false,
    recurring_days: [] as number[]
  })
  
  const supabase = createClient()
  
  const daysOfWeek = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' }
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Get organization ID
      const { organizationId, error } = await getCurrentUserOrganization()
      
      if (error || !organizationId) {
        throw new Error(error || 'Organization not found')
      }

      // Create the class
      const startDateTime = new Date(`${formData.start_date}T${formData.start_time}`)
      
      if (formData.recurring && formData.recurring_days.length > 0) {
        // Create recurring classes
        for (const dayOfWeek of formData.recurring_days) {
          const { error } = await supabase
            .from('class_sessions')
            .insert({
              organization_id: organizationId,
              name: formData.name,
              instructor_name: formData.instructor_name,
              start_time: startDateTime.toISOString(),
              duration_minutes: parseInt(formData.duration_minutes),
              capacity: parseInt(formData.capacity),
              price: parseFloat(formData.price) * 100, // Convert to pence
              location: formData.location,
              description: formData.description,
              recurring: true,
              day_of_week: dayOfWeek
            })

          if (error) throw error
        }
      } else {
        // Create single class
        const { error } = await supabase
          .from('class_sessions')
          .insert({
            organization_id: organizationId,
            name: formData.name,
            instructor_name: formData.instructor_name,
            start_time: startDateTime.toISOString(),
            duration_minutes: parseInt(formData.duration_minutes),
            capacity: parseInt(formData.capacity),
            price: parseFloat(formData.price) * 100, // Convert to pence
            location: formData.location,
            description: formData.description,
            recurring: false
          })

        if (error) throw error
      }

      onSuccess()
      onClose()
    } catch (error: any) {
      console.error('Error creating class:', error)
      alert(error.message || 'Failed to create class')
    } finally {
      setLoading(false)
    }
  }

  const toggleRecurringDay = (day: number) => {
    setFormData(prev => ({
      ...prev,
      recurring_days: prev.recurring_days.includes(day)
        ? prev.recurring_days.filter(d => d !== day)
        : [...prev.recurring_days, day]
    }))
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-white">Add New Class</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Class Name*
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                placeholder="e.g., Morning HIIT"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Instructor*
              </label>
              <input
                type="text"
                required
                value={formData.instructor_name}
                onChange={(e) => setFormData({ ...formData, instructor_name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                placeholder="Instructor name"
              />
            </div>
          </div>

          {/* Schedule */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-white">Schedule</h3>
            
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="recurring"
                checked={formData.recurring}
                onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded"
              />
              <label htmlFor="recurring" className="text-sm text-gray-300">
                This is a recurring class
              </label>
            </div>

            {formData.recurring ? (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Repeat on days*
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {daysOfWeek.map((day) => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleRecurringDay(day.value)}
                      className={`px-3 py-2 rounded text-sm transition-colors ${
                        formData.recurring_days.includes(day.value)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      {day.label.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Date*
                </label>
                <input
                  type="date"
                  required={!formData.recurring}
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Start Time*
                </label>
                <input
                  type="time"
                  required
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Duration (minutes)*
                </label>
                <select
                  value={formData.duration_minutes}
                  onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                >
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                  <option value="90">90 minutes</option>
                  <option value="120">120 minutes</option>
                </select>
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Capacity*
              </label>
              <input
                type="number"
                required
                min="1"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Price (£)*
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                placeholder="10.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Location
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                placeholder="Main Studio"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
              placeholder="Describe what this class involves..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg transition-colors font-medium"
            >
              {loading ? 'Creating...' : 'Create Class'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}