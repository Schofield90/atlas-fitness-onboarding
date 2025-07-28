'use client'

import DashboardLayout from '../components/DashboardLayout'

export default function BillingRevenuePage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold">Billing & Revenue</h2>
            <p className="text-gray-400 mt-1">Manage payments, invoices, and financial transactions</p>
          </div>

          {/* Revenue Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6">
              <p className="text-gray-400 text-sm mb-2">Monthly Revenue</p>
              <p className="text-3xl font-bold text-gray-500">£0</p>
              <p className="text-sm text-gray-400 mt-2">No data yet</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <p className="text-gray-400 text-sm mb-2">Outstanding</p>
              <p className="text-3xl font-bold text-gray-500">£0</p>
              <p className="text-sm text-gray-400 mt-2">0 invoices</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <p className="text-gray-400 text-sm mb-2">Failed Payments</p>
              <p className="text-3xl font-bold text-gray-500">£0</p>
              <p className="text-sm text-gray-400 mt-2">0 payments</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6">
              <p className="text-gray-400 text-sm mb-2">Active Subscriptions</p>
              <p className="text-3xl font-bold text-gray-500">0</p>
              <p className="text-sm text-gray-400 mt-2">£0 MRR</p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <button className="bg-orange-600 hover:bg-orange-700 rounded-lg p-6 text-left transition-colors">
              <h3 className="text-lg font-semibold mb-2">Create Invoice</h3>
              <p className="text-sm opacity-90">Generate a new invoice for services</p>
            </button>
            <button className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 text-left transition-colors">
              <h3 className="text-lg font-semibold mb-2">Process Payment</h3>
              <p className="text-sm text-gray-400">Record a manual payment</p>
            </button>
            <button className="bg-gray-800 hover:bg-gray-700 rounded-lg p-6 text-left transition-colors">
              <h3 className="text-lg font-semibold mb-2">Export Reports</h3>
              <p className="text-sm text-gray-400">Download financial statements</p>
            </button>
          </div>

          {/* Recent Transactions */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
            <div className="text-center py-8">
              <p className="text-gray-400">No transactions yet</p>
              <p className="text-sm text-gray-500 mt-2">Transactions will appear here once you start processing payments</p>
            </div>
          </div>

          {/* Coming Soon Notice */}
          <div className="mt-8 bg-blue-900/20 border border-blue-700 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-blue-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-300">
                Stripe integration coming soon for automated payment processing and subscription management.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}