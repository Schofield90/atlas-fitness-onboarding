'use client'

import { useState, useRef } from 'react'
import { Building2, Globe, Upload, X } from 'lucide-react'
import { createClient } from '@/app/lib/supabase/client'
import toast from '@/app/lib/toast'

interface BusinessInformationFormProps {
  settings: any
  onUpdate: (updates: any) => Promise<any>
}

export default function BusinessInformationForm({ settings, onUpdate }: BusinessInformationFormProps) {
  const [formData, setFormData] = useState({
    business_name: settings?.business_name || '',
    legal_name: settings?.legal_name || '',
    business_type: settings?.business_type || 'gym',
    description: settings?.description || '',
    website_url: settings?.website_url || '',
    logo_url: settings?.logo_url || '',
    registration_number: settings?.registration_number || '',
    vat_number: settings?.vat_number || ''
  })
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const [errors, setErrors] = useState<any>({})

  const validateUrl = (url: string) => {
    if (!url) return true // Optional field
    
    // If no protocol, add https://
    if (url && !url.match(/^https?:\/\//)) {
      return `https://${url}`
    }
    return url
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB')
      return
    }

    setUploadingLogo(true)

    try {
      // Get user and organization
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('User not authenticated')

      // Create unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${settings.organization_id}-logo-${Date.now()}.${fileExt}`
      const filePath = `logos/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('business-assets')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('business-assets')
        .getPublicUrl(filePath)

      // Update form data and save
      const newFormData = { ...formData, logo_url: publicUrl }
      setFormData(newFormData)
      
      // Save to database
      await onUpdate({ logo_url: publicUrl })
      toast.success('Logo uploaded successfully!')
      
    } catch (error) {
      console.error('Error uploading logo:', error)
      toast.error('Failed to upload logo. Please try again.')
    } finally {
      setUploadingLogo(false)
    }
  }

  const removeLogo = async () => {
    if (confirm('Are you sure you want to remove the logo?')) {
      setFormData({ ...formData, logo_url: '' })
      await onUpdate({ logo_url: null })
    }
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
        toast.success('Business information saved successfully!')
      } else {
        setErrors({ general: 'Failed to save. Please try again.' })
        toast.error('Failed to save. Please try again.')
      }
    } catch (error) {
      console.error('Form submission error:', error)
      setErrors({ general: 'An error occurred. Please try again.' })
      toast.error('An error occurred. Please try again.')
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
        {/* Logo Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Business Logo
          </label>
          <div className="flex items-center space-x-4">
            {formData.logo_url ? (
              <div className="relative">
                <img
                  src={formData.logo_url}
                  alt="Business Logo"
                  className="h-20 w-20 rounded-lg object-cover border border-gray-600"
                />
                <button
                  type="button"
                  onClick={removeLogo}
                  className="absolute -top-2 -right-2 p-1 bg-red-600 rounded-full hover:bg-red-700 transition-colors"
                >
                  <X className="h-3 w-3 text-white" />
                </button>
              </div>
            ) : (
              <div className="h-20 w-20 rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center">
                <Upload className="h-8 w-8 text-gray-500" />
              </div>
            )}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {uploadingLogo ? 'Uploading...' : 'Upload Logo'}
              </button>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG up to 5MB
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Business Name (Friendly) *
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
              Legal Business Name
            </label>
            <input
              type="text"
              value={formData.legal_name}
              onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Atlas Fitness Ltd."
            />
          </div>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              Company Registration Number
            </label>
            <input
              type="text"
              value={formData.registration_number}
              onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="12345678"
            />
            <p className="text-xs text-gray-500 mt-1">
              UK company registration number
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">
              VAT Number
            </label>
            <input
              type="text"
              value={formData.vat_number}
              onChange={(e) => setFormData({ ...formData, vat_number: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="GB 123 4567 89"
            />
            <p className="text-xs text-gray-500 mt-1">
              If VAT registered
            </p>
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