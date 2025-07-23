'use client'

import { useState } from 'react'
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import type { Condition, ConditionGroup, ConditionOperator, ComparisonOperator } from '@/app/lib/types/automation'

interface ConditionEditorProps {
  conditions: ConditionGroup
  onChange: (conditions: ConditionGroup) => void
  availableFields?: Field[]
}

interface Field {
  name: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'array'
  options?: { value: any; label: string }[]
}

const OPERATORS: Record<string, { label: string; operators: ComparisonOperator[] }> = {
  string: {
    label: 'Text',
    operators: ['equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty', 'regex']
  },
  number: {
    label: 'Number',
    operators: ['equals', 'not_equals', 'greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal', 'between', 'is_empty', 'is_not_empty']
  },
  boolean: {
    label: 'True/False',
    operators: ['equals', 'not_equals']
  },
  date: {
    label: 'Date',
    operators: ['equals', 'not_equals', 'before', 'after', 'between', 'days_ago_less_than', 'days_ago_greater_than', 'is_empty', 'is_not_empty']
  },
  array: {
    label: 'List',
    operators: ['contains', 'not_contains', 'is_empty', 'is_not_empty']
  }
}

const OPERATOR_LABELS: Record<ComparisonOperator, string> = {
  equals: 'equals',
  not_equals: 'does not equal',
  greater_than: 'is greater than',
  greater_than_or_equal: 'is greater than or equal to',
  less_than: 'is less than',
  less_than_or_equal: 'is less than or equal to',
  contains: 'contains',
  not_contains: 'does not contain',
  starts_with: 'starts with',
  ends_with: 'ends with',
  in: 'is in',
  not_in: 'is not in',
  is_empty: 'is empty',
  is_not_empty: 'is not empty',
  regex: 'matches pattern',
  between: 'is between',
  days_ago_less_than: 'was less than X days ago',
  days_ago_greater_than: 'was more than X days ago',
  before: 'is before',
  after: 'is after'
}

// Default fields if none provided
const DEFAULT_FIELDS: Field[] = [
  { name: 'trigger.lead.name', label: 'Lead Name', type: 'string' },
  { name: 'trigger.lead.email', label: 'Lead Email', type: 'string' },
  { name: 'trigger.lead.phone', label: 'Lead Phone', type: 'string' },
  { name: 'trigger.lead.score', label: 'Lead Score', type: 'number' },
  { name: 'trigger.lead.stage', label: 'Lead Stage', type: 'string', options: [
    { value: 'new', label: 'New' },
    { value: 'contacted', label: 'Contacted' },
    { value: 'qualified', label: 'Qualified' },
    { value: 'proposal', label: 'Proposal' },
    { value: 'negotiation', label: 'Negotiation' },
    { value: 'closed', label: 'Closed' }
  ]},
  { name: 'trigger.lead.tags', label: 'Lead Tags', type: 'array' },
  { name: 'trigger.lead.created_at', label: 'Lead Created', type: 'date' },
  { name: 'trigger.lead.last_activity', label: 'Last Activity', type: 'date' }
]

export default function ConditionEditor({ conditions, onChange, availableFields = DEFAULT_FIELDS }: ConditionEditorProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['root']))

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

  const updateOperator = (operator: ConditionOperator) => {
    onChange({ ...conditions, operator })
  }

  const addCondition = (parentGroup: ConditionGroup) => {
    const newCondition: Condition = {
      field: availableFields[0]?.name || '',
      operator: 'equals',
      value: ''
    }
    onChange({
      ...conditions,
      conditions: parentGroup === conditions 
        ? [...conditions.conditions, newCondition]
        : conditions.conditions
    })
  }

  const addGroup = (parentGroup: ConditionGroup) => {
    const newGroup: ConditionGroup = {
      operator: 'AND',
      conditions: []
    }
    onChange({
      ...conditions,
      conditions: parentGroup === conditions 
        ? [...conditions.conditions, newGroup]
        : conditions.conditions
    })
  }

  const updateCondition = (index: number, updatedCondition: Condition | ConditionGroup) => {
    const newConditions = [...conditions.conditions]
    newConditions[index] = updatedCondition
    onChange({ ...conditions, conditions: newConditions })
  }

  const removeCondition = (index: number) => {
    onChange({
      ...conditions,
      conditions: conditions.conditions.filter((_, i) => i !== index)
    })
  }

  const renderCondition = (condition: Condition, index: number) => {
    const field = availableFields.find(f => f.name === condition.field)
    const fieldType = field?.type || 'string'
    const availableOperators = OPERATORS[fieldType]?.operators || []
    const needsValue = !['is_empty', 'is_not_empty'].includes(condition.operator)

    return (
      <div key={index} className="flex items-center gap-2 p-3 bg-gray-700 rounded-lg">
        <select
          value={condition.field}
          onChange={(e) => updateCondition(index, { ...condition, field: e.target.value })}
          className="flex-1 bg-gray-600 border border-gray-500 rounded px-3 py-1 text-sm"
        >
          {availableFields.map(field => (
            <option key={field.name} value={field.name}>{field.label}</option>
          ))}
        </select>

        <select
          value={condition.operator}
          onChange={(e) => updateCondition(index, { ...condition, operator: e.target.value as ComparisonOperator })}
          className="bg-gray-600 border border-gray-500 rounded px-3 py-1 text-sm"
        >
          {availableOperators.map(op => (
            <option key={op} value={op}>{OPERATOR_LABELS[op]}</option>
          ))}
        </select>

        {needsValue && (
          <>
            {condition.operator === 'between' ? (
              <div className="flex items-center gap-2">
                <input
                  type={fieldType === 'number' ? 'number' : 'text'}
                  value={Array.isArray(condition.value) ? condition.value[0] : ''}
                  onChange={(e) => updateCondition(index, { 
                    ...condition, 
                    value: [e.target.value, Array.isArray(condition.value) ? condition.value[1] : '']
                  })}
                  placeholder="From"
                  className="w-24 bg-gray-600 border border-gray-500 rounded px-3 py-1 text-sm"
                />
                <span className="text-gray-400">and</span>
                <input
                  type={fieldType === 'number' ? 'number' : 'text'}
                  value={Array.isArray(condition.value) ? condition.value[1] : ''}
                  onChange={(e) => updateCondition(index, { 
                    ...condition, 
                    value: [Array.isArray(condition.value) ? condition.value[0] : '', e.target.value]
                  })}
                  placeholder="To"
                  className="w-24 bg-gray-600 border border-gray-500 rounded px-3 py-1 text-sm"
                />
              </div>
            ) : field?.options ? (
              <select
                value={condition.value}
                onChange={(e) => updateCondition(index, { ...condition, value: e.target.value })}
                className="flex-1 bg-gray-600 border border-gray-500 rounded px-3 py-1 text-sm"
              >
                <option value="">Select...</option>
                {field.options.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            ) : fieldType === 'boolean' ? (
              <select
                value={condition.value}
                onChange={(e) => updateCondition(index, { ...condition, value: e.target.value === 'true' })}
                className="bg-gray-600 border border-gray-500 rounded px-3 py-1 text-sm"
              >
                <option value="true">True</option>
                <option value="false">False</option>
              </select>
            ) : fieldType === 'date' && !['days_ago_less_than', 'days_ago_greater_than'].includes(condition.operator) ? (
              <input
                type="datetime-local"
                value={condition.value}
                onChange={(e) => updateCondition(index, { ...condition, value: e.target.value })}
                className="bg-gray-600 border border-gray-500 rounded px-3 py-1 text-sm"
              />
            ) : (
              <input
                type={fieldType === 'number' || ['days_ago_less_than', 'days_ago_greater_than'].includes(condition.operator) ? 'number' : 'text'}
                value={condition.value}
                onChange={(e) => updateCondition(index, { ...condition, value: e.target.value })}
                placeholder={condition.operator === 'regex' ? 'Pattern' : 'Value'}
                className="flex-1 bg-gray-600 border border-gray-500 rounded px-3 py-1 text-sm"
              />
            )}
          </>
        )}

        <button
          onClick={() => removeCondition(index)}
          className="text-red-400 hover:text-red-300 p-1"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  const renderConditionGroup = (group: ConditionGroup, index: number, groupId: string) => {
    const isExpanded = expandedGroups.has(groupId)

    return (
      <div key={groupId} className="border border-gray-600 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => toggleGroup(groupId)}
              className="text-gray-400 hover:text-gray-300"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <select
              value={group.operator}
              onChange={(e) => updateCondition(index, { ...group, operator: e.target.value as ConditionOperator })}
              className="bg-gray-600 border border-gray-500 rounded px-3 py-1 text-sm font-medium"
            >
              <option value="AND">ALL of the following</option>
              <option value="OR">ANY of the following</option>
              <option value="NOT">NONE of the following</option>
            </select>
          </div>
          <button
            onClick={() => removeCondition(index)}
            className="text-red-400 hover:text-red-300 p-1"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {isExpanded && (
          <div className="space-y-2 ml-6">
            {group.conditions.map((item, idx) => (
              'field' in item 
                ? renderCondition(item as Condition, idx)
                : renderConditionGroup(item as ConditionGroup, idx, `${groupId}-${idx}`)
            ))}
            
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => addCondition(group)}
                className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm"
              >
                <Plus className="h-3 w-3" />
                Add Condition
              </button>
              <button
                onClick={() => addGroup(group)}
                className="flex items-center gap-1 px-3 py-1 bg-purple-600 hover:bg-purple-700 rounded text-sm"
              >
                <Plus className="h-3 w-3" />
                Add Group
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Conditions</h3>
        <select
          value={conditions.operator}
          onChange={(e) => updateOperator(e.target.value as ConditionOperator)}
          className="bg-gray-700 border border-gray-600 rounded px-4 py-2 text-sm font-medium"
        >
          <option value="AND">ALL conditions must be true</option>
          <option value="OR">ANY condition must be true</option>
          <option value="NOT">NO conditions must be true</option>
        </select>
      </div>

      <div className="space-y-2">
        {conditions.conditions.map((item, index) => (
          'field' in item 
            ? renderCondition(item as Condition, index)
            : renderConditionGroup(item as ConditionGroup, index, `group-${index}`)
        ))}
      </div>

      {conditions.conditions.length === 0 && (
        <div className="text-center py-8 text-gray-400">
          No conditions added yet
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => addCondition(conditions)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded"
        >
          <Plus className="h-4 w-4" />
          Add Condition
        </button>
        <button
          onClick={() => addGroup(conditions)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded"
        >
          <Plus className="h-4 w-4" />
          Add Group
        </button>
      </div>
    </div>
  )
}