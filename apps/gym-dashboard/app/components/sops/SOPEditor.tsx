'use client'

import { useState, useEffect, useRef } from 'react'
import { Card } from '@/app/components/ui/Card'
import { Button } from '@/app/components/ui/Button'
import { Badge } from '@/app/components/ui/Badge'
import { SOPWithDetails, SOPInsert, SOPUpdate, SOP_STATUSES, DEFAULT_CATEGORIES } from '@/app/lib/types/sop'

interface SOPEditorProps {
  sop?: SOPWithDetails | null
  onSave: (sop: SOPWithDetails) => void
  onCancel: () => void
  onAnalyze?: (file: File, metadata: any) => void
}

export function SOPEditor({ sop, onSave, onCancel, onAnalyze }: SOPEditorProps) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    description: '',
    category: '',
    tags: [] as string[],
    training_required: false,
    effective_date: '',
    review_date: '',
    status: SOP_STATUSES.DRAFT
  })
  
  const [saving, setSaving] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [newTag, setNewTag] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [showCustomCategory, setShowCustomCategory] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (sop) {
      setFormData({
        title: sop.title,
        content: sop.content,
        description: sop.description || '',
        category: sop.category,
        tags: sop.tags || [],
        training_required: sop.training_required,
        effective_date: sop.effective_date || '',
        review_date: sop.review_date || '',
        status: sop.status
      })
    }
  }, [sop])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      handleInputChange('tags', [...formData.tags, newTag.trim()])
      setNewTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    handleInputChange('tags', formData.tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      addTag()
    }
  }

  const handleCategoryChange = (value: string) => {
    if (value === 'custom') {
      setShowCustomCategory(true)
    } else {
      setShowCustomCategory(false)
      handleInputChange('category', value)
      setCustomCategory('')
    }
  }

  const handleCustomCategorySubmit = () => {
    if (customCategory.trim()) {
      handleInputChange('category', customCategory.trim())
      setShowCustomCategory(false)
      setCustomCategory('')
    }
  }

  const handleFileUpload = async (files: FileList) => {
    if (!files[0] || !onAnalyze) return

    const file = files[0]
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]

    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a PDF, DOCX, or TXT file')
      return
    }

    setAnalyzing(true)
    try {
      await onAnalyze(file, {
        title: formData.title || file.name.replace(/\.[^/.]+$/, ''),
        category: formData.category || 'General',
        description: formData.description,
        training_required: formData.training_required
      })
    } catch (error) {
      console.error('Error analyzing document:', error)
      alert('Failed to analyze document. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileUpload(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim() || !formData.content.trim() || !formData.category.trim()) {
      alert('Please fill in all required fields')
      return
    }

    setSaving(true)
    try {
      const endpoint = sop ? `/api/sops/${sop.id}` : '/api/sops'
      const method = sop ? 'PUT' : 'POST'
      
      const payload = sop ? formData as SOPUpdate : formData as SOPInsert

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error('Failed to save SOP')
      }

      const result = await response.json()
      onSave(result.sop)
    } catch (error) {
      console.error('Error saving SOP:', error)
      alert('Failed to save SOP. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [formData.content])

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {sop ? 'Edit SOP' : 'Create New SOP'}
          </h2>
          <p className="text-gray-600 mt-1">
            {sop ? 'Update your standard operating procedure' : 'Create a comprehensive operational guide'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? 'Saving...' : sop ? 'Update SOP' : 'Create SOP'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Emergency Evacuation Procedure"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <div className="space-y-2">
                <select
                  value={showCustomCategory ? 'custom' : formData.category}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  required={!showCustomCategory}
                >
                  <option value="">Select a category</option>
                  {DEFAULT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                  <option value="custom">+ Create Custom Category</option>
                </select>

                {showCustomCategory && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="Enter custom category name"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && handleCustomCategorySubmit()}
                    />
                    <Button
                      type="button"
                      onClick={handleCustomCategorySubmit}
                      size="sm"
                    >
                      Add
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Brief description of what this SOP covers..."
            />
          </div>

          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tags
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Add tags to organize your SOPs"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <Button type="button" onClick={addTag} size="sm">
                  Add Tag
                </Button>
              </div>
              
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {formData.tags.map((tag, index) => (
                    <Badge key={index} className="bg-blue-100 text-blue-800 flex items-center gap-1">
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-1 hover:text-blue-600"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Document Upload */}
        {!sop && onAnalyze && (
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Document Upload</h3>
            <p className="text-sm text-gray-600 mb-4">
              Upload an existing document to automatically extract and analyze content with AI
            </p>
            
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragOver 
                  ? 'border-blue-400 bg-blue-50' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {analyzing ? (
                <div className="py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-sm text-gray-600">Analyzing document with AI...</p>
                </div>
              ) : (
                <>
                  <svg className="h-12 w-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray-600 mb-2">
                    Drop files here or <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      click to browse
                    </button>
                  </p>
                  <p className="text-xs text-gray-500">
                    Supports PDF, DOCX, and TXT files
                  </p>
                </>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                className="hidden"
              />
            </div>
          </Card>
        )}

        {/* Content */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Content *</h3>
          
          <div className="space-y-4">
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <div className="bg-gray-50 px-4 py-2 border-b border-gray-300">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Markdown supported</span>
                  <span>•</span>
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-700"
                    onClick={() => window.open('https://www.markdownguide.org/basic-syntax/', '_blank')}
                  >
                    Formatting help
                  </button>
                </div>
              </div>
              
              <textarea
                ref={textareaRef}
                value={formData.content}
                onChange={(e) => handleInputChange('content', e.target.value)}
                className="w-full px-4 py-3 border-0 focus:ring-0 font-mono text-sm resize-none"
                style={{ minHeight: '400px' }}
                placeholder="Write your SOP content here. Use Markdown formatting for structure..."
                required
              />
            </div>
          </div>
        </Card>

        {/* Settings */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Settings</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Effective Date
              </label>
              <input
                type="date"
                value={formData.effective_date}
                onChange={(e) => handleInputChange('effective_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Review Date
              </label>
              <input
                type="date"
                value={formData.review_date}
                onChange={(e) => handleInputChange('review_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {sop && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={SOP_STATUSES.DRAFT}>Draft</option>
                  <option value={SOP_STATUSES.REVIEW}>Under Review</option>
                  <option value={SOP_STATUSES.APPROVED}>Approved</option>
                  <option value={SOP_STATUSES.ARCHIVED}>Archived</option>
                </select>
              </div>
            )}
          </div>

          <div className="mt-6">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.training_required}
                onChange={(e) => handleInputChange('training_required', e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Require training completion for staff
              </span>
            </label>
          </div>
        </Card>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4 pt-6">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saving ? 'Saving...' : sop ? 'Update SOP' : 'Create SOP'}
          </Button>
        </div>
      </form>
    </div>
  )
}