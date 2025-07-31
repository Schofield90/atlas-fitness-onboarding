'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { MapPin, Plus, Edit2, Trash2, Users, Clock, Settings } from 'lucide-react'

interface Location {
  id: string
  name: string
  slug: string
  address?: string
  city?: string
  postcode?: string
  phone?: string
  email?: string
  is_active: boolean
  is_primary: boolean
  staff_count?: number
  customer_count?: number
}

interface LocationFormData {
  name: string
  address: string
  city: string
  postcode: string
  phone: string
  email: string
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingLocation, setEditingLocation] = useState<Location | null>(null)
  const [formData, setFormData] = useState<LocationFormData>({
    name: '',
    address: '',
    city: '',
    postcode: '',
    phone: '',
    email: ''
  })
  
  const supabase = createClient()

  useEffect(() => {
    loadLocations()
  }, [])

  const loadLocations = async () => {
    try {
      // Get user's organization
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: staffData } = await supabase
        .from('organization_staff')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!staffData) return

      // Load locations with counts
      const { data: locationsData, error } = await supabase
        .from('locations')
        .select(`
          *,
          location_staff!location_staff_location_id_fkey(count),
          customers!customers_location_id_fkey(count)
        `)
        .eq('organization_id', staffData.organization_id)
        .order('is_primary', { ascending: false })
        .order('created_at', { ascending: true })

      if (error) throw error

      const formattedLocations = locationsData?.map(loc => ({
        ...loc,
        staff_count: loc.location_staff?.[0]?.count || 0,
        customer_count: loc.customers?.[0]?.count || 0
      })) || []

      setLocations(formattedLocations)
    } catch (error) {
      console.error('Error loading locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: staffData } = await supabase
        .from('organization_staff')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!staffData) return

      const slug = formData.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

      if (editingLocation) {
        // Update existing location
        const { error } = await supabase
          .from('locations')
          .update({
            name: formData.name,
            address: formData.address,
            city: formData.city,
            postcode: formData.postcode,
            phone: formData.phone,
            email: formData.email,
            slug: slug
          })
          .eq('id', editingLocation.id)

        if (error) throw error
      } else {
        // Create new location
        const { error } = await supabase
          .from('locations')
          .insert({
            organization_id: staffData.organization_id,
            name: formData.name,
            slug: slug,
            address: formData.address,
            city: formData.city,
            postcode: formData.postcode,
            phone: formData.phone,
            email: formData.email,
            is_primary: locations.length === 0 // First location is primary
          })

        if (error) throw error
      }

      // Reset form and reload
      setFormData({ name: '', address: '', city: '', postcode: '', phone: '', email: '' })
      setShowAddModal(false)
      setEditingLocation(null)
      loadLocations()
    } catch (error) {
      console.error('Error saving location:', error)
      alert('Failed to save location')
    }
  }

  const handleEdit = (location: Location) => {
    setEditingLocation(location)
    setFormData({
      name: location.name,
      address: location.address || '',
      city: location.city || '',
      postcode: location.postcode || '',
      phone: location.phone || '',
      email: location.email || ''
    })
    setShowAddModal(true)
  }

  const handleDelete = async (locationId: string) => {
    if (!confirm('Are you sure you want to delete this location? This cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', locationId)

      if (error) throw error
      loadLocations()
    } catch (error) {
      console.error('Error deleting location:', error)
      alert('Failed to delete location. It may have associated data.')
    }
  }

  const toggleLocationStatus = async (locationId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('locations')
        .update({ is_active: !currentStatus })
        .eq('id', locationId)

      if (error) throw error
      loadLocations()
    } catch (error) {
      console.error('Error updating location status:', error)
    }
  }

  const makePrimary = async (locationId: string) => {
    try {
      // First, unset all primary flags
      await supabase
        .from('locations')
        .update({ is_primary: false })
        .eq('organization_id', locations[0]?.id) // Using first location's org_id

      // Then set the new primary
      const { error } = await supabase
        .from('locations')
        .update({ is_primary: true })
        .eq('id', locationId)

      if (error) throw error
      loadLocations()
    } catch (error) {
      console.error('Error setting primary location:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 p-8 flex items-center justify-center">
        <div className="text-white">Loading locations...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Gym Locations</h1>
            <p className="text-gray-400">Manage multiple gym locations and control staff access</p>
          </div>
          <button
            onClick={() => {
              setEditingLocation(null)
              setFormData({ name: '', address: '', city: '', postcode: '', phone: '', email: '' })
              setShowAddModal(true)
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="h-5 w-5" />
            Add Location
          </button>
        </div>

        {/* Locations Grid */}
        <div className="grid gap-6">
          {locations.length === 0 ? (
            <div className="bg-gray-800 rounded-lg p-12 text-center">
              <MapPin className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No locations yet</h3>
              <p className="text-gray-400 mb-6">Add your first gym location to get started</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
              >
                Add First Location
              </button>
            </div>
          ) : (
            locations.map((location) => (
              <div key={location.id} className="bg-gray-800 rounded-lg p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-white">{location.name}</h3>
                      {location.is_primary && (
                        <span className="px-2 py-1 bg-blue-900 text-blue-300 text-xs rounded">
                          Primary
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs rounded ${
                        location.is_active 
                          ? 'bg-green-900 text-green-300' 
                          : 'bg-red-900 text-red-300'
                      }`}>
                        {location.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-400 mb-4">
                      {location.address && (
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 mt-0.5" />
                          <div>
                            <p>{location.address}</p>
                            {location.city && location.postcode && (
                              <p>{location.city}, {location.postcode}</p>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-2">
                        {location.phone && (
                          <p className="flex items-center gap-2">
                            <span className="text-gray-500">Phone:</span> {location.phone}
                          </p>
                        )}
                        {location.email && (
                          <p className="flex items-center gap-2">
                            <span className="text-gray-500">Email:</span> {location.email}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="text-white">{location.staff_count || 0}</span>
                        <span className="text-gray-400">staff members</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-500" />
                        <span className="text-white">{location.customer_count || 0}</span>
                        <span className="text-gray-400">customers</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    {!location.is_primary && (
                      <button
                        onClick={() => makePrimary(location.id)}
                        className="p-2 text-gray-400 hover:text-blue-500 transition-colors"
                        title="Make primary"
                      >
                        <Settings className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={() => toggleLocationStatus(location.id, location.is_active)}
                      className="p-2 text-gray-400 hover:text-yellow-500 transition-colors"
                      title={location.is_active ? 'Deactivate' : 'Activate'}
                    >
                      <Clock className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleEdit(location)}
                      className="p-2 text-gray-400 hover:text-white transition-colors"
                    >
                      <Edit2 className="h-5 w-5" />
                    </button>
                    {!location.is_primary && (
                      <button
                        onClick={() => handleDelete(location.id)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add/Edit Location Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h2 className="text-xl font-semibold text-white mb-4">
                {editingLocation ? 'Edit Location' : 'Add New Location'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Location Name*
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    placeholder="e.g., Downtown Branch"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Address
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    placeholder="123 High Street"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                      placeholder="London"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Postcode
                    </label>
                    <input
                      type="text"
                      value={formData.postcode}
                      onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                      placeholder="SW1A 1AA"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    placeholder="020 1234 5678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    placeholder="downtown@yourgym.com"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
                  >
                    {editingLocation ? 'Save Changes' : 'Add Location'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false)
                      setEditingLocation(null)
                    }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}