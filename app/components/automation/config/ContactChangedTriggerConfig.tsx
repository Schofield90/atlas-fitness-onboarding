'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, UserCheck, Plus, X, AlertCircle } from 'lucide-react'

interface ContactChangedTriggerConfigProps {
  config: any
  onChange: (config: any) => void
  organizationId: string
}

interface ContactField {
  id: string
  name: string
  label: string
  type: 'text' | 'email' | 'phone' | 'date' | 'number' | 'boolean' | 'select'
  required: boolean
}

export default function ContactChangedTriggerConfig({ config, onChange, organizationId }: ContactChangedTriggerConfigProps) {
  const [triggerName, setTriggerName] = useState(config.name || 'Contact Changed Trigger')
  const [contactFields, setContactFields] = useState<ContactField[]>([])
  const [filters, setFilters] = useState(config.filters || {
    changeType: 'any_change', // 'any_change', 'field_changed', 'field_added', 'field_removed'
    watchedFields: [], // Array of field names to watch
    changeCondition: 'any', // 'any', 'all', 'specific'
    excludeFields: [], // Fields to ignore
    valueComparison: 'any_change' // 'any_change', 'specific_values', 'range_change'
  })
  const [additionalFilters, setAdditionalFilters] = useState(config.additionalFilters || [])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (config.name) {
      setTriggerName(config.name)
    }
  }, [])

  useEffect(() => {
    loadContactFields()
  }, [organizationId])

  const loadContactFields = async () => {
    try {
      setLoading(true)
      
      // Load available contact fields/schema
      const response = await fetch('/api/contacts/fields')
      if (response.ok) {
        const data = await response.json()
        if (data.fields) {
          setContactFields(data.fields.map((field: any) => ({
            id: field.id || field.name,
            name: field.name,
            label: field.label || field.name,
            type: field.type || 'text',
            required: field.required || false
          })))
        }
      } else {
        // Default contact fields if API is not available
        setContactFields([
          { id: 'name', name: 'name', label: 'Full Name', type: 'text', required: false },
          { id: 'email', name: 'email', label: 'Email Address', type: 'email', required: false },
          { id: 'phone', name: 'phone', label: 'Phone Number', type: 'phone', required: false },
          { id: 'company', name: 'company', label: 'Company', type: 'text', required: false },
          { id: 'source', name: 'source', label: 'Lead Source', type: 'text', required: false },
          { id: 'status', name: 'status', label: 'Status', type: 'select', required: false },
          { id: 'created_at', name: 'created_at', label: 'Created Date', type: 'date', required: false },
          { id: 'updated_at', name: 'updated_at', label: 'Updated Date', type: 'date', required: false }
        ])
      }
    } catch (error) {
      console.error('Error loading contact fields:', error)
      // Set default fields on error
      setContactFields([
        { id: 'name', name: 'name', label: 'Full Name', type: 'text', required: false },
        { id: 'email', name: 'email', label: 'Email Address', type: 'email', required: false },
        { id: 'phone', name: 'phone', label: 'Phone Number', type: 'phone', required: false }
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onChange({ ...config, filters: newFilters })
  }

  const handleFieldSelection = (fieldName: string, type: 'watched' | 'excluded') => {
    const currentFields = filters[type === 'watched' ? 'watchedFields' : 'excludeFields']
    let newFields
    
    if (currentFields.includes(fieldName)) {
      newFields = currentFields.filter((name: string) => name !== fieldName)
    } else {
      newFields = [...currentFields, fieldName]
    }
    
    handleFilterChange(type === 'watched' ? 'watchedFields' : 'excludeFields', newFields)
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

  const getFieldByName = (name: string) => {
    return contactFields.find(field => field.name === name)
  }

  if (loading) {
    return <div className="p-4 text-center">Loading contact fields...</div>
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

      {/* Contact Change Configuration */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
            CONTACT CHANGE TRIGGER SETTINGS
          </label>
          <p className="text-sm text-gray-500 mb-4">
            Configure when to trigger based on contact information changes
          </p>
        </div>

        {/* Change Type */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trigger when
            </label>
            <div className="relative">
              <select
                value={filters.changeType}
                onChange={(e) => handleFilterChange('changeType', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any_change">Any field is changed</option>
                <option value="field_changed">Specific fields are changed</option>
                <option value="field_added">New field value is added</option>
                <option value="field_removed">Field value is removed/cleared</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Change Condition */}
        {filters.changeType === 'field_changed' && (
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Field condition
              </label>
              <div className="relative">
                <select
                  value={filters.changeCondition}
                  onChange={(e) => handleFilterChange('changeCondition', e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="any">Any watched field changes</option>
                  <option value="all">All watched fields change</option>
                  <option value="specific">Specific field combinations</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {/* Contact Fields Display */}
        {contactFields.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Contact Fields Found
            </h3>
            <p className="text-gray-600 mb-4">
              Unable to load contact field structure. Using default fields.
            </p>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <UserCheck className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-blue-800 font-medium">
                {contactFields.length} contact fields available to monitor
              </span>
            </div>
          </div>
        )}

        {/* Field Selection */}
        {(filters.changeType === 'field_changed' || filters.changeType === 'field_added' || filters.changeType === 'field_removed') && contactFields.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select fields to monitor
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {contactFields.map(field => (
                <label
                  key={field.id}
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filters.watchedFields.includes(field.name)}
                    onChange={() => handleFieldSelection(field.name, 'watched')}
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">{field.label}</span>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span className="capitalize">{field.type}</span>
                      {field.required && (
                        <span className="bg-red-100 text-red-600 px-1 rounded">Required</span>
                      )}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Selected Fields Display */}
        {filters.watchedFields.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Monitored fields ({filters.watchedFields.length})
            </label>
            <div className="flex flex-wrap gap-2">
              {filters.watchedFields.map((fieldName: string) => {
                const field = getFieldByName(fieldName)
                return (
                  <span
                    key={fieldName}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                  >
                    {field?.label || fieldName}
                    <button
                      type="button"
                      onClick={() => handleFieldSelection(fieldName, 'watched')}
                      className="ml-2 text-blue-600 hover:text-blue-800"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )
              })}
            </div>
          </div>
        )}

        {/* Exclude Fields */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Exclude fields from monitoring (optional)
          </label>
          <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
            {contactFields
              .filter(field => !filters.watchedFields.includes(field.name))
              .map(field => (
                <label
                  key={field.id}
                  className="flex items-center p-2 border border-gray-200 rounded hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filters.excludeFields.includes(field.name)}
                    onChange={() => handleFieldSelection(field.name, 'excluded')}
                    className="mr-2 h-3 w-3 text-gray-600 focus:ring-gray-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{field.label}</span>
                </label>
              ))
            }
          </div>
        </div>

        {/* Value Comparison */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Value change detection
            </label>
            <div className="relative">
              <select
                value={filters.valueComparison}
                onChange={(e) => handleFilterChange('valueComparison', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any_change">Any value change</option>
                <option value="specific_values">Only specific values</option>
                <option value="range_change">Value range changes</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

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
                  <option value="change.timestamp">Change Timestamp</option>
                  <option value="change.user">Changed By User</option>
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