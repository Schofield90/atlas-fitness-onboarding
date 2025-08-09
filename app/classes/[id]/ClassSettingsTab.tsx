'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Save, AlertCircle } from 'lucide-react'

interface ClassSettingsTabProps {
  programId: string
  classType: {
    id: string
    name: string
    description?: string
    category?: string
    is_active: boolean
    price_pennies?: number
    duration_minutes?: number
    max_participants?: number
    color?: string
  }
  onUpdate: () => void
}

const CLASS_CATEGORIES = [
  'Strength Training',
  'Cardio',
  'HIIT',
  'Yoga',
  'Pilates',
  'Dance',
  'Martial Arts',
  'Cycling',
  'Swimming',
  'Flexibility',
  'Mind & Body',
  'Bootcamp',
  'CrossFit',
  'Functional Training',
  'Sports Specific',
  'Recovery',
  'Kids Classes',
  'Senior Classes',
  'Beginner Friendly',
  'Advanced',
  'Other'
]

const CLASS_COLORS = [
  { name: 'Orange', value: '#F97316' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Gray', value: '#6B7280' }
]

export default function ClassSettingsTab({ programId, classType, onUpdate }: ClassSettingsTabProps) {
  const [formData, setFormData] = useState({
    name: classType.name || '',
    description: classType.description || '',
    category: classType.category || '',
    is_active: classType.is_active ?? true,
    price_pennies: classType.price_pennies || 0,
    duration_minutes: classType.duration_minutes || 60,
    max_participants: classType.max_participants || 20,
    color: classType.color || '#F97316'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    setError(null)
    setSuccess(false)
  }

  const handleSave = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)

      const { error: updateError } = await supabase
        .from('programs')
        .update({
          name: formData.name,
          description: formData.description,
          category: formData.category,
          is_active: formData.is_active,
          price_pennies: formData.price_pennies,
          duration_minutes: formData.duration_minutes,
          max_participants: formData.max_participants,
          color: formData.color
        })
        .eq('id', programId)

      if (updateError) throw updateError

      setSuccess(true)
      onUpdate() // Refresh parent data
      
      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('Error updating class settings:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Basic Information */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Basic Information</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Class Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="e.g. Group PT"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              placeholder="Brief description of the class..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Category
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <option value="">Select a category</option>
              {CLASS_CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Calendar Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {CLASS_COLORS.map(color => (
                <button
                  key={color.value}
                  onClick={() => handleChange('color', color.value)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    formData.color === color.value 
                      ? 'border-white scale-110' 
                      : 'border-gray-600 hover:border-gray-500'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => handleChange('is_active', e.target.checked)}
              className="w-4 h-4 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500"
            />
            <label htmlFor="is_active" className="ml-2 text-sm text-gray-300">
              Class is active and bookable
            </label>
          </div>
        </div>
      </div>

      {/* Class Details */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Class Details</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Default Duration (minutes)
            </label>
            <input
              type="number"
              value={formData.duration_minutes}
              onChange={(e) => handleChange('duration_minutes', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              min="15"
              max="240"
              step="15"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Max Participants
            </label>
            <input
              type="number"
              value={formData.max_participants}
              onChange={(e) => handleChange('max_participants', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              min="1"
              max="100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Default Price (£)
            </label>
            <input
              type="number"
              value={(formData.price_pennies / 100).toFixed(2)}
              onChange={(e) => handleChange('price_pennies', Math.round(parseFloat(e.target.value) * 100) || 0)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              min="0"
              step="0.01"
              placeholder="0.00"
            />
          </div>
        </div>
      </div>

      {/* Booking Settings */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Booking Settings</h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300">Allow waitlist when full</p>
              <p className="text-sm text-gray-500">Members can join a waitlist when the class is full</p>
            </div>
            <button className="px-3 py-1 bg-gray-700 text-gray-400 rounded-lg text-sm">
              Coming soon
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300">Require payment to book</p>
              <p className="text-sm text-gray-500">Members must pay before booking</p>
            </div>
            <button className="px-3 py-1 bg-gray-700 text-gray-400 rounded-lg text-sm">
              Coming soon
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-300">Cancellation policy</p>
              <p className="text-sm text-gray-500">How long before class can members cancel</p>
            </div>
            <button className="px-3 py-1 bg-gray-700 text-gray-400 rounded-lg text-sm">
              Coming soon
            </button>
          </div>
        </div>
      </div>

      {/* Error/Success Messages */}
      {error && (
        <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-900/50 border border-green-600 rounded-lg p-4 flex items-center gap-3">
          <Save className="h-5 w-5 text-green-400" />
          <p className="text-green-300">Settings saved successfully!</p>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  )
}