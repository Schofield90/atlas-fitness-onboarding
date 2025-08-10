'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Clock, DollarSign } from 'lucide-react'
import Button from '@/app/components/ui/Button'
import { createClient } from '@/app/lib/supabase/client'

interface AppointmentType {
  id: string
  name: string
  description?: string
  duration_minutes: number
  buffer_after_minutes: number
  price_pennies: number
  is_active: boolean
  created_at: string
}

export default function AppointmentTypesManager() {
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingType, setEditingType] = useState<AppointmentType | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    duration_minutes: 30,
    buffer_after_minutes: 0,
    price_pennies: 0,
    is_active: true
  })

  useEffect(() => {
    fetchAppointmentTypes()
  }, [])

  const fetchAppointmentTypes = async () => {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      // Get organization ID - try multiple methods
      let organizationId = null

      // Method 1: Check organization_members table
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('org_id')
        .eq('user_id', user.id)
        .single()

      if (orgMember) {
        organizationId = orgMember.org_id
      } else {
        // Method 2: Check users table for organization_id
        const { data: userData } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', user.id)
          .single()

        if (userData?.organization_id) {
          organizationId = userData.organization_id
        } else {
          // Method 3: Use the known Atlas Fitness organization ID as fallback
          organizationId = '63589490-8f55-4157-bd3a-e141594b748e'
          console.log('Using fallback organization ID:', organizationId)
        }
      }

      if (!organizationId) return

      const { data, error } = await supabase
        .from('appointment_types')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name')

      if (error) throw error
      setAppointmentTypes(data || [])
    } catch (error) {
      console.error('Error fetching appointment types:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        alert('You must be logged in to create appointment types')
        return
      }

      // Get organization ID - try multiple methods
      let organizationId = null

      // Method 1: Check organization_members table
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('org_id')
        .eq('user_id', user.id)
        .single()

      if (orgMember) {
        organizationId = orgMember.org_id
      } else {
        // Method 2: Check users table for organization_id
        const { data: userData } = await supabase
          .from('users')
          .select('organization_id')
          .eq('id', user.id)
          .single()

        if (userData?.organization_id) {
          organizationId = userData.organization_id
        } else {
          // Method 3: Use the known Atlas Fitness organization ID as fallback
          organizationId = '63589490-8f55-4157-bd3a-e141594b748e'
          console.log('Using fallback organization ID for creation:', organizationId)
        }
      }

      if (!organizationId) {
        alert('Unable to determine organization. Please contact support.')
        return
      }

      const { data, error } = await supabase
        .from('appointment_types')
        .insert({
          ...formData,
          organization_id: organizationId
        })
        .select()
        .single()

      if (error) throw error

      setAppointmentTypes([...appointmentTypes, data])
      setShowCreateModal(false)
      resetForm()
      alert('Appointment type created successfully!')
    } catch (error) {
      console.error('Error creating appointment type:', error)
      alert('Failed to create appointment type: ' + (error as any).message)
    }
  }

  const handleUpdate = async () => {
    if (!editingType) return

    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('appointment_types')
        .update(formData)
        .eq('id', editingType.id)
        .select()
        .single()

      if (error) throw error

      setAppointmentTypes(appointmentTypes.map(type => 
        type.id === editingType.id ? data : type
      ))
      setEditingType(null)
      resetForm()
      alert('Appointment type updated successfully!')
    } catch (error) {
      console.error('Error updating appointment type:', error)
      alert('Failed to update appointment type')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this appointment type?')) return

    try {
      const supabase = await createClient()
      const { error } = await supabase
        .from('appointment_types')
        .delete()
        .eq('id', id)

      if (error) throw error

      setAppointmentTypes(appointmentTypes.filter(type => type.id !== id))
      alert('Appointment type deleted successfully!')
    } catch (error) {
      console.error('Error deleting appointment type:', error)
      alert('Failed to delete appointment type')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      duration_minutes: 30,
      buffer_after_minutes: 0,
      price_pennies: 0,
      is_active: true
    })
  }

  const formatPrice = (pennies: number) => {
    return `£${(pennies / 100).toFixed(2)}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading appointment types...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white">Appointment Types</h3>
          <p className="text-sm text-gray-400 mt-1">
            Define the types of appointments clients can book
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-orange-600 hover:bg-orange-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Appointment Type
        </Button>
      </div>

      {/* Appointment Types List */}
      {appointmentTypes.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <Clock className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 mb-4">No appointment types created yet</p>
          <Button
            onClick={() => setShowCreateModal(true)}
            variant="outline"
          >
            Create Your First Type
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {appointmentTypes.map((type) => (
            <div key={type.id} className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="text-lg font-semibold text-white">{type.name}</h4>
                  {type.description && (
                    <p className="text-sm text-gray-400 mt-1">{type.description}</p>
                  )}
                  <div className="flex items-center gap-6 mt-3 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      <span>{type.duration_minutes} min</span>
                      {type.buffer_after_minutes > 0 && (
                        <span className="text-gray-600">
                          (+{type.buffer_after_minutes} min buffer)
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <DollarSign className="w-4 h-4" />
                      <span>{formatPrice(type.price_pennies)}</span>
                    </div>
                    <span className={type.is_active ? 'text-green-500' : 'text-gray-600'}>
                      {type.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => {
                      setEditingType(type)
                      setFormData({
                        name: type.name,
                        description: type.description || '',
                        duration_minutes: type.duration_minutes,
                        buffer_after_minutes: type.buffer_after_minutes,
                        price_pennies: type.price_pennies,
                        is_active: type.is_active
                      })
                    }}
                    className="p-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(type.id)}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingType) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">
              {editingType ? 'Edit Appointment Type' : 'Create Appointment Type'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  placeholder="e.g., Personal Training Session"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  rows={3}
                  placeholder="Brief description of this appointment type"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    min="5"
                    step="5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Buffer (minutes)
                  </label>
                  <input
                    type="number"
                    value={formData.buffer_after_minutes}
                    onChange={(e) => setFormData({ ...formData, buffer_after_minutes: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    min="0"
                    step="5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Price (£)
                </label>
                <input
                  type="number"
                  value={formData.price_pennies / 100}
                  onChange={(e) => setFormData({ ...formData, price_pennies: Math.round(parseFloat(e.target.value) * 100) || 0 })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-300">
                    Active (available for booking)
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false)
                  setEditingType(null)
                  resetForm()
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={editingType ? handleUpdate : handleCreate}
                disabled={!formData.name || formData.duration_minutes < 1}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {editingType ? 'Update' : 'Create'} Type
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}