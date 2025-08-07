'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, ChevronDown, Brain, Zap, Filter, Code, Calendar, User, Tag, BarChart3, Settings, Sparkles } from 'lucide-react'
import type { SmartCondition, ConditionDimension, TemporalCondition, BusinessHours } from '../../../lib/types/advanced-automation'

interface ConditionBuilderProps {
  conditions: SmartCondition[]
  onChange: (conditions: SmartCondition[]) => void
  availableFields: ConditionField[]
  aiAssistance?: boolean
  context?: {
    nodeType?: string
    workflowType?: string
    organizationData?: Record<string, any>
  }
}

interface ConditionField {
  id: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'select'
  category: 'lead' | 'contact' | 'activity' | 'engagement' | 'system'
  options?: Array<{ value: any; label: string }>
  description?: string
}

type ConditionOperator = 
  | 'equals' | 'not_equals'
  | 'greater_than' | 'less_than' | 'greater_than_or_equal' | 'less_than_or_equal'
  | 'contains' | 'not_contains' | 'starts_with' | 'ends_with'
  | 'in' | 'not_in' | 'is_empty' | 'is_not_empty'
  | 'between' | 'before' | 'after'
  | 'days_ago_less_than' | 'days_ago_greater_than'

export function ConditionBuilder({
  conditions,
  onChange,
  availableFields,
  aiAssistance = true,
  context
}: ConditionBuilderProps) {
  const [selectedCondition, setSelectedCondition] = useState<string | null>(null)
  const [conditionType, setConditionType] = useState<'simple' | 'multi_dimensional' | 'temporal' | 'ai_powered'>('simple')
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)

  useEffect(() => {
    if (aiAssistance && context) {
      loadAISuggestions()
    }
  }, [context, aiAssistance])

  const loadAISuggestions = async () => {
    setIsLoadingSuggestions(true)
    try {
      // Mock AI suggestions - would be replaced with actual API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const suggestions = [
        {
          type: 'lead_qualification',
          description: 'High-value lead detection',
          condition: {
            field: 'lead_score',
            operator: 'greater_than',
            value: 75,
            description: 'Identify leads with high conversion potential'
          }
        },
        {
          type: 'engagement_based',
          description: 'Recently engaged leads',
          condition: {
            field: 'last_email_opened',
            operator: 'days_ago_less_than',
            value: 7,
            description: 'Target leads who opened emails in the last week'
          }
        },
        {
          type: 'behavioral',
          description: 'Website activity based',
          condition: {
            field: 'page_views',
            operator: 'greater_than',
            value: 3,
            description: 'Leads who have viewed multiple pages'
          }
        }
      ]
      
      setAiSuggestions(suggestions)
    } catch (error) {
      console.error('Failed to load AI suggestions:', error)
    } finally {
      setIsLoadingSuggestions(false)
    }
  }

  const addCondition = (type: 'simple' | 'ai_suggested' = 'simple', template?: any) => {
    const newCondition: SmartCondition = template ? {
      field: template.field,
      operator: template.operator,
      value: template.value,
      dataType: getFieldType(template.field),
      aiEvaluation: type === 'ai_suggested' ? {
        enabled: true,
        model: 'gpt-4',
        prompt: `Evaluate if lead meets criteria: ${template.description}`,
        confidenceThreshold: 0.8
      } : undefined
    } : {
      field: availableFields[0]?.id || 'lead_score',
      operator: 'equals',
      value: '',
      dataType: 'string'
    }

    onChange([...conditions, newCondition])
  }

  const updateCondition = (index: number, updates: Partial<SmartCondition>) => {
    const newConditions = conditions.map((condition, i) =>
      i === index ? { ...condition, ...updates } : condition
    )
    onChange(newConditions)
  }

  const removeCondition = (index: number) => {
    onChange(conditions.filter((_, i) => i !== index))
  }

  const getFieldType = (fieldId: string): 'string' | 'number' | 'boolean' | 'date' | 'array' | 'select' => {
    const field = availableFields.find(f => f.id === fieldId)
    return field?.type || 'string'
  }

  const getOperatorsForType = (type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'select'): ConditionOperator[] => {
    const baseOperators: ConditionOperator[] = ['equals', 'not_equals']
    
    switch (type) {
      case 'string':
        return [...baseOperators, 'contains', 'not_contains', 'starts_with', 'ends_with', 'is_empty', 'is_not_empty']
      case 'number':
        return [...baseOperators, 'greater_than', 'less_than', 'greater_than_or_equal', 'less_than_or_equal', 'between']
      case 'date':
        return [...baseOperators, 'before', 'after', 'days_ago_less_than', 'days_ago_greater_than']
      case 'array':
        return [...baseOperators, 'in', 'not_in', 'is_empty', 'is_not_empty']
      case 'boolean':
        return ['equals', 'not_equals']
      case 'select':
        return [...baseOperators, 'in', 'not_in']
      default:
        return baseOperators
    }
  }

  const renderConditionValue = (condition: SmartCondition, index: number) => {
    const field = availableFields.find(f => f.id === condition.field)
    const fieldType = field?.type || 'string'

    if (condition.operator === 'is_empty' || condition.operator === 'is_not_empty') {
      return null // No value needed
    }

    if (condition.operator === 'between') {
      return (
        <div className="flex items-center space-x-2">
          <input
            type="number"
            value={condition.value?.min || ''}
            onChange={(e) => updateCondition(index, {
              value: { ...condition.value, min: parseFloat(e.target.value) }
            })}
            placeholder="Min"
            className="block w-20 px-2 py-1 border border-gray-300 rounded text-sm"
          />
          <span className="text-gray-500">and</span>
          <input
            type="number"
            value={condition.value?.max || ''}
            onChange={(e) => updateCondition(index, {
              value: { ...condition.value, max: parseFloat(e.target.value) }
            })}
            placeholder="Max"
            className="block w-20 px-2 py-1 border border-gray-300 rounded text-sm"
          />
        </div>
      )
    }

    if (field?.options) {
      return (
        <select
          value={condition.value || ''}
          onChange={(e) => updateCondition(index, { value: e.target.value })}
          className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Select value</option>
          {field.options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )
    }

    switch (fieldType) {
      case 'number':
        return (
          <input
            type="number"
            value={condition.value || ''}
            onChange={(e) => updateCondition(index, { value: parseFloat(e.target.value) || 0 })}
            placeholder="Enter number"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        )
      
      case 'date':
        return (
          <input
            type="date"
            value={condition.value || ''}
            onChange={(e) => updateCondition(index, { value: e.target.value })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        )
      
      case 'boolean':
        return (
          <select
            value={condition.value || ''}
            onChange={(e) => updateCondition(index, { value: e.target.value === 'true' })}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select value</option>
            <option value="true">True</option>
            <option value="false">False</option>
          </select>
        )
      
      default:
        return (
          <input
            type="text"
            value={condition.value || ''}
            onChange={(e) => updateCondition(index, { value: e.target.value })}
            placeholder="Enter value"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          />
        )
    }
  }

  const getFieldIcon = (category: string) => {
    const icons = {
      lead: User,
      contact: User,
      activity: BarChart3,
      engagement: Zap,
      system: Settings
    }
    return icons[category as keyof typeof icons] || Filter
  }

  const renderSimpleCondition = (condition: SmartCondition, index: number) => {
    const field = availableFields.find(f => f.id === condition.field)
    const operators = getOperatorsForType(condition.dataType || 'string')
    const Icon = field ? getFieldIcon(field.category) : Filter

    return (
      <div className="p-4 border border-gray-200 rounded-lg bg-white space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Icon className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Condition {index + 1}</span>
            {condition.aiEvaluation?.enabled && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                <Brain className="w-3 h-3 mr-1" />
                AI
              </span>
            )}
          </div>
          <button
            onClick={() => removeCondition(index)}
            className="text-gray-400 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Field Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Field</label>
            <select
              value={condition.field}
              onChange={(e) => {
                const newField = e.target.value
                const fieldType = getFieldType(newField)
                const availableOperators = getOperatorsForType(fieldType)
                updateCondition(index, {
                  field: newField,
                  dataType: fieldType,
                  operator: availableOperators.includes(condition.operator) 
                    ? condition.operator 
                    : availableOperators[0]
                })
              }}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {availableFields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.label}
                </option>
              ))}
            </select>
          </div>

          {/* Operator Selection */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Operator</label>
            <select
              value={condition.operator}
              onChange={(e) => updateCondition(index, { operator: e.target.value as ConditionOperator })}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              {operators.map((operator) => (
                <option key={operator} value={operator}>
                  {operator.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {/* Value Input */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Value</label>
            {renderConditionValue(condition, index)}
          </div>
        </div>

        {/* AI Enhancement Options */}
        {condition.aiEvaluation?.enabled && (
          <div className="border-t pt-3 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-purple-700">AI Evaluation Settings</span>
              <button
                onClick={() => updateCondition(index, { 
                  aiEvaluation: { ...condition.aiEvaluation, enabled: false } 
                })}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Disable AI
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">AI Model</label>
                <select
                  value={condition.aiEvaluation?.model || 'gpt-4'}
                  onChange={(e) => updateCondition(index, {
                    aiEvaluation: { ...condition.aiEvaluation!, model: e.target.value }
                  })}
                  className="block w-full px-2 py-1 border border-gray-300 rounded text-sm"
                >
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="claude-3">Claude 3</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Confidence Threshold</label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.1"
                  value={condition.aiEvaluation?.confidenceThreshold || 0.8}
                  onChange={(e) => updateCondition(index, {
                    aiEvaluation: { 
                      ...condition.aiEvaluation!, 
                      confidenceThreshold: parseFloat(e.target.value) 
                    }
                  })}
                  className="block w-full"
                />
                <div className="text-xs text-gray-500 text-center mt-1">
                  {Math.round((condition.aiEvaluation?.confidenceThreshold || 0.8) * 100)}%
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">AI Evaluation Prompt</label>
              <textarea
                value={condition.aiEvaluation?.prompt || ''}
                onChange={(e) => updateCondition(index, {
                  aiEvaluation: { ...condition.aiEvaluation!, prompt: e.target.value }
                })}
                rows={2}
                className="block w-full px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="Describe how AI should evaluate this condition..."
              />
            </div>
          </div>
        )}

        {/* Field Description */}
        {field?.description && (
          <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
            <strong>Field Info:</strong> {field.description}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Filter className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-medium text-gray-900">Condition Builder</h3>
          {aiAssistance && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Enhanced
            </span>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={conditionType}
            onChange={(e) => setConditionType(e.target.value as any)}
            className="text-sm border border-gray-300 rounded-md px-3 py-1"
          >
            <option value="simple">Simple Conditions</option>
            <option value="multi_dimensional">Multi-Dimensional</option>
            <option value="temporal">Time-Based</option>
            <option value="ai_powered">AI-Powered</option>
          </select>
        </div>
      </div>

      {/* AI Suggestions */}
      {aiAssistance && aiSuggestions.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-200">
          <div className="flex items-center mb-3">
            <Brain className="w-5 h-5 text-purple-600 mr-2" />
            <h4 className="font-medium text-purple-900">AI Suggested Conditions</h4>
            {isLoadingSuggestions && (
              <div className="animate-spin ml-2 h-4 w-4 border-2 border-purple-600 border-t-transparent rounded-full"></div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {aiSuggestions.map((suggestion, index) => (
              <button
                key={index}
                onClick={() => addCondition('ai_suggested', suggestion.condition)}
                className="p-3 text-left bg-white border border-purple-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors"
              >
                <div className="font-medium text-purple-900 text-sm mb-1">
                  {suggestion.type.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                </div>
                <div className="text-xs text-purple-700 mb-2">{suggestion.description}</div>
                <div className="text-xs text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded">
                  {suggestion.condition.field} {suggestion.condition.operator} {suggestion.condition.value}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conditions List */}
      <div className="space-y-3">
        {conditions.length === 0 ? (
          <div className="text-center py-12 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
            <Filter className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No conditions added</h3>
            <p className="mt-1 text-sm text-gray-500">
              Add conditions to control when this node should execute
            </p>
          </div>
        ) : (
          conditions.map((condition, index) => (
            <div key={index}>
              {renderSimpleCondition(condition, index)}
              {index < conditions.length - 1 && (
                <div className="flex items-center justify-center py-2">
                  <div className="bg-gray-100 px-3 py-1 rounded-full text-xs font-medium text-gray-600">
                    AND
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Condition Button */}
      <div className="flex items-center justify-center pt-4">
        <button
          onClick={() => addCondition('simple')}
          className="inline-flex items-center px-4 py-2 border border-dashed border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Condition
        </button>
      </div>

      {/* Logic Summary */}
      {conditions.length > 0 && (
        <div className="border-t pt-4">
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="flex items-center mb-2">
              <Code className="w-4 h-4 text-blue-600 mr-2" />
              <span className="text-sm font-medium text-blue-900">Logic Summary</span>
            </div>
            <div className="text-sm text-blue-800 font-mono">
              Execute when: {conditions.map((condition, index) => (
                <span key={index}>
                  {index > 0 && <strong> AND </strong>}
                  <span className="bg-blue-100 px-2 py-1 rounded">
                    {condition.field} {condition.operator} {typeof condition.value === 'object' 
                      ? JSON.stringify(condition.value) 
                      : condition.value}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Mock data for available fields
export const mockAvailableFields: ConditionField[] = [
  {
    id: 'lead_score',
    label: 'Lead Score',
    type: 'number',
    category: 'lead',
    description: 'Calculated lead score from 0-100'
  },
  {
    id: 'email',
    label: 'Email Address',
    type: 'string',
    category: 'contact',
    description: 'Lead email address'
  },
  {
    id: 'company_size',
    label: 'Company Size',
    type: 'select',
    category: 'lead',
    options: [
      { value: '1-10', label: '1-10 employees' },
      { value: '11-50', label: '11-50 employees' },
      { value: '51-200', label: '51-200 employees' },
      { value: '201-1000', label: '201-1000 employees' },
      { value: '1000+', label: '1000+ employees' }
    ],
    description: 'Size of the lead\'s company'
  },
  {
    id: 'last_email_opened',
    label: 'Last Email Opened',
    type: 'date',
    category: 'engagement',
    description: 'Date when lead last opened an email'
  },
  {
    id: 'page_views',
    label: 'Page Views',
    type: 'number',
    category: 'activity',
    description: 'Number of website pages viewed'
  },
  {
    id: 'tags',
    label: 'Tags',
    type: 'array',
    category: 'lead',
    description: 'Tags assigned to the lead'
  },
  {
    id: 'created_at',
    label: 'Created Date',
    type: 'date',
    category: 'system',
    description: 'When the lead was created'
  },
  {
    id: 'is_qualified',
    label: 'Is Qualified',
    type: 'boolean',
    category: 'lead',
    description: 'Whether the lead has been qualified'
  }
]