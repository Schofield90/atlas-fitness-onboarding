'use client'

import DashboardLayout from '../components/DashboardLayout'

export default function FormsDocumentsPage() {
  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Forms & Documents</h2>
              <p className="text-gray-400 mt-1">Manage waivers, contracts, and member documents</p>
            </div>
            <button className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg transition-colors">
              + Upload Document
            </button>
          </div>

          {/* Document Categories */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-750 transition-colors cursor-pointer">
              <svg className="w-12 h-12 mx-auto mb-3 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="font-semibold mb-1">Waivers</h3>
              <p className="text-sm text-gray-400">0 documents</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-750 transition-colors cursor-pointer">
              <svg className="w-12 h-12 mx-auto mb-3 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
              <h3 className="font-semibold mb-1">Contracts</h3>
              <p className="text-sm text-gray-400">0 documents</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-750 transition-colors cursor-pointer">
              <svg className="w-12 h-12 mx-auto mb-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="font-semibold mb-1">Health Forms</h3>
              <p className="text-sm text-gray-400">0 documents</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-6 text-center hover:bg-gray-750 transition-colors cursor-pointer">
              <svg className="w-12 h-12 mx-auto mb-3 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <h3 className="font-semibold mb-1">Policies</h3>
              <p className="text-sm text-gray-400">0 documents</p>
            </div>
          </div>

          {/* Recent Documents */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">All Documents</h3>
            <div className="text-center py-8">
              <p className="text-gray-400">No documents uploaded yet</p>
              <p className="text-sm text-gray-500 mt-2">Upload waivers, contracts, and policies to share with members</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}