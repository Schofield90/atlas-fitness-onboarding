'use client'

import { useState } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { X } from 'lucide-react'
import { getCurrentUserOrganization } from '@/app/lib/services/membership-service'

interface AddClassTypeModalProps {
  onClose: () => void
  onSuccess: () => void
}

export default function AddClassTypeModal({ onClose, onSuccess }: AddClassTypeModalProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    visibility: 'everyone',
    registrationSetting: 'default',
    defaultOccupancy: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      
      // Get organization ID
      const { organizationId, error: orgError } = await getCurrentUserOrganization()
      if (orgError || !organizationId) {
        throw new Error(orgError || 'Organization not found')
      }

      // Create the class type (program)
      const { error } = await supabase
        .from('programs')
        .insert({
          organization_id: organizationId,
          name: formData.name,
          description: formData.description || '',
          price_pennies: 0, // Price will be set when creating actual classes
          is_active: true
        })

      if (error) throw error

      onSuccess()
    } catch (error: any) {
      console.error('Error creating class type:', error)
      alert(error.message || 'Failed to create class type')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">New Class Type</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name:
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description:
            </label>
            <div className="border border-gray-300 rounded-md">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-300 bg-gray-50">
                <select className="text-sm border-0 bg-transparent focus:outline-none">
                  <option>Body</option>
                </select>
                <button type="button" className="p-1 hover:bg-gray-200 rounded font-bold">B</button>
                <button type="button" className="p-1 hover:bg-gray-200 rounded italic">I</button>
                <button type="button" className="p-1 hover:bg-gray-200 rounded">🔗</button>
                <button type="button" className="p-1 hover:bg-gray-200 rounded">↩</button>
                <button type="button" className="p-1 hover:bg-gray-200 rounded">↪</button>
              </div>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 min-h-[100px] text-gray-900 placeholder-gray-900 focus:outline-none"
                placeholder="Describe the Class Type. You can format the text in this box."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category:
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- None --</option>
              <option value="strength">Strength</option>
              <option value="cardio">Cardio</option>
              <option value="yoga">Yoga</option>
              <option value="pilates">Pilates</option>
              <option value="dance">Dance</option>
              <option value="martial-arts">Martial Arts</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Visibility:
            </label>
            <div className="space-y-2">
              <label className="flex items-center text-gray-900">
                <input
                  type="radio"
                  name="visibility"
                  value="everyone"
                  checked={formData.visibility === 'everyone'}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                  className="mr-2"
                />
                <span>Everyone</span>
              </label>
              <label className="flex items-center text-gray-900">
                <input
                  type="radio"
                  name="visibility"
                  value="members"
                  checked={formData.visibility === 'members'}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                  className="mr-2"
                />
                <span>Membership Holders</span>
              </label>
              <label className="flex items-center text-gray-900">
                <input
                  type="radio"
                  name="visibility"
                  value="business"
                  checked={formData.visibility === 'business'}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value })}
                  className="mr-2"
                />
                <span>Business Only</span>
              </label>
            </div>
            <p className="text-sm text-gray-900 mt-2">
              Which customers are able to view this class. "Membership holders" are customers who hold a membership valid for classes of this type. 
              "Business Only" class types are only viewable by you and your staff.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Registration settings:
            </label>
            <div className="space-y-2">
              <label className="flex items-start text-gray-900">
                <input
                  type="radio"
                  name="registrationSetting"
                  value="default"
                  checked={formData.registrationSetting === 'default'}
                  onChange={(e) => setFormData({ ...formData, registrationSetting: e.target.value })}
                  className="mr-2 mt-1"
                />
                <div>
                  <span className="font-medium">Default Timeline - Calendar opens to everyone 180 days before event.</span>
                  <span className="text-gray-900"> Registrations between 365 days before event starts and when event starts. Cancels up to 1 minute before event starts.</span>
                </div>
              </label>
              <label className="flex items-start text-gray-900">
                <input
                  type="radio"
                  name="registrationSetting"
                  value="custom"
                  checked={formData.registrationSetting === 'custom'}
                  onChange={(e) => setFormData({ ...formData, registrationSetting: e.target.value })}
                  className="mr-2 mt-1"
                />
                <div>
                  <span>- Registrations between 365 days before event starts and when event starts.</span>
                  <span className="text-gray-900"> Cancels up to 1 minute before event starts.</span>
                </div>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Default occupancy:
            </label>
            <input
              type="number"
              value={formData.defaultOccupancy}
              onChange={(e) => setFormData({ ...formData, defaultOccupancy: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder=""
            />
            <p className="text-sm text-gray-900 mt-1">
              The default size limit when creating new time slots or one-off events. Leave empty if no default occupancy is needed.
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
              {loading ? 'Creating...' : 'Create Class Type'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}