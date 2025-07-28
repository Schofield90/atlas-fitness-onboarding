'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatBritishDate } from '@/app/lib/utils/british-format'

interface Lead {
  id: string
  name: string
  email: string
  phone: string
  source: string
  status: string
  created_at: string
  form_name?: string
  campaign_name?: string
}

interface LeadsTableProps {
  statusFilter?: string
}

export function LeadsTable({ statusFilter = 'all' }: LeadsTableProps) {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLeads, setSelectedLeads] = useState<string[]>([])

  useEffect(() => {
    fetchLeads()
  }, [statusFilter])

  const fetchLeads = async () => {
    try {
      const url = statusFilter === 'all' 
        ? '/api/leads' 
        : `/api/leads?status=${statusFilter}`
      
      const res = await fetch(url)
      const data = await res.json()
      setLeads(data.leads || [])
    } catch (error) {
      console.error('Error fetching leads:', error)
      setLeads([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new': return 'bg-blue-500'
      case 'contacted': return 'bg-yellow-500'
      case 'qualified': return 'bg-green-500'
      case 'converted': return 'bg-purple-500'
      default: return 'bg-gray-500'
    }
  }

  const getSourceIcon = (source: string) => {
    switch (source.toLowerCase()) {
      case 'facebook':
        return (
          <span className="flex items-center gap-1 text-sm">
            <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Facebook
          </span>
        )
      case 'website':
        return (
          <span className="flex items-center gap-1 text-sm">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            Website
          </span>
        )
      default:
        return (
          <span className="flex items-center gap-1 text-sm">
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {source}
          </span>
        )
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`
    if (diffInHours < 48) return 'Yesterday'
    
    return formatBritishDate(date)
  }

  const filteredLeads = leads.filter(lead => 
    lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.phone.includes(searchTerm)
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    )
  }

  return (
    <div>
      {/* Search and Filters */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <div className="relative">
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-80 bg-gray-700 text-white placeholder-gray-400 rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button className="bg-gray-700 hover:bg-gray-600 p-2 rounded-lg transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </button>
        </div>
        
        {selectedLeads.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400">{selectedLeads.length} selected</span>
            <button className="text-red-400 hover:text-red-300 text-sm">Delete</button>
            <button className="text-blue-400 hover:text-blue-300 text-sm">Export</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-gray-700 rounded-lg overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-800 text-gray-300 text-sm">
              <th className="p-4 text-left">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedLeads(filteredLeads.map(l => l.id))
                    } else {
                      setSelectedLeads([])
                    }
                  }}
                  className="rounded border-gray-600 text-orange-500 focus:ring-orange-500"
                />
              </th>
              <th className="p-4 text-left font-medium">Name</th>
              <th className="p-4 text-left font-medium">Contact</th>
              <th className="p-4 text-left font-medium">Source</th>
              <th className="p-4 text-left font-medium">Status</th>
              <th className="p-4 text-left font-medium">Created</th>
              <th className="p-4 text-left font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-600">
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-400">
                  <div className="flex flex-col items-center">
                    <svg className="w-12 h-12 mb-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-lg font-medium mb-1">No leads found</p>
                    <p className="text-sm">Start by syncing leads from your integrations</p>
                  </div>
                </td>
              </tr>
            ) : (
              filteredLeads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-600/50 transition-colors">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedLeads.includes(lead.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedLeads([...selectedLeads, lead.id])
                        } else {
                          setSelectedLeads(selectedLeads.filter(id => id !== lead.id))
                        }
                      }}
                      className="rounded border-gray-600 text-orange-500 focus:ring-orange-500"
                    />
                  </td>
                  <td className="p-4">
                    <Link href={`/leads/${lead.id}`} className="hover:text-orange-400 transition-colors">
                      <div className="font-medium">{lead.name}</div>
                      {lead.form_name && (
                        <div className="text-xs text-gray-400">{lead.form_name}</div>
                      )}
                    </Link>
                  </td>
                  <td className="p-4">
                    <div className="text-sm">{lead.email}</div>
                    <div className="text-sm text-gray-400">{lead.phone}</div>
                  </td>
                  <td className="p-4">
                    {getSourceIcon(lead.source)}
                    {lead.campaign_name && (
                      <div className="text-xs text-gray-400 mt-1">{lead.campaign_name}</div>
                    )}
                  </td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white ${getStatusColor(lead.status)}`}>
                      {lead.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-300">
                    {formatDate(lead.created_at)}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <Link href={`/leads/${lead.id}`} className="p-1 hover:bg-gray-600 rounded transition-colors inline-block" title="View Details">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
                      <button 
                        onClick={() => window.location.href = `mailto:${lead.email}`}
                        className="p-1 hover:bg-gray-600 rounded transition-colors" 
                        title="Send Email"
                      >
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </button>
                      <button 
                        onClick={() => {
                          // For now, just log. Could add a dropdown menu here
                          console.log('More actions for lead:', lead.id)
                        }}
                        className="p-1 hover:bg-gray-600 rounded transition-colors" 
                        title="More Actions"
                      >
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {filteredLeads.length > 0 && (
        <div className="flex justify-between items-center mt-6">
          <p className="text-sm text-gray-400">
            Showing {filteredLeads.length} of {leads.length} leads
          </p>
          <div className="flex gap-2">
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors">Previous</button>
            <button className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded transition-colors">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}