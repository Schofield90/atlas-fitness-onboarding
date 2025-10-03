'use client'

import { useState, useEffect } from 'react'
import { Info, Calendar, Users, Clock, AlertCircle } from 'lucide-react'

interface BookingTriggerConfigProps {
  config: any
  onChange: (config: any) => void
  organizationId: string
  triggerType: string
}

export default function BookingTriggerConfig({ 
  config, 
  onChange, 
  organizationId,
  triggerType 
}: BookingTriggerConfigProps) {
  const [localConfig, setLocalConfig] = useState(config || {
    conditions: []
  })

  useEffect(() => {
    setLocalConfig(config || { conditions: [] })
  }, [config])

  const handleChange = (field: string, value: any) => {
    const updated = { ...localConfig, [field]: value }
    setLocalConfig(updated)
    onChange(updated)
  }

  const handleConditionChange = (index: number, field: string, value: any) => {
    const conditions = [...(localConfig.conditions || [])]
    conditions[index] = { ...conditions[index], [field]: value }
    handleChange('conditions', conditions)
  }

  const addCondition = () => {
    const conditions = [...(localConfig.conditions || []), { field: '', operator: 'equals', value: '' }]
    handleChange('conditions', conditions)
  }

  const removeCondition = (index: number) => {
    const conditions = localConfig.conditions.filter((_: any, i: number) => i !== index)
    handleChange('conditions', conditions)
  }

  const getTriggerDescription = () => {
    switch (triggerType) {
      case 'missed_session':
        return 'This automation will trigger when a client misses a booked session (marked as no-show).'
      case 'first_session':
        return 'This automation will trigger when a client attends their first session at your gym.'
      case 'booking_confirmed':
        return 'This automation will trigger immediately when a booking is confirmed.'
      case 'class_full':
        return 'This automation will trigger when a class reaches its maximum capacity.'
      case 'booking_cancelled':
        return 'This automation will trigger when a client cancels their booking.'
      case 'waitlist_joined':
        return 'This automation will trigger when a client joins a waitlist for a full class.'
      default:
        return 'Configure when this automation should trigger.'
    }
  }

  const getConditionFields = () => {
    switch (triggerType) {
      case 'missed_session':
        return [
          { value: 'class_type', label: 'Class Type' },
          { value: 'instructor', label: 'Instructor' },
          { value: 'time_of_day', label: 'Time of Day' },
          { value: 'missed_count', label: 'Number of Misses' },
          { value: 'membership_type', label: 'Membership Type' }
        ]
      case 'first_session':
        return [
          { value: 'class_type', label: 'Class Type' },
          { value: 'instructor', label: 'Instructor' },
          { value: 'membership_type', label: 'Membership Type' },
          { value: 'referral_source', label: 'Referral Source' }
        ]
      case 'booking_confirmed':
        return [
          { value: 'class_type', label: 'Class Type' },
          { value: 'booking_time', label: 'Booking Time' },
          { value: 'days_before_class', label: 'Days Before Class' },
          { value: 'membership_type', label: 'Membership Type' }
        ]
      case 'class_full':
        return [
          { value: 'class_type', label: 'Class Type' },
          { value: 'day_of_week', label: 'Day of Week' },
          { value: 'time_of_day', label: 'Time of Day' },
          { value: 'waitlist_size', label: 'Waitlist Size' }
        ]
      case 'booking_cancelled':
        return [
          { value: 'hours_before_class', label: 'Hours Before Class' },
          { value: 'class_type', label: 'Class Type' },
          { value: 'cancellation_reason', label: 'Cancellation Reason' },
          { value: 'membership_type', label: 'Membership Type' }
        ]
      case 'waitlist_joined':
        return [
          { value: 'class_type', label: 'Class Type' },
          { value: 'waitlist_position', label: 'Waitlist Position' },
          { value: 'days_until_class', label: 'Days Until Class' }
        ]
      default:
        return []
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 p-4 rounded-lg">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Trigger Description</h4>
            <p className="text-sm text-blue-800">{getTriggerDescription()}</p>
          </div>
        </div>
      </div>

      {/* Trigger-specific options */}
      {triggerType === 'missed_session' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Check for missed sessions
          </label>
          <select
            value={localConfig.checkFrequency || 'immediately'}
            onChange={(e) => handleChange('checkFrequency', e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg"
          >
            <option value="immediately">Immediately after session ends</option>
            <option value="30min">30 minutes after session ends</option>
            <option value="1hour">1 hour after session ends</option>
            <option value="next_day">Next day at 9 AM</option>
          </select>
        </div>
      )}

      {triggerType === 'first_session' && (
        <div>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={localConfig.includeTrialSessions || false}
              onChange={(e) => handleChange('includeTrialSessions', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm font-medium text-gray-700">
              Include trial/intro sessions
            </span>
          </label>
        </div>
      )}

      {/* Conditions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-gray-900">Conditions (Optional)</h4>
          <button
            onClick={addCondition}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            + Add Condition
          </button>
        </div>

        {localConfig.conditions?.map((condition: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-2">
            <select
              value={condition.field}
              onChange={(e) => handleConditionChange(index, 'field', e.target.value)}
              className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="">Select field...</option>
              {getConditionFields().map(field => (
                <option key={field.value} value={field.value}>
                  {field.label}
                </option>
              ))}
            </select>
            
            <select
              value={condition.operator}
              onChange={(e) => handleConditionChange(index, 'operator', e.target.value)}
              className="w-32 p-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="equals">equals</option>
              <option value="not_equals">not equals</option>
              <option value="greater_than">greater than</option>
              <option value="less_than">less than</option>
              <option value="contains">contains</option>
            </select>
            
            <input
              type="text"
              value={condition.value}
              onChange={(e) => handleConditionChange(index, 'value', e.target.value)}
              placeholder="Value"
              className="flex-1 p-2 border border-gray-300 rounded-lg text-sm"
            />
            
            <button
              onClick={() => removeCondition(index)}
              className="text-red-600 hover:text-red-700"
            >
              ×
            </button>
          </div>
        ))}

        {localConfig.conditions?.length === 0 && (
          <p className="text-sm text-gray-500 italic">
            No conditions set. This trigger will fire for all {triggerType.replace(/_/g, ' ')} events.
          </p>
        )}
      </div>

      {/* Additional Settings */}
      <div className="space-y-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={localConfig.oncePerCustomer || false}
            onChange={(e) => handleChange('oncePerCustomer', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700">
            Only trigger once per customer
          </span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={localConfig.businessHoursOnly || false}
            onChange={(e) => handleChange('businessHoursOnly', e.target.checked)}
            className="rounded"
          />
          <span className="text-sm font-medium text-gray-700">
            Only trigger during business hours
          </span>
        </label>
      </div>
    </div>
  )
}