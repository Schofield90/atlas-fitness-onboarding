'use client'

import { useState, useEffect } from 'react'
import { ChevronDown, Calendar, Clock, User, Plus, X, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

interface AppointmentTriggerConfigProps {
  config: any
  onChange: (config: any) => void
  organizationId: string
}

interface Staff {
  id: string
  name: string
  email: string
  role: string
}

interface AppointmentType {
  id: string
  name: string
  duration: number
  color: string
}

export default function AppointmentTriggerConfig({ config, onChange, organizationId }: AppointmentTriggerConfigProps) {
  const [triggerName, setTriggerName] = useState(config.name || 'Appointment Trigger')
  const [staff, setStaff] = useState<Staff[]>([])
  const [appointmentTypes, setAppointmentTypes] = useState<AppointmentType[]>([])
  const [filters, setFilters] = useState(config.filters || {
    appointmentAction: 'appointment_booked', // 'appointment_booked', 'appointment_cancelled', 'appointment_completed', 'appointment_no_show'
    staffFilter: 'any', // 'any', 'specific'
    selectedStaff: [],
    appointmentTypeFilter: 'any', // 'any', 'specific'
    selectedAppointmentTypes: [],
    timeFilter: 'any', // 'any', 'business_hours', 'after_hours', 'specific_time_range'
    timeRange: {
      start: '09:00',
      end: '17:00'
    },
    advanceNotice: 0 // Minutes before appointment to trigger (for upcoming appointments)
  })
  const [additionalFilters, setAdditionalFilters] = useState(config.additionalFilters || [])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (config.name) {
      setTriggerName(config.name)
    }
  }, [])

  useEffect(() => {
    loadAppointmentData()
  }, [organizationId])

  const loadAppointmentData = async () => {
    try {
      setLoading(true)
      
      // Load staff members
      const staffResponse = await fetch('/api/staff')
      if (staffResponse.ok) {
        const staffData = await staffResponse.json()
        if (staffData.staff) {
          setStaff(staffData.staff.map((member: any) => ({
            id: member.id,
            name: member.name || member.email,
            email: member.email,
            role: member.role || 'Staff'
          })))
        }
      }

      // Load appointment types
      const typesResponse = await fetch('/api/appointments/types')
      if (typesResponse.ok) {
        const typesData = await typesResponse.json()
        if (typesData.appointmentTypes) {
          setAppointmentTypes(typesData.appointmentTypes.map((type: any) => ({
            id: type.id,
            name: type.name,
            duration: type.duration || 60,
            color: type.color || '#3B82F6'
          })))
        }
      }
    } catch (error) {
      console.error('Error loading appointment data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (key: string, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onChange({ ...config, filters: newFilters })
  }

  const handleStaffSelection = (staffId: string) => {
    const currentStaff = filters.selectedStaff
    let newStaff
    
    if (currentStaff.includes(staffId)) {
      newStaff = currentStaff.filter((id: string) => id !== staffId)
    } else {
      newStaff = [...currentStaff, staffId]
    }
    
    handleFilterChange('selectedStaff', newStaff)
  }

  const handleAppointmentTypeSelection = (typeId: string) => {
    const currentTypes = filters.selectedAppointmentTypes
    let newTypes
    
    if (currentTypes.includes(typeId)) {
      newTypes = currentTypes.filter((id: string) => id !== typeId)
    } else {
      newTypes = [...currentTypes, typeId]
    }
    
    handleFilterChange('selectedAppointmentTypes', newTypes)
  }

  const addAdditionalFilter = () => {
    const newFilter = {
      id: Date.now().toString(),
      field: 'appointment.duration',
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

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'appointment_booked': return <Calendar className="w-5 h-5 text-green-600" />
      case 'appointment_cancelled': return <XCircle className="w-5 h-5 text-red-600" />
      case 'appointment_completed': return <CheckCircle className="w-5 h-5 text-blue-600" />
      case 'appointment_no_show': return <AlertTriangle className="w-5 h-5 text-orange-600" />
      default: return <Calendar className="w-5 h-5 text-gray-600" />
    }
  }

  const getActionDescription = (action: string) => {
    switch (action) {
      case 'appointment_booked': return 'When a new appointment is scheduled'
      case 'appointment_cancelled': return 'When an appointment is cancelled'
      case 'appointment_completed': return 'When an appointment is marked as completed'
      case 'appointment_no_show': return 'When a client doesn\'t show up for their appointment'
      default: return 'When an appointment event occurs'
    }
  }

  if (loading) {
    return <div className="p-4 text-center">Loading appointment data...</div>
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

      {/* Appointment Trigger Configuration */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
            APPOINTMENT TRIGGER SETTINGS
          </label>
          <p className="text-sm text-gray-500 mb-4">
            Configure when to trigger based on appointment events
          </p>
        </div>

        {/* Appointment Action */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Trigger when
            </label>
            <div className="relative">
              <select
                value={filters.appointmentAction}
                onChange={(e) => handleFilterChange('appointmentAction', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="appointment_booked">Appointment is booked</option>
                <option value="appointment_cancelled">Appointment is cancelled</option>
                <option value="appointment_completed">Appointment is completed</option>
                <option value="appointment_no_show">Client doesn't show up</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
            <div className="mt-2 flex items-center text-sm text-gray-600">
              {getActionIcon(filters.appointmentAction)}
              <span className="ml-2">{getActionDescription(filters.appointmentAction)}</span>
            </div>
          </div>
        </div>

        {/* Staff Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Staff member
            </label>
            <div className="relative">
              <select
                value={filters.staffFilter}
                onChange={(e) => handleFilterChange('staffFilter', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any staff member</option>
                <option value="specific">Specific staff members only</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Specific Staff Selection */}
        {filters.staffFilter === 'specific' && staff.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select staff members
            </label>
            <div className="grid grid-cols-2 gap-2">
              {staff.map(member => (
                <label
                  key={member.id}
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filters.selectedStaff.includes(member.id)}
                    onChange={() => handleStaffSelection(member.id)}
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex items-center">
                    <User className="w-4 h-4 text-gray-400 mr-2" />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{member.name}</div>
                      <div className="text-xs text-gray-500">{member.role}</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Appointment Type Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Appointment type
            </label>
            <div className="relative">
              <select
                value={filters.appointmentTypeFilter}
                onChange={(e) => handleFilterChange('appointmentTypeFilter', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any appointment type</option>
                <option value="specific">Specific appointment types only</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Specific Appointment Type Selection */}
        {filters.appointmentTypeFilter === 'specific' && appointmentTypes.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select appointment types
            </label>
            <div className="grid grid-cols-2 gap-2">
              {appointmentTypes.map(type => (
                <label
                  key={type.id}
                  className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filters.selectedAppointmentTypes.includes(type.id)}
                    onChange={() => handleAppointmentTypeSelection(type.id)}
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="flex items-center">
                    <span
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: type.color }}
                    />
                    <div>
                      <div className="text-sm font-medium text-gray-900">{type.name}</div>
                      <div className="text-xs text-gray-500">{type.duration} minutes</div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Time Filter */}
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time of appointment
            </label>
            <div className="relative">
              <select
                value={filters.timeFilter}
                onChange={(e) => handleFilterChange('timeFilter', e.target.value)}
                className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg appearance-none bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="any">Any time</option>
                <option value="business_hours">During business hours</option>
                <option value="after_hours">After business hours</option>
                <option value="specific_time_range">Specific time range</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Specific Time Range */}
        {filters.timeFilter === 'specific_time_range' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time range
            </label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Start time</label>
                <input
                  type="time"
                  value={filters.timeRange.start}
                  onChange={(e) => handleFilterChange('timeRange', { ...filters.timeRange, start: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">End time</label>
                <input
                  type="time"
                  value={filters.timeRange.end}
                  onChange={(e) => handleFilterChange('timeRange', { ...filters.timeRange, end: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Data Display */}
        {(staff.length === 0 && appointmentTypes.length === 0) ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
            <Calendar className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Appointment System Data Found
            </h3>
            <p className="text-gray-600 mb-4">
              Set up your appointment system with staff and appointment types to use this trigger.
            </p>
            <a
              href="/booking/setup"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Setup Appointments
            </a>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="w-5 h-5 text-blue-600 mr-2" />
                <span className="text-blue-800 font-medium">
                  {staff.length} staff, {appointmentTypes.length} appointment types
                </span>
              </div>
            </div>
          </div>
        )}

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
                  <option value="appointment.duration">Appointment Duration</option>
                  <option value="appointment.notes">Appointment Notes</option>
                  <option value="client.name">Client Name</option>
                  <option value="client.email">Client Email</option>
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