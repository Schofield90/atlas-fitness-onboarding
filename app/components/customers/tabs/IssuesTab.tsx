'use client'

import { useState } from 'react'
import { AlertTriangle, Plus, CheckCircle, Clock } from 'lucide-react'
import { formatBritishDateTime } from '@/app/lib/utils/british-format'

interface IssuesTabProps {
  customerId: string
}

export default function IssuesTab({ customerId }: IssuesTabProps) {
  const [issues, setIssues] = useState<any[]>([])
  const [showAddModal, setShowAddModal] = useState(false)

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
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Issues & Notes</h3>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Report Issue
        </button>
      </div>
      
      {issues.length === 0 ? (
        <div className="text-center py-12 bg-gray-800 rounded-lg">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <p className="text-gray-400">No issues reported</p>
          <p className="text-sm text-gray-500 mt-2">
            Any concerns or issues will be tracked here
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {issues.map((issue) => (
            <div key={issue.id} className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${getIssueColor(issue.priority)}`}>
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-medium text-white">{issue.title}</h4>
                      <p className="text-sm text-gray-400 mt-1">{issue.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>Reported {formatBritishDateTime(issue.created_at)}</span>
                        <span>By {issue.reported_by}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      issue.status === 'resolved' 
                        ? 'bg-green-600 text-white' 
                        : 'bg-yellow-600 text-white'
                    }`}>
                      {issue.status}
                    </span>
                  </div>
                  
                  {issue.notes && issue.notes.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <p className="text-sm font-medium text-gray-400 mb-2">Updates:</p>
                      {issue.notes.map((note: any, index: number) => (
                        <div key={index} className="text-sm text-gray-300 mb-2">
                          <p>{note.text}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {note.author} • {formatBritishDateTime(note.created_at)}
                          </p>
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
    </div>
  )
}