'use client'

import DashboardLayout from '../components/DashboardLayout'
import { useState, useEffect } from 'react'
import NewMembershipPlanModal from '../components/memberships/NewMembershipPlanModal'
import { formatBritishCurrency, formatBritishDate } from '@/app/lib/utils/british-format'
import { getMembershipPlans, type MembershipPlan } from '@/app/lib/services/membership-service'

export default function MembershipsPage() {
  const [activeTab, setActiveTab] = useState('plans')
  const [showNewPlanModal, setShowNewPlanModal] = useState(false)
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([])
  const [loading, setLoading] = useState(true)

  const handleNewPlan = () => {
    setShowNewPlanModal(true)
  }

  const fetchMembershipPlans = async () => {
    console.log('Starting to fetch membership plans...')
    setLoading(true)
    try {
      const { plans, error } = await getMembershipPlans()
      
      if (error) {
        console.error('Error fetching membership plans:', error)
      } else {
        setMembershipPlans(plans)
        console.log('Set membership plans:', plans.length, 'plans')
      }
    } catch (error) {
      console.error('Unexpected error:', error)
    } finally {
      console.log('Setting loading to false')
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMembershipPlans()
  }, [])

  const handleModalClose = () => {
    setShowNewPlanModal(false)
    fetchMembershipPlans() // Refresh the list
  }
  
  console.log('Render state:', { loading, membershipPlansCount: membershipPlans.length, activeTab })

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
            <div>
              {loading ? (
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto"></div>
                    <p className="text-gray-400 mt-4">Loading membership plans...</p>
                  </div>
                </div>
              ) : membershipPlans.length === 0 ? (
                <div className="bg-gray-800 rounded-lg p-6">
                  <div className="text-center py-8">
                    <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                    </svg>
                    <p className="text-gray-400 mb-2">No membership plans created yet</p>
                    <p className="text-sm text-gray-500">Click "New Membership Plan" to create your first plan</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {membershipPlans.map((plan) => (
                    <div key={plan.id} className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors">
                      <div className="flex justify-between items-start mb-4">
                        <h3 className="text-xl font-semibold">{plan.name}</h3>
                        <span className={`px-2 py-1 text-xs rounded ${plan.is_active ? 'bg-green-600' : 'bg-gray-600'}`}>
                          {plan.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <p className="text-gray-400 text-sm mb-4">{plan.description}</p>
                      
                      <div className="mb-4">
                        <p className="text-3xl font-bold">
                          {formatBritishCurrency(plan.price, true)}
                          <span className="text-sm text-gray-400 font-normal">
                            /{plan.billing_period === 'monthly' ? 'month' : plan.billing_period === 'yearly' ? 'year' : 'one-time'}
                          </span>
                        </p>
                      </div>
                      
                      {plan.features && plan.features.length > 0 && (
                        <ul className="space-y-2 mb-4">
                          {plan.features.slice(0, 3).map((feature, index) => (
                            <li key={index} className="text-sm text-gray-400 flex items-center">
                              <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              {feature}
                            </li>
                          ))}
                          {plan.features.length > 3 && (
                            <li className="text-sm text-gray-500 ml-6">+{plan.features.length - 3} more</li>
                          )}
                        </ul>
                      )}
                      
                      <div className="flex justify-between items-center pt-4 border-t border-gray-700">
                        <span className="text-sm text-gray-400">
                          Active Plan
                        </span>
                        <button className="text-sm text-orange-500 hover:text-orange-400 transition-colors">
                          Edit Plan
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
        onClose={handleModalClose}
      />
    </DashboardLayout>
  )
}