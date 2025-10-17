'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Target, ArrowRight, Plus, X, TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

interface OpportunityStageChangedTriggerConfigProps {
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

interface StageTransition {
  id: string
  fromStageId: string | 'any'
  toStageId: string | 'any'
  direction: 'forward' | 'backward' | 'any'
}

export default function OpportunityStageChangedTriggerConfig({ config, onChange, organizationId }: OpportunityStageChangedTriggerConfigProps) {
  const [triggerName, setTriggerName] = useState(config.name || 'Opportunity Stage Changed Trigger')
  const [pipelines, setPipelines] = useState<OpportunityPipeline[]>([])
  const [filters, setFilters] = useState(config.filters || {
    pipelineFilter: 'any', // 'any' or specific pipeline ID
    changeType: 'any_change', // 'any_change', 'specific_transition', 'direction_based'
    direction: 'forward', // 'forward', 'backward', 'any'
    stageTransitions: [] as StageTransition[], // Array of specific transitions
    fromStages: [], // Array of from stage IDs
    toStages: [], // Array of to stage IDs
    probabilityChange: 'any', // 'any', 'increase', 'decrease', 'threshold'
    probabilityThreshold: 50,
    valueChange: 'any', // 'any', 'increase', 'decrease', 'significant'
    valueThreshold: 100, // For significant value changes
    timeWindow: 'immediate', // 'immediate', 'within_hours', 'within_days'
    timeValue: 1,
    assigneeFilter: 'any', // 'any', 'specific_user', 'changed_assignee'
    assigneeId: ''
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
      
      const response = await fetch('/api/opportunities/pipelines')
      if (response.ok) {
        const data = await response.json()
        if (data.pipelines) {
          setPipelines(data.pipelines)
        }
      } else {
        // Mock pipelines data
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
              { id: 'closed-won', name: 'Closed Won', order: 5, probability: 100 },
              { id: 'closed-lost', name: 'Closed Lost', order: 6, probability: 0 }
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
              { id: 'member', name: 'Member', order: 4, probability: 100 },
              { id: 'cancelled', name: 'Cancelled', order: 5, probability: 0 }
            ]
          }
        ])
      }
    } catch (error) {
      console.error('Error loading opportunity data:', error)
      setPipelines([])
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

  const addStageTransition = () => {
    const newTransition: StageTransition = {
      id: Date.now().toString(),
      fromStageId: 'any',
      toStageId: 'any',
      direction: 'forward'
    }
    
    const updatedTransitions = [...filters.stageTransitions, newTransition]
    handleFilterChange('stageTransitions', updatedTransitions)
  }

  const updateStageTransition = (id: string, updates: Partial<StageTransition>) => {
    const updatedTransitions = filters.stageTransitions.map((transition: StageTransition) => 
      transition.id === id ? { ...transition, ...updates } : transition
    )
    handleFilterChange('stageTransitions', updatedTransitions)
  }

  const removeStageTransition = (id: string) => {
    const updatedTransitions = filters.stageTransitions.filter((transition: StageTransition) => transition.id !== id)
    handleFilterChange('stageTransitions', updatedTransitions)
  }

  const handleStageSelection = (stageId: string, type: 'from' | 'to') => {
    const currentStages = filters[type === 'from' ? 'fromStages' : 'toStages']
    let newStages
    
    if (currentStages.includes(stageId)) {
      newStages = currentStages.filter((id: string) => id !== stageId)
    } else {
      newStages = [...currentStages, stageId]
    }
    
    handleFilterChange(type === 'from' ? 'fromStages' : 'toStages', newStages)
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

  const getStageById = (stageId: string) => {
    const stages = getAvailableStages()
    return stages.find(stage => stage.id === stageId)
  }

  const renderStageTransitionConfig = (transition: StageTransition, index: number) => {
    const stages = getAvailableStages()
    
    return (
      <div key={transition.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">
            Transition #{index + 1}
          </h4>
          {filters.stageTransitions.length > 1 && (
            <button
              type="button"
              onClick={() => removeStageTransition(transition.id)}
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From stage
            </label>
            <select
              value={transition.fromStageId}
              onChange={(e) => updateStageTransition(transition.id, { fromStageId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="any">Any stage</option>
              {stages.map(stage => (
                <option key={stage.id} value={stage.id}>
                  {stage.name} ({stage.probability}%)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              To stage
            </label>
            <select
              value={transition.toStageId}
              onChange={(e) => updateStageTransition(transition.id, { toStageId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="any">Any stage</option>
              {stages.map(stage => (
                <option key={stage.id} value={stage.id}>
                  {stage.name} ({stage.probability}%)
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Direction
          </label>
          <select
            value={transition.direction}
            onChange={(e) => updateStageTransition(transition.id, { direction: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="forward">Forward progression</option>
            <option value="backward">Backward movement</option>
            <option value="any">Any direction</option>
          </select>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="p-4 text-center">Loading stage configuration...</div>
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

      {/* Opportunity Stage Changed Configuration */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
            OPPORTUNITY STAGE CHANGED TRIGGER SETTINGS
          </label>
          <p className="text-sm text-gray-500 mb-4">
            Configure triggers for when opportunities move between stages in your sales pipeline
          </p>
        </div>

        {/* Pipeline Information */}
        {pipelines.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <Target className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Sales Pipelines Found
            </h3>
            <p className="text-gray-600 mb-4">
              You need to create sales pipelines to track stage changes.
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
              <ArrowRight className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-blue-800 font-medium">
                {pipelines.length} sales pipelines with stage tracking
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
                  // Reset stage-specific filters when pipeline changes
                  if (e.target.value !== filters.pipelineFilter) {
                    handleFilterChange('stageTransitions', [])
                    handleFilterChange('fromStages', [])
                    handleFilterChange('toStages', [])
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
                <option value="any_change">Any stage change occurs</option>
                <option value="specific_transition">Specific stage transitions</option>
                <option value="direction_based">Direction-based changes</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Direction-based Configuration */}
        {filters.changeType === 'direction_based' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stage movement direction
                </label>
                <div className="relative">
                  <select
                    value={filters.direction}
                    onChange={(e) => handleFilterChange('direction', e.target.value)}
                    className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="forward">Forward progression (towards close)</option>
                    <option value="backward">Backward movement (away from close)</option>
                    <option value="any">Any direction</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Stage Selection for Direction-based */}
            {filters.pipelineFilter !== 'any' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    From stages (optional)
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                    {getAvailableStages().map(stage => (
                      <label
                        key={stage.id}
                        className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={filters.fromStages.includes(stage.id)}
                          onChange={() => handleStageSelection(stage.id, 'from')}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-900">{stage.name}</span>
                        <span className="ml-auto text-xs text-gray-500">
                          {stage.probability}%
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    To stages (optional)
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2">
                    {getAvailableStages().map(stage => (
                      <label
                        key={stage.id}
                        className="flex items-center p-2 hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={filters.toStages.includes(stage.id)}
                          onChange={() => handleStageSelection(stage.id, 'to')}
                          className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="text-sm text-gray-900">{stage.name}</span>
                        <span className="ml-auto text-xs text-gray-500">
                          {stage.probability}%
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Specific Transitions Configuration */}
        {filters.changeType === 'specific_transition' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700">
                Stage Transitions
              </label>
              <button
                type="button"
                onClick={addStageTransition}
                className="text-blue-600 hover:text-blue-700 font-medium flex items-center text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Transition
              </button>
            </div>

            {filters.stageTransitions.map((transition: StageTransition, index: number) => (
              renderStageTransitionConfig(transition, index)
            ))}

            {filters.stageTransitions.length === 0 && (
              <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
                <ArrowRight className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500 mb-4">No specific transitions configured</p>
                <button
                  type="button"
                  onClick={addStageTransition}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Your First Transition
                </button>
              </div>
            )}
          </div>
        )}

        {/* Probability Change Filter */}
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Probability change
              </label>
              <div className="relative">
                <select
                  value={filters.probabilityChange}
                  onChange={(e) => handleFilterChange('probabilityChange', e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="any">Any probability change</option>
                  <option value="increase">Probability increases</option>
                  <option value="decrease">Probability decreases</option>
                  <option value="threshold">Reaches probability threshold</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {filters.probabilityChange === 'threshold' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Probability threshold (%)
              </label>
              <input
                type="number"
                value={filters.probabilityThreshold || 50}
                onChange={(e) => handleFilterChange('probabilityThreshold', parseInt(e.target.value) || 50)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="50"
                min="0"
                max="100"
              />
            </div>
          )}
        </div>

        {/* Value Change Filter */}
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Opportunity value change
              </label>
              <div className="relative">
                <select
                  value={filters.valueChange}
                  onChange={(e) => handleFilterChange('valueChange', e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="any">Any value change</option>
                  <option value="increase">Value increases</option>
                  <option value="decrease">Value decreases</option>
                  <option value="significant">Significant change (threshold)</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {filters.valueChange === 'significant' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Significant change threshold ($)
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  value={filters.valueThreshold || 100}
                  onChange={(e) => handleFilterChange('valueThreshold', parseFloat(e.target.value) || 100)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="100.00"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          )}
        </div>

        {/* Time Window */}
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time window
              </label>
              <div className="relative">
                <select
                  value={filters.timeWindow}
                  onChange={(e) => handleFilterChange('timeWindow', e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="immediate">Trigger immediately</option>
                  <option value="within_hours">Within X hours</option>
                  <option value="within_days">Within X days</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {(filters.timeWindow === 'within_hours' || filters.timeWindow === 'within_days') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time value
              </label>
              <input
                type="number"
                value={filters.timeValue || 1}
                onChange={(e) => handleFilterChange('timeValue', parseInt(e.target.value) || 1)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="1"
                min="1"
                max={filters.timeWindow === 'within_hours' ? 72 : 30}
              />
            </div>
          )}
        </div>

        {/* Assignee Filter */}
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assignee filter
              </label>
              <div className="relative">
                <select
                  value={filters.assigneeFilter}
                  onChange={(e) => handleFilterChange('assigneeFilter', e.target.value)}
                  className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="any">Any assignee</option>
                  <option value="specific_user">Specific user</option>
                  <option value="changed_assignee">Assignee was changed</option>
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
              <select
                value={filters.assigneeId}
                onChange={(e) => handleFilterChange('assigneeId', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select a user...</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
            </div>
          )}
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
                  <option value="opportunity.value">Opportunity Value</option>
                  <option value="opportunity.probability">Stage Probability</option>
                  <option value="opportunity.close_date">Close Date</option>
                  <option value="opportunity.modified_by">Modified By</option>
                  <option value="stage.duration">Time in Previous Stage</option>
                  <option value="stage.change_reason">Change Reason</option>
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