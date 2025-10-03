'use client'

import { useState } from 'react'
import { Palette, Upload, X } from 'lucide-react'

interface BrandingFormProps {
  settings: any
  onUpdate: (updates: any) => Promise<any>
}

export default function BrandingForm({ settings, onUpdate }: BrandingFormProps) {
  const [formData, setFormData] = useState({
    logo_url: settings?.logo_url || '',
    brand_color: settings?.brand_color || '#3b82f6',
    secondary_color: settings?.secondary_color || '#64748b',
    timezone: settings?.timezone || 'Europe/London',
    date_format: settings?.date_format || 'DD/MM/YYYY',
    currency: settings?.currency || 'GBP'
  })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    
    const result = await onUpdate(formData)
    
    if (result.success) {
      // Show success message
    }
    
    setSaving(false)
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // In production, upload to storage first
      // For now, create a temporary URL
      const url = URL.createObjectURL(file)
      setFormData({ ...formData, logo_url: url })
    }
  }

  const removeLogo = () => {
    setFormData({ ...formData, logo_url: '' })
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <Palette className="h-5 w-5 text-gray-400" />
        <h2 className="text-lg font-semibold text-white">Branding & Localization</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Business Logo
          </label>
          {formData.logo_url ? (
            <div className="relative">
              <img 
                src={formData.logo_url} 
                alt="Business logo" 
                className="h-20 w-auto rounded-lg bg-white p-2"
              />
              <button
                type="button"
                onClick={removeLogo}
                className="absolute -top-2 -right-2 p-1 bg-red-600 rounded-full hover:bg-red-700"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-700 hover:bg-gray-650">
              <Upload className="h-8 w-8 text-gray-400 mb-2" />
              <span className="text-sm text-gray-400">Click to upload logo</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleLogoUpload}
                className="hidden" 
              />
            </label>
          )}
        </div>

        {/* Brand Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Primary Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.brand_color}
                onChange={(e) => setFormData({ ...formData, brand_color: e.target.value })}
                className="h-10 w-10 rounded border border-gray-600 cursor-pointer"
              />
              <input
                type="text"
                value={formData.brand_color}
                onChange={(e) => setFormData({ ...formData, brand_color: e.target.value })}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Secondary Color
            </label>
            <div className="flex gap-2">
              <input
                type="color"
                value={formData.secondary_color}
                onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                className="h-10 w-10 rounded border border-gray-600 cursor-pointer"
              />
              <input
                type="text"
                value={formData.secondary_color}
                onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>

        {/* Localization */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Timezone
          </label>
          <select
            value={formData.timezone}
            onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="Europe/London">Europe/London</option>
            <option value="America/New_York">America/New York</option>
            <option value="America/Chicago">America/Chicago</option>
            <option value="America/Los_Angeles">America/Los Angeles</option>
            <option value="Australia/Sydney">Australia/Sydney</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Date Format
            </label>
            <select
              value={formData.date_format}
              onChange={(e) => setFormData({ ...formData, date_format: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="GBP">£ GBP</option>
              <option value="USD">$ USD</option>
              <option value="EUR">€ EUR</option>
              <option value="AUD">$ AUD</option>
              <option value="CAD">$ CAD</option>
            </select>
          </div>
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