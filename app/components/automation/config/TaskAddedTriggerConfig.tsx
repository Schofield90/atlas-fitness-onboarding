'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Plus, X, CheckSquare, AlertCircle, User, Calendar } from 'lucide-react'

interface TaskAddedTriggerConfigProps {
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

export default function TaskAddedTriggerConfig({ config, onChange, organizationId }: TaskAddedTriggerConfigProps) {
  const [triggerName, setTriggerName] = useState(config.name || 'Task Added Trigger')
  const [taskTypes, setTaskTypes] = useState<TaskType[]>([])
  const [taskAssignees, setTaskAssignees] = useState<TaskAssignee[]>([])
  const [filters, setFilters] = useState(config.filters || {
    taskType: 'any', // 'any', specific task type id
    assignedTo: 'any', // 'any', 'me', specific user id
    priority: 'any', // 'any', 'low', 'medium', 'high', 'urgent'
    dueDate: 'any', // 'any', 'with_due_date', 'without_due_date', 'overdue', 'due_today', 'due_this_week'
    status: 'any', // 'any', 'pending', 'in_progress', 'completed', 'cancelled'
    category: 'any', // 'any', specific category
    relatedTo: 'any' // 'any', 'contact', 'opportunity', 'appointment'
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

  if (loading) {
    return <div className="p-4 text-center">Loading tasks configuration...</div>
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

      {/* Task Configuration */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
            TASK TRIGGER SETTINGS
          </label>
          <p className="text-sm text-gray-500 mb-4">
            Configure when to trigger based on task creation
          </p>
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
                <option value="unassigned">Unassigned</option>
                {taskAssignees.map(assignee => (
                  <option key={assignee.id} value={assignee.id}>{assignee.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg block text-center">
              {filters.assignedTo === 'me' ? 'Me' : 
               filters.assignedTo === 'unassigned' ? 'Unassigned' :
               getSelectedAssignee()?.name || 'Anyone'}
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

        {/* Due Date Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Due date condition
            </label>
            <div className="relative">
              <select
                value={filters.dueDate}
                onChange={(e) => handleFilterChange('dueDate', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any due date</option>
                <option value="with_due_date">Has due date</option>
                <option value="without_due_date">No due date</option>
                <option value="overdue">Overdue</option>
                <option value="due_today">Due today</option>
                <option value="due_this_week">Due this week</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg block text-center">
              {filters.dueDate === 'any' ? 'Any' : 
               filters.dueDate === 'with_due_date' ? 'Has due date' :
               filters.dueDate === 'without_due_date' ? 'No due date' :
               filters.dueDate === 'overdue' ? 'Overdue' :
               filters.dueDate === 'due_today' ? 'Due today' :
               filters.dueDate === 'due_this_week' ? 'Due this week' :
               'Any'}
            </span>
          </div>
        </div>

        {/* Related To Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Related to
            </label>
            <div className="relative">
              <select
                value={filters.relatedTo}
                onChange={(e) => handleFilterChange('relatedTo', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any relation</option>
                <option value="contact">Related to contact</option>
                <option value="opportunity">Related to opportunity</option>
                <option value="appointment">Related to appointment</option>
                <option value="none">Not related to anything</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
          <div className="flex-1">
            <span className="px-4 py-3 bg-gray-100 text-gray-700 rounded-lg block text-center">
              {filters.relatedTo === 'any' ? 'Any' : 
               filters.relatedTo === 'contact' ? 'Contact' :
               filters.relatedTo === 'opportunity' ? 'Opportunity' :
               filters.relatedTo === 'appointment' ? 'Appointment' :
               filters.relatedTo === 'none' ? 'None' :
               'Any'}
            </span>
          </div>
        </div>

        {/* Task Info Display */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckSquare className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-blue-800 font-medium">
              Trigger will fire when tasks are added matching the above criteria
            </span>
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
                  <option value="task.title">Task Title</option>
                  <option value="task.description">Task Description</option>
                  <option value="task.created_by">Created By</option>
                  <option value="task.created_at">Created Date</option>
                  <option value="task.due_date">Due Date</option>
                  <option value="task.category">Category</option>
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