'use client'

import DashboardLayout from '../components/DashboardLayout'

export default function ReportsPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Revenue Reports */}
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors cursor-pointer">
              <h3 className="text-lg font-semibold mb-2">Revenue Reports</h3>
              <p className="text-gray-400 text-sm mb-4">Track income, payments, and financial performance</p>
              <div className="flex items-center text-orange-500">
                <span className="text-sm">View Reports</span>
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Attendance Reports */}
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors cursor-pointer">
              <h3 className="text-lg font-semibold mb-2">Attendance Reports</h3>
              <p className="text-gray-400 text-sm mb-4">Monitor class attendance and participation rates</p>
              <div className="flex items-center text-orange-500">
                <span className="text-sm">View Reports</span>
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Member Reports */}
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors cursor-pointer">
              <h3 className="text-lg font-semibold mb-2">Member Reports</h3>
              <p className="text-gray-400 text-sm mb-4">Analyze member growth and retention metrics</p>
              <div className="flex items-center text-orange-500">
                <span className="text-sm">View Reports</span>
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Staff Reports */}
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors cursor-pointer">
              <h3 className="text-lg font-semibold mb-2">Staff Reports</h3>
              <p className="text-gray-400 text-sm mb-4">Review instructor performance and schedules</p>
              <div className="flex items-center text-orange-500">
                <span className="text-sm">View Reports</span>
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Lead Reports */}
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors cursor-pointer">
              <h3 className="text-lg font-semibold mb-2">Lead Reports</h3>
              <p className="text-gray-400 text-sm mb-4">Track lead conversion and marketing effectiveness</p>
              <div className="flex items-center text-orange-500">
                <span className="text-sm">View Reports</span>
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>

            {/* Custom Reports */}
            <div className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 transition-colors cursor-pointer">
              <h3 className="text-lg font-semibold mb-2">Custom Reports</h3>
              <p className="text-gray-400 text-sm mb-4">Create personalized reports for your business</p>
              <div className="flex items-center text-orange-500">
                <span className="text-sm">Create Report</span>
                <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
          </div>

          {/* Coming Soon Notice */}
          <div className="mt-8 bg-orange-900/20 border border-orange-700 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-orange-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-gray-300">
                Full reporting functionality coming soon. Reports will include detailed analytics, export options, and scheduled email reports.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}