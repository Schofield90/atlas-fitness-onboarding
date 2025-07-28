'use client'

import DashboardLayout from '../components/DashboardLayout'
import { useState } from 'react'

export default function StaffPage() {
  const [activeTab, setActiveTab] = useState('team')
  const [showAddModal, setShowAddModal] = useState(false)

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
              <div className="text-center py-8">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <p className="text-gray-400 mb-2">No staff members yet</p>
                <p className="text-sm text-gray-500">Click "Add Staff Member" to get started</p>
              </div>
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
        </div>
      </div>
    </DashboardLayout>
  )
}