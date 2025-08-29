'use client'

import DashboardLayout from '../components/DashboardLayout'
import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { MapPin, UserPlus } from 'lucide-react'
import StaffLocationModal from './StaffLocationModal'
import InviteStaffModal from './InviteStaffModal'
import { useToast } from '@/app/lib/hooks/useToast'
import { isFeatureEnabled } from '@/app/lib/feature-flags'

interface Staff {
  id: string
  user_id: string
  phone_number: string
  email: string
  is_available: boolean
  receives_calls: boolean
  receives_sms: boolean
  receives_whatsapp: boolean
  receives_emails: boolean
  routing_priority: number
  role: string
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
      
      // Get the organization ID from the API which handles auth properly
      const response = await fetch('/api/organization/get-info')
      if (!response.ok) {
        throw new Error('Failed to get organization info')
      }
      
      const { organizationId } = await response.json()

      const { data, error: staffError } = await supabase
        .from('organization_staff')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })

      if (staffError) {
        throw staffError
      }

      setStaff(data || [])
    } catch (error) {
      console.error('Error fetching staff:', error)
      
      if (isFeatureEnabled('staffFallback')) {
        // Show placeholder staff list
        setStaff([
          {
            id: 'placeholder-1',
            user_id: 'placeholder',
            phone_number: '+44 7123 456789',
            email: 'demo@example.com',
            is_available: true,
            receives_calls: true,
            receives_sms: true,
            receives_whatsapp: false,
            receives_emails: true,
            routing_priority: 1,
            role: 'manager',
            location_access: { all_locations: true }
          }
        ])
        toast.error('Unable to load staff - showing demo data')
      } else {
        setError(true)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const response = await fetch('/api/organization/add-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          phone_number: formData.phone,
          role: formData.role || 'staff'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add staff member')
      }

      alert('Staff member added successfully!')
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
      alert(error.message || 'Failed to add staff member')
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
                { id: 'team', label: 'Team Members' },
                { id: 'schedule', label: 'Schedules' },
                { id: 'payroll', label: 'Payroll' },
                { id: 'permissions', label: 'Permissions' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-orange-500 text-orange-500'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  {tab.label}
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
                    <div key={member.id} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold">
                              {member.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <h4 className="font-medium">{member.email}</h4>
                            <p className="text-sm text-gray-400 capitalize">{member.role}</p>
                          </div>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs ${
                          member.is_available ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                        }`}>
                          {member.is_available ? 'Available' : 'Unavailable'}
                        </div>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p className="text-gray-400">
                          <span className="inline-block w-16">Phone:</span>
                          <span className="text-gray-300">{member.phone_number}</span>
                        </p>
                        <div className="flex gap-2 mt-2 text-xs">
                          {member.receives_calls && <span className="bg-gray-600 px-2 py-1 rounded">Calls</span>}
                          {member.receives_sms && <span className="bg-gray-600 px-2 py-1 rounded">SMS</span>}
                          {member.receives_whatsapp && <span className="bg-gray-600 px-2 py-1 rounded">WhatsApp</span>}
                          {member.receives_emails && <span className="bg-gray-600 px-2 py-1 rounded">Email</span>}
                        </div>
                        <div className="mt-3">
                          <button
                            onClick={() => setSelectedStaffForLocation({ id: member.id, name: member.email })}
                            className="flex items-center gap-2 text-xs bg-gray-600 hover:bg-gray-500 px-3 py-1.5 rounded transition-colors"
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
                    <label className="block text-sm font-medium mb-2">Full Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
                      placeholder="John Doe"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Email Address</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
                      placeholder="john@example.com"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
                      placeholder="+44 7123 456789"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Role</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-orange-500"
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