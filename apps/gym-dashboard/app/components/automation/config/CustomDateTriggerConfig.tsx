'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Calendar, Clock, Plus, X, CalendarDays } from 'lucide-react'

interface CustomDateTriggerConfigProps {
  config: any
  onChange: (config: any) => void
  organizationId: string
}

interface DateRule {
  id: string
  dateSource: 'fixed' | 'relative' | 'contact_field' | 'recurring'
  fixedDate?: string
  fixedTime?: string
  relativeAmount?: number
  relativeUnit?: 'days' | 'weeks' | 'months' | 'years'
  relativeFrom?: 'now' | 'contact_created' | 'contact_updated' | 'custom_field'
  contactField?: string
  recurringType?: 'daily' | 'weekly' | 'monthly' | 'yearly'
  recurringInterval?: number
  timezone?: string
}

export default function CustomDateTriggerConfig({ config, onChange, organizationId }: CustomDateTriggerConfigProps) {
  const [triggerName, setTriggerName] = useState(config.name || 'Custom Date Trigger')
  const [contactFields, setContactFields] = useState<Array<{ name: string; label: string; type: string }>>([])
  const [filters, setFilters] = useState(config.filters || {
    triggerType: 'fixed_date', // 'fixed_date', 'relative_date', 'recurring_date', 'contact_field_date'
    dateRules: [] as DateRule[],
    timezone: 'UTC',
    bufferTime: 0, // Minutes before/after the date
    skipWeekends: false,
    skipHolidays: false
  })
  const [additionalFilters, setAdditionalFilters] = useState(config.additionalFilters || [])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (config.name) {
      setTriggerName(config.name)
    }
    
    // Initialize with a default date rule if none exist
    if (!config.filters?.dateRules?.length) {
      const defaultRule: DateRule = {
        id: Date.now().toString(),
        dateSource: 'fixed',
        fixedDate: new Date().toISOString().split('T')[0],
        fixedTime: '09:00',
        timezone: 'UTC'
      }
      handleFilterChange('dateRules', [defaultRule])
    }
  }, [])

  useEffect(() => {
    loadContactFields()
  }, [organizationId])

  const loadContactFields = async () => {
    try {
      setLoading(true)
      
      // Load contact fields that are date/datetime types
      const response = await fetch('/api/contacts/fields?type=date')
      if (response.ok) {
        const data = await response.json()
        if (data.fields) {
          setContactFields(data.fields.filter((field: any) => 
            field.type === 'date' || field.type === 'datetime'
          ))
        }
      } else {
        // Default date fields
        setContactFields([
          { name: 'created_at', label: 'Created Date', type: 'datetime' },
          { name: 'updated_at', label: 'Updated Date', type: 'datetime' },
          { name: 'birthday', label: 'Birthday', type: 'date' },
          { name: 'anniversary', label: 'Anniversary', type: 'date' },
          { name: 'last_contact', label: 'Last Contact Date', type: 'datetime' }
        ])
      }
    } catch (error) {
      console.error('Error loading contact fields:', error)
      setContactFields([
        { name: 'created_at', label: 'Created Date', type: 'datetime' },
        { name: 'updated_at', label: 'Updated Date', type: 'datetime' },
        { name: 'birthday', label: 'Birthday', type: 'date' }
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

  const addDateRule = () => {
    const newRule: DateRule = {
      id: Date.now().toString(),
      dateSource: 'fixed',
      fixedDate: new Date().toISOString().split('T')[0],
      fixedTime: '09:00',
      timezone: filters.timezone
    }
    
    const updatedRules = [...filters.dateRules, newRule]
    handleFilterChange('dateRules', updatedRules)
  }

  const updateDateRule = (ruleId: string, updates: Partial<DateRule>) => {
    const updatedRules = filters.dateRules.map((rule: DateRule) => 
      rule.id === ruleId ? { ...rule, ...updates } : rule
    )
    handleFilterChange('dateRules', updatedRules)
  }

  const removeDateRule = (ruleId: string) => {
    const updatedRules = filters.dateRules.filter((rule: DateRule) => rule.id !== ruleId)
    handleFilterChange('dateRules', updatedRules)
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

  const renderDateRuleConfig = (rule: DateRule, index: number) => {
    return (
      <div key={rule.id} className="border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900">Date Rule #{index + 1}</h4>
          {filters.dateRules.length > 1 && (
            <button
              type="button"
              onClick={() => removeDateRule(rule.id)}
              className="text-red-600 hover:text-red-800"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Date Source Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date source
          </label>
          <div className="relative">
            <select
              value={rule.dateSource}
              onChange={(e) => updateDateRule(rule.id, { dateSource: e.target.value as any })}
              className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="fixed">Fixed date and time</option>
              <option value="relative">Relative to a reference date</option>
              <option value="contact_field">Contact date field</option>
              <option value="recurring">Recurring schedule</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Fixed Date Configuration */}
        {rule.dateSource === 'fixed' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                type="date"
                value={rule.fixedDate || ''}
                onChange={(e) => updateDateRule(rule.id, { fixedDate: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time
              </label>
              <input
                type="time"
                value={rule.fixedTime || '09:00'}
                onChange={(e) => updateDateRule(rule.id, { fixedTime: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        )}

        {/* Relative Date Configuration */}
        {rule.dateSource === 'relative' && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <input
                type="number"
                value={rule.relativeAmount || 1}
                onChange={(e) => updateDateRule(rule.id, { relativeAmount: parseInt(e.target.value) || 1 })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="1"
                min="1"
              />
              <select
                value={rule.relativeUnit || 'days'}
                onChange={(e) => updateDateRule(rule.id, { relativeUnit: e.target.value as any })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
                <option value="years">Years</option>
              </select>
              <select
                value={rule.relativeFrom || 'now'}
                onChange={(e) => updateDateRule(rule.id, { relativeFrom: e.target.value as any })}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="now">from now</option>
                <option value="contact_created">after contact created</option>
                <option value="contact_updated">after contact updated</option>
                <option value="custom_field">after custom field date</option>
              </select>
            </div>

            {rule.relativeFrom === 'custom_field' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reference field
                </label>
                <select
                  value={rule.contactField || ''}
                  onChange={(e) => updateDateRule(rule.id, { contactField: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a date field...</option>
                  {contactFields.map(field => (
                    <option key={field.name} value={field.name}>
                      {field.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Contact Field Configuration */}
        {rule.dateSource === 'contact_field' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact date field
            </label>
            <select
              value={rule.contactField || ''}
              onChange={(e) => updateDateRule(rule.id, { contactField: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a date field...</option>
              {contactFields.map(field => (
                <option key={field.name} value={field.name}>
                  {field.label} ({field.type})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Recurring Configuration */}
        {rule.dateSource === 'recurring' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Repeat every
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={rule.recurringInterval || 1}
                    onChange={(e) => updateDateRule(rule.id, { recurringInterval: parseInt(e.target.value) || 1 })}
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                  />
                  <select
                    value={rule.recurringType || 'weekly'}
                    onChange={(e) => updateDateRule(rule.id, { recurringType: e.target.value as any })}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="daily">Day(s)</option>
                    <option value="weekly">Week(s)</option>
                    <option value="monthly">Month(s)</option>
                    <option value="yearly">Year(s)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time
                </label>
                <input
                  type="time"
                  value={rule.fixedTime || '09:00'}
                  onChange={(e) => updateDateRule(rule.id, { fixedTime: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Timezone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Timezone
          </label>
          <select
            value={rule.timezone || 'UTC'}
            onChange={(e) => updateDateRule(rule.id, { timezone: e.target.value })}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="UTC">UTC</option>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
            <option value="Europe/London">London Time</option>
            <option value="Europe/Paris">Paris Time</option>
            <option value="Asia/Tokyo">Tokyo Time</option>
            <option value="Australia/Sydney">Sydney Time</option>
          </select>
        </div>
      </div>
    )
  }

  if (loading) {
    return <div className="p-4 text-center">Loading date configuration...</div>
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

      {/* Custom Date Configuration */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
            CUSTOM DATE TRIGGER SETTINGS
          </label>
          <p className="text-sm text-gray-500 mb-4">
            Configure date-based triggers with flexible scheduling options
          </p>
        </div>

        {/* Date Fields Information */}
        {contactFields.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center">
              <CalendarDays className="w-5 h-5 text-blue-600 mr-2" />
              <span className="text-blue-800 font-medium">
                {contactFields.length} date fields available for reference
              </span>
            </div>
          </div>
        )}

        {/* Date Rules */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">
              Date Rules
            </label>
            <button
              type="button"
              onClick={addDateRule}
              className="text-blue-600 hover:text-blue-700 font-medium flex items-center text-sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Rule
            </button>
          </div>

          {filters.dateRules.map((rule: DateRule, index: number) => (
            renderDateRuleConfig(rule, index)
          ))}

          {filters.dateRules.length === 0 && (
            <div className="text-center py-8 border border-dashed border-gray-300 rounded-lg">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500 mb-4">No date rules configured</p>
              <button
                type="button"
                onClick={addDateRule}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Add Your First Date Rule
              </button>
            </div>
          )}
        </div>

        {/* Buffer Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Buffer time (minutes)
          </label>
          <input
            type="number"
            value={filters.bufferTime || 0}
            onChange={(e) => handleFilterChange('bufferTime', parseInt(e.target.value) || 0)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="0"
            min="0"
            max="1440"
          />
          <p className="text-xs text-gray-500 mt-1">
            Allow triggering this many minutes before/after the exact time
          </p>
        </div>

        {/* Skip Options */}
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="skip-weekends"
              checked={filters.skipWeekends || false}
              onChange={(e) => handleFilterChange('skipWeekends', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="skip-weekends" className="ml-2 text-sm text-gray-700">
              Skip weekends (move to next weekday)
            </label>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="skip-holidays"
              checked={filters.skipHolidays || false}
              onChange={(e) => handleFilterChange('skipHolidays', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="skip-holidays" className="ml-2 text-sm text-gray-700">
              Skip holidays (move to next business day)
            </label>
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
                  <option value="trigger.day_of_week">Day of Week</option>
                  <option value="trigger.time">Time of Day</option>
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