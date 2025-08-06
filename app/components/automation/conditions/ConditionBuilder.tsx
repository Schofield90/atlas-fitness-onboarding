'use client'

import { useState } from 'react'
import { Plus, Minus, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'

interface ConditionBuilderProps {
  node: any
  onUpdate: (updatedNode: any) => void
}

interface Condition {
  id: string
  type: 'lead_score' | 'tags' | 'time_based' | 'field_comparison' | 'activity' | 'custom'
  field?: string
  operator: string
  value: any
  logic?: 'AND' | 'OR'
}

interface ConditionGroup {
  id: string
  logic: 'AND' | 'OR'
  conditions: (Condition | ConditionGroup)[]
}

export function ConditionBuilder({ node, onUpdate }: ConditionBuilderProps) {
  const [activeTab, setActiveTab] = useState<'simple' | 'advanced'>('simple')
  const [conditionType, setConditionType] = useState(node.data.config.conditionType || 'lead_score')

  const updateNodeConfig = (updates: any) => {
    const updatedNode = {
      ...node,
      data: {
        ...node.data,
        config: {
          ...node.data.config,
          ...updates
        },
        isValid: validateCondition(updates)
      }
    }
    onUpdate(updatedNode)
  }

  const validateCondition = (config: any) => {
    switch (config.conditionType) {
      case 'lead_score':
        return config.operator && config.value !== undefined
      case 'tags':
        return config.tags && config.tags.length > 0
      case 'field_comparison':
        return config.field && config.operator && config.value !== undefined
      case 'time_based':
        return config.timeType
      case 'activity':
        return config.activityType && config.timeframe
      case 'multi_condition':
        return config.conditions && config.conditions.length > 0
      default:
        return false
    }
  }

  const renderLeadScoreCondition = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Operator</label>
        <select
          value={node.data.config.operator || ''}
          onChange={(e) => updateNodeConfig({ operator: e.target.value })}
          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
        >
          <option value="">Select operator...</option>
          <option value="greater_than">Greater than</option>
          <option value="less_than">Less than</option>
          <option value="equals">Equals</option>
          <option value="between">Between</option>
          <option value="greater_than_or_equal">Greater than or equal</option>
          <option value="less_than_or_equal">Less than or equal</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Score Value</label>
        {node.data.config.operator === 'between' ? (
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              value={node.data.config.minValue || ''}
              onChange={(e) => updateNodeConfig({ minValue: parseInt(e.target.value) })}
              className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
            />
            <input
              type="number"
              placeholder="Max"
              value={node.data.config.maxValue || ''}
              onChange={(e) => updateNodeConfig({ maxValue: parseInt(e.target.value) })}
              className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
            />
          </div>
        ) : (
          <input
            type="number"
            value={node.data.config.value || ''}
            onChange={(e) => updateNodeConfig({ value: parseInt(e.target.value) })}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
            placeholder="Enter score value..."
          />
        )}
      </div>
    </div>
  )

  const renderTagsCondition = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Tag Operation</label>
        <select
          value={node.data.config.operator || 'has_tag'}
          onChange={(e) => updateNodeConfig({ operator: e.target.value })}
          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
        >
          <option value="has_tag">Has tag</option>
          <option value="not_has_tag">Doesn't have tag</option>
          <option value="has_any">Has any of these tags</option>
          <option value="has_all">Has all of these tags</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Tags</label>
        <div className="space-y-2">
          {(node.data.config.tags || []).map((tag: string, index: number) => (
            <div key={index} className="flex gap-2">
              <input
                type="text"
                value={tag}
                onChange={(e) => {
                  const newTags = [...(node.data.config.tags || [])]
                  newTags[index] = e.target.value
                  updateNodeConfig({ tags: newTags })
                }}
                className="flex-1 bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
                placeholder="Tag name..."
              />
              <button
                onClick={() => {
                  const newTags = (node.data.config.tags || []).filter((_: any, i: number) => i !== index)
                  updateNodeConfig({ tags: newTags })
                }}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => {
              const newTags = [...(node.data.config.tags || []), '']
              updateNodeConfig({ tags: newTags })
            }}
            className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Tag
          </button>
        </div>
      </div>
    </div>
  )

  const renderTimeBasedCondition = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Time Type</label>
        <select
          value={node.data.config.timeType || ''}
          onChange={(e) => updateNodeConfig({ timeType: e.target.value })}
          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
        >
          <option value="">Select time type...</option>
          <option value="business_hours">Business hours</option>
          <option value="specific_days">Specific days</option>
          <option value="date_range">Date range</option>
          <option value="time_since">Time since event</option>
        </select>
      </div>

      {node.data.config.timeType === 'business_hours' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Start Time</label>
            <input
              type="time"
              value={node.data.config.startTime || '09:00'}
              onChange={(e) => updateNodeConfig({ startTime: e.target.value })}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">End Time</label>
            <input
              type="time"
              value={node.data.config.endTime || '17:00'}
              onChange={(e) => updateNodeConfig({ endTime: e.target.value })}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {node.data.config.timeType === 'specific_days' && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Days of Week</label>
          <div className="grid grid-cols-4 gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, index) => (
              <label key={day} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={(node.data.config.workDays || []).includes(index + 1)}
                  onChange={(e) => {
                    const workDays = node.data.config.workDays || []
                    const newWorkDays = e.target.checked
                      ? [...workDays, index + 1]
                      : workDays.filter((d: number) => d !== index + 1)
                    updateNodeConfig({ workDays: newWorkDays })
                  }}
                  className="rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-300">{day}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {node.data.config.timeType === 'date_range' && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Start Date</label>
            <input
              type="date"
              value={node.data.config.startDate || ''}
              onChange={(e) => updateNodeConfig({ startDate: e.target.value })}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">End Date</label>
            <input
              type="date"
              value={node.data.config.endDate || ''}
              onChange={(e) => updateNodeConfig({ endDate: e.target.value })}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  )

  const renderFieldComparisonCondition = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Field</label>
        <select
          value={node.data.config.field || ''}
          onChange={(e) => updateNodeConfig({ field: e.target.value })}
          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
        >
          <option value="">Select field...</option>
          <option value="email">Email</option>
          <option value="phone">Phone</option>
          <option value="name">Name</option>
          <option value="source">Lead Source</option>
          <option value="custom_field">Custom Field</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Operator</label>
        <select
          value={node.data.config.operator || ''}
          onChange={(e) => updateNodeConfig({ operator: e.target.value })}
          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
        >
          <option value="">Select operator...</option>
          <option value="equals">Equals</option>
          <option value="not_equals">Not equals</option>
          <option value="contains">Contains</option>
          <option value="not_contains">Doesn't contain</option>
          <option value="starts_with">Starts with</option>
          <option value="ends_with">Ends with</option>
          <option value="is_empty">Is empty</option>
          <option value="is_not_empty">Is not empty</option>
        </select>
      </div>

      {!['is_empty', 'is_not_empty'].includes(node.data.config.operator) && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Value</label>
          <input
            type="text"
            value={node.data.config.value || ''}
            onChange={(e) => updateNodeConfig({ value: e.target.value })}
            className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
            placeholder="Enter comparison value..."
          />
        </div>
      )}
    </div>
  )

  const renderActivityCondition = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Activity Type</label>
        <select
          value={node.data.config.activityType || ''}
          onChange={(e) => updateNodeConfig({ activityType: e.target.value })}
          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
        >
          <option value="">Select activity...</option>
          <option value="email_opened">Email opened</option>
          <option value="email_clicked">Email clicked</option>
          <option value="email_replied">Email replied</option>
          <option value="form_submitted">Form submitted</option>
          <option value="page_visited">Page visited</option>
          <option value="call_answered">Call answered</option>
          <option value="appointment_booked">Appointment booked</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Time Frame</label>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            value={node.data.config.timeframe?.value || ''}
            onChange={(e) => updateNodeConfig({ 
              timeframe: { 
                ...node.data.config.timeframe, 
                value: parseInt(e.target.value) 
              }
            })}
            className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
            placeholder="Value"
          />
          <select
            value={node.data.config.timeframe?.unit || 'days'}
            onChange={(e) => updateNodeConfig({
              timeframe: {
                ...node.data.config.timeframe,
                unit: e.target.value
              }
            })}
            className="bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
          >
            <option value="minutes">Minutes</option>
            <option value="hours">Hours</option>
            <option value="days">Days</option>
            <option value="weeks">Weeks</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Condition</label>
        <select
          value={node.data.config.operator || 'within'}
          onChange={(e) => updateNodeConfig({ operator: e.target.value })}
          className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
        >
          <option value="within">Within timeframe</option>
          <option value="not_within">Not within timeframe</option>
          <option value="exactly">Exactly this timeframe ago</option>
        </select>
      </div>
    </div>
  )

  const renderConditionForm = () => {
    switch (conditionType) {
      case 'lead_score':
        return renderLeadScoreCondition()
      case 'tags':
        return renderTagsCondition()
      case 'time_based':
        return renderTimeBasedCondition()
      case 'field_comparison':
        return renderFieldComparisonCondition()
      case 'activity':
        return renderActivityCondition()
      default:
        return <div className="text-gray-400">Select a condition type to configure</div>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h4 className="font-medium text-white mb-2">Condition Configuration</h4>
        <p className="text-sm text-gray-400">
          Define when this branch should be taken
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('simple')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'simple'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Simple Condition
        </button>
        <button
          onClick={() => setActiveTab('advanced')}
          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === 'advanced'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          Advanced Logic
        </button>
      </div>

      {activeTab === 'simple' && (
        <div className="space-y-4">
          {/* Condition Type */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Condition Type</label>
            <select
              value={conditionType}
              onChange={(e) => {
                setConditionType(e.target.value as any)
                updateNodeConfig({ conditionType: e.target.value })
              }}
              className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 border border-gray-600 focus:border-purple-500 focus:outline-none"
            >
              <option value="lead_score">Lead Score</option>
              <option value="tags">Tags</option>
              <option value="time_based">Time-Based</option>
              <option value="field_comparison">Field Comparison</option>
              <option value="activity">Activity</option>
            </select>
          </div>

          {/* Dynamic Condition Form */}
          {renderConditionForm()}
        </div>
      )}

      {activeTab === 'advanced' && (
        <div className="space-y-4">
          <div className="p-4 bg-amber-900/20 border border-amber-600 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5" />
              <div>
                <div className="text-amber-300 font-medium text-sm">Advanced Logic</div>
                <div className="text-amber-200 text-xs mt-1">
                  Complex AND/OR conditions with multiple criteria. Coming soon!
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Validation */}
      {!node.data.isValid && (
        <div className="p-3 bg-red-900/30 border border-red-600 rounded-lg">
          <div className="text-red-300 text-sm">
            Please complete the condition configuration
          </div>
        </div>
      )}
    </div>
  )
}