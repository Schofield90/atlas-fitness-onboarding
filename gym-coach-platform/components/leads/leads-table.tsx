'use client'

import { useState } from 'react'
import { ChevronDown, Search, Filter, Plus, Eye, Edit, Trash2, Brain, Zap, Upload, Download } from 'lucide-react'
import { useLeads, useDeleteLead, useBulkImportLeads, useExportLeads } from '@/hooks/use-api'
import { useAnalyzeLead, useBulkAnalyzeLeads } from '@/hooks/use-ai'
import { AIScoringBadge } from '@/components/ai/ai-scoring-badge'
import { ImportModal } from '@/components/leads/import-modal'
import { Lead, LeadStatus } from '@/types/database'
import { cn } from '@/lib/utils'

interface LeadsTableProps {
  onCreateLead: () => void
  onEditLead: (lead: Lead) => void
  onViewLead: (lead: Lead) => void
}

export function LeadsTable({ onCreateLead, onEditLead, onViewLead }: LeadsTableProps) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<LeadStatus | ''>('')
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [showImportModal, setShowImportModal] = useState(false)

  const { data: leadsData, isLoading, error } = useLeads({
    page,
    limit: 10,
    search: search || undefined,
    status: status || undefined,
    sort: sortBy,
    order: sortOrder,
  })
  
  const leadsResponse = leadsData as any

  const deleteLead = useDeleteLead()
  const analyzeLead = useAnalyzeLead()
  const bulkAnalyze = useBulkAnalyzeLeads()
  const bulkImport = useBulkImportLeads()
  const exportLeads = useExportLeads()
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])

  const getStatusBadge = (status: LeadStatus) => {
    const styles = {
      cold: 'bg-blue-100 text-blue-800',
      warm: 'bg-yellow-100 text-yellow-800',
      hot: 'bg-red-100 text-red-800',
      converted: 'bg-green-100 text-green-800',
      lost: 'bg-gray-100 text-gray-800',
    }

    return (
      <span className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        styles[status]
      )}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  const getScoreBadge = (score: number) => {
    let colorClass = 'bg-gray-100 text-gray-800'
    
    if (score >= 80) colorClass = 'bg-green-100 text-green-800'
    else if (score >= 60) colorClass = 'bg-yellow-100 text-yellow-800'
    else if (score >= 40) colorClass = 'bg-orange-100 text-orange-800'
    else if (score > 0) colorClass = 'bg-red-100 text-red-800'

    return (
      <span className={cn(
        'inline-flex items-center px-2 py-1 rounded text-xs font-medium',
        colorClass
      )}>
        {score}/100
      </span>
    )
  }

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  const handleDeleteLead = async (lead: Lead) => {
    if (window.confirm(`Are you sure you want to delete ${lead.name}?`)) {
      deleteLead.mutate(lead.id)
    }
  }

  const handleAnalyzeLead = (leadId: string) => {
    analyzeLead.mutate(leadId)
  }

  const handleBulkAnalyze = () => {
    if (selectedLeads.length === 0) {
      // Analyze all visible leads
      const leadIds = leadsResponse?.leads?.map((lead: any) => lead.id) || []
      if (leadIds.length > 0) {
        bulkAnalyze.mutate({ lead_ids: leadIds })
      }
    } else {
      bulkAnalyze.mutate({ lead_ids: selectedLeads })
      setSelectedLeads([])
    }
  }

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeads(prev => 
      prev.includes(leadId) 
        ? prev.filter(id => id !== leadId)
        : [...prev, leadId]
    )
  }

  const toggleSelectAll = () => {
    const allLeadIds = leadsResponse?.leads?.map((lead: any) => lead.id) || []
    setSelectedLeads(prev => 
      prev.length === allLeadIds.length ? [] : allLeadIds
    )
  }

  const handleImport = async (leads: any[]) => {
    await bulkImport.mutateAsync({ leads })
  }

  const handleExport = () => {
    const params = {
      ...(search && { search }),
      ...(status && { status }),
      format: 'csv' as const
    }
    exportLeads.mutate(params)
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Failed to load leads</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Leads</h2>
          <div className="flex items-center space-x-2">
            {selectedLeads.length > 0 && (
              <span className="text-sm text-gray-600">
                {selectedLeads.length} selected
              </span>
            )}
            <button
              onClick={() => setShowImportModal(true)}
              disabled={bulkImport.isPending}
              className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {bulkImport.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <Upload className="w-4 h-4 mr-2" />
              )}
              Import CSV
            </button>
            <button
              onClick={handleExport}
              disabled={exportLeads.isPending}
              className="inline-flex items-center px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
            >
              {exportLeads.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export CSV
            </button>
            <button
              onClick={handleBulkAnalyze}
              disabled={bulkAnalyze.isPending}
              className="inline-flex items-center px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
            >
              {bulkAnalyze.isPending ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              AI Analyze {selectedLeads.length > 0 ? `(${selectedLeads.length})` : 'All'}
            </button>
            <button
              onClick={onCreateLead}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Lead
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus | '')}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All Status</option>
            <option value="cold">Cold</option>
            <option value="warm">Warm</option>
            <option value="hot">Hot</option>
            <option value="converted">Converted</option>
            <option value="lost">Lost</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-4 font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={selectedLeads.length === leadsResponse?.leads?.length && leadsResponse?.leads?.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th 
                className="text-left py-3 px-6 font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center">
                  Name
                  <ChevronDown className="w-4 h-4 ml-1" />
                </div>
              </th>
              <th className="text-left py-3 px-6 font-medium text-gray-700">Email</th>
              <th className="text-left py-3 px-6 font-medium text-gray-700">Status</th>
              <th className="text-left py-3 px-6 font-medium text-gray-700">AI Score</th>
              <th className="text-left py-3 px-6 font-medium text-gray-700">Source</th>
              <th 
                className="text-left py-3 px-6 font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('created_at')}
              >
                <div className="flex items-center">
                  Created
                  <ChevronDown className="w-4 h-4 ml-1" />
                </div>
              </th>
              <th className="text-left py-3 px-6 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-gray-200">
                  <td className="py-4 px-6">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-6 w-16 bg-gray-200 rounded-full animate-pulse"></div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex space-x-2">
                      <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </td>
                </tr>
              ))
            ) : leadsResponse?.leads?.length ? (
              leadsResponse.leads.map((lead: any) => (
                <tr key={lead.id} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-4 px-4">
                    <input
                      type="checkbox"
                      checked={selectedLeads.includes(lead.id)}
                      onChange={() => toggleLeadSelection(lead.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="py-4 px-6">
                    <div className="font-medium text-gray-900">{lead.name}</div>
                    {lead.phone && (
                      <div className="text-sm text-gray-500">{lead.phone}</div>
                    )}
                  </td>
                  <td className="py-4 px-6 text-gray-900">{lead.email}</td>
                  <td className="py-4 px-6">{getStatusBadge(lead.status)}</td>
                  <td className="py-4 px-6">
                    <AIScoringBadge 
                      score={lead.lead_score} 
                      analysis={lead.ai_analysis}
                      size="sm"
                    />
                  </td>
                  <td className="py-4 px-6 text-gray-700">{lead.source}</td>
                  <td className="py-4 px-6 text-gray-700">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleAnalyzeLead(lead.id)}
                        disabled={analyzeLead.isPending}
                        className="p-1 text-gray-600 hover:text-purple-600 transition-colors disabled:opacity-50"
                        title="AI Analyze"
                      >
                        <Brain className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onViewLead(lead)}
                        className="p-1 text-gray-600 hover:text-blue-600 transition-colors"
                        title="View lead"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEditLead(lead)}
                        className="p-1 text-gray-600 hover:text-green-600 transition-colors"
                        title="Edit lead"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLead(lead)}
                        className="p-1 text-gray-600 hover:text-red-600 transition-colors"
                        title="Delete lead"
                        disabled={deleteLead.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-8 px-6 text-center text-gray-500">
                  No leads found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {leadsResponse?.pagination && leadsResponse.pagination.pages > 1 && (
        <div className="p-6 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((leadsResponse.pagination.page - 1) * leadsResponse.pagination.limit) + 1} to{' '}
            {Math.min(leadsResponse.pagination.page * leadsResponse.pagination.limit, leadsResponse.pagination.total)} of{' '}
            {leadsResponse.pagination.total} results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= leadsResponse.pagination.pages}
              className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
        isImporting={bulkImport.isPending}
      />
    </div>
  )
}