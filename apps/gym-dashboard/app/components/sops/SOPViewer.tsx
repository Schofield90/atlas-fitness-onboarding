'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/app/components/ui/Card'
import { Button } from '@/app/components/ui/Button'
import { Badge } from '@/app/components/ui/Badge'
import { SOPWithDetails, SOPTrainingRecord, SOP_STATUSES, TRAINING_STATUSES } from '@/app/lib/types/sop'
// Simple markdown renderer component
const MarkdownRenderer = ({ children }: { children: string }) => {
  const renderMarkdown = (text: string) => {
    // Basic markdown parsing - you can extend this or use a proper library
    let html = text
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold text-gray-900 mb-4">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold text-gray-900 mb-3 mt-6">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold text-gray-900 mb-2 mt-4">$1</h3>')
      .replace(/\*\*(.*)\**/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\n\n/gim, '</p><p class="text-gray-700 mb-4 leading-relaxed">')
      .replace(/^\* (.*)$/gim, '<li class="ml-4">$1</li>')
      .replace(/^(\d+)\. (.*)$/gim, '<li class="ml-4">$2</li>')

    // Wrap in paragraph tags
    if (!html.includes('<h1') && !html.includes('<h2') && !html.includes('<h3')) {
      html = `<p class="text-gray-700 mb-4 leading-relaxed">${html}</p>`
    }

    // Wrap lists
    html = html.replace(/(<li class="ml-4">.*<\/li>)+/gim, (match) => {
      return `<ul class="list-disc list-inside text-gray-700 mb-4 space-y-1">${match}</ul>`
    })

    return html
  }

  return (
    <div 
      className="prose prose-lg max-w-none"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(children) }}
    />
  )
}

interface SOPViewerProps {
  sop: SOPWithDetails
  onEdit?: () => void
  onBack: () => void
  canEdit?: boolean
  showTraining?: boolean
}

export function SOPViewer({ 
  sop, 
  onEdit, 
  onBack, 
  canEdit = false, 
  showTraining = true 
}: SOPViewerProps) {
  const [trainingRecord, setTrainingRecord] = useState<SOPTrainingRecord | null>(null)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [showComments, setShowComments] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (showTraining) {
      fetchTrainingRecord()
    }
    fetchComments()
  }, [sop.id])

  const fetchTrainingRecord = async () => {
    try {
      const response = await fetch(`/api/sops/${sop.id}/training`)
      if (response.ok) {
        const data = await response.json()
        setTrainingRecord(data.training_record)
      }
    } catch (error) {
      console.error('Error fetching training record:', error)
    }
  }

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/sops/${sop.id}/comments`)
      if (response.ok) {
        const data = await response.json()
        setComments(data.comments)
      }
    } catch (error) {
      console.error('Error fetching comments:', error)
    }
  }

  const handleStartTraining = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/sops/${sop.id}/training`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start' })
      })

      if (response.ok) {
        const data = await response.json()
        setTrainingRecord(data.training_record)
      }
    } catch (error) {
      console.error('Error starting training:', error)
      alert('Failed to start training. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleCompleteTraining = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/sops/${sop.id}/training`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'complete',
          notes: 'Completed reading and understanding'
        })
      })

      if (response.ok) {
        const data = await response.json()
        setTrainingRecord(data.training_record)
      }
    } catch (error) {
      console.error('Error completing training:', error)
      alert('Failed to complete training. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleAddComment = async () => {
    if (!newComment.trim()) return

    try {
      const response = await fetch(`/api/sops/${sop.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment })
      })

      if (response.ok) {
        const data = await response.json()
        setComments(prev => [data.comment, ...prev])
        setNewComment('')
      }
    } catch (error) {
      console.error('Error adding comment:', error)
      alert('Failed to add comment. Please try again.')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case SOP_STATUSES.APPROVED:
        return 'bg-green-100 text-green-800'
      case SOP_STATUSES.REVIEW:
        return 'bg-yellow-100 text-yellow-800'
      case SOP_STATUSES.DRAFT:
        return 'bg-gray-100 text-gray-800'
      case SOP_STATUSES.ARCHIVED:
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getTrainingStatusColor = (status: string) => {
    switch (status) {
      case TRAINING_STATUSES.COMPLETED:
        return 'bg-green-100 text-green-800'
      case TRAINING_STATUSES.IN_PROGRESS:
        return 'bg-blue-100 text-blue-800'
      case TRAINING_STATUSES.OVERDUE:
        return 'bg-red-100 text-red-800'
      case TRAINING_STATUSES.ASSIGNED:
        return 'bg-yellow-100 text-yellow-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="outline" size="sm" onClick={onBack}>
              ← Back
            </Button>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {sop.title}
          </h1>
          
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Badge className={getStatusColor(sop.status)}>
              {sop.status.replace('_', ' ')}
            </Badge>
            
            {sop.training_required && (
              <Badge className="bg-purple-100 text-purple-800">
                Training Required
              </Badge>
            )}
            
            <span className="text-sm text-gray-600">
              Category: {sop.category}
            </span>
            
            <span className="text-sm text-gray-600">
              Version {sop.version}
            </span>
          </div>

          {sop.description && (
            <p className="text-lg text-gray-700 mb-4">
              {sop.description}
            </p>
          )}
        </div>

        <div className="flex gap-2 ml-6">
          {canEdit && onEdit && (
            <Button onClick={onEdit} className="bg-blue-600 hover:bg-blue-700">
              Edit SOP
            </Button>
          )}
        </div>
      </div>

      {/* Metadata */}
      <Card className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-sm">
          <div>
            <span className="font-medium text-gray-700">Created By:</span>
            <p className="text-gray-600 mt-1">
              {sop.creator?.name || 'Unknown'}
            </p>
          </div>
          
          {sop.approved_by && sop.approved_at && (
            <div>
              <span className="font-medium text-gray-700">Approved By:</span>
              <p className="text-gray-600 mt-1">
                {sop.approver?.name}
              </p>
              <p className="text-gray-500 text-xs">
                {formatDate(sop.approved_at)}
              </p>
            </div>
          )}
          
          <div>
            <span className="font-medium text-gray-700">Last Updated:</span>
            <p className="text-gray-600 mt-1">
              {formatDate(sop.updated_at)}
            </p>
          </div>
          
          {sop.effective_date && (
            <div>
              <span className="font-medium text-gray-700">Effective Date:</span>
              <p className="text-gray-600 mt-1">
                {formatDate(sop.effective_date)}
              </p>
            </div>
          )}
        </div>

        {sop.tags && sop.tags.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <span className="font-medium text-gray-700 mr-3">Tags:</span>
            <div className="flex flex-wrap gap-2 mt-2">
              {sop.tags.map((tag, index) => (
                <Badge key={index} className="bg-gray-100 text-gray-700">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Training Status */}
      {showTraining && sop.training_required && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Training Status</h3>
          
          {trainingRecord ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge className={getTrainingStatusColor(trainingRecord.status)}>
                    {trainingRecord.status.replace('_', ' ')}
                  </Badge>
                  
                  {trainingRecord.completed_at && (
                    <span className="text-sm text-gray-600">
                      Completed on {formatDateTime(trainingRecord.completed_at)}
                    </span>
                  )}
                  
                  {trainingRecord.quiz_score && (
                    <Badge className="bg-blue-100 text-blue-800">
                      Quiz Score: {trainingRecord.quiz_score}%
                    </Badge>
                  )}
                </div>

                <div className="flex gap-2">
                  {trainingRecord.status === TRAINING_STATUSES.ASSIGNED && (
                    <Button 
                      onClick={handleStartTraining}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Start Training
                    </Button>
                  )}
                  
                  {trainingRecord.status === TRAINING_STATUSES.IN_PROGRESS && (
                    <Button 
                      onClick={handleCompleteTraining}
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Mark Complete
                    </Button>
                  )}
                </div>
              </div>

              {trainingRecord.notes && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <span className="font-medium text-gray-700">Notes:</span>
                  <p className="text-gray-600 mt-1">{trainingRecord.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-600 mb-4">No training record found</p>
              <Button 
                onClick={handleStartTraining}
                disabled={loading}
                className="bg-green-600 hover:bg-green-700"
              >
                Start Training
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* AI Summary */}
      {sop.ai_summary && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-center gap-2 mb-3">
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a9 9 0 117.072 0l-.548.547A3.374 3.374 0 0014.846 21H9.154a3.374 3.374 0 00-2.872-1.24l-.548-.547z" />
            </svg>
            <h3 className="text-lg font-semibold text-blue-900">AI Summary</h3>
          </div>
          <p className="text-blue-800 leading-relaxed">
            {sop.ai_summary}
          </p>
        </Card>
      )}

      {/* Content */}
      <Card className="p-8">
        <MarkdownRenderer>{sop.content}</MarkdownRenderer>
      </Card>

      {/* Comments Section */}
      <Card className="p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Comments ({comments.length})
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowComments(!showComments)}
          >
            {showComments ? 'Hide' : 'Show'} Comments
          </Button>
        </div>

        {showComments && (
          <div className="space-y-4">
            {/* Add Comment */}
            <div className="space-y-3">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment or question about this SOP..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleAddComment}
                  disabled={!newComment.trim()}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Add Comment
                </Button>
              </div>
            </div>

            {/* Comments List */}
            <div className="space-y-4 pt-4 border-t border-gray-200">
              {comments.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No comments yet. Be the first to add one!
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-gray-900">
                        {comment.user?.name || 'Anonymous'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {formatDateTime(comment.created_at)}
                      </span>
                    </div>
                    <p className="text-gray-700">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}