'use client'

import DashboardLayout from '../components/DashboardLayout'
import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'

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
}

export default function StaffPage() {
  const [activeTab, setActiveTab] = useState('team')
  const [showAddModal, setShowAddModal] = useState(false)
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  
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
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Current user:', user)
      if (!user) {
        console.error('No user found')
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single()

      console.log('Profile data:', profile)
      console.log('Profile error:', profileError)

      if (!profile?.organization_id) {
        console.error('No organization_id found for user')
        return
      }

      const { data, error: staffError } = await supabase
        .from('organization_staff')
        .select('*')
        .eq('organization_id', profile.organization_id)
        .order('created_at', { ascending: false })

      console.log('Staff data:', data)
      console.log('Staff error:', staffError)

      setStaff(data || [])
    } catch (error) {
      console.error('Error fetching staff:', error)
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
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg transition-colors"
            >
              + Add Staff Member
            </button>
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
              ) : staff.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="text-gray-400 mb-2">No staff members yet</p>
                  <p className="text-sm text-gray-500">Click "Add Staff Member" to get started</p>
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
        </div>
      </div>
    </DashboardLayout>
  )
}