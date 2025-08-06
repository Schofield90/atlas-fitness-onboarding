'use client'

import { useState, useEffect } from 'react'
import { Search, ChevronDown, Facebook, Globe, Mail, Phone, FileText, Webhook, Plus, Trash2, Tag } from 'lucide-react'

interface LeadSource {
  id: string
  type: 'facebook' | 'google' | 'website' | 'email' | 'sms' | 'webhook' | 'manual'
  name: string
  icon: any
  details?: {
    pageId?: string
    pageName?: string
    formId?: string
    formName?: string
    campaignId?: string
    campaignName?: string
  }
}

interface LeadTriggerConfigProps {
  config: any
  onChange: (config: any) => void
  organizationId: string
}

export default function LeadTriggerConfig({ config, onChange, organizationId }: LeadTriggerConfigProps) {
  const [sources, setSources] = useState<LeadSource[]>([])
  const [selectedSource, setSelectedSource] = useState<LeadSource | null>(null)
  const [filters, setFilters] = useState(config.filters || [])
  const [tags, setTags] = useState(config.tags || [])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAvailableSources()
  }, [organizationId])

  const loadAvailableSources = async () => {
    try {
      // In a real implementation, this would fetch from your integrations
      const mockSources: LeadSource[] = [
        {
          id: 'fb_page_1',
          type: 'facebook',
          name: 'Facebook - Atlas Fitness Main',
          icon: Facebook,
          details: {
            pageId: 'page_123',
            pageName: 'Atlas Fitness Main',
            formId: 'form_456',
            formName: 'Free Trial Form'
          }
        },
        {
          id: 'fb_page_2',
          type: 'facebook',
          name: 'Facebook - Atlas Fitness Downtown',
          icon: Facebook,
          details: {
            pageId: 'page_789',
            pageName: 'Atlas Fitness Downtown',
            formId: 'form_012',
            formName: 'Membership Inquiry'
          }
        },
        {
          id: 'website_form_1',
          type: 'website',
          name: 'Website - Contact Form',
          icon: Globe,
          details: {
            formId: 'contact_form',
            formName: 'Main Contact Form'
          }
        },
        {
          id: 'website_form_2',
          type: 'website',
          name: 'Website - Free Trial Form',
          icon: Globe,
          details: {
            formId: 'trial_form',
            formName: 'Free Trial Signup'
          }
        },
        {
          id: 'webhook_1',
          type: 'webhook',
          name: 'Custom Webhook',
          icon: Webhook,
          details: {
            formId: 'custom_webhook',
            formName: 'External Lead Source'
          }
        }
      ]
      
      setSources(mockSources)
      
      // Set selected source if config has one
      if (config.sourceId) {
        const source = mockSources.find(s => s.id === config.sourceId)
        if (source) setSelectedSource(source)
      }
    } catch (error) {
      console.error('Error loading sources:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSourceSelect = (source: LeadSource) => {
    setSelectedSource(source)
    onChange({
      ...config,
      sourceId: source.id,
      sourceType: source.type,
      sourceDetails: source.details
    })
  }

  const addFilter = () => {
    const newFilter = {
      id: Date.now().toString(),
      field: '',
      operator: 'equals',
      value: ''
    }
    setFilters([...filters, newFilter])
    onChange({ ...config, filters: [...filters, newFilter] })
  }

  const updateFilter = (id: string, updates: any) => {
    const updated = filters.map((f: any) => f.id === id ? { ...f, ...updates } : f)
    setFilters(updated)
    onChange({ ...config, filters: updated })
  }

  const removeFilter = (id: string) => {
    const updated = filters.filter((f: any) => f.id !== id)
    setFilters(updated)
    onChange({ ...config, filters: updated })
  }

  const addTag = () => {
    const newTag = prompt('Enter tag name:')
    if (newTag && !tags.includes(newTag)) {
      const updated = [...tags, newTag]
      setTags(updated)
      onChange({ ...config, tags: updated })
    }
  }

  const removeTag = (tag: string) => {
    const updated = tags.filter((t: string) => t !== tag)
    setTags(updated)
    onChange({ ...config, tags: updated })
  }

  const availableFields = [
    { value: 'email', label: 'Email' },
    { value: 'phone', label: 'Phone' },
    { value: 'first_name', label: 'First Name' },
    { value: 'last_name', label: 'Last Name' },
    { value: 'source', label: 'Lead Source' },
    { value: 'campaign', label: 'Campaign' },
    { value: 'interest', label: 'Interest' },
    { value: 'location', label: 'Location' }
  ]

  const operators = [
    { value: 'equals', label: 'Equals' },
    { value: 'not_equals', label: 'Not Equals' },
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does Not Contain' },
    { value: 'starts_with', label: 'Starts With' },
    { value: 'ends_with', label: 'Ends With' },
    { value: 'is_empty', label: 'Is Empty' },
    { value: 'is_not_empty', label: 'Is Not Empty' }
  ]

  if (loading) {
    return <div className="p-4 text-center">Loading sources...</div>
  }

  return (
    <div className="space-y-6">
      {/* Source Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Lead Source
        </label>
        <div className="relative">
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 border border-gray-300 rounded-lg bg-white hover:bg-gray-50"
            onClick={() => {/* Toggle dropdown */}}
          >
            {selectedSource ? (
              <div className="flex items-center space-x-3">
                <selectedSource.icon className="w-5 h-5 text-gray-600" />
                <div className="text-left">
                  <div className="font-medium">{selectedSource.name}</div>
                  {selectedSource.details?.formName && (
                    <div className="text-sm text-gray-500">{selectedSource.details.formName}</div>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-gray-500">Select a lead source...</span>
            )}
            <ChevronDown className="w-5 h-5 text-gray-400" />
          </button>

          {/* Dropdown */}
          <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
            {sources.map((source) => (
              <button
                key={source.id}
                type="button"
                className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-gray-50 text-left"
                onClick={() => handleSourceSelect(source)}
              >
                <source.icon className="w-5 h-5 text-gray-600" />
                <div className="flex-1">
                  <div className="font-medium">{source.name}</div>
                  {source.details?.formName && (
                    <div className="text-sm text-gray-500">{source.details.formName}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Lead Filters (Optional)
          </label>
          <button
            type="button"
            onClick={addFilter}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Filter
          </button>
        </div>
        
        <div className="space-y-2">
          {filters.map((filter: any) => (
            <div key={filter.id} className="flex items-center space-x-2">
              <select
                value={filter.field}
                onChange={(e) => updateFilter(filter.id, { field: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">Select field...</option>
                {availableFields.map(field => (
                  <option key={field.value} value={field.value}>{field.label}</option>
                ))}
              </select>
              
              <select
                value={filter.operator}
                onChange={(e) => updateFilter(filter.id, { operator: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded-md"
              >
                {operators.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
              
              {!['is_empty', 'is_not_empty'].includes(filter.operator) && (
                <input
                  type="text"
                  value={filter.value}
                  onChange={(e) => updateFilter(filter.id, { value: e.target.value })}
                  placeholder="Value"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                />
              )}
              
              <button
                type="button"
                onClick={() => removeFilter(filter.id)}
                className="p-2 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Tags */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Auto-apply Tags
          </label>
          <button
            type="button"
            onClick={addTag}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Tag
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {tags.map((tag: string) => (
            <span
              key={tag}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-700"
            >
              <Tag className="w-3 h-3 mr-1" />
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="ml-2 text-blue-600 hover:text-blue-800"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* Advanced Settings */}
      <div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={config.deduplication || false}
            onChange={(e) => onChange({ ...config, deduplication: e.target.checked })}
            className="rounded border-gray-300 text-blue-600"
          />
          <span className="text-sm text-gray-700">
            Prevent duplicate leads (based on email/phone)
          </span>
        </label>
      </div>
    </div>
  )
}