'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, Plus, CheckCircle } from 'lucide-react'
import { formatBritishDateTime } from '@/app/lib/utils/british-format'
import { createClient } from '@/app/lib/supabase/client'
import ReportIssueModal from '@/src/components/issues/ReportIssueModal'

interface IssuesTabProps {
  customerId: string
}

export default function IssuesTab({ customerId }: IssuesTabProps) {
  const [issues, setIssues] = useState<any[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchIssues()
  }, [customerId])

  const fetchIssues = async () => {
    try {
      // Reuse customer_notes as backing store with note_type = 'issue'
      const { data } = await supabase
        .from('customer_notes')
        .select('*')
        .eq('customer_id', customerId)
        .eq('note_type', 'issue')
        .order('created_at', { ascending: false })

      const mapped = (data || []).map((row: any) => ({
        id: row.id,
        title: row.note_title || 'Issue',
        description: row.note,
        priority: row.priority || 'medium',
        status: row.status || 'open',
        created_at: row.created_at,
        reported_by: row.created_by_name || 'Staff',
        notes: row.metadata?.updates || []
      }))

      setIssues(mapped)
    } catch (err) {
      console.error('Failed to load issues', err)
    }
  }

  const handleSubmitIssue = async (payload: { title: string; description: string; severity: 'low' | 'medium' | 'high' }) => {
    try {
      // Get current user/org for required fields
      const { data: { user } } = await supabase.auth.getUser()
      const { data: mem } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user?.id)
        .single()

      await supabase
        .from('customer_notes')
        .insert({
          customer_id: customerId,
          organization_id: mem?.organization_id,
          note: payload.description,
          note_type: 'issue',
          priority: payload.severity,
          note_title: payload.title,
        })

      await fetchIssues()
    } catch (err) {
      console.error('Failed to submit issue', err)
    }
  }

  const getIssueColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-400 bg-red-400/10'
      case 'medium':
        return 'text-yellow-400 bg-yellow-400/10'
      case 'low':
        return 'text-green-400 bg-green-400/10'
      default:
        return 'text-gray-400 bg-gray-400/10'
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Issues & Notes</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Report Issue
        </button>
      </div>
      {issues.length === 0 ? (
        <div className="rounded-lg bg-gray-800 py-12 text-center">
          <CheckCircle className="mx-auto mb-4 h-12 w-12 text-green-600" />
          <p className="text-gray-400">No issues reported</p>
          <p className="mt-2 text-sm text-gray-500">Any concerns or issues will be tracked here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {issues.map((issue) => (
            <div key={issue.id} className="rounded-lg bg-gray-800 p-4">
              <div className="flex items-start gap-3">
                <div className={`rounded-lg p-2 ${getIssueColor(issue.priority)}`}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-white">{issue.title}</h4>
                      <p className="mt-1 text-sm text-gray-400">{issue.description}</p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                        <span>Reported {formatBritishDateTime(issue.created_at)}</span>
                        <span>By {issue.reported_by}</span>
                      </div>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs ${
                      issue.status === 'resolved' ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'
                    }`}>
                      {issue.status}
                    </span>
                  </div>
                  {issue.notes && issue.notes.length > 0 && (
                    <div className="mt-3 border-t border-gray-700 pt-3">
                      <p className="mb-2 text-sm font-medium text-gray-400">Updates:</p>
                      {issue.notes.map((note: any, index: number) => (
                        <div key={index} className="mb-2 text-sm text-gray-300">
                          <p>{note.text}</p>
                          <p className="mt-1 text-xs text-gray-500">{note.author} • {formatBritishDateTime(note.created_at)}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ReportIssueModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSubmit={handleSubmitIssue}
      />
    </div>
  )
}