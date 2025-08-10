'use client'

import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Clock, Calendar } from 'lucide-react'
import Button from '@/app/components/ui/Button'
import { createClient } from '@/app/lib/supabase/client'

interface AvailabilityRule {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  is_enabled: boolean
  timezone: string
  buffer_before: number
  buffer_after: number
}

interface AvailabilityOverride {
  id: string
  date: string
  start_time?: string
  end_time?: string
  type: 'unavailable' | 'available' | 'modified_hours'
  reason?: string
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
]

export default function AvailabilityRules() {
  const [rules, setRules] = useState<AvailabilityRule[]>([])
  const [overrides, setOverrides] = useState<AvailabilityOverride[]>([])
  const [loading, setLoading] = useState(true)
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const [editingRule, setEditingRule] = useState<AvailabilityRule | null>(null)
  const [activeTab, setActiveTab] = useState<'rules' | 'overrides'>('rules')
  
  // Form state for rules
  const [ruleForm, setRuleForm] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
    is_enabled: true,
    buffer_before: 0,
    buffer_after: 15
  })

  // Form state for overrides
  const [overrideForm, setOverrideForm] = useState({
    date: '',
    type: 'unavailable' as const,
    start_time: '',
    end_time: '',
    reason: ''
  })

  useEffect(() => {
    fetchAvailabilityData()
  }, [])

  const fetchAvailabilityData = async () => {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      // Fetch availability rules
      const { data: rulesData, error: rulesError } = await supabase
        .from('availability_rules')
        .select('*')
        .eq('user_id', user.id)
        .order('day_of_week')

      if (!rulesError && rulesData) {
        setRules(rulesData)
      }

      // Fetch availability overrides
      const { data: overridesData, error: overridesError } = await supabase
        .from('availability_overrides')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date')

      if (!overridesError && overridesData) {
        setOverrides(overridesData)
      }
    } catch (error) {
      console.error('Error fetching availability:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRule = async () => {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      // Get organization ID using the same logic as appointment types
      let organizationId = '63589490-8f55-4157-bd3a-e141594b748e' // Default to Atlas Fitness

      const { data, error } = await supabase
        .from('availability_rules')
        .insert({
          ...ruleForm,
          user_id: user.id,
          organization_id: organizationId,
          timezone: 'Europe/London'
        })
        .select()
        .single()

      if (error) throw error

      setRules([...rules, data])
      setShowRuleModal(false)
      resetRuleForm()
      alert('Availability rule created successfully!')
    } catch (error) {
      console.error('Error creating rule:', error)
      alert('Failed to create availability rule')
    }
  }

  const handleUpdateRule = async () => {
    if (!editingRule) return

    try {
      const supabase = await createClient()
      const { data, error } = await supabase
        .from('availability_rules')
        .update(ruleForm)
        .eq('id', editingRule.id)
        .select()
        .single()

      if (error) throw error

      setRules(rules.map(rule => 
        rule.id === editingRule.id ? data : rule
      ))
      setEditingRule(null)
      setShowRuleModal(false)
      resetRuleForm()
      alert('Availability rule updated successfully!')
    } catch (error) {
      console.error('Error updating rule:', error)
      alert('Failed to update availability rule')
    }
  }

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this availability rule?')) return

    try {
      const supabase = await createClient()
      const { error } = await supabase
        .from('availability_rules')
        .delete()
        .eq('id', id)

      if (error) throw error

      setRules(rules.filter(rule => rule.id !== id))
      alert('Availability rule deleted successfully!')
    } catch (error) {
      console.error('Error deleting rule:', error)
      alert('Failed to delete availability rule')
    }
  }

  const handleCreateOverride = async () => {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) return

      let organizationId = '63589490-8f55-4157-bd3a-e141594b748e' // Default to Atlas Fitness

      const { data, error } = await supabase
        .from('availability_overrides')
        .insert({
          ...overrideForm,
          user_id: user.id,
          organization_id: organizationId
        })
        .select()
        .single()

      if (error) throw error

      setOverrides([...overrides, data])
      setShowOverrideModal(false)
      resetOverrideForm()
      alert('Availability override created successfully!')
      fetchAvailabilityData() // Refresh to get sorted list
    } catch (error) {
      console.error('Error creating override:', error)
      alert('Failed to create availability override')
    }
  }

  const handleDeleteOverride = async (id: string) => {
    if (!confirm('Are you sure you want to delete this override?')) return

    try {
      const supabase = await createClient()
      const { error } = await supabase
        .from('availability_overrides')
        .delete()
        .eq('id', id)

      if (error) throw error

      setOverrides(overrides.filter(override => override.id !== id))
      alert('Override deleted successfully!')
    } catch (error) {
      console.error('Error deleting override:', error)
      alert('Failed to delete override')
    }
  }

  const resetRuleForm = () => {
    setRuleForm({
      day_of_week: 1,
      start_time: '09:00',
      end_time: '17:00',
      is_enabled: true,
      buffer_before: 0,
      buffer_after: 15
    })
  }

  const resetOverrideForm = () => {
    setOverrideForm({
      date: '',
      type: 'unavailable',
      start_time: '',
      end_time: '',
      reason: ''
    })
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour
    return `${displayHour}:${minutes} ${ampm}`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading availability settings...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('rules')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'rules'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Working Hours
          </button>
          <button
            onClick={() => setActiveTab('overrides')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overrides'
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            Time Off & Overrides
          </button>
        </nav>
      </div>

      {activeTab === 'rules' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Working Hours</h3>
              <p className="text-sm text-gray-400 mt-1">
                Set your regular working hours for each day of the week
              </p>
            </div>
            <Button
              onClick={() => setShowRuleModal(true)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Working Hours
            </Button>
          </div>

          {rules.length === 0 ? (
            <div className="bg-gray-700 rounded-lg p-8 text-center">
              <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No working hours set yet</p>
              <Button
                onClick={() => setShowRuleModal(true)}
                variant="outline"
              >
                Set Your First Working Hours
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {DAYS_OF_WEEK.map((day) => {
                const dayRules = rules.filter(r => r.day_of_week === day.value)
                
                return (
                  <div key={day.value} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-white">{day.label}</h4>
                      <div className="flex items-center gap-4">
                        {dayRules.length === 0 ? (
                          <span className="text-sm text-gray-500">No hours set</span>
                        ) : (
                          dayRules.map((rule) => (
                            <div key={rule.id} className="flex items-center gap-2">
                              <span className={`text-sm ${rule.is_enabled ? 'text-gray-300' : 'text-gray-500 line-through'}`}>
                                {formatTime(rule.start_time)} - {formatTime(rule.end_time)}
                              </span>
                              <button
                                onClick={() => {
                                  setEditingRule(rule)
                                  setRuleForm({
                                    day_of_week: rule.day_of_week,
                                    start_time: rule.start_time,
                                    end_time: rule.end_time,
                                    is_enabled: rule.is_enabled,
                                    buffer_before: rule.buffer_before,
                                    buffer_after: rule.buffer_after
                                  })
                                  setShowRuleModal(true)
                                }}
                                className="p-1 text-gray-400 hover:text-white"
                              >
                                <Edit className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteRule(rule.id)}
                                className="p-1 text-gray-400 hover:text-red-500"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'overrides' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Time Off & Overrides</h3>
              <p className="text-sm text-gray-400 mt-1">
                Mark specific dates as unavailable or modify working hours
              </p>
            </div>
            <Button
              onClick={() => setShowOverrideModal(true)}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Override
            </Button>
          </div>

          {overrides.length === 0 ? (
            <div className="bg-gray-700 rounded-lg p-8 text-center">
              <Calendar className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 mb-4">No time off or overrides scheduled</p>
              <Button
                onClick={() => setShowOverrideModal(true)}
                variant="outline"
              >
                Schedule Time Off
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {overrides.map((override) => (
                <div key={override.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">
                        {new Date(override.date).toLocaleDateString('en-GB', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-sm text-gray-400">
                        {override.type === 'unavailable' && 'Unavailable all day'}
                        {override.type === 'available' && `Available ${formatTime(override.start_time!)} - ${formatTime(override.end_time!)}`}
                        {override.type === 'modified_hours' && `Modified hours: ${formatTime(override.start_time!)} - ${formatTime(override.end_time!)}`}
                        {override.reason && ` - ${override.reason}`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteOverride(override.id)}
                      className="p-2 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Working Hours Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">
              {editingRule ? 'Edit Working Hours' : 'Add Working Hours'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Day of Week
                </label>
                <select
                  value={ruleForm.day_of_week}
                  onChange={(e) => setRuleForm({ ...ruleForm, day_of_week: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  disabled={!!editingRule}
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day.value} value={day.value}>
                      {day.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={ruleForm.start_time}
                    onChange={(e) => setRuleForm({ ...ruleForm, start_time: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={ruleForm.end_time}
                    onChange={(e) => setRuleForm({ ...ruleForm, end_time: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Buffer Before (min)
                  </label>
                  <input
                    type="number"
                    value={ruleForm.buffer_before}
                    onChange={(e) => setRuleForm({ ...ruleForm, buffer_before: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    min="0"
                    step="5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Buffer After (min)
                  </label>
                  <input
                    type="number"
                    value={ruleForm.buffer_after}
                    onChange={(e) => setRuleForm({ ...ruleForm, buffer_after: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    min="0"
                    step="5"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={ruleForm.is_enabled}
                    onChange={(e) => setRuleForm({ ...ruleForm, is_enabled: e.target.checked })}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-300">
                    Enable these working hours
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRuleModal(false)
                  setEditingRule(null)
                  resetRuleForm()
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={editingRule ? handleUpdateRule : handleCreateRule}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {editingRule ? 'Update' : 'Create'} Hours
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">
              Add Availability Override
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={overrideForm.date}
                  onChange={(e) => setOverrideForm({ ...overrideForm, date: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Type
                </label>
                <select
                  value={overrideForm.type}
                  onChange={(e) => setOverrideForm({ ...overrideForm, type: e.target.value as any })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                >
                  <option value="unavailable">Unavailable (Day Off)</option>
                  <option value="available">Available (Extra Hours)</option>
                  <option value="modified_hours">Modified Hours</option>
                </select>
              </div>

              {(overrideForm.type === 'available' || overrideForm.type === 'modified_hours') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Start Time
                    </label>
                    <input
                      type="time"
                      value={overrideForm.start_time}
                      onChange={(e) => setOverrideForm({ ...overrideForm, start_time: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={overrideForm.end_time}
                      onChange={(e) => setOverrideForm({ ...overrideForm, end_time: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Reason (optional)
                </label>
                <input
                  type="text"
                  value={overrideForm.reason}
                  onChange={(e) => setOverrideForm({ ...overrideForm, reason: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white"
                  placeholder="e.g., Holiday, Training, Conference"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowOverrideModal(false)
                  resetOverrideForm()
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateOverride}
                disabled={!overrideForm.date}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Create Override
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}