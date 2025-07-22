'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LeadsTable } from '@/app/components/leads/LeadsTable'

export default function LeadsPage() {
  const [activeTab, setActiveTab] = useState('all')

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="container mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <Link href="/" className="text-2xl font-bold text-orange-500">
              Atlas Fitness
            </Link>
            <nav className="flex items-center space-x-6">
              <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors">
                Dashboard
              </Link>
              <Link href="/leads" className="text-white font-medium">
                Leads
              </Link>
              <Link href="/integrations" className="text-gray-300 hover:text-white transition-colors">
                Integrations
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Leads & Contacts</h1>
          <div className="flex gap-3">
            <button className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg flex items-center gap-2 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
            <button className="bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg flex items-center gap-2 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Lead
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-gray-800 rounded-lg">
          <div className="border-b border-gray-700">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {[
                { id: 'all', name: 'All Leads', count: null },
                { id: 'new', name: 'New', count: 12 },
                { id: 'contacted', name: 'Contacted', count: 8 },
                { id: 'qualified', name: 'Qualified', count: 5 },
                { id: 'converted', name: 'Converted', count: 3 }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    py-4 px-1 border-b-2 font-medium text-sm transition-colors
                    ${activeTab === tab.id
                      ? 'border-orange-500 text-orange-500'
                      : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                    }
                  `}
                >
                  <span className="flex items-center gap-2">
                    {tab.name}
                    {tab.count !== null && (
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        activeTab === tab.id 
                          ? 'bg-orange-500/20 text-orange-400' 
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                        {tab.count}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            <LeadsTable statusFilter={activeTab} />
          </div>
        </div>
      </main>
    </div>
  )
}