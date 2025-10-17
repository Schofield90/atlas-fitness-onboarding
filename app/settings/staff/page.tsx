'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import SettingsHeader from '@/app/components/settings/SettingsHeader'
import { Users, Plus, Mail, Phone, Shield, Calendar, Trash2, Edit } from 'lucide-react'

interface StaffMember {
  id: string
  full_name: string
  email: string
  phone?: string
  role: 'admin' | 'coach'
  availability?: {
    monday: { start: string; end: string; available: boolean }
    tuesday: { start: string; end: string; available: boolean }
    wednesday: { start: string; end: string; available: boolean }
    thursday: { start: string; end: string; available: boolean }
    friday: { start: string; end: string; available: boolean }
    saturday: { start: string; end: string; available: boolean }
    sunday: { start: string; end: string; available: boolean }
  }
  created_at: string
  status: 'active' | 'invited' | 'inactive'
}

export default function StaffManagementPage() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const supabase = createClient()

  const [newStaff, setNewStaff] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'coach' as 'admin' | 'coach'
  })

  const defaultAvailability = {
    monday: { start: '09:00', end: '17:00', available: true },
    tuesday: { start: '09:00', end: '17:00', available: true },
    wednesday: { start: '09:00', end: '17:00', available: true },
    thursday: { start: '09:00', end: '17:00', available: true },
    friday: { start: '09:00', end: '17:00', available: true },
    saturday: { start: '09:00', end: '13:00', available: true },
    sunday: { start: '09:00', end: '13:00', available: false }
  }

  useEffect(() => {
    fetchStaff()
  }, [])

  // Loading timeout to prevent infinite spinners
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Loading timeout - forcing loading to stop')
        setLoading(false)
      }
    }, 5000) // 5 second timeout
    
    return () => clearTimeout(timeout)
  }, [loading])

  const fetchStaff = async () => {
    try {
      // Use the API endpoint we created
      const response = await fetch('/api/staff')
      
      if (!response.ok) {
        throw new Error(`Failed to fetch staff: ${response.statusText}`)
      }

      const data = await response.json()

      if (data.success && data.staff) {
        const formattedStaff = data.staff.map((member: any) => ({
          id: member.id,
          full_name: member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim(),
          email: member.email,
          phone: member.phone_number,
          role: member.role || 'coach',
          availability: defaultAvailability, // Use default for now
          created_at: member.created_at,
          status: member.is_available !== false ? 'active' : 'inactive'
        }))
        setStaff(formattedStaff)
      } else {
        console.log('No staff data returned or API call failed:', data)
        setStaff([])
      }
    } catch (error) {
      console.error('Error fetching staff:', error)
      setStaff([])
    } finally {
      setLoading(false)
    }
  }

  const handleInviteStaff = async () => {
    if (!newStaff.email || !newStaff.full_name) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const nameParts = newStaff.full_name.split(' ')
      const firstName = nameParts[0]
      const lastName = nameParts.slice(1).join(' ') || nameParts[0]

      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: newStaff.full_name,
          email: newStaff.email,
          phone_number: newStaff.phone || null,
          role: newStaff.role,
          hourly_rate: 0
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create staff member')
      }

      if (data.success && data.data) {
        // Add to local state
        setStaff([...staff, {
          id: data.data.id,
          full_name: data.data.name || newStaff.full_name,
          email: data.data.email,
          phone: data.data.phone_number,
          role: data.data.role,
          availability: defaultAvailability,
          created_at: data.data.created_at,
          status: 'active'
        }])

        // Reset form
        setNewStaff({
          full_name: '',
          email: '',
          phone: '',
          role: 'coach'
        })
        setShowAddModal(false)

        alert(`Staff member ${newStaff.full_name} added successfully!`)
      }
    } catch (error) {
      console.error('Error adding staff:', error)
      alert(error instanceof Error ? error.message : 'Failed to add staff member. Please try again.')
    }
  }

  const handleUpdateAvailability = async (staffId: string, availability: any) => {
    try {
      // Update in database
      const { error } = await supabase
        .from('organization_members')
        .update({ availability })
        .eq('user_id', staffId)

      if (error) throw error

      // Update local state
      setStaff(staff.map(member => 
        member.id === staffId 
          ? { ...member, availability }
          : member
      ))

      alert('Availability updated successfully')
    } catch (error) {
      setLoading(false)
      console.error('Error updating availability:', error)
      alert('Failed to update availability')
    }
  }

  const handleRemoveStaff = async (staffId: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) return

    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('user_id', staffId)

      if (error) throw error

      setStaff(staff.filter(member => member.id !== staffId))
      alert('Staff member removed successfully')
    } catch (error) {
      setLoading(false)
      console.error('Error removing staff:', error)
      alert('Failed to remove staff member')
    }
  }

  const getRoleBadge = (role: string) => {
    const colors = {
      admin: 'bg-purple-900 text-purple-300',
      coach: 'bg-blue-900 text-blue-300'
    }
    return colors[role as keyof typeof colors] || 'bg-gray-900 text-gray-300'
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      active: 'bg-green-900 text-green-300',
      invited: 'bg-yellow-900 text-yellow-300',
      inactive: 'bg-gray-900 text-gray-300'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-900 text-gray-300'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading staff...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsHeader 
        title="Staff Management"
        description="Manage your gym staff and their availability"
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Total Staff</p>
              <p className="text-2xl font-bold text-white">{staff.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Admins</p>
              <p className="text-2xl font-bold text-white">
                {staff.filter(s => s.role === 'admin').length}
              </p>
            </div>
            <Shield className="h-8 w-8 text-purple-500" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-400">Coaches</p>
              <p className="text-2xl font-bold text-white">
                {staff.filter(s => s.role === 'coach').length}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Staff List */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-white">Staff Members</h2>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Staff
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 font-medium text-gray-400">Name</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Contact</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Role</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id} className="border-b border-gray-700">
                  <td className="py-4 px-4">
                    <div className="font-medium text-white">{member.full_name}</div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </div>
                      {member.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-300">
                          <Phone className="h-3 w-3" />
                          {member.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleBadge(member.role)}`}>
                      {member.role === 'admin' ? 'Admin' : 'Coach'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadge(member.status)}`}>
                      {member.status}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingStaff(member)}
                        className="p-1 hover:bg-gray-700 rounded"
                        title="Edit Availability"
                      >
                        <Calendar className="h-4 w-4 text-gray-400" />
                      </button>
                      <button
                        onClick={() => handleRemoveStaff(member.id)}
                        className="p-1 hover:bg-gray-700 rounded"
                        title="Remove"
                      >
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold text-white mb-4">Add Staff Member</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newStaff.full_name}
                  onChange={(e) => setNewStaff({ ...newStaff, full_name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="John Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={newStaff.phone}
                  onChange={(e) => setNewStaff({ ...newStaff, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="+44 7XXX XXXXXX"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Role *
                </label>
                <select
                  value={newStaff.role}
                  onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value as 'admin' | 'coach' })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  <option value="coach">Coach</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Admins can manage all settings and data. Coaches can manage their own schedule and clients.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleInviteStaff}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Send Invitation
              </button>
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Availability Modal */}
      {editingStaff && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-white mb-4">
              Edit Availability - {editingStaff.full_name}
            </h2>
            
            <div className="space-y-3">
              {Object.entries(editingStaff.availability || defaultAvailability).map(([day, schedule]) => (
                <div key={day} className="flex items-center gap-4 p-3 bg-gray-700 rounded-lg">
                  <input
                    type="checkbox"
                    checked={schedule.available}
                    onChange={(e) => {
                      const newAvailability = {
                        ...editingStaff.availability,
                        [day]: { ...schedule, available: e.target.checked }
                      }
                      setEditingStaff({ ...editingStaff, availability: newAvailability })
                    }}
                    className="rounded border-gray-600 bg-gray-800 text-blue-500"
                  />
                  <span className="w-24 text-white capitalize">{day}</span>
                  <input
                    type="time"
                    value={schedule.start}
                    onChange={(e) => {
                      const newAvailability = {
                        ...editingStaff.availability,
                        [day]: { ...schedule, start: e.target.value }
                      }
                      setEditingStaff({ ...editingStaff, availability: newAvailability })
                    }}
                    disabled={!schedule.available}
                    className="px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white disabled:opacity-50"
                  />
                  <span className="text-gray-400">to</span>
                  <input
                    type="time"
                    value={schedule.end}
                    onChange={(e) => {
                      const newAvailability = {
                        ...editingStaff.availability,
                        [day]: { ...schedule, end: e.target.value }
                      }
                      setEditingStaff({ ...editingStaff, availability: newAvailability })
                    }}
                    disabled={!schedule.available}
                    className="px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white disabled:opacity-50"
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  handleUpdateAvailability(editingStaff.id, editingStaff.availability)
                  setEditingStaff(null)
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Availability
              </button>
              <button
                onClick={() => setEditingStaff(null)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}