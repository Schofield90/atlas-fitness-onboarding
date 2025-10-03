'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Plus, X, FileText, Globe, ExternalLink, AlertCircle } from 'lucide-react'

interface FormSubmittedTriggerConfigProps {
  config: any
  onChange: (config: any) => void
  organizationId: string
}

interface Form {
  id: string
  name: string
  type: 'website' | 'landing_page' | 'popup' | 'embedded'
  url?: string
  submissionsCount: number
  isActive: boolean
  fields: FormField[]
}

interface FormField {
  id: string
  name: string
  label: string
  type: 'text' | 'email' | 'phone' | 'select' | 'textarea' | 'checkbox' | 'radio'
  required: boolean
}

export default function FormSubmittedTriggerConfig({ config, onChange, organizationId }: FormSubmittedTriggerConfigProps) {
  const [triggerName, setTriggerName] = useState(config.name || 'Form Submitted Trigger')
  const [forms, setForms] = useState<Form[]>([])
  const [filters, setFilters] = useState(config.filters || {
    formId: 'any', // 'any', specific form id
    formType: 'any', // 'any', 'website', 'landing_page', 'popup', 'embedded'
    submissionSource: 'any', // 'any', 'direct', 'referral', 'social', 'email', 'ads'
    requiredFields: [], // array of field names that must be filled
    fieldValues: [], // array of { field, operator, value } for field value conditions
    duplicateHandling: 'allow', // 'allow', 'skip', 'update'
    minFieldsCompleted: 0 // minimum number of fields that must be completed
  })
  const [additionalFilters, setAdditionalFilters] = useState(config.additionalFilters || [])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (config.name) {
      setTriggerName(config.name)
    }
  }, [])

  useEffect(() => {
    loadAvailableForms()
  }, [organizationId])

  const loadAvailableForms = async () => {
    try {
      setLoading(true)
      
      // Load available forms
      const formsResponse = await fetch('/api/forms')
      if (formsResponse.ok) {
        const formsData = await formsResponse.json()
        if (formsData.forms) {
          setForms(formsData.forms.map((form: any) => ({
            id: form.id,
            name: form.name,
            type: form.type || 'website',
            url: form.url,
            submissionsCount: form.submissions_count || 0,
            isActive: form.is_active !== false,
            fields: form.fields?.map((field: any) => ({
              id: field.id,
              name: field.name,
              label: field.label || field.name,
              type: field.type || 'text',
              required: field.required || false
            })) || []
          })))
        }
      } else {
        // Default forms if API is not available
        setForms([
          {
            id: 'contact_form',
            name: 'Contact Form',
            type: 'website',
            submissionsCount: 0,
            isActive: true,
            fields: [
              { id: 'name', name: 'name', label: 'Name', type: 'text', required: true },
              { id: 'email', name: 'email', label: 'Email', type: 'email', required: true },
              { id: 'message', name: 'message', label: 'Message', type: 'textarea', required: false }
            ]
          },
          {
            id: 'signup_form',
            name: 'Newsletter Signup',
            type: 'popup',
            submissionsCount: 0,
            isActive: true,
            fields: [
              { id: 'email', name: 'email', label: 'Email Address', type: 'email', required: true },
              { id: 'interests', name: 'interests', label: 'Interests', type: 'checkbox', required: false }
            ]
          }
        ])
      }
    } catch (error) {
      console.error('Error loading forms:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onChange({ ...config, filters: newFilters })
  }

  const handleRequiredFieldToggle = (fieldName: string) => {
    const currentFields = filters.requiredFields || []
    let newFields
    
    if (currentFields.includes(fieldName)) {
      newFields = currentFields.filter((name: string) => name !== fieldName)
    } else {
      newFields = [...currentFields, fieldName]
    }
    
    handleFilterChange('requiredFields', newFields)
  }

  const addFieldValueFilter = () => {
    const selectedForm = getSelectedForm()
    if (!selectedForm || selectedForm.fields.length === 0) return

    const newFieldValue = {
      id: Date.now().toString(),
      field: selectedForm.fields[0].name,
      operator: 'equals',
      value: ''
    }
    
    const currentFieldValues = filters.fieldValues || []
    handleFilterChange('fieldValues', [...currentFieldValues, newFieldValue])
  }

  const updateFieldValueFilter = (id: string, updates: any) => {
    const currentFieldValues = filters.fieldValues || []
    const updated = currentFieldValues.map((f: any) => f.id === id ? { ...f, ...updates } : f)
    handleFilterChange('fieldValues', updated)
  }

  const removeFieldValueFilter = (id: string) => {
    const currentFieldValues = filters.fieldValues || []
    const updated = currentFieldValues.filter((f: any) => f.id !== id)
    handleFilterChange('fieldValues', updated)
  }

  const addAdditionalFilter = () => {
    const newFilter = {
      id: Date.now().toString(),
      field: 'submission.created_at',
      operator: 'greater_than',
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

  const getSelectedForm = () => {
    return forms.find(form => form.id === filters.formId)
  }

  const getFormTypeDisplay = (type: string) => {
    switch (type) {
      case 'website': return 'Website Form'
      case 'landing_page': return 'Landing Page'
      case 'popup': return 'Popup Form'
      case 'embedded': return 'Embedded Form'
      default: return type
    }
  }

  if (loading) {
    return <div className="p-4 text-center">Loading forms configuration...</div>
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

      {/* Form Configuration */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
            FORM SUBMISSION TRIGGER SETTINGS
          </label>
          <p className="text-sm text-gray-500 mb-4">
            Configure when to trigger based on form submissions
          </p>
        </div>

        {/* Forms Display */}
        {forms.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Forms Created
            </h3>
            <p className="text-gray-600 mb-4">
              You need to create forms before you can use form submission triggers.
            </p>
            <a
              href="/forms"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Form
            </a>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <FileText className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-blue-800 font-medium">
                {forms.length} forms available for triggers
              </span>
            </div>
          </div>
        )}

        {forms.length > 0 && (
          <>
            {/* Form Selection */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Specific form
                </label>
                <div className="relative">
                  <select
                    value={filters.formId}
                    onChange={(e) => handleFilterChange('formId', e.target.value)}
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="any">Any form</option>
                    {forms.map(form => (
                      <option key={form.id} value={form.id}>
                        {form.name} ({getFormTypeDisplay(form.type)})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex-1">
                <div className={`px-4 py-3 rounded-lg block text-center ${
                  filters.formId !== 'any' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {getSelectedForm()?.name || 'Any'}
                  {getSelectedForm() && (
                    <div className="text-xs mt-1">
                      {getSelectedForm()!.submissionsCount} submissions
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Form Type Filter */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Form type
                </label>
                <div className="relative">
                  <select
                    value={filters.formType}
                    onChange={(e) => handleFilterChange('formType', e.target.value)}
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="any">Any form type</option>
                    <option value="website">Website forms</option>
                    <option value="landing_page">Landing page forms</option>
                    <option value="popup">Popup forms</option>
                    <option value="embedded">Embedded forms</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex-1">
                <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg block text-center">
                  {filters.formType === 'any' ? 'Any' : getFormTypeDisplay(filters.formType)}
                </span>
              </div>
            </div>

            {/* Submission Source Filter */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Submission source
                </label>
                <div className="relative">
                  <select
                    value={filters.submissionSource}
                    onChange={(e) => handleFilterChange('submissionSource', e.target.value)}
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="any">Any source</option>
                    <option value="direct">Direct traffic</option>
                    <option value="referral">Referral traffic</option>
                    <option value="social">Social media</option>
                    <option value="email">Email campaigns</option>
                    <option value="ads">Paid advertisements</option>
                    <option value="organic">Organic search</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex-1">
                <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg block text-center capitalize">
                  {filters.submissionSource === 'any' ? 'Any' : filters.submissionSource}
                </span>
              </div>
            </div>

            {/* Duplicate Handling */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Duplicate submissions
                </label>
                <div className="relative">
                  <select
                    value={filters.duplicateHandling}
                    onChange={(e) => handleFilterChange('duplicateHandling', e.target.value)}
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="allow">Allow all submissions</option>
                    <option value="skip">Skip duplicate emails</option>
                    <option value="update">Update existing contacts</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="flex-1">
                <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg block text-center">
                  {filters.duplicateHandling === 'allow' ? 'Allow all' :
                   filters.duplicateHandling === 'skip' ? 'Skip duplicates' :
                   filters.duplicateHandling === 'update' ? 'Update existing' :
                   'Allow all'}
                </span>
              </div>
            </div>

            {/* Minimum Fields Completed */}
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum fields completed
                </label>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={filters.minFieldsCompleted}
                  onChange={(e) => handleFilterChange('minFieldsCompleted', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="flex-1">
                <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg block text-center">
                  {filters.minFieldsCompleted === 0 ? 'Any number' : `At least ${filters.minFieldsCompleted}`}
                </span>
              </div>
            </div>

            {/* Required Fields (only show for specific form) */}
            {filters.formId !== 'any' && getSelectedForm() && getSelectedForm()!.fields.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required fields to be completed
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {getSelectedForm()!.fields.map(field => (
                    <label
                      key={field.id}
                      className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={(filters.requiredFields || []).includes(field.name)}
                        onChange={() => handleRequiredFieldToggle(field.name)}
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

            {/* Field Value Conditions */}
            {filters.formId !== 'any' && getSelectedForm() && getSelectedForm()!.fields.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-sm font-medium text-gray-700">
                    Field value conditions
                  </label>
                  <button
                    type="button"
                    onClick={addFieldValueFilter}
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center text-sm"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add condition
                  </button>
                </div>

                {(filters.fieldValues || []).map((fieldValue: any) => (
                  <div key={fieldValue.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <select
                      value={fieldValue.field}
                      onChange={(e) => updateFieldValueFilter(fieldValue.id, { field: e.target.value })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {getSelectedForm()!.fields.map(field => (
                        <option key={field.id} value={field.name}>{field.label}</option>
                      ))}
                    </select>
                    
                    <select
                      value={fieldValue.operator}
                      onChange={(e) => updateFieldValueFilter(fieldValue.id, { operator: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="equals">equals</option>
                      <option value="not_equals">not equals</option>
                      <option value="contains">contains</option>
                      <option value="starts_with">starts with</option>
                      <option value="ends_with">ends with</option>
                      <option value="is_empty">is empty</option>
                      <option value="is_not_empty">is not empty</option>
                    </select>
                    
                    <input
                      type="text"
                      value={fieldValue.value}
                      onChange={(e) => updateFieldValueFilter(fieldValue.id, { value: e.target.value })}
                      placeholder="Value"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    
                    <button
                      type="button"
                      onClick={() => removeFieldValueFilter(fieldValue.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
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
                      <option value="submission.created_at">Submission Date</option>
                      <option value="submission.ip_address">IP Address</option>
                      <option value="submission.user_agent">User Agent</option>
                      <option value="submission.referrer">Referrer URL</option>
                      <option value="form.name">Form Name</option>
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
                      <option value="greater_than">greater than</option>
                      <option value="less_than">less than</option>
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
          </>
        )}
      </div>
    </div>
  )
}