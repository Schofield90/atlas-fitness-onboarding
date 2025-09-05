import React, { useState } from 'react'

interface ReportIssueModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (payload: { title: string; description: string; severity: 'low' | 'medium' | 'high' }) => Promise<void> | void
}

export default function ReportIssueModal({ isOpen, onClose, onSubmit }: ReportIssueModalProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high'>('medium')
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !description.trim()) return
    try {
      setSubmitting(true)
      await onSubmit({ title: title.trim(), description: description.trim(), severity })
      setTitle('')
      setDescription('')
      setSeverity('medium')
      onClose()
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-gray-800 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Report Issue</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-300">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              placeholder="Short summary"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-300">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-700 bg-gray-700 px-3 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
              placeholder="What happened?"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-300">Severity</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value as 'low' | 'medium' | 'high')}
              className="w-full rounded-lg border border-gray-700 bg-gray-700 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg bg-gray-700 px-4 py-2 text-white hover:bg-gray-600">Cancel</button>
            <button disabled={submitting || !title.trim() || !description.trim()} type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50">
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}