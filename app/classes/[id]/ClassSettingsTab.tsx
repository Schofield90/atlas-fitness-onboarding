'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Save, AlertCircle, Plus, X } from 'lucide-react'

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
  
  const [categories, setCategories] = useState<string[]>([])
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    loadCategories()
  }, [])

  // Update form data when classType prop changes
  useEffect(() => {
    setFormData({
      name: classType.name || '',
      description: classType.description || '',
      category: classType.category || '',
      is_active: classType.is_active ?? true,
      price_pennies: classType.price_pennies || 0,
      duration_minutes: classType.duration_minutes || 60,
      max_participants: classType.max_participants || 20,
      color: classType.color || '#F97316'
    })
  }, [classType])

  const loadCategories = () => {
    // Load categories from localStorage (in production, this would be from database)
    const savedCategories = localStorage.getItem('class_categories')
    if (savedCategories) {
      setCategories(JSON.parse(savedCategories))
    } else {
      // Initialize with some default categories if none exist
      const defaultCategories = ['General Fitness', 'Personal Training', 'Group Classes']
      setCategories(defaultCategories)
      localStorage.setItem('class_categories', JSON.stringify(defaultCategories))
    }
  }

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory.trim())) {
      const updatedCategories = [...categories, newCategory.trim()].sort()
      setCategories(updatedCategories)
      localStorage.setItem('class_categories', JSON.stringify(updatedCategories))
      handleChange('category', newCategory.trim())
      setNewCategory('')
      setShowAddCategory(false)
    }
  }

  const handleRemoveCategory = (categoryToRemove: string) => {
    if (confirm(`Remove category "${categoryToRemove}"? This won't affect existing classes using this category.`)) {
      const updatedCategories = categories.filter(cat => cat !== categoryToRemove)
      setCategories(updatedCategories)
      localStorage.setItem('class_categories', JSON.stringify(updatedCategories))
      
      // If the current category was removed, clear it
      if (formData.category === categoryToRemove) {
        handleChange('category', '')
      }
    }
  }

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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
            {!showAddCategory ? (
              <div className="flex gap-2">
                <select
                  value={formData.category}
                  onChange={(e) => handleChange('category', e.target.value)}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Select a category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button
                  onClick={() => setShowAddCategory(true)}
                  className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors flex items-center gap-1"
                  title="Add new category"
                >
                  <Plus className="w-4 h-4" />
                  Add
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                  className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Enter new category name"
                  autoFocus
                />
                <button
                  onClick={handleAddCategory}
                  disabled={!newCategory.trim()}
                  className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setShowAddCategory(false)
                    setNewCategory('')
                  }}
                  className="px-3 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
            
            {/* Category Management */}
            {categories.length > 0 && !showAddCategory && (
              <div className="mt-2 flex flex-wrap gap-2">
                {categories.map(cat => (
                  <div key={cat} className="flex items-center gap-1 px-2 py-1 bg-gray-700 rounded text-xs text-gray-300">
                    <span>{cat}</span>
                    <button
                      onClick={() => handleRemoveCategory(cat)}
                      className="text-gray-500 hover:text-red-500 transition-colors"
                      title="Remove category"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
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

      {/* Save Button */}
      <div className="flex items-center justify-between">
        <div>
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="text-green-400 text-sm">
              Settings saved successfully!
            </div>
          )}
        </div>
        
        <button
          onClick={handleSave}
          disabled={loading || !formData.name}
          className="px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:text-gray-500 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}