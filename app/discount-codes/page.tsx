'use client'

import DashboardLayout from '../components/DashboardLayout'
import { useState } from 'react'

export default function DiscountCodesPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Discount Codes</h2>
              <p className="text-gray-400 mt-1">Create and manage promotional codes for your services</p>
            </div>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg transition-colors"
            >
              + Create Discount Code
            </button>
          </div>

          {/* Active Codes */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="text-center py-8">
              <svg className="w-16 h-16 mx-auto mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <p className="text-gray-400 mb-2">No discount codes created yet</p>
              <p className="text-sm text-gray-500">Click "Create Discount Code" to offer promotions to your customers</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}