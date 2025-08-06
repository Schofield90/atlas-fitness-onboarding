'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Webhook, Copy, Eye, EyeOff, Plus, X, AlertCircle, CheckCircle } from 'lucide-react'

interface WebhookTriggerConfigProps {
  config: any
  onChange: (config: any) => void
  organizationId: string
}

interface WebhookEndpoint {
  id: string
  url: string
  secret: string
  createdAt: string
  lastUsed?: string
  totalCalls: number
}

export default function WebhookTriggerConfig({ config, onChange, organizationId }: WebhookTriggerConfigProps) {
  const [triggerName, setTriggerName] = useState(config.name || 'Webhook Trigger')
  const [webhookEndpoints, setWebhookEndpoints] = useState<WebhookEndpoint[]>([])
  const [filters, setFilters] = useState(config.filters || {
    webhookSource: 'any', // 'any', 'specific_url', 'new_endpoint'
    selectedEndpointId: '',
    payloadValidation: 'none', // 'none', 'json_schema', 'required_fields'
    requiredFields: [], // Array of required field paths
    secretValidation: true
  })
  const [additionalFilters, setAdditionalFilters] = useState(config.additionalFilters || [])
  const [showSecret, setShowSecret] = useState(false)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (config.name) {
      setTriggerName(config.name)
    }
  }, [])

  useEffect(() => {
    loadWebhookEndpoints()
  }, [organizationId])

  const loadWebhookEndpoints = async () => {
    try {
      setLoading(true)
      
      // Load existing webhook endpoints
      const response = await fetch('/api/webhooks/endpoints')
      if (response.ok) {
        const data = await response.json()
        if (data.endpoints) {
          setWebhookEndpoints(data.endpoints)
        }
      } else {
        console.error('Failed to fetch webhook endpoints')
      }
    } catch (error) {
      console.error('Error loading webhook endpoints:', error)
    } finally {
      setLoading(false)
    }
  }

  const createNewEndpoint = async () => {
    try {
      setCreating(true)
      
      const response = await fetch('/api/webhooks/endpoints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          organizationId,
          name: `${triggerName} Endpoint`
        })
      })
      
      if (response.ok) {
        const newEndpoint = await response.json()
        setWebhookEndpoints([...webhookEndpoints, newEndpoint])
        handleFilterChange('selectedEndpointId', newEndpoint.id)
        handleFilterChange('webhookSource', 'specific_url')
      } else {
        console.error('Failed to create webhook endpoint')
      }
    } catch (error) {
      console.error('Error creating webhook endpoint:', error)
    } finally {
      setCreating(false)
    }
  }

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onChange({ ...config, filters: newFilters })
  }

  const handleRequiredFieldChange = (index: number, value: string) => {
    const newRequiredFields = [...filters.requiredFields]
    newRequiredFields[index] = value
    handleFilterChange('requiredFields', newRequiredFields)
  }

  const addRequiredField = () => {
    handleFilterChange('requiredFields', [...filters.requiredFields, ''])
  }

  const removeRequiredField = (index: number) => {
    const newRequiredFields = filters.requiredFields.filter((_: any, i: number) => i !== index)
    handleFilterChange('requiredFields', newRequiredFields)
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
  }

  const addAdditionalFilter = () => {
    const newFilter = {
      id: Date.now().toString(),
      field: 'payload.type',
      operator: 'equals',
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

  const getSelectedEndpoint = () => {
    return webhookEndpoints.find(ep => ep.id === filters.selectedEndpointId)
  }

  if (loading) {
    return <div className="p-4 text-center">Loading webhook endpoints...</div>
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

      {/* Webhook Configuration */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
            WEBHOOK TRIGGER SETTINGS
          </label>
          <p className="text-sm text-gray-500 mb-4">
            Configure webhook endpoints and payload validation
          </p>
        </div>

        {/* Webhook Source */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Webhook source
            </label>
            <div className="relative">
              <select
                value={filters.webhookSource}
                onChange={(e) => handleFilterChange('webhookSource', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any webhook endpoint</option>
                <option value="specific_url">Specific endpoint only</option>
                <option value="new_endpoint">Create new endpoint</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Webhook Endpoints Display */}
        {webhookEndpoints.length === 0 && filters.webhookSource !== 'new_endpoint' ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <Webhook className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Webhook Endpoints Found
            </h3>
            <p className="text-gray-600 mb-4">
              You need to create a webhook endpoint to receive external data.
            </p>
            <button
              onClick={createNewEndpoint}
              disabled={creating}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Webhook Endpoint'}
            </button>
          </div>
        ) : (
          <>
            {/* Existing Endpoints */}
            {webhookEndpoints.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Webhook className="w-5 h-5 text-blue-600 mr-2" />
                    <span className="text-blue-800 font-medium">
                      {webhookEndpoints.length} webhook endpoints available
                    </span>
                  </div>
                  <button
                    onClick={createNewEndpoint}
                    disabled={creating}
                    className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : '+ New Endpoint'}
                  </button>
                </div>
              </div>
            )}

            {/* Specific Endpoint Selection */}
            {filters.webhookSource === 'specific_url' && webhookEndpoints.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select webhook endpoint
                </label>
                <div className="space-y-2">
                  {webhookEndpoints.map(endpoint => (
                    <label
                      key={endpoint.id}
                      className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="webhook-endpoint"
                        value={endpoint.id}
                        checked={filters.selectedEndpointId === endpoint.id}
                        onChange={(e) => handleFilterChange('selectedEndpointId', e.target.value)}
                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                      />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {endpoint.url}
                            </div>
                            <div className="text-xs text-gray-500">
                              Created {new Date(endpoint.createdAt).toLocaleDateString()}
                              {endpoint.lastUsed && ` • Last used ${new Date(endpoint.lastUsed).toLocaleDateString()}`}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">
                              {endpoint.totalCalls} calls
                            </div>
                          </div>
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Selected Endpoint Details */}
            {filters.selectedEndpointId && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Webhook Endpoint Details</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">URL</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={getSelectedEndpoint()?.url || ''}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded bg-white text-sm"
                      />
                      <button
                        onClick={() => copyToClipboard(getSelectedEndpoint()?.url || '')}
                        className="px-3 py-2 text-gray-600 hover:text-gray-800"
                        title="Copy URL"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Secret</label>
                    <div className="flex items-center gap-2">
                      <input
                        type={showSecret ? 'text' : 'password'}
                        value={getSelectedEndpoint()?.secret || ''}
                        readOnly
                        className="flex-1 px-3 py-2 border border-gray-300 rounded bg-white text-sm"
                      />
                      <button
                        onClick={() => setShowSecret(!showSecret)}
                        className="px-3 py-2 text-gray-600 hover:text-gray-800"
                        title="Toggle secret visibility"
                      >
                        {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => copyToClipboard(getSelectedEndpoint()?.secret || '')}
                        className="px-3 py-2 text-gray-600 hover:text-gray-800"
                        title="Copy secret"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Payload Validation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payload validation
              </label>
              <div className="relative">
                <select
                  value={filters.payloadValidation}
                  onChange={(e) => handleFilterChange('payloadValidation', e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="none">No validation</option>
                  <option value="required_fields">Required fields only</option>
                  <option value="json_schema">JSON schema validation</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Required Fields Configuration */}
            {filters.payloadValidation === 'required_fields' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Required fields in webhook payload
                </label>
                <div className="space-y-2">
                  {filters.requiredFields.map((field: string, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={field}
                        onChange={(e) => handleRequiredFieldChange(index, e.target.value)}
                        placeholder="e.g., data.user.email"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeRequiredField(index)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={addRequiredField}
                    className="text-blue-600 hover:text-blue-700 font-medium flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add required field
                  </button>
                </div>
              </div>
            )}

            {/* Secret Validation Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="secret-validation"
                checked={filters.secretValidation}
                onChange={(e) => handleFilterChange('secretValidation', e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="secret-validation" className="ml-2 text-sm text-gray-700">
                Validate webhook secret for security
              </label>
            </div>
          </>
        )}

        {/* Additional Filters */}
        {additionalFilters.length > 0 && (
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Payload Filters</label>
            {additionalFilters.map((filter: any) => (
              <div key={filter.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <input
                  type="text"
                  value={filter.field}
                  onChange={(e) => updateAdditionalFilter(filter.id, { field: e.target.value })}
                  placeholder="payload.data.type"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                
                <select
                  value={filter.operator}
                  onChange={(e) => updateAdditionalFilter(filter.id, { operator: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="equals">equals</option>
                  <option value="not_equals">not equals</option>
                  <option value="contains">contains</option>
                  <option value="exists">exists</option>
                  <option value="not_exists">not exists</option>
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
          Add payload filters
        </button>
      </div>
    </div>
  )
}