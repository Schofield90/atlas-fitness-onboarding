'use client'

import { useState } from 'react'
import { Table, Kanban, X } from 'lucide-react'
import { LeadsTable } from '@/components/leads/leads-table'
import { LeadsKanban } from '@/components/leads/leads-kanban'
import { LeadForm } from '@/components/leads/lead-form'
import { Lead } from '@/types/database'

type ViewMode = 'table' | 'kanban'

export default function LeadsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [showForm, setShowForm] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | undefined>()
  const [showDetails, setShowDetails] = useState(false)

  const handleCreateLead = () => {
    setSelectedLead(undefined)
    setShowForm(true)
  }

  const handleEditLead = (lead: Lead) => {
    setSelectedLead(lead)
    setShowForm(true)
  }

  const handleViewLead = (lead: Lead) => {
    setSelectedLead(lead)
    setShowDetails(true)
  }

  const handleCloseForm = () => {
    setShowForm(false)
    setSelectedLead(undefined)
  }

  const handleCloseDetails = () => {
    setShowDetails(false)
    setSelectedLead(undefined)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads Management</h1>
          <p className="text-gray-600">Track and manage your potential clients</p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode('table')}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Table className="w-4 h-4 mr-2" />
            Table
          </button>
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'kanban'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Kanban className="w-4 h-4 mr-2" />
            Kanban
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[600px]">
        {viewMode === 'table' ? (
          <LeadsTable
            onCreateLead={handleCreateLead}
            onEditLead={handleEditLead}
            onViewLead={handleViewLead}
          />
        ) : (
          <LeadsKanban
            onCreateLead={handleCreateLead}
            onEditLead={handleEditLead}
            onViewLead={handleViewLead}
          />
        )}
      </div>

      {/* Lead Form Modal */}
      <LeadForm
        lead={selectedLead}
        isOpen={showForm}
        onClose={handleCloseForm}
      />

      {/* Lead Details Modal */}
      {showDetails && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Lead Details</h2>
              <button
                onClick={handleCloseDetails}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-4">Contact Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-600">Name</label>
                      <p className="font-medium">{selectedLead.name}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Email</label>
                      <p className="font-medium">{selectedLead.email}</p>
                    </div>
                    {selectedLead.phone && (
                      <div>
                        <label className="text-sm text-gray-600">Phone</label>
                        <p className="font-medium">{selectedLead.phone}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-4">Lead Information</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm text-gray-600">Status</label>
                      <p className="font-medium capitalize">{selectedLead.status}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Score</label>
                      <p className="font-medium">{selectedLead.lead_score}/100</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Source</label>
                      <p className="font-medium">{selectedLead.source}</p>
                    </div>
                    <div>
                      <label className="text-sm text-gray-600">Created</label>
                      <p className="font-medium">
                        {new Date(selectedLead.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedLead.qualification_notes && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded">
                    {selectedLead.qualification_notes}
                  </p>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6 pt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    handleCloseDetails()
                    handleEditLead(selectedLead)
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Edit Lead
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}