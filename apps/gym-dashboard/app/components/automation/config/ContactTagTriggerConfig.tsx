'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Tag, Plus, X, Hash } from 'lucide-react'

interface ContactTagTriggerConfigProps {
  config: any
  onChange: (config: any) => void
  organizationId: string
}

interface TagInfo {
  id: string
  name: string
  color: string
  contactCount: number
}

export default function ContactTagTriggerConfig({ config, onChange, organizationId }: ContactTagTriggerConfigProps) {
  const [triggerName, setTriggerName] = useState(config.name || 'Contact Tagged Trigger')
  const [availableTags, setAvailableTags] = useState<TagInfo[]>([])
  const [filters, setFilters] = useState(config.filters || {
    triggerAction: 'tag_added', // 'tag_added', 'tag_removed', 'any_tag_change'
    specificTags: [], // Array of tag IDs to watch for
    tagCondition: 'any', // 'any', 'all', 'specific'
    excludedTags: [] // Tags that should not trigger this workflow
  })
  const [additionalFilters, setAdditionalFilters] = useState(config.additionalFilters || [])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (config.name) {
      setTriggerName(config.name)
    }
  }, [])

  useEffect(() => {
    loadAvailableTags()
  }, [organizationId])

  const loadAvailableTags = async () => {
    try {
      setLoading(true)
      
      // Load available tags from the system
      const tagsResponse = await fetch('/api/tags')
      if (tagsResponse.ok) {
        const tagsData = await tagsResponse.json()
        if (tagsData.tags) {
          setAvailableTags(tagsData.tags.map((tag: any) => ({
            id: tag.id,
            name: tag.name,
            color: tag.color || '#6B7280',
            contactCount: tag.contact_count || 0
          })))
        }
      } else {
        console.error('Failed to fetch tags')
      }
    } catch (error) {
      console.error('Error loading tags:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onChange({ ...config, filters: newFilters })
  }

  const handleTagSelection = (tagId: string, type: 'specific' | 'excluded') => {
    const currentTags = filters[type === 'specific' ? 'specificTags' : 'excludedTags']
    let newTags
    
    if (currentTags.includes(tagId)) {
      newTags = currentTags.filter((id: string) => id !== tagId)
    } else {
      newTags = [...currentTags, tagId]
    }
    
    handleFilterChange(type === 'specific' ? 'specificTags' : 'excludedTags', newTags)
  }

  const addAdditionalFilter = () => {
    const newFilter = {
      id: Date.now().toString(),
      field: 'contact.name',
      operator: 'contains',
      value: ''
    }
    setAdditionalFilters([...additionalFilters, newFilter])
    onChange({ ...config, additionalFilters: [...additionalFilters, newFilter] })
  }

  const updateAdditionalFilter = (id: string, updates: any) => {
    const updated = additionalFilters.map((f: any) => f.id === id ? { ...f, ...updates } : f)
    setAdditionalFilters(updated)
    onChange({ ...config, additionalFilters: updated })
  }

  const removeAdditionalFilter = (id: string) => {
    const updated = additionalFilters.filter((f: any) => f.id !== id)
    setAdditionalFilters(updated)
    onChange({ ...config, additionalFilters: updated })
  }

  const getSelectedTags = (tagIds: string[]) => {
    return availableTags.filter(tag => tagIds.includes(tag.id))
  }

  if (loading) {
    return <div className="p-4 text-center">Loading tags...</div>
  }

  return (
    <div className="space-y-6">
      {/* Trigger Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
          WORKFLOW TRIGGER NAME
        </label>
        <input
          type="text"
          value={triggerName}
          onChange={(e) => {
            setTriggerName(e.target.value)
            onChange({ ...config, name: e.target.value })
          }}
          placeholder="Enter trigger name"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {/* Tag Trigger Configuration */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
            TAG TRIGGER SETTINGS
          </label>
          <p className="text-sm text-gray-500 mb-4">
            Configure when to trigger based on contact tagging actions
          </p>
        </div>

        {/* Trigger Action */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trigger when
            </label>
            <div className="relative">
              <select
                value={filters.triggerAction}
                onChange={(e) => handleFilterChange('triggerAction', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="tag_added">A tag is added to contact</option>
                <option value="tag_removed">A tag is removed from contact</option>
                <option value="any_tag_change">Any tag is added or removed</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Tag Condition */}
        {filters.triggerAction !== 'any_tag_change' && (
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tag condition
              </label>
              <div className="relative">
                <select
                  value={filters.tagCondition}
                  onChange={(e) => handleFilterChange('tagCondition', e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="any">Any tag</option>
                  <option value="specific">Specific tags only</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {/* Available Tags Display */}
        {availableTags.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <Tag className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Tags Created Yet
            </h3>
            <p className="text-gray-600 mb-4">
              You need to create tags before you can use tag-based triggers.
            </p>
            <a
              href="/contacts/tags"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Manage Tags
            </a>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <Hash className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-blue-800 font-medium">
                {availableTags.length} tags available
              </span>
            </div>
          </div>
        )}

        {/* Specific Tags Selection */}
        {filters.tagCondition === 'specific' && availableTags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select specific tags to watch
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableTags.map(tag => (
                <label
                  key={tag.id}
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filters.specificTags.includes(tag.id)}
                    onChange={() => handleTagSelection(tag.id, 'specific')}
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex items-center flex-1">
                    <span
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: tag.color }}
                    />
                    <span className="text-sm font-medium text-gray-900">{tag.name}</span>
                    <span className="text-xs text-gray-500 ml-auto">
                      {tag.contactCount} contacts
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Selected Tags Display */}
        {filters.specificTags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selected tags ({filters.specificTags.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {getSelectedTags(filters.specificTags).map(tag => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                >
                  <span
                    className="w-2 h-2 rounded-full mr-2"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                  <button
                    type="button"
                    onClick={() => handleTagSelection(tag.id, 'specific')}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Additional Filters */}
        {additionalFilters.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Additional Filters</label>
            {additionalFilters.map((filter: any) => (
              <div key={filter.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <select
                  value={filter.field}
                  onChange={(e) => updateAdditionalFilter(filter.id, { field: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="contact.name">Contact Name</option>
                  <option value="contact.email">Contact Email</option>
                  <option value="contact.source">Contact Source</option>
                  <option value="contact.created_at">Created Date</option>
                </select>
                
                <select
                  value={filter.operator}
                  onChange={(e) => updateAdditionalFilter(filter.id, { operator: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="equals">equals</option>
                  <option value="not_equals">not equals</option>
                  <option value="contains">contains</option>
                  <option value="starts_with">starts with</option>
                  <option value="ends_with">ends with</option>
                </select>
                
                <input
                  type="text"
                  value={filter.value}
                  onChange={(e) => updateAdditionalFilter(filter.id, { value: e.target.value })}
                  placeholder="Value"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                
                <button
                  type="button"
                  onClick={() => removeAdditionalFilter(filter.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add More Filters */}
        <button
          type="button"
          onClick={addAdditionalFilter}
          className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
        >
          <Plus className="w-5 h-5 mr-1" />
          Add filters
        </button>
      </div>
    </div>
  )
}