'use client'

import DashboardLayout from '../components/DashboardLayout'
import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { MapPin, UserPlus, Phone, Mail, MessageCircle, Edit2, Trash2, Eye, MoreVertical } from 'lucide-react'
import StaffLocationModal from './StaffLocationModal'
import InviteStaffModal from './InviteStaffModal'
import { useToast } from '@/app/lib/hooks/useToast'
import { isFeatureEnabled } from '@/app/lib/feature-flags'

interface Staff {
  id: string
  user_id: string
  name?: string
  phone_number: string
  email: string
  is_available: boolean
  receives_calls?: boolean
  receives_sms?: boolean
  receives_whatsapp?: boolean
  receives_emails?: boolean
  routing_priority?: number
  role: string
  type?: string
  specializations?: string[]
  certifications?: any
  bio?: string
  rating?: number
  location_access?: any
}

export default function StaffPage() {
  const [activeTab, setActiveTab] = useState('team')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [selectedStaffForLocation, setSelectedStaffForLocation] = useState<{id: string, name: string} | null>(null)
  const supabase = createClient()
  const toast = useToast()
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
    hourlyRate: ''
  })

  useEffect(() => {
    fetchStaff()
  }, [])

  const fetchStaff = async () => {
    try {
      setError(false)
      setLoading(true)
      
      // Fetch staff from API
      const response = await fetch('/api/staff')
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch staff')
      }
      
      if (data.success) {
        setStaff(data.staff || [])
      } else {
        setStaff([])
      }
    } catch (error: any) {
      console.error('Error fetching staff:', error)
      toast.error(error.message || 'Unable to load staff members')
      setStaff([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone_number: formData.phone,
          role: formData.role || 'staff',
          hourly_rate: formData.hourlyRate ? parseFloat(formData.hourlyRate) : 0
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add staff member')
      }

      toast.success('Staff member added successfully!')
      setShowAddModal(false)
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: '',
        hourlyRate: ''
      })
      
      // Refresh staff list
      fetchStaff()
    } catch (error: any) {
      console.error('Error adding staff:', error)
      toast.error(error.message || 'Failed to add staff member')
    }
  }

  const handleEditStaff = async (staffId: string, updatedData: any) => {
    try {
      const response = await fetch('/api/staff', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: staffId,
          ...updatedData
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update staff member')
      }

      toast.success('Staff member updated successfully!')
      fetchStaff()
    } catch (error: any) {
      console.error('Error updating staff:', error)
      toast.error(error.message || 'Failed to update staff member')
    }
  }

  const handleDeleteStaff = async (staffId: string) => {
    if (!confirm('Are you sure you want to remove this staff member?')) {
      return
    }

    try {
      const response = await fetch(`/api/staff?id=${staffId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete staff member')
      }

      toast.success('Staff member removed successfully!')
      fetchStaff()
    } catch (error: any) {
      console.error('Error deleting staff:', error)
      toast.error(error.message || 'Failed to remove staff member')
    }
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Staff Management</h2>
              <p className="text-gray-400 mt-1">Manage your team members and their permissions</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowInviteModal(true)}
                className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
              >
                <UserPlus className="h-4 w-4" />
                Invite Staff
              </button>
              <button 
                onClick={() => setShowAddModal(true)}
                className="bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
              >
                Add Manually
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-700 mb-6">
            <nav className="flex space-x-8">
              {[
                { id: 'team', label: 'Team Members', enabled: true },
                { id: 'schedule', label: 'Schedules', enabled: false, badge: 'Coming Soon' },
                { id: 'payroll', label: 'Payroll', enabled: false, badge: 'Coming Soon' },
                { id: 'permissions', label: 'Permissions', enabled: false, badge: 'Coming Soon' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => tab.enabled && setActiveTab(tab.id)}
                  disabled={!tab.enabled}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors relative ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-500'
                      : tab.enabled 
                        ? 'border-transparent text-gray-400 hover:text-gray-300'
                        : 'border-transparent text-gray-600 cursor-not-allowed'
                  }`}
                >
                  {tab.label}
                  {tab.badge && (
                    <span className="ml-2 text-xs bg-gray-700 text-gray-400 px-2 py-0.5 rounded">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Team Members */}
          {activeTab === 'team' && (
            <div className="bg-gray-800 rounded-lg p-6">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto"></div>
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 mx-auto mb-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-gray-400 mb-2">Unable to load staff</p>
                  <p className="text-sm text-gray-500 mb-4">There was an issue fetching your staff members</p>
                  <button 
                    onClick={() => {
                      setLoading(true)
                      fetchStaff()
                    }}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              ) : staff.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="text-gray-400 mb-2">No staff members yet</p>
                  <p className="text-sm text-gray-500">Click "Invite Staff" or "Add Manually" to get started</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {staff.map((member) => (
                    <div key={member.id} className="bg-gray-700 rounded-lg p-4 relative group">
                      {/* Action Menu */}
                      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="flex gap-1">
                          <button
                            onClick={() => {
                              // View staff details (could open a modal)
                              toast.info(`Viewing ${member.email}`);
                            }}
                            className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              // Edit staff (could open edit modal with pre-filled data)
                              const newEmail = prompt('Enter new email:', member.email);
                              if (newEmail && newEmail !== member.email) {
                                handleEditStaff(member.id, { email: newEmail });
                              }
                            }}
                            className="p-1.5 bg-gray-600 hover:bg-gray-500 rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStaff(member.id)}
                            className="p-1.5 bg-red-600 hover:bg-red-500 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold">
                              {(member.name || member.email).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium">{member.name || member.email}</h4>
                            <p className="text-sm text-gray-400 capitalize">
                              {member.role || member.type}
                              {member.specializations && member.specializations.length > 0 && (
                                <span className="ml-1 text-xs">
                                  ({member.specializations.join(', ')})
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs ${
                          member.is_available ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                        }`}>
                          {member.is_available ? 'Available' : 'Unavailable'}
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        {/* Contact Info with clickable links */}
                        {member.phone_number && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4 text-gray-400" />
                            <a 
                              href={`tel:${member.phone_number}`}
                              className="text-gray-300 hover:text-orange-400 transition-colors"
                            >
                              {member.phone_number}
                            </a>
                          </div>
                        )}
                        
                        {member.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <a 
                              href={`mailto:${member.email}`}
                              className="text-gray-300 hover:text-orange-400 transition-colors truncate"
                            >
                              {member.email}
                            </a>
                          </div>
                        )}

                        {/* Contact Methods */}
                        <div className="flex gap-2 mt-3 pt-3 border-t border-gray-600">
                          {member.phone_number && (
                            <>
                              <a
                                href={`tel:${member.phone_number}`}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-gray-600 hover:bg-green-600 rounded transition-colors text-xs"
                                title="Call"
                              >
                                <Phone className="h-3 w-3" />
                                Call
                              </a>
                              <a
                                href={`sms:${member.phone_number}`}
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-gray-600 hover:bg-blue-600 rounded transition-colors text-xs"
                                title="SMS"
                              >
                                <MessageCircle className="h-3 w-3" />
                                SMS
                              </a>
                              <a
                                href={`https://wa.me/${member.phone_number.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-gray-600 hover:bg-green-500 rounded transition-colors text-xs"
                                title="WhatsApp"
                              >
                                <MessageCircle className="h-3 w-3" />
                                WA
                              </a>
                            </>
                          )}
                        </div>

                        {/* Communication Preferences */}
                        <div className="flex flex-wrap gap-1 mt-2 text-xs">
                          {member.receives_calls && <span className="bg-gray-600 px-2 py-0.5 rounded text-xs">📞 Calls</span>}
                          {member.receives_sms && <span className="bg-gray-600 px-2 py-0.5 rounded text-xs">💬 SMS</span>}
                          {member.receives_whatsapp && <span className="bg-gray-600 px-2 py-0.5 rounded text-xs">📱 WhatsApp</span>}
                          {member.receives_emails && <span className="bg-gray-600 px-2 py-0.5 rounded text-xs">📧 Email</span>}
                        </div>

                        {/* Location Management */}
                        <div className="mt-3">
                          <button
                            onClick={() => setSelectedStaffForLocation({ id: member.id, name: member.email })}
                            className="w-full flex items-center justify-center gap-2 text-xs bg-gray-600 hover:bg-gray-500 px-3 py-1.5 rounded transition-colors"
                          >
                            <MapPin className="h-3 w-3" />
                            {member.location_access?.all_locations ? 'All Locations' : 'Manage Locations'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <div className="bg-gray-800 rounded-lg p-6">
              <p className="text-gray-400">Staff schedules and shift management coming soon...</p>
            </div>
          )}

          {/* Payroll Tab */}
          {activeTab === 'payroll' && (
            <div className="bg-gray-800 rounded-lg p-6">
              <p className="text-gray-400">Payroll management and reports coming soon...</p>
            </div>
          )}

          {/* Permissions Tab */}
          {activeTab === 'permissions' && (
            <div className="bg-gray-800 rounded-lg p-6">
              <p className="text-gray-400">Role-based access control settings coming soon...</p>
            </div>
          )}
          
          {/* Add Staff Modal */}
          {showAddModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
                <h3 className="text-xl font-bold mb-4">Add Staff Member</h3>
                <form onSubmit={handleAddStaff} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500 text-white"
                      placeholder="John Doe"
                      required
                      minLength={2}
                      maxLength={100}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Email Address <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500 text-white"
                      placeholder="john@example.com"
                      required
                      pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500 text-white"
                      placeholder="+44 7123 456789"
                      pattern="[\+]?[0-9\s\-\(\)]+"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Role <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500 text-white"
                      required
                    >
                      <option value="">Select a role</option>
                      <option value="owner">Owner</option>
                      <option value="manager">Manager</option>
                      <option value="staff">Staff</option>
                      <option value="trainer">Trainer</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Hourly Rate (Optional)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">£</span>
                      <input
                        type="number"
                        value={formData.hourlyRate}
                        onChange={(e) => setFormData({ ...formData, hourlyRate: e.target.value })}
                        className="w-full pl-8 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
                        placeholder="15.00"
                        step="0.01"
                      />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg transition-colors"
                    >
                      Add Staff Member
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Location Access Modal */}
          {selectedStaffForLocation && (
            <StaffLocationModal
              staffId={selectedStaffForLocation.id}
              staffName={selectedStaffForLocation.name}
              onClose={() => setSelectedStaffForLocation(null)}
              onSave={() => {
                setSelectedStaffForLocation(null)
                fetchStaff()
              }}
            />
          )}
          
          {/* Invite Staff Modal */}
          <InviteStaffModal
            isOpen={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            onSuccess={() => {
              setShowInviteModal(false)
              fetchStaff()
            }}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}