'use client'

import DashboardLayout from '../components/DashboardLayout'
import { useState } from 'react'
import NewMembershipPlanModal from '../components/memberships/NewMembershipPlanModal'

export default function MembershipsPage() {
  const [activeTab, setActiveTab] = useState('plans')
  const [showNewPlanModal, setShowNewPlanModal] = useState(false)

  const handleNewPlan = () => {
    setShowNewPlanModal(true)
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Membership Management</h2>
              <p className="text-gray-400 mt-1">Create and manage membership plans for your gym</p>
            </div>
            <button 
              onClick={handleNewPlan}
              className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg transition-colors"
            >
              + New Membership Plan
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-700 mb-6">
            <nav className="flex space-x-8">
              {[
                { id: 'plans', label: 'Membership Plans' },
                { id: 'active', label: 'Active Members' },
                { id: 'expired', label: 'Expired/Cancelled' },
                { id: 'settings', label: 'Settings' }
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

          {/* Content */}
          {activeTab === 'plans' && (
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="text-center py-8">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                <p className="text-gray-400 mb-2">No membership plans created yet</p>
                <p className="text-sm text-gray-500">Click "New Membership Plan" to create your first plan</p>
              </div>
            </div>
          )}

          {activeTab === 'active' && (
            <div className="bg-gray-800 rounded-lg p-6">
              <p className="text-gray-400">Active members list will be displayed here...</p>
            </div>
          )}

          {activeTab === 'expired' && (
            <div className="bg-gray-800 rounded-lg p-6">
              <p className="text-gray-400">Expired and cancelled memberships will be displayed here...</p>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-gray-800 rounded-lg p-6">
              <p className="text-gray-400">Membership settings and configurations...</p>
            </div>
          )}
        </div>
      </div>
      
      <NewMembershipPlanModal 
        isOpen={showNewPlanModal}
        onClose={() => setShowNewPlanModal(false)}
      />
    </DashboardLayout>
  )
}