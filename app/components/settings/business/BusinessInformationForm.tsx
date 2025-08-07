'use client'

import { useState } from 'react'
import { Building2, Globe } from 'lucide-react'

interface BusinessInformationFormProps {
  settings: any
  onUpdate: (updates: any) => Promise<any>
}

export default function BusinessInformationForm({ settings, onUpdate }: BusinessInformationFormProps) {
  const [formData, setFormData] = useState({
    business_name: settings?.business_name || '',
    business_type: settings?.business_type || 'gym',
    description: settings?.description || '',
    website_url: settings?.website_url || ''
  })
  const [saving, setSaving] = useState(false)

  const [errors, setErrors] = useState<any>({})

  const validateUrl = (url: string) => {
    if (!url) return true // Optional field
    
    // If no protocol, add https://
    if (url && !url.match(/^https?:\/\//)) {
      return `https://${url}`
    }
    return url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setSaving(true)
    
    try {
      // Validate and fix URL
      const processedData = {
        ...formData,
        website_url: validateUrl(formData.website_url)
      }
      
      const result = await onUpdate(processedData)
      
      if (result.success) {
        setFormData(processedData) // Update local state with processed data
        // Show success message
        alert('Business information saved successfully!')
      } else {
        setErrors({ general: 'Failed to save. Please try again.' })
      }
    } catch (error) {
      console.error('Form submission error:', error)
      setErrors({ general: 'An error occurred. Please try again.' })
    }
    
    setSaving(false)
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <Building2 className="h-5 w-5 text-gray-400" />
        <h2 className="text-lg font-semibold text-white">Business Information</h2>
      </div>

      {errors.general && (
        <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-3 mb-4">
          <p className="text-red-400 text-sm">{errors.general}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Business Name *
          </label>
          <input
            type="text"
            value={formData.business_name}
            onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Atlas Fitness"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Business Type *
          </label>
          <select
            value={formData.business_type}
            onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="gym">Gym</option>
            <option value="personal_training">Personal Training</option>
            <option value="yoga_studio">Yoga Studio</option>
            <option value="crossfit">CrossFit Box</option>
            <option value="martial_arts">Martial Arts</option>
            <option value="dance_studio">Dance Studio</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Tell us about your business..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Website URL
          </label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              value={formData.website_url}
              onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
              className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="www.atlas-gyms.co.uk"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Enter your website URL (https:// will be added automatically if needed)
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  )
}