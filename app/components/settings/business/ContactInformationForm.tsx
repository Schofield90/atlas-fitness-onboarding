'use client'

import { useState } from 'react'
import { Mail, Phone, MapPin } from 'lucide-react'

interface ContactInformationFormProps {
  settings: any
  onUpdate: (updates: any) => Promise<any>
}

export default function ContactInformationForm({ settings, onUpdate }: ContactInformationFormProps) {
  const [formData, setFormData] = useState({
    primary_email: settings?.primary_email || '',
    primary_phone: settings?.primary_phone || '',
    address: settings?.address || {
      street: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'GB'
    }
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

  const updateAddress = (field: string, value: string) => {
    setFormData({
      ...formData,
      address: {
        ...formData.address,
        [field]: value
      }
    })
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-6">
        <MapPin className="h-5 w-5 text-gray-400" />
        <h2 className="text-lg font-semibold text-white">Contact Information</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Primary Email
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="email"
              value={formData.primary_email}
              onChange={(e) => setFormData({ ...formData, primary_email: e.target.value })}
              className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="info@atlasfitness.com"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">
            Primary Phone
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="tel"
              value={formData.primary_phone}
              onChange={(e) => setFormData({ ...formData, primary_phone: e.target.value })}
              className="w-full pl-10 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="+44 20 1234 5678"
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-400">
            Business Address
          </label>
          
          <input
            type="text"
            value={formData.address.street}
            onChange={(e) => updateAddress('street', e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Street Address"
          />

          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={formData.address.city}
              onChange={(e) => updateAddress('city', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="City"
            />
            <input
              type="text"
              value={formData.address.postal_code}
              onChange={(e) => updateAddress('postal_code', e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Postal Code"
            />
          </div>
          
          <select
            value={formData.address.country}
            onChange={(e) => updateAddress('country', e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="GB">United Kingdom</option>
            <option value="US">United States</option>
            <option value="CA">Canada</option>
            <option value="AU">Australia</option>
          </select>
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