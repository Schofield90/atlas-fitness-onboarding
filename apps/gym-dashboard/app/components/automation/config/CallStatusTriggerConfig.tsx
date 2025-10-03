'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Phone, PhoneCall, PhoneIncoming, PhoneOutgoing, Plus, X, Clock } from 'lucide-react'

interface CallStatusTriggerConfigProps {
  config: any
  onChange: (config: any) => void
  organizationId: string
}

interface CallProvider {
  id: string
  name: string
  type: 'twilio' | 'ringcentral' | 'zoom' | 'custom'
  isConnected: boolean
  lastSync?: string
}

export default function CallStatusTriggerConfig({ config, onChange, organizationId }: CallStatusTriggerConfigProps) {
  const [triggerName, setTriggerName] = useState(config.name || 'Call Status Changed Trigger')
  const [callProviders, setCallProviders] = useState<CallProvider[]>([])
  const [filters, setFilters] = useState(config.filters || {
    statusChange: 'any_change', // 'any_change', 'specific_status', 'status_group'
    specificStatuses: [], // Array of specific statuses to watch
    statusGroup: 'all', // 'all', 'completed', 'missed', 'answered', 'failed'
    callDirection: 'any', // 'any', 'inbound', 'outbound'
    callDuration: 'any', // 'any', 'minimum', 'maximum', 'range'
    minDuration: 0, // seconds
    maxDuration: 0, // seconds
    callerFilters: [], // Array of caller number filters
    providerFilter: 'any' // 'any' or specific provider ID
  })
  const [additionalFilters, setAdditionalFilters] = useState(config.additionalFilters || [])
  const [loading, setLoading] = useState(true)

  // Common call statuses across different providers
  const callStatuses = [
    { value: 'initiated', label: 'Call Initiated', group: 'active' },
    { value: 'ringing', label: 'Ringing', group: 'active' },
    { value: 'in_progress', label: 'In Progress', group: 'active' },
    { value: 'answered', label: 'Answered', group: 'completed' },
    { value: 'completed', label: 'Completed', group: 'completed' },
    { value: 'missed', label: 'Missed', group: 'missed' },
    { value: 'busy', label: 'Busy', group: 'failed' },
    { value: 'failed', label: 'Failed', group: 'failed' },
    { value: 'no_answer', label: 'No Answer', group: 'missed' },
    { value: 'cancelled', label: 'Cancelled', group: 'failed' },
    { value: 'voicemail', label: 'Voicemail', group: 'completed' }
  ]

  useEffect(() => {
    if (config.name) {
      setTriggerName(config.name)
    }
  }, [])

  useEffect(() => {
    loadCallProviders()
  }, [organizationId])

  const loadCallProviders = async () => {
    try {
      setLoading(true)
      
      // Load connected call providers/integrations
      const response = await fetch('/api/integrations/call-providers')
      if (response.ok) {
        const data = await response.json()
        if (data.providers) {
          setCallProviders(data.providers)
        }
      } else {
        // Mock data for demo purposes
        setCallProviders([
          {
            id: 'twilio-1',
            name: 'Twilio Phone System',
            type: 'twilio',
            isConnected: true,
            lastSync: new Date().toISOString()
          },
          {
            id: 'ringcentral-1',
            name: 'RingCentral',
            type: 'ringcentral',
            isConnected: false
          }
        ])
      }
    } catch (error) {
      console.error('Error loading call providers:', error)
      setCallProviders([])
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onChange({ ...config, filters: newFilters })
  }

  const handleStatusSelection = (status: string) => {
    const currentStatuses = filters.specificStatuses
    let newStatuses
    
    if (currentStatuses.includes(status)) {
      newStatuses = currentStatuses.filter((s: string) => s !== status)
    } else {
      newStatuses = [...currentStatuses, status]
    }
    
    handleFilterChange('specificStatuses', newStatuses)
  }

  const addCallerFilter = () => {
    const newCallerFilter = {
      id: Date.now().toString(),
      type: 'number_contains', // 'number_contains', 'number_equals', 'area_code', 'contact_exists'
      value: ''
    }
    handleFilterChange('callerFilters', [...filters.callerFilters, newCallerFilter])
  }

  const updateCallerFilter = (id: string, updates: any) => {
    const updatedFilters = filters.callerFilters.map((f: any) => 
      f.id === id ? { ...f, ...updates } : f
    )
    handleFilterChange('callerFilters', updatedFilters)
  }

  const removeCallerFilter = (id: string) => {
    const updatedFilters = filters.callerFilters.filter((f: any) => f.id !== id)
    handleFilterChange('callerFilters', updatedFilters)
  }

  const addAdditionalFilter = () => {
    const newFilter = {
      id: Date.now().toString(),
      field: 'call.caller_id',
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

  const getStatusesByGroup = (group: string) => {
    return callStatuses.filter(status => status.group === group)
  }

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes`
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`
  }

  if (loading) {
    return <div className="p-4 text-center">Loading call providers...</div>
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

      {/* Call Status Configuration */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
            CALL STATUS TRIGGER SETTINGS
          </label>
          <p className="text-sm text-gray-500 mb-4">
            Configure triggers based on call status changes from your phone system
          </p>
        </div>

        {/* Call Providers Status */}
        {callProviders.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <Phone className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Call Providers Connected
            </h3>
            <p className="text-gray-600 mb-4">
              Connect a phone system to track call statuses and trigger workflows.
            </p>
            <a
              href="/integrations/call-providers"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Connect Phone System
            </a>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <PhoneCall className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-blue-800 font-medium">
                  {callProviders.filter(p => p.isConnected).length} of {callProviders.length} providers connected
                </span>
              </div>
              <a
                href="/integrations/call-providers"
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                Manage Providers
              </a>
            </div>
            <div className="mt-2 space-y-1">
              {callProviders.map(provider => (
                <div key={provider.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-700">{provider.name}</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    provider.isConnected 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {provider.isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Provider Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Call provider
            </label>
            <div className="relative">
              <select
                value={filters.providerFilter}
                onChange={(e) => handleFilterChange('providerFilter', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any connected provider</option>
                {callProviders.filter(p => p.isConnected).map(provider => (
                  <option key={provider.id} value={provider.id}>
                    {provider.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Status Change Type */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trigger when
            </label>
            <div className="relative">
              <select
                value={filters.statusChange}
                onChange={(e) => handleFilterChange('statusChange', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any_change">Any call status changes</option>
                <option value="specific_status">Specific statuses only</option>
                <option value="status_group">Status group changes</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Specific Status Selection */}
        {filters.statusChange === 'specific_status' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select call statuses to monitor
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto">
              {callStatuses.map(status => (
                <label
                  key={status.value}
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filters.specificStatuses.includes(status.value)}
                    onChange={() => handleStatusSelection(status.value)}
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">{status.label}</span>
                    <div className="text-xs text-gray-500 capitalize">
                      {status.group} calls
                    </div>
                  </div>
                </label>
              ))}
            </div>

            {/* Selected Statuses Display */}
            {filters.specificStatuses.length > 0 && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selected statuses ({filters.specificStatuses.length})
                </label>
                <div className="flex flex-wrap gap-2">
                  {filters.specificStatuses.map((statusValue: string) => {
                    const status = callStatuses.find(s => s.value === statusValue)
                    return (
                      <span
                        key={statusValue}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                      >
                        {status?.label || statusValue}
                        <button
                          type="button"
                          onClick={() => handleStatusSelection(statusValue)}
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
          </div>
        )}

        {/* Status Group Selection */}
        {filters.statusChange === 'status_group' && (
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status group
              </label>
              <div className="relative">
                <select
                  value={filters.statusGroup}
                  onChange={(e) => handleFilterChange('statusGroup', e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All calls</option>
                  <option value="completed">Completed calls</option>
                  <option value="missed">Missed calls</option>
                  <option value="answered">Answered calls</option>
                  <option value="failed">Failed calls</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {/* Call Direction */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Call direction
            </label>
            <div className="relative">
              <select
                value={filters.callDirection}
                onChange={(e) => handleFilterChange('callDirection', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any direction</option>
                <option value="inbound">Inbound calls only</option>
                <option value="outbound">Outbound calls only</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Call Duration Filters */}
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration filter
              </label>
              <div className="relative">
                <select
                  value={filters.callDuration}
                  onChange={(e) => handleFilterChange('callDuration', e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="any">Any duration</option>
                  <option value="minimum">Minimum duration</option>
                  <option value="maximum">Maximum duration</option>
                  <option value="range">Duration range</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Duration Inputs */}
          {filters.callDuration === 'minimum' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum duration (seconds)
              </label>
              <input
                type="number"
                value={filters.minDuration || 0}
                onChange={(e) => handleFilterChange('minDuration', parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0"
                min="0"
              />
            </div>
          )}

          {filters.callDuration === 'maximum' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum duration (seconds)
              </label>
              <input
                type="number"
                value={filters.maxDuration || 300}
                onChange={(e) => handleFilterChange('maxDuration', parseInt(e.target.value) || 300)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="300"
                min="0"
              />
            </div>
          )}

          {filters.callDuration === 'range' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum (seconds)
                </label>
                <input
                  type="number"
                  value={filters.minDuration || 0}
                  onChange={(e) => handleFilterChange('minDuration', parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum (seconds)
                </label>
                <input
                  type="number"
                  value={filters.maxDuration || 300}
                  onChange={(e) => handleFilterChange('maxDuration', parseInt(e.target.value) || 300)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="300"
                  min="0"
                />
              </div>
            </div>
          )}
        </div>

        {/* Caller Filters */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Caller filters (optional)
            </label>
            <button
              type="button"
              onClick={addCallerFilter}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Filter
            </button>
          </div>

          {filters.callerFilters.map((filter: any, index: number) => (
            <div key={filter.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <select
                value={filter.type}
                onChange={(e) => updateCallerFilter(filter.id, { type: e.target.value })}
                className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="number_contains">Number contains</option>
                <option value="number_equals">Number equals</option>
                <option value="area_code">Area code</option>
                <option value="contact_exists">Contact exists in CRM</option>
              </select>
              
              {filter.type !== 'contact_exists' && (
                <input
                  type="text"
                  value={filter.value}
                  onChange={(e) => updateCallerFilter(filter.id, { value: e.target.value })}
                  placeholder="Enter value..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              )}
              
              <button
                type="button"
                onClick={() => removeCallerFilter(filter.id)}
                className="text-red-600 hover:text-red-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
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
                  <option value="call.caller_id">Caller ID</option>
                  <option value="call.duration">Call Duration</option>
                  <option value="call.timestamp">Call Time</option>
                  <option value="call.recording_url">Recording Available</option>
                  <option value="call.transfer_count">Transfer Count</option>
                  <option value="contact.name">Contact Name</option>
                </select>
                
                <select
                  value={filter.operator}
                  onChange={(e) => updateAdditionalFilter(filter.id, { operator: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="equals">equals</option>
                  <option value="not_equals">not equals</option>
                  <option value="contains">contains</option>
                  <option value="greater_than">greater than</option>
                  <option value="less_than">less than</option>
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
          Add filters
        </button>
      </div>
    </div>
  )
}