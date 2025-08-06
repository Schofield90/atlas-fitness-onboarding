'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Target, DollarSign, Plus, X, Calendar, User } from 'lucide-react'

interface OpportunityCreatedTriggerConfigProps {
  config: any
  onChange: (config: any) => void
  organizationId: string
}

interface OpportunityPipeline {
  id: string
  name: string
  stages: OpportunityStage[]
  isActive: boolean
}

interface OpportunityStage {
  id: string
  name: string
  order: number
  probability: number
}

interface OpportunitySource {
  id: string
  name: string
  type: 'manual' | 'web_form' | 'integration' | 'import'
  isActive: boolean
}

export default function OpportunityCreatedTriggerConfig({ config, onChange, organizationId }: OpportunityCreatedTriggerConfigProps) {
  const [triggerName, setTriggerName] = useState(config.name || 'Opportunity Created Trigger')
  const [pipelines, setPipelines] = useState<OpportunityPipeline[]>([])
  const [sources, setSources] = useState<OpportunitySource[]>([])
  const [filters, setFilters] = useState(config.filters || {
    pipelineFilter: 'any', // 'any' or specific pipeline ID
    stageFilter: 'any', // 'any' or specific stage ID
    sourceFilter: 'any', // 'any' or specific source ID
    valueFilter: 'any', // 'any', 'minimum', 'maximum', 'range'
    minValue: 0,
    maxValue: 0,
    assigneeFilter: 'any', // 'any', 'specific_user', 'unassigned'
    assigneeId: '',
    priorityFilter: 'any', // 'any', 'high', 'medium', 'low'
    tagFilters: [], // Array of required tags
    dateFilter: 'any', // 'any', 'today', 'this_week', 'this_month'
    customFields: [] // Array of custom field filters
  })
  const [additionalFilters, setAdditionalFilters] = useState(config.additionalFilters || [])
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<Array<{id: string, name: string, email: string}>>([])

  useEffect(() => {
    if (config.name) {
      setTriggerName(config.name)
    }
  }, [])

  useEffect(() => {
    loadOpportunityData()
    loadUsers()
  }, [organizationId])

  const loadOpportunityData = async () => {
    try {
      setLoading(true)
      
      // Load pipelines and sources
      const [pipelinesResponse, sourcesResponse] = await Promise.all([
        fetch('/api/opportunities/pipelines'),
        fetch('/api/opportunities/sources')
      ])
      
      if (pipelinesResponse.ok) {
        const pipelinesData = await pipelinesResponse.json()
        if (pipelinesData.pipelines) {
          setPipelines(pipelinesData.pipelines)
        }
      } else {
        // Mock pipelines
        setPipelines([
          {
            id: 'sales-pipeline',
            name: 'Sales Pipeline',
            isActive: true,
            stages: [
              { id: 'lead', name: 'Lead', order: 1, probability: 10 },
              { id: 'qualified', name: 'Qualified', order: 2, probability: 25 },
              { id: 'proposal', name: 'Proposal', order: 3, probability: 50 },
              { id: 'negotiation', name: 'Negotiation', order: 4, probability: 75 },
              { id: 'closed-won', name: 'Closed Won', order: 5, probability: 100 }
            ]
          },
          {
            id: 'membership-pipeline',
            name: 'Membership Pipeline',
            isActive: true,
            stages: [
              { id: 'inquiry', name: 'Inquiry', order: 1, probability: 10 },
              { id: 'tour-scheduled', name: 'Tour Scheduled', order: 2, probability: 30 },
              { id: 'tour-completed', name: 'Tour Completed', order: 3, probability: 60 },
              { id: 'member', name: 'Member', order: 4, probability: 100 }
            ]
          }
        ])
      }
      
      if (sourcesResponse.ok) {
        const sourcesData = await sourcesResponse.json()
        if (sourcesData.sources) {
          setSources(sourcesData.sources)
        }
      } else {
        // Mock sources
        setSources([
          { id: 'website', name: 'Website Form', type: 'web_form', isActive: true },
          { id: 'manual', name: 'Manual Entry', type: 'manual', isActive: true },
          { id: 'referral', name: 'Referral', type: 'manual', isActive: true },
          { id: 'facebook', name: 'Facebook Ads', type: 'integration', isActive: true },
          { id: 'google', name: 'Google Ads', type: 'integration', isActive: true }
        ])
      }
    } catch (error) {
      console.error('Error loading opportunity data:', error)
      setPipelines([])
      setSources([])
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        if (data.users) {
          setUsers(data.users)
        }
      } else {
        // Mock users
        setUsers([
          { id: 'user-1', name: 'John Smith', email: 'john@gym.com' },
          { id: 'user-2', name: 'Sarah Johnson', email: 'sarah@gym.com' },
          { id: 'user-3', name: 'Mike Wilson', email: 'mike@gym.com' }
        ])
      }
    } catch (error) {
      console.error('Error loading users:', error)
      setUsers([])
    }
  }

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onChange({ ...config, filters: newFilters })
  }

  const addTagFilter = () => {
    const newTag = ''
    handleFilterChange('tagFilters', [...filters.tagFilters, newTag])
  }

  const updateTagFilter = (index: number, value: string) => {
    const newTags = [...filters.tagFilters]
    newTags[index] = value
    handleFilterChange('tagFilters', newTags)
  }

  const removeTagFilter = (index: number) => {
    const newTags = filters.tagFilters.filter((_: any, i: number) => i !== index)
    handleFilterChange('tagFilters', newTags)
  }

  const addCustomFieldFilter = () => {
    const newFilter = {
      id: Date.now().toString(),
      field: '',
      operator: 'equals',
      value: ''
    }
    handleFilterChange('customFields', [...filters.customFields, newFilter])
  }

  const updateCustomFieldFilter = (id: string, updates: any) => {
    const updated = filters.customFields.map((f: any) => 
      f.id === id ? { ...f, ...updates } : f
    )
    handleFilterChange('customFields', updated)
  }

  const removeCustomFieldFilter = (id: string) => {
    const updated = filters.customFields.filter((f: any) => f.id !== id)
    handleFilterChange('customFields', updated)
  }

  const addAdditionalFilter = () => {
    const newFilter = {
      id: Date.now().toString(),
      field: 'opportunity.name',
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

  const getSelectedPipeline = () => {
    return pipelines.find(p => p.id === filters.pipelineFilter)
  }

  const getAvailableStages = () => {
    const selectedPipeline = getSelectedPipeline()
    return selectedPipeline ? selectedPipeline.stages : []
  }

  if (loading) {
    return <div className="p-4 text-center">Loading opportunity configuration...</div>
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

      {/* Opportunity Created Configuration */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
            OPPORTUNITY CREATED TRIGGER SETTINGS
          </label>
          <p className="text-sm text-gray-500 mb-4">
            Configure triggers for when new opportunities are created in your sales pipeline
          </p>
        </div>

        {/* Pipeline and Stage Information */}
        {pipelines.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <Target className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Sales Pipelines Found
            </h3>
            <p className="text-gray-600 mb-4">
              You need to create sales pipelines to track opportunities.
            </p>
            <a
              href="/opportunities/pipelines"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Create Pipeline
            </a>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <Target className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-blue-800 font-medium">
                {pipelines.length} sales pipelines available
              </span>
            </div>
          </div>
        )}

        {/* Pipeline Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sales pipeline
            </label>
            <div className="relative">
              <select
                value={filters.pipelineFilter}
                onChange={(e) => {
                  handleFilterChange('pipelineFilter', e.target.value)
                  // Reset stage filter when pipeline changes
                  if (e.target.value !== filters.pipelineFilter) {
                    handleFilterChange('stageFilter', 'any')
                  }
                }}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any pipeline</option>
                {pipelines.map(pipeline => (
                  <option key={pipeline.id} value={pipeline.id}>
                    {pipeline.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Stage Filter */}
        {filters.pipelineFilter !== 'any' && (
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Initial stage
              </label>
              <div className="relative">
                <select
                  value={filters.stageFilter}
                  onChange={(e) => handleFilterChange('stageFilter', e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="any">Any stage</option>
                  {getAvailableStages().map(stage => (
                    <option key={stage.id} value={stage.id}>
                      {stage.name} ({stage.probability}% probability)
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        )}

        {/* Source Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Opportunity source
            </label>
            <div className="relative">
              <select
                value={filters.sourceFilter}
                onChange={(e) => handleFilterChange('sourceFilter', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any source</option>
                {sources.map(source => (
                  <option key={source.id} value={source.id}>
                    {source.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Value Filter */}
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Opportunity value filter
              </label>
              <div className="relative">
                <select
                  value={filters.valueFilter}
                  onChange={(e) => handleFilterChange('valueFilter', e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="any">Any value</option>
                  <option value="minimum">Minimum value</option>
                  <option value="maximum">Maximum value</option>
                  <option value="range">Value range</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Value Inputs */}
          {filters.valueFilter === 'minimum' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Minimum value ($)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  value={filters.minValue || 0}
                  onChange={(e) => handleFilterChange('minValue', parseFloat(e.target.value) || 0)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          )}

          {filters.valueFilter === 'maximum' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Maximum value ($)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  value={filters.maxValue || 1000}
                  onChange={(e) => handleFilterChange('maxValue', parseFloat(e.target.value) || 1000)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1000.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          )}

          {filters.valueFilter === 'range' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum ($)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={filters.minValue || 0}
                    onChange={(e) => handleFilterChange('minValue', parseFloat(e.target.value) || 0)}
                    className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum ($)
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={filters.maxValue || 1000}
                    onChange={(e) => handleFilterChange('maxValue', parseFloat(e.target.value) || 1000)}
                    className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="1000.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Assignee Filter */}
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assigned to
              </label>
              <div className="relative">
                <select
                  value={filters.assigneeFilter}
                  onChange={(e) => handleFilterChange('assigneeFilter', e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="any">Anyone</option>
                  <option value="specific_user">Specific user</option>
                  <option value="unassigned">Unassigned</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {filters.assigneeFilter === 'specific_user' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select user
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <select
                  value={filters.assigneeId}
                  onChange={(e) => handleFilterChange('assigneeId', e.target.value)}
                  className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a user...</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          )}
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority level
            </label>
            <div className="relative">
              <select
                value={filters.priorityFilter}
                onChange={(e) => handleFilterChange('priorityFilter', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any priority</option>
                <option value="high">High priority only</option>
                <option value="medium">Medium priority only</option>
                <option value="low">Low priority only</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Created date
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select
                value={filters.dateFilter}
                onChange={(e) => handleFilterChange('dateFilter', e.target.value)}
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any time</option>
                <option value="today">Today only</option>
                <option value="this_week">This week</option>
                <option value="this_month">This month</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Tag Filters */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Required tags (optional)
            </label>
            <button
              type="button"
              onClick={addTagFilter}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Tag
            </button>
          </div>

          {filters.tagFilters.map((tag: string, index: number) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={tag}
                onChange={(e) => updateTagFilter(index, e.target.value)}
                placeholder="Enter tag name..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => removeTagFilter(index)}
                className="text-red-600 hover:text-red-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Custom Fields */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Custom field filters (optional)
            </label>
            <button
              type="button"
              onClick={addCustomFieldFilter}
              className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Filter
            </button>
          </div>

          {filters.customFields.map((filter: any) => (
            <div key={filter.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <input
                type="text"
                value={filter.field}
                onChange={(e) => updateCustomFieldFilter(filter.id, { field: e.target.value })}
                placeholder="Field name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              
              <select
                value={filter.operator}
                onChange={(e) => updateCustomFieldFilter(filter.id, { operator: e.target.value })}
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
                onChange={(e) => updateCustomFieldFilter(filter.id, { value: e.target.value })}
                placeholder="Value"
                className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              
              <button
                type="button"
                onClick={() => removeCustomFieldFilter(filter.id)}
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
                  <option value="opportunity.name">Opportunity Name</option>
                  <option value="opportunity.description">Description</option>
                  <option value="opportunity.contact_id">Contact ID</option>
                  <option value="opportunity.company">Company</option>
                  <option value="opportunity.created_by">Created By</option>
                  <option value="opportunity.modified_at">Last Modified</option>
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