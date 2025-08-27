'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { LeadsTable } from '@/app/components/leads/LeadsTable'
import { AddLeadModal } from '@/app/components/leads/AddLeadModal'
import BulkImportModal from '@/app/components/leads/BulkImportModal'
import DashboardLayout from '@/app/components/DashboardLayout'
import { createClient } from '@/app/lib/supabase/client'

export default function LeadsPage() {
  const [activeTab, setActiveTab] = useState('all')
  const [userData, setUserData] = useState<any>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const storedData = localStorage.getItem('gymleadhub_trial_data')
    if (storedData) {
      setUserData(JSON.parse(storedData))
    }
    fetchOrganization()
  }, [])

  const fetchOrganization = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (userOrg) {
        setOrganizationId(userOrg.organization_id)
      }
    } catch (error) {
      console.error('Error fetching organization:', error)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    
    // Create a simple toast notification function
    const showToast = (message: string, type: 'success' | 'error' | 'info') => {
      const toast = document.createElement('div')
      toast.className = `fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg transition-all duration-300 ${
        type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-blue-600'
      } text-white`
      toast.textContent = message
      document.body.appendChild(toast)
      setTimeout(() => {
        toast.style.opacity = '0'
        setTimeout(() => toast.remove(), 300)
      }, 3000)
    }
    
    try {
      showToast('Preparing export...', 'info')
      
      // Fetch all leads data
      const response = await fetch('/api/leads')
      const data = await response.json()
      const leads = data.leads || []

      if (leads.length === 0) {
        showToast('No leads to export', 'info')
        return
      }

      // Convert to CSV format
      const headers = ['Name', 'Email', 'Phone', 'Source', 'Status', 'Lead Score', 'Temperature', 'Created Date']
      const rows = leads.map((lead: any) => {
        const score = lead.lead_score || 0
        const temperature = score >= 80 ? 'Hot' : score >= 60 ? 'Warm' : score >= 40 ? 'Lukewarm' : 'Cold'
        const date = new Date(lead.created_at).toLocaleDateString('en-GB')
        
        return [
          lead.name || '',
          lead.email || '',
          lead.phone || '',
          lead.source || '',
          lead.status || '',
          score,
          temperature,
          date
        ]
      })

      // Create CSV content
      const csvContent = [
        headers.join(','),
        ...rows.map((row: any[]) => 
          row.map(cell => {
            // Escape commas and quotes in cell content
            const cellStr = String(cell)
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
              return `"${cellStr.replace(/"/g, '""')}"`
            }
            return cellStr
          }).join(',')
        )
      ].join('\n')

      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.setAttribute('href', url)
      link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      showToast('Export completed successfully', 'success')
    } catch (error) {
      console.error('Error exporting leads:', error)
      showToast('Export failed. Please try again.', 'error')
    } finally {
      setExporting(false)
    }
  }

  return (
    <DashboardLayout userData={userData}>
      <div className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Leads & Contacts</h1>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowImportModal(true)}
              className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Import
            </button>
            <button 
              onClick={handleExport}
              disabled={exporting}
              className="bg-gray-700 hover:bg-gray-600 text-white py-2 px-4 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {exporting ? 'Exporting...' : 'Export'}
            </button>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
            >
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
            <LeadsTable statusFilter={activeTab} key={refreshKey} />
          </div>
        </div>

        {/* Add Lead Modal */}
        <AddLeadModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onLeadAdded={() => {
            setRefreshKey(prev => prev + 1)
            setShowAddModal(false)
          }}
        />

        {/* Bulk Import Modal */}
        {organizationId && (
          <BulkImportModal
            open={showImportModal}
            onClose={() => setShowImportModal(false)}
            onImportComplete={() => {
              setRefreshKey(prev => prev + 1)
              setShowImportModal(false)
            }}
            organizationId={organizationId}
          />
        )}
      </div>
    </DashboardLayout>
  )
}