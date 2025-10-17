'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MapPin, Check } from 'lucide-react'

interface Location {
  id: string
  name: string
  is_active: boolean
}

interface StaffLocationModalProps {
  staffId: string
  staffName: string
  onClose: () => void
  onSave: () => void
}

export default function StaffLocationModal({ staffId, staffName, onClose, onSave }: StaffLocationModalProps) {
  const [locations, setLocations] = useState<Location[]>([])
  const [accessType, setAccessType] = useState<'all' | 'specific'>('all')
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [staffId])

  const loadData = async () => {
    try {
      // Get staff's current access settings
      const { data: staffData } = await supabase
        .from('organization_staff')
        .select('location_access, organization_id')
        .eq('id', staffId)
        .single()

      if (!staffData) return

      // Load all organization locations
      const { data: locationsData } = await supabase
        .from('locations')
        .select('id, name, is_active')
        .eq('organization_id', staffData.organization_id)
        .eq('is_active', true)
        .order('name')

      setLocations(locationsData || [])

      // Set current access settings
      if (staffData.location_access) {
        const access = staffData.location_access as any
        setAccessType(access.all_locations ? 'all' : 'specific')
        if (access.specific_locations) {
          setSelectedLocations(access.specific_locations)
        }
      }
    } catch (error) {
      console.error('Error loading location data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const locationAccess = {
        all_locations: accessType === 'all',
        specific_locations: accessType === 'specific' ? selectedLocations : []
      }

      const { error } = await supabase
        .from('organization_staff')
        .update({ location_access: locationAccess })
        .eq('id', staffId)

      if (error) throw error

      onSave()
      onClose()
    } catch (error) {
      console.error('Error saving location access:', error)
      alert('Failed to save location access')
    } finally {
      setSaving(false)
    }
  }

  const toggleLocation = (locationId: string) => {
    setSelectedLocations(prev => 
      prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    )
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
          <p className="text-white">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[80vh] flex flex-col">
        <h3 className="text-xl font-bold text-white mb-2">Location Access</h3>
        <p className="text-gray-400 mb-6">Configure which locations {staffName} can access</p>

        {/* Access Type Selection */}
        <div className="space-y-3 mb-6">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="accessType"
              value="all"
              checked={accessType === 'all'}
              onChange={() => setAccessType('all')}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600"
            />
            <div>
              <p className="text-white font-medium">All Locations</p>
              <p className="text-sm text-gray-400">Staff can access all current and future locations</p>
            </div>
          </label>

          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="accessType"
              value="specific"
              checked={accessType === 'specific'}
              onChange={() => setAccessType('specific')}
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600"
            />
            <div>
              <p className="text-white font-medium">Specific Locations</p>
              <p className="text-sm text-gray-400">Choose which locations staff can access</p>
            </div>
          </label>
        </div>

        {/* Location List */}
        {accessType === 'specific' && (
          <div className="flex-1 overflow-y-auto mb-6">
            <p className="text-sm text-gray-400 mb-3">Select locations:</p>
            <div className="space-y-2">
              {locations.map((location) => (
                <label
                  key={location.id}
                  className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedLocations.includes(location.id)}
                    onChange={() => toggleLocation(location.id)}
                    className="w-4 h-4 text-blue-600 bg-gray-600 border-gray-500 rounded"
                  />
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <span className="text-white flex-1">{location.name}</span>
                  {selectedLocations.includes(location.id) && (
                    <Check className="h-4 w-4 text-green-500" />
                  )}
                </label>
              ))}
            </div>
            
            {accessType === 'specific' && selectedLocations.length === 0 && (
              <p className="text-yellow-400 text-sm mt-3">
                Warning: No locations selected. Staff won't be able to access any data.
              </p>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || (accessType === 'specific' && selectedLocations.length === 0)}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
          >
            {saving ? 'Saving...' : 'Save Access'}
          </button>
        </div>
      </div>
    </div>
  )
}