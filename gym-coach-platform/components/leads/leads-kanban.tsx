'use client'

import { useState } from 'react'
import { Plus, MoreHorizontal } from 'lucide-react'
import { useLeads, useUpdateLead } from '@/hooks/use-api'
import { Lead, LeadStatus } from '@/types/database'
import { cn } from '@/lib/utils'

interface LeadsKanbanProps {
  onCreateLead: () => void
  onEditLead: (lead: Lead) => void
  onViewLead: (lead: Lead) => void
}

const statusColumns: { status: LeadStatus; title: string; color: string }[] = [
  { status: 'cold', title: 'Cold Leads', color: 'bg-blue-100 border-blue-200' },
  { status: 'warm', title: 'Warm Leads', color: 'bg-yellow-100 border-yellow-200' },
  { status: 'hot', title: 'Hot Leads', color: 'bg-red-100 border-red-200' },
  { status: 'converted', title: 'Converted', color: 'bg-green-100 border-green-200' },
  { status: 'lost', title: 'Lost', color: 'bg-gray-100 border-gray-200' },
]

export function LeadsKanban({ onCreateLead, onEditLead, onViewLead }: LeadsKanbanProps) {
  const { data: leadsData, isLoading } = useLeads({ limit: 100 }) // Get all leads for kanban
  const updateLead = useUpdateLead()
  const [draggedLead, setDraggedLead] = useState<Lead | null>(null)
  
  const leadsResponse = leadsData as any
  const leads = leadsResponse?.leads || []

  const getLeadsByStatus = (status: LeadStatus) => {
    return leads.filter((lead: any) => lead.status === status)
  }

  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, newStatus: LeadStatus) => {
    e.preventDefault()
    
    if (draggedLead && draggedLead.status !== newStatus) {
      updateLead.mutate({
        id: draggedLead.id,
        data: { status: newStatus }
      })
    }
    
    setDraggedLead(null)
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    if (score >= 40) return 'text-orange-600'
    return 'text-red-600'
  }

  if (isLoading) {
    return (
      <div className="flex space-x-6 overflow-x-auto pb-4">
        {statusColumns.map((column) => (
          <div key={column.status} className="flex-shrink-0 w-80">
            <div className={cn("rounded-lg border-2 border-dashed p-4", column.color)}>
              <h3 className="font-semibold mb-4">{column.title}</h3>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-white p-4 rounded-lg shadow animate-pulse">
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="flex space-x-6 overflow-x-auto pb-4">
      {statusColumns.map((column) => {
        const columnLeads = getLeadsByStatus(column.status)
        
        return (
          <div key={column.status} className="flex-shrink-0 w-80">
            <div
              className={cn(
                "rounded-lg border-2 p-4 min-h-[500px]",
                column.color
              )}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, column.status)}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">{column.title}</h3>
                <div className="flex items-center space-x-2">
                  <span className="bg-white px-2 py-1 rounded-full text-xs font-medium">
                    {columnLeads.length}
                  </span>
                  {column.status === 'cold' && (
                    <button
                      onClick={onCreateLead}
                      className="p-1 hover:bg-white hover:bg-opacity-50 rounded"
                      title="Add new lead"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                {columnLeads.map((lead: any) => (
                  <div
                    key={lead.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, lead)}
                    className="bg-white p-4 rounded-lg shadow cursor-move hover:shadow-md transition-shadow"
                    onClick={() => onViewLead(lead)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-gray-900 truncate flex-1">
                        {lead.name}
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          onEditLead(lead)
                        }}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <MoreHorizontal className="w-3 h-3 text-gray-400" />
                      </button>
                    </div>
                    
                    <p className="text-sm text-gray-600 truncate mb-2">
                      {lead.email}
                    </p>
                    
                    {lead.phone && (
                      <p className="text-sm text-gray-500 truncate mb-2">
                        {lead.phone}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {lead.source}
                      </span>
                      <span className={cn(
                        "text-xs font-medium",
                        getScoreColor(lead.lead_score)
                      )}>
                        {lead.lead_score}/100
                      </span>
                    </div>
                    
                    {lead.qualification_notes && (
                      <p className="text-xs text-gray-400 mt-2 line-clamp-2">
                        {lead.qualification_notes}
                      </p>
                    )}
                    
                    <div className="text-xs text-gray-400 mt-2">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                
                {columnLeads.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">No {column.title.toLowerCase()}</p>
                    {column.status === 'cold' && (
                      <button
                        onClick={onCreateLead}
                        className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        Add your first lead
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}