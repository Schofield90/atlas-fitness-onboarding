'use client'

import { useState, useEffect, useCallback } from 'react'
import { ArrowRight, Zap, Check, X, AlertCircle, RefreshCw, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

interface FieldMapping {
  id: string
  facebook_field_name: string
  facebook_field_label: string
  facebook_field_type: string
  crm_field: string
  crm_field_type: 'standard' | 'custom'
  transformation?: {
    type: string
    options?: any
  }
  is_required: boolean
  auto_detected: boolean
}

interface CustomFieldMapping {
  id: string
  custom_field_name: string
  custom_field_type: string
  facebook_field_name: string
  transformation?: any
}

interface StoredFieldMappings {
  version: string
  created_at: string
  updated_at: string
  mappings: FieldMapping[]
  custom_mappings: CustomFieldMapping[]
  auto_create_contact: boolean
  default_lead_source: string
}

interface FacebookFormField {
  key: string
  label: string
  type: string
  required?: boolean
}

interface FieldMappingInterfaceProps {
  formId: string
  formName: string
  organizationId: string
  onSave?: (mappings: StoredFieldMappings) => void
  onCancel?: () => void
}

// Standard CRM fields available for mapping
const STANDARD_CRM_FIELDS = [
  { value: 'first_name', label: 'First Name', icon: '👤' },
  { value: 'last_name', label: 'Last Name', icon: '👤' },
  { value: 'email', label: 'Email', icon: '✉️' },
  { value: 'phone', label: 'Phone', icon: '📱' },
  { value: 'company', label: 'Company', icon: '🏢' },
  { value: 'address', label: 'Address', icon: '📍' },
  { value: 'city', label: 'City', icon: '🏙️' },
  { value: 'postcode', label: 'Postcode', icon: '📮' },
  { value: 'notes', label: 'Notes', icon: '📝' },
  { value: 'source', label: 'Lead Source', icon: '🔗' },
]

// Field type mappings for Facebook
const FACEBOOK_FIELD_TYPES: { [key: string]: string } = {
  'SHORT_ANSWER': 'Text',
  'PHONE_NUMBER': 'Phone',
  'EMAIL': 'Email',
  'MULTIPLE_CHOICE': 'Multiple Choice',
  'DATETIME': 'Date/Time',
  'NUMBER': 'Number',
  'URL': 'URL',
  'BOOLEAN': 'Yes/No'
}

export default function FieldMappingInterface({
  formId,
  formName,
  organizationId,
  onSave,
  onCancel
}: FieldMappingInterfaceProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formFields, setFormFields] = useState<FacebookFormField[]>([])
  const [mappings, setMappings] = useState<FieldMapping[]>([])
  const [customMappings, setCustomMappings] = useState<CustomFieldMapping[]>([])
  const [autoCreateContact, setAutoCreateContact] = useState(true)
  const [defaultLeadSource, setDefaultLeadSource] = useState('Facebook Lead Form')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [validationErrors, setValidationErrors] = useState<string[]>([])
  const [validationWarnings, setValidationWarnings] = useState<string[]>([])
  const [autoDetecting, setAutoDetecting] = useState(false)

  // Load existing mappings and form structure
  useEffect(() => {
    loadFieldMappings()
  }, [formId])

  const loadFieldMappings = async () => {
    try {
      setLoading(true)
      
      // Get existing mappings or auto-detect
      const response = await fetch(`/api/integrations/facebook/field-mappings?formId=${formId}`)
      const data = await response.json()
      
      if (data.mappings) {
        // Use existing mappings
        setMappings(data.mappings.mappings || [])
        setCustomMappings(data.mappings.custom_mappings || [])
        setAutoCreateContact(data.mappings.auto_create_contact ?? true)
        setDefaultLeadSource(data.mappings.default_lead_source || 'Facebook Lead Form')
      } else {
        // Auto-detect mappings
        await autoDetectMappings()
      }
      
      // Load form structure
      if (data.form_structure) {
        setFormFields(data.form_structure)
      }
      
    } catch (error) {
      console.error('Error loading field mappings:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshFormQuestions = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/integrations/facebook/refresh-form-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId })
      })
      
      const data = await response.json()
      
      if (data.success && data.questions) {
        setFormFields(data.questions)
        console.log(`Refreshed ${data.questions_count} form fields`)
        // Reload the mappings after refreshing questions
        await loadFieldMappings()
      } else {
        console.error('Failed to refresh form questions:', data.error)
      }
      
    } catch (error) {
      console.error('Error refreshing form questions:', error)
    } finally {
      setLoading(false)
    }
  }

  const autoDetectMappings = async () => {
    try {
      setAutoDetecting(true)
      
      const response = await fetch('/api/integrations/facebook/auto-detect-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId })
      })
      
      const data = await response.json()
      
      if (data.success && data.suggested_mappings) {
        setMappings(data.suggested_mappings.mappings)
        setCustomMappings(data.suggested_mappings.custom_mappings)
        setAutoCreateContact(data.suggested_mappings.auto_create_contact)
        setDefaultLeadSource(data.suggested_mappings.default_lead_source)
        
        // Set validation results
        if (data.validation) {
          setValidationErrors(data.validation.errors || [])
          setValidationWarnings(data.validation.warnings || [])
        }
      }
      
    } catch (error) {
      console.error('Error auto-detecting mappings:', error)
    } finally {
      setAutoDetecting(false)
    }
  }

  const updateMapping = (fieldName: string, newCrmField: string) => {
    setMappings(prev => prev.map(m => 
      m.facebook_field_name === fieldName 
        ? { ...m, crm_field: newCrmField, auto_detected: false }
        : m
    ))
  }

  const removeMapping = (fieldName: string) => {
    setMappings(prev => prev.filter(m => m.facebook_field_name !== fieldName))
  }

  const addCustomField = () => {
    const newCustomField: CustomFieldMapping = {
      id: `custom_${Date.now()}`,
      custom_field_name: '',
      custom_field_type: 'text',
      facebook_field_name: ''
    }
    setCustomMappings(prev => [...prev, newCustomField])
  }

  const updateCustomMapping = (id: string, updates: Partial<CustomFieldMapping>) => {
    setCustomMappings(prev => prev.map(m => 
      m.id === id ? { ...m, ...updates } : m
    ))
  }

  const removeCustomMapping = (id: string) => {
    setCustomMappings(prev => prev.filter(m => m.id !== id))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      const fieldMappings: StoredFieldMappings = {
        version: '1.0',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        mappings,
        custom_mappings: customMappings,
        auto_create_contact: autoCreateContact,
        default_lead_source: defaultLeadSource
      }
      
      const response = await fetch('/api/integrations/facebook/field-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId,
          mappings: fieldMappings
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        if (result.warnings) {
          setValidationWarnings(result.warnings)
        }
        if (onSave) {
          onSave(fieldMappings)
        }
      } else {
        setValidationErrors(result.validation_errors || ['Failed to save mappings'])
      }
      
    } catch (error) {
      console.error('Error saving field mappings:', error)
      setValidationErrors(['Failed to save field mappings'])
    } finally {
      setSaving(false)
    }
  }

  // Get unmapped fields
  const unmappedFields = formFields.filter(field => 
    !mappings.find(m => m.facebook_field_name === field.key) &&
    !customMappings.find(m => m.facebook_field_name === field.key)
  )

  // Get mapped CRM fields to prevent duplicates
  const mappedCrmFields = mappings.map(m => m.crm_field)

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2">Loading field mappings...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-2">Field Mapping Configuration</h2>
        <p className="text-gray-600">
          Map Facebook form fields to your CRM fields for: <strong>{formName}</strong>
        </p>
        
        {/* Action buttons */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={autoDetectMappings}
            disabled={autoDetecting || loading}
            className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            {autoDetecting ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Zap className="w-4 h-4 mr-2" />
            )}
            Auto-Detect Fields
          </button>
          
          {/* Refresh Form Fields button - shows when no fields are loaded */}
          {formFields.length === 0 && (
            <button
              onClick={refreshFormQuestions}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh Form Fields
            </button>
          )}
        </div>
      </div>

      {/* Validation Messages */}
      {(validationErrors.length > 0 || validationWarnings.length > 0) && (
        <div className="space-y-2">
          {validationErrors.map((error, i) => (
            <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start">
              <X className="w-5 h-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
              <span className="text-red-700">{error}</span>
            </div>
          ))}
          {validationWarnings.map((warning, i) => (
            <div key={i} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
              <span className="text-yellow-700">{warning}</span>
            </div>
          ))}
        </div>
      )}

      {/* Standard Field Mappings */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-medium mb-4">Standard Field Mappings</h3>
        
        {/* Show message when no form fields are available */}
        {formFields.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="font-medium mb-2">No form fields found</p>
            <p className="text-sm mb-4">
              The form structure hasn't been loaded from Facebook yet.
            </p>
            <button
              onClick={refreshFormQuestions}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Load Form Fields from Facebook
            </button>
          </div>
        ) : (
        <div className="space-y-3">
          {mappings.map((mapping) => (
            <div key={mapping.facebook_field_name} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
              {/* Facebook Field */}
              <div className="flex-1">
                <div className="text-sm text-gray-500">Facebook Field</div>
                <div className="font-medium">{mapping.facebook_field_label}</div>
                <div className="text-xs text-gray-400">
                  {FACEBOOK_FIELD_TYPES[mapping.facebook_field_type] || mapping.facebook_field_type}
                </div>
              </div>
              
              {/* Arrow */}
              <ArrowRight className="w-5 h-5 text-gray-400" />
              
              {/* CRM Field */}
              <div className="flex-1">
                <div className="text-sm text-gray-500">CRM Field</div>
                <select
                  value={mapping.crm_field}
                  onChange={(e) => updateMapping(mapping.facebook_field_name, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- Select Field --</option>
                  {STANDARD_CRM_FIELDS
                    .filter(field => !mappedCrmFields.includes(field.value) || field.value === mapping.crm_field)
                    .map(field => (
                      <option key={field.value} value={field.value}>
                        {field.icon} {field.label}
                      </option>
                    ))
                  }
                </select>
              </div>
              
              {/* Status */}
              <div className="flex items-center space-x-2">
                {mapping.auto_detected && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                    Auto-detected
                  </span>
                )}
                <button
                  onClick={() => removeMapping(mapping.facebook_field_name)}
                  className="p-1 text-red-500 hover:bg-red-50 rounded"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          
          {/* Add mapping for unmapped fields */}
          {unmappedFields.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700 mb-2">
                {unmappedFields.length} unmapped field{unmappedFields.length > 1 ? 's' : ''}
              </p>
              <select
                onChange={(e) => {
                  const field = unmappedFields.find(f => f.key === e.target.value)
                  if (field) {
                    const newMapping: FieldMapping = {
                      id: `map_${Date.now()}`,
                      facebook_field_name: field.key,
                      facebook_field_label: field.label,
                      facebook_field_type: field.type,
                      crm_field: '',
                      crm_field_type: 'standard',
                      is_required: field.required || false,
                      auto_detected: false
                    }
                    setMappings(prev => [...prev, newMapping])
                  }
                }}
                className="w-full px-3 py-2 border border-blue-200 rounded-lg"
                defaultValue=""
              >
                <option value="">+ Add field mapping</option>
                {unmappedFields.map(field => (
                  <option key={field.key} value={field.key}>
                    {field.label} ({FACEBOOK_FIELD_TYPES[field.type] || field.type})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        )}
      </div>

      {/* Custom Fields */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium">Custom Fields</h3>
          <button
            onClick={addCustomField}
            className="inline-flex items-center px-3 py-1 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Custom Field
          </button>
        </div>
        
        <div className="space-y-3">
          {customMappings.map((customMapping) => (
            <div key={customMapping.id} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
              {/* Facebook Field */}
              <div className="flex-1">
                <div className="text-sm text-gray-500">Facebook Field</div>
                <select
                  value={customMapping.facebook_field_name}
                  onChange={(e) => updateCustomMapping(customMapping.id, { facebook_field_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">-- Select Field --</option>
                  {unmappedFields.map(field => (
                    <option key={field.key} value={field.key}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Arrow */}
              <ArrowRight className="w-5 h-5 text-gray-400" />
              
              {/* Custom Field Name */}
              <div className="flex-1">
                <div className="text-sm text-gray-500">Custom Field Name</div>
                <input
                  type="text"
                  value={customMapping.custom_field_name}
                  onChange={(e) => updateCustomMapping(customMapping.id, { custom_field_name: e.target.value })}
                  placeholder="e.g. fitness_goals"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              
              {/* Remove */}
              <button
                onClick={() => removeCustomMapping(customMapping.id)}
                className="p-1 text-red-500 hover:bg-red-50 rounded"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          
          {customMappings.length === 0 && (
            <p className="text-gray-500 text-sm">
              No custom fields configured. Click "Add Custom Field" to map Facebook fields to custom CRM fields.
            </p>
          )}
        </div>
      </div>

      {/* Advanced Settings */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full"
        >
          <h3 className="text-lg font-medium">Advanced Settings</h3>
          {showAdvanced ? (
            <ChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {showAdvanced && (
          <div className="mt-4 space-y-4">
            <div>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={autoCreateContact}
                  onChange={(e) => setAutoCreateContact(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>Automatically create contact for every lead</span>
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Default Lead Source
              </label>
              <input
                type="text"
                value={defaultLeadSource}
                onChange={(e) => setDefaultLeadSource(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3">
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <>
              <RefreshCw className="w-4 h-4 inline mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Check className="w-4 h-4 inline mr-2" />
              Save Field Mappings
            </>
          )}
        </button>
      </div>
    </div>
  )
}