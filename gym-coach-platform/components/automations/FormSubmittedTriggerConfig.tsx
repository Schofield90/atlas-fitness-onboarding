'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Plus, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import Link from 'next/link'

// Mock form data - in real app this would come from API
const mockForms = [
  {
    id: '1',
    name: 'Contact Form',
    type: 'contact',
    status: 'active',
    submissions: 45
  },
  {
    id: '2',
    name: 'Free Trial Form',
    type: 'lead',
    status: 'active',
    submissions: 89
  },
  {
    id: '3',
    name: 'Class Booking Form',
    type: 'booking',
    status: 'inactive',
    submissions: 12
  }
]

interface FormSubmittedTriggerConfigProps {
  value?: string[]
  onChange?: (selectedForms: string[]) => void
  onSave?: () => void
  onCancel?: () => void
}

export function FormSubmittedTriggerConfig({
  value = [],
  onChange,
  onSave,
  onCancel
}: FormSubmittedTriggerConfigProps) {
  const [selectedForms, setSelectedForms] = useState<string[]>(value)
  const [showDropdown, setShowDropdown] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'lead' | 'contact' | 'booking'>('all')

  // Update parent when selection changes
  useEffect(() => {
    onChange?.(selectedForms)
  }, [selectedForms, onChange])

  const handleFormToggle = (formId: string) => {
    setSelectedForms(prev => 
      prev.includes(formId) 
        ? prev.filter(id => id !== formId)
        : [...prev, formId]
    )
  }

  const handleSelectAll = () => {
    const activeForms = mockForms.filter(f => f.status === 'active').map(f => f.id)
    setSelectedForms(activeForms)
  }

  const handleClearAll = () => {
    setSelectedForms([])
  }

  const filteredForms = mockForms.filter(form => {
    switch (filter) {
      case 'active':
        return form.status === 'active'
      case 'lead':
        return form.type === 'lead'
      case 'contact':
        return form.type === 'contact'
      case 'booking':
        return form.type === 'booking'
      default:
        return true
    }
  })

  const selectedFormNames = mockForms
    .filter(form => selectedForms.includes(form.id))
    .map(form => form.name)

  const getFormTypeColor = (type: string) => {
    switch (type) {
      case 'contact':
        return 'bg-blue-100 text-blue-800'
      case 'lead':
        return 'bg-green-100 text-green-800'
      case 'booking':
        return 'bg-orange-100 text-orange-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  // Show empty state if no forms exist
  if (mockForms.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Website Form Trigger</CardTitle>
          <CardDescription>
            Trigger this automation when specific forms are submitted
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center py-8">
            <div className="text-gray-400 mb-4">
              <Plus className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No forms available</h3>
            <p className="text-gray-600 mb-4">
              Create a form first to use this trigger type
            </p>
            <Link href="/dashboard/website">
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="w-4 h-4 mr-2" />
                Create a form
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Website Form Trigger</CardTitle>
        <CardDescription>
          Trigger this automation when specific forms are submitted on your website
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Form Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Select Forms</Label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-left flex items-center justify-between focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              data-testid="form-selector-trigger"
            >
              <span className="text-sm">
                {selectedForms.length === 0 
                  ? 'Choose forms to monitor...'
                  : selectedForms.length === 1
                    ? selectedFormNames[0]
                    : `${selectedForms.length} forms selected`
                }
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10">
                <div className="p-3 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSelectAll}
                        data-testid="select-all-forms"
                      >
                        Select All Active
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearAll}
                        data-testid="clear-all-forms"
                      >
                        Clear All
                      </Button>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={() => setFilter('all')}
                      className={`px-2 py-1 text-xs rounded ${filter === 'all' ? 'bg-blue-100 text-blue-800' : 'text-gray-600'}`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilter('active')}
                      className={`px-2 py-1 text-xs rounded ${filter === 'active' ? 'bg-green-100 text-green-800' : 'text-gray-600'}`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilter('lead')}
                      className={`px-2 py-1 text-xs rounded ${filter === 'lead' ? 'bg-green-100 text-green-800' : 'text-gray-600'}`}
                    >
                      Lead Forms
                    </button>
                    <button
                      type="button"
                      onClick={() => setFilter('contact')}
                      className={`px-2 py-1 text-xs rounded ${filter === 'contact' ? 'bg-blue-100 text-blue-800' : 'text-gray-600'}`}
                    >
                      Contact
                    </button>
                  </div>
                </div>
                <div className="max-h-48 overflow-y-auto p-2">
                  {filteredForms.map((form) => (
                    <div
                      key={form.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 rounded"
                      data-testid={`form-option-${form.id}`}
                    >
                      <div className="flex items-center space-x-3">
                        <Checkbox
                          checked={selectedForms.includes(form.id)}
                          onCheckedChange={() => handleFormToggle(form.id)}
                          data-testid={`form-checkbox-${form.id}`}
                        />
                        <div>
                          <p className="text-sm font-medium">{form.name}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            <span className={`text-xs px-2 py-1 rounded ${getFormTypeColor(form.type)}`}>
                              {form.type}
                            </span>
                            <span className={`text-xs px-2 py-1 rounded ${form.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                              {form.status}
                            </span>
                            <span className="text-xs text-gray-600">
                              {form.submissions} submissions
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          {selectedForms.length > 0 && (
            <p className="text-xs text-gray-600">
              Selected forms: {selectedFormNames.join(', ')}
            </p>
          )}
        </div>

        {/* Configuration Summary */}
        {selectedForms.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Trigger Configuration</h4>
            <p className="text-sm text-blue-800">
              This automation will run whenever someone submits any of the {selectedForms.length} selected form(s).
            </p>
            <Link href="/dashboard/website" className="inline-flex items-center mt-2 text-sm text-blue-600 hover:text-blue-700">
              <ExternalLink className="w-3 h-3 mr-1" />
              Manage forms
            </Link>
          </div>
        )}

        {/* Action Buttons */}
        {(onSave || onCancel) && (
          <div className="flex justify-end space-x-3 pt-4 border-t">
            {onCancel && (
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            {onSave && (
              <Button
                onClick={onSave}
                disabled={selectedForms.length === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                data-testid="save-trigger-config"
              >
                Save Configuration
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}