'use client'

import { useState } from 'react'
import { StickyNote, Plus, User, Calendar, Edit2, Trash2, Save, X } from 'lucide-react'
import { formatBritishDateTime } from '@/app/lib/utils/british-format'

interface Note {
  id: string
  content: string
  created_at: string
  updated_at?: string
  created_by: string | { name?: string; email?: string }
  is_internal?: boolean
}

interface NotesTabProps {
  notes: Note[]
  onAddNote: (content: string) => Promise<void>
  onRefresh?: () => void
}

export default function NotesTab({ notes, onAddNote, onRefresh }: NotesTabProps) {
  const [showAddModal, setShowAddModal] = useState(false)
  const [newNoteContent, setNewNoteContent] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNoteContent.trim()) return

    setSaving(true)
    try {
      await onAddNote(newNoteContent)
      setNewNoteContent('')
      setShowAddModal(false)
      if (onRefresh) onRefresh()
    } catch (error) {
      console.error('Error adding note:', error)
    } finally {
      setSaving(false)
    }
  }

  const formatCreatedBy = (createdBy: string | { name?: string; email?: string }) => {
    if (typeof createdBy === 'string') {
      return 'System'
    }
    return createdBy?.name || createdBy?.email || 'Unknown'
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Notes & Comments</h3>
        <button 
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Note
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="text-center py-12">
          <StickyNote className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400">No notes yet</p>
          <p className="text-sm text-gray-500 mt-2">
            Add notes to keep track of important information about this customer
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="bg-gray-900 rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <User className="h-4 w-4" />
                  <span>{formatCreatedBy(note.created_by)}</span>
                  <span className="text-gray-600">•</span>
                  <Calendar className="h-4 w-4" />
                  <span>{formatBritishDateTime(note.created_at)}</span>
                  {note.is_internal && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span className="bg-gray-700 px-2 py-0.5 rounded text-xs">Internal</span>
                    </>
                  )}
                </div>
              </div>
              <p className="text-white whitespace-pre-wrap">{note.content}</p>
              {note.updated_at && note.updated_at !== note.created_at && (
                <p className="text-xs text-gray-500 mt-2">
                  Edited: {formatBritishDateTime(note.updated_at)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Note Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">Add Note</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitNote} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Note Content *
                </label>
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  rows={6}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter your note here..."
                  required
                  autoFocus
                />
              </div>

              <div className="bg-gray-900 rounded-lg p-3">
                <p className="text-sm text-gray-400">
                  This note will be visible to all team members with access to this customer.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setNewNoteContent('')
                  }}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  disabled={saving || !newNoteContent.trim()}
                >
                  {saving ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Note
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}