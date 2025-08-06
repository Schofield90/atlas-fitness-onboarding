'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Plus, X, Clock, Bell, Calendar, AlertTriangle } from 'lucide-react'

interface TaskReminderTriggerConfigProps {
  config: any
  onChange: (config: any) => void
  organizationId: string
}

interface TaskType {
  id: string
  name: string
  description?: string
}

interface TaskAssignee {
  id: string
  name: string
  email: string
}

export default function TaskReminderTriggerConfig({ config, onChange, organizationId }: TaskReminderTriggerConfigProps) {
  const [triggerName, setTriggerName] = useState(config.name || 'Task Reminder Trigger')
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([])
  const [taskAssignees, setTaskAssignees] = useState<TaskAssignee[]>([])
  const [filters, setFilters] = useState(config.filters || {
    reminderType: 'due_date', // 'due_date', 'start_date', 'custom_reminder'
    reminderTiming: 'before', // 'before', 'after', 'on'
    timeAmount: 1,
    timeUnit: 'hours', // 'minutes', 'hours', 'days', 'weeks'
    taskType: 'any', // 'any', specific task type id
    assignedTo: 'any', // 'any', 'me', specific user id
    priority: 'any', // 'any', 'low', 'medium', 'high', 'urgent'
    status: 'any', // 'any', 'pending', 'in_progress', 'overdue'
    repeatReminder: false, // whether to repeat the reminder
    repeatInterval: 1, // how often to repeat (in same timeUnit)
    maxReminders: 3 // maximum number of reminder repeats
  })
  const [additionalFilters, setAdditionalFilters] = useState(config.additionalFilters || [])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (config.name) {
      setTriggerName(config.name)
    }
  }, [])

  useEffect(() => {
    loadAvailableData()
  }, [organizationId])

  const loadAvailableData = async () => {
    try {
      setLoading(true)
      
      // Load available task types
      const taskTypesResponse = await fetch('/api/tasks/types')
      if (taskTypesResponse.ok) {
        const taskTypesData = await taskTypesResponse.json()
        if (taskTypesData.taskTypes) {
          setTaskTypes(taskTypesData.taskTypes.map((type: any) => ({
            id: type.id,
            name: type.name,
            description: type.description
          })))
        }
      } else {
        // Default task types if API is not available
        setTaskTypes([
          { id: 'follow_up', name: 'Follow-up', description: 'Follow-up tasks' },
          { id: 'call', name: 'Call', description: 'Phone call tasks' },
          { id: 'email', name: 'Email', description: 'Email tasks' },
          { id: 'meeting', name: 'Meeting', description: 'Meeting tasks' },
          { id: 'research', name: 'Research', description: 'Research tasks' },
          { id: 'proposal', name: 'Proposal', description: 'Proposal tasks' }
        ])
      }
      
      // Load available task assignees (team members)
      const assigneesResponse = await fetch('/api/team/members')
      if (assigneesResponse.ok) {
        const assigneesData = await assigneesResponse.json()
        if (assigneesData.members) {
          setTaskAssignees(assigneesData.members.map((member: any) => ({
            id: member.id,
            name: member.name || member.email,
            email: member.email
          })))
        }
      } else {
        console.error('Failed to fetch team members')
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onChange({ ...config, filters: newFilters })
  }

  const addAdditionalFilter = () => {
    const newFilter = {
      id: Date.now().toString(),
      field: 'task.title',
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

  const getSelectedTaskType = () => {
    return taskTypes.find(type => type.id === filters.taskType)
  }

  const getSelectedAssignee = () => {
    return taskAssignees.find(assignee => assignee.id === filters.assignedTo)
  }

  const formatReminderDescription = () => {
    const timing = filters.reminderTiming
    const amount = filters.timeAmount
    const unit = filters.timeUnit
    const type = filters.reminderType
    
    let description = `${amount} ${unit} ${timing} `
    
    if (type === 'due_date') {
      description += 'task due date'
    } else if (type === 'start_date') {
      description += 'task start date'
    } else {
      description += 'custom reminder time'
    }
    
    return description
  }

  if (loading) {
    return <div className="p-4 text-center">Loading task reminder configuration...</div>
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

      {/* Task Reminder Configuration */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
            TASK REMINDER TRIGGER SETTINGS
          </label>
          <p className="text-sm text-gray-500 mb-4">
            Configure when to send task reminders based on due dates
          </p>
        </div>

        {/* Reminder Type */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reminder based on
            </label>
            <div className="relative">
              <select
                value={filters.reminderType}
                onChange={(e) => handleFilterChange('reminderType', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="due_date">Task due date</option>
                <option value="start_date">Task start date</option>
                <option value="custom_reminder">Custom reminder time</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Reminder Timing */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time amount
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={filters.timeAmount}
              onChange={(e) => handleFilterChange('timeAmount', parseInt(e.target.value) || 1)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time unit
            </label>
            <div className="relative">
              <select
                value={filters.timeUnit}
                onChange={(e) => handleFilterChange('timeUnit', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timing
            </label>
            <div className="relative">
              <select
                value={filters.reminderTiming}
                onChange={(e) => handleFilterChange('reminderTiming', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="before">Before</option>
                <option value="after">After</option>
                <option value="on">On</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Reminder Description */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <Bell className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-blue-800 font-medium">
              Reminder will trigger {formatReminderDescription()}
            </span>
          </div>
        </div>

        {/* Task Type Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Task type
            </label>
            <div className="relative">
              <select
                value={filters.taskType}
                onChange={(e) => handleFilterChange('taskType', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any task type</option>
                {taskTypes.map(type => (
                  <option key={type.id} value={type.id}>{type.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg block text-center">
              {getSelectedTaskType()?.name || 'Any'}
            </span>
          </div>
        </div>

        {/* Assigned To Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assigned to
            </label>
            <div className="relative">
              <select
                value={filters.assignedTo}
                onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Anyone</option>
                <option value="me">Me</option>
                {taskAssignees.map(assignee => (
                  <option key={assignee.id} value={assignee.id}>{assignee.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg block text-center">
              {filters.assignedTo === 'me' ? 'Me' : getSelectedAssignee()?.name || 'Anyone'}
            </span>
          </div>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority level
            </label>
            <div className="relative">
              <select
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any priority</option>
                <option value="low">Low priority</option>
                <option value="medium">Medium priority</option>
                <option value="high">High priority</option>
                <option value="urgent">Urgent priority</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <span className={`px-4 py-3 rounded-lg block text-center capitalize ${
              filters.priority === 'urgent' ? 'bg-red-100 text-red-700' :
              filters.priority === 'high' ? 'bg-orange-100 text-orange-700' :
              filters.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              filters.priority === 'low' ? 'bg-green-100 text-green-700' :
              'bg-gray-100 text-gray-700'
            }`}>
              {filters.priority === 'any' ? 'Any' : filters.priority}
            </span>
          </div>
        </div>

        {/* Repeat Reminder Settings */}
        <div className="space-y-3">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="repeatReminder"
              checked={filters.repeatReminder}
              onChange={(e) => handleFilterChange('repeatReminder', e.target.checked)}
              className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="repeatReminder" className="text-sm font-medium text-gray-700">
              Repeat reminder if task is still pending
            </label>
          </div>

          {filters.repeatReminder && (
            <div className="ml-7 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Repeat every
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="24"
                    value={filters.repeatInterval}
                    onChange={(e) => handleFilterChange('repeatInterval', parseInt(e.target.value) || 1)}
                    className="w-20 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <span className="text-sm text-gray-600">{filters.timeUnit}</span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max reminders
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={filters.maxReminders}
                  onChange={(e) => handleFilterChange('maxReminders', parseInt(e.target.value) || 3)}
                  className="w-20 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
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
                  <option value="task.title">Task Title</option>
                  <option value="task.description">Task Description</option>
                  <option value="task.due_date">Due Date</option>
                  <option value="task.created_at">Created Date</option>
                  <option value="contact.name">Related Contact Name</option>
                  <option value="contact.email">Related Contact Email</option>
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
      </div>
    </div>
  )
}