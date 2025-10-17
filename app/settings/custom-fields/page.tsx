'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import SettingsHeader from '@/app/components/settings/SettingsHeader'
import { 
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  Save,
  X,
  User,
  Activity,
  Target,
  Heart,
  AlertCircle
} from 'lucide-react'

interface CustomField {
  id: string
  field_name: string
  field_label: string
  field_type: 'text' | 'number' | 'email' | 'phone' | 'date' | 'select' | 'multiselect' | 'boolean' | 'textarea'
  entity_type: 'lead' | 'client' | 'booking'
  options?: string[]
  validation_rules?: {
    required?: boolean
    min?: number
    max?: number
    pattern?: string
  }
  is_required: boolean
  display_order: number
  is_active: boolean
  placeholder?: string
  help_text?: string
  group?: string
}

const gymSpecificFields: CustomField[] = [
  {
    id: 'current_weight',
    field_name: 'current_weight',
    field_label: 'Current Weight (kg)',
    field_type: 'number',
    entity_type: 'client',
    is_required: false,
    display_order: 0,
    is_active: true,
    placeholder: 'e.g., 75',
    help_text: 'Client\'s current body weight',
    group: 'Fitness Metrics'
  },
  {
    id: 'target_weight',
    field_name: 'target_weight',
    field_label: 'Target Weight (kg)',
    field_type: 'number',
    entity_type: 'client',
    is_required: false,
    display_order: 1,
    is_active: true,
    placeholder: 'e.g., 70',
    help_text: 'Client\'s weight goal',
    group: 'Fitness Metrics'
  },
  {
    id: 'fitness_goals',
    field_name: 'fitness_goals',
    field_label: 'Fitness Goals',
    field_type: 'multiselect',
    entity_type: 'client',
    options: ['Weight Loss', 'Muscle Gain', 'Strength', 'Endurance', 'Flexibility', 'General Fitness'],
    is_required: false,
    display_order: 2,
    is_active: true,
    help_text: 'Select all that apply',
    group: 'Fitness Metrics'
  },
  {
    id: 'motivation_level',
    field_name: 'motivation_level',
    field_label: 'Motivation Level (1-10)',
    field_type: 'number',
    entity_type: 'lead',
    validation_rules: { min: 1, max: 10 },
    is_required: false,
    display_order: 3,
    is_active: true,
    placeholder: '1-10',
    help_text: 'How motivated is this lead?',
    group: 'Lead Qualification'
  },
  {
    id: 'health_conditions',
    field_name: 'health_conditions',
    field_label: 'Health Conditions',
    field_type: 'textarea',
    entity_type: 'client',
    is_required: false,
    display_order: 4,
    is_active: true,
    placeholder: 'Any medical conditions or injuries we should know about?',
    help_text: 'Important health information',
    group: 'Health & Safety'
  },
  {
    id: 'emergency_contact',
    field_name: 'emergency_contact',
    field_label: 'Emergency Contact',
    field_type: 'text',
    entity_type: 'client',
    is_required: true,
    display_order: 5,
    is_active: true,
    placeholder: 'Name and phone number',
    group: 'Health & Safety'
  },
  {
    id: 'preferred_time',
    field_name: 'preferred_time',
    field_label: 'Preferred Training Time',
    field_type: 'select',
    entity_type: 'lead',
    options: ['Early Morning (6-9am)', 'Morning (9am-12pm)', 'Afternoon (12-5pm)', 'Evening (5-8pm)', 'Late Evening (8-10pm)'],
    is_required: false,
    display_order: 6,
    is_active: true,
    group: 'Preferences'
  },
  {
    id: 'referral_source',
    field_name: 'referral_source',
    field_label: 'How did you hear about us?',
    field_type: 'select',
    entity_type: 'lead',
    options: ['Google', 'Facebook', 'Instagram', 'Friend/Family', 'Walk-in', 'Other'],
    is_required: false,
    display_order: 7,
    is_active: true,
    group: 'Lead Source'
  }
]

export default function CustomFieldsPage() {
  const [fields, setFields] = useState<CustomField[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'lead' | 'client' | 'booking'>('client')
  const [editingField, setEditingField] = useState<CustomField | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const supabase = createClient()

  const [newField, setNewField] = useState<Partial<CustomField>>({
    field_label: '',
    field_name: '',
    field_type: 'text',
    entity_type: 'client',
    is_required: false,
    is_active: true,
    options: []
  })

  useEffect(() => {
    fetchCustomFields()
  }, [])

  // Loading timeout to prevent infinite spinners
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('Loading timeout - forcing loading to stop')
        setLoading(false)
      }
    }, 5000) // 5 second timeout
    
    return () => clearTimeout(timeout)
  }, [loading])

  const fetchCustomFields = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) return

      // Fetch custom fields
      const { data: customFields } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .order('display_order', { ascending: true })

      if (customFields && customFields.length > 0) {
        setFields(customFields)
      } else {
        // Initialize with gym-specific fields
        setFields(gymSpecificFields)
        // Save them to database
        for (const field of gymSpecificFields) {
          await supabase.from('custom_fields').insert({
            ...field,
            organization_id: userOrg.organization_id
          })
        }
      }
    } catch (error) {
      setLoading(false)
      console.error('Error fetching custom fields:', error)
      // Use default fields as fallback
      setFields(gymSpecificFields)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveField = async () => {
    if (!newField.field_label || !newField.field_name) {
      alert('Please fill in all required fields')
      return
    }

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()

      if (!userOrg) return

      const fieldData = {
        ...newField,
        organization_id: userOrg.organization_id,
        display_order: fields.filter(f => f.entity_type === newField.entity_type).length,
        id: Date.now().toString()
      } as CustomField

      if (editingField) {
        // Update existing field
        const { error } = await supabase
          .from('custom_fields')
          .update(fieldData)
          .eq('id', editingField.id)

        if (error) throw error

        setFields(fields.map(f => f.id === editingField.id ? fieldData : f))
        setEditingField(null)
      } else {
        // Create new field
        const { data, error } = await supabase
          .from('custom_fields')
          .insert(fieldData)
          .select()
          .single()

        if (error) throw error
        setFields([...fields, data])
      }

      // Reset form
      setNewField({
        field_label: '',
        field_name: '',
        field_type: 'text',
        entity_type: 'client',
        is_required: false,
        is_active: true,
        options: []
      })
      setShowAddModal(false)
      alert('Custom field saved successfully!')
    } catch (error) {
      setLoading(false)
      console.error('Error saving field:', error)
      alert('Failed to save custom field')
    }
  }

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this field? This cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('custom_fields')
        .delete()
        .eq('id', fieldId)

      if (error) throw error

      setFields(fields.filter(f => f.id !== fieldId))
      alert('Field deleted successfully')
    } catch (error) {
      setLoading(false)
      console.error('Error deleting field:', error)
      alert('Failed to delete field')
    }
  }

  const handleToggleActive = async (fieldId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('custom_fields')
        .update({ is_active: !isActive })
        .eq('id', fieldId)

      if (error) throw error

      setFields(fields.map(f => f.id === fieldId ? { ...f, is_active: !isActive } : f))
    } catch (error) {
      setLoading(false)
      console.error('Error toggling field:', error)
    }
  }

  const getFieldIcon = (group?: string) => {
    switch (group) {
      case 'Fitness Metrics': return <Activity className="h-4 w-4" />
      case 'Health & Safety': return <Heart className="h-4 w-4" />
      case 'Lead Qualification': return <Target className="h-4 w-4" />
      default: return <User className="h-4 w-4" />
    }
  }

  const filteredFields = fields.filter(f => f.entity_type === activeTab)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">Loading custom fields...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsHeader 
        title="Custom Fields"
        description="Collect gym-specific information from leads and clients"
      />

      {/* Info Banner */}
      <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
          <div>
            <p className="text-sm text-blue-300 font-medium">Pre-configured for Gyms</p>
            <p className="text-xs text-blue-200 mt-1">
              We've added essential fields for fitness tracking, health information, and lead qualification. 
              You can customize or add more fields as needed.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-700">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('client')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'client'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Client Fields ({fields.filter(f => f.entity_type === 'client').length})
          </button>
          <button
            onClick={() => setActiveTab('lead')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'lead'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Lead Fields ({fields.filter(f => f.entity_type === 'lead').length})
          </button>
          <button
            onClick={() => setActiveTab('booking')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'booking'
                ? 'border-blue-500 text-blue-500'
                : 'border-transparent text-gray-400 hover:text-gray-300'
            }`}
          >
            Booking Fields ({fields.filter(f => f.entity_type === 'booking').length})
          </button>
        </nav>
      </div>

      {/* Fields List */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-white">
            {activeTab === 'client' && 'Client Information Fields'}
            {activeTab === 'lead' && 'Lead Capture Fields'}
            {activeTab === 'booking' && 'Booking Form Fields'}
          </h2>
          <button
            onClick={() => {
              setNewField({ ...newField, entity_type: activeTab })
              setShowAddModal(true)
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Field
          </button>
        </div>

        {filteredFields.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <User className="h-12 w-12 mx-auto mb-3 text-gray-600" />
            <p>No custom fields for {activeTab}s yet</p>
            <button
              onClick={() => {
                setNewField({ ...newField, entity_type: activeTab })
                setShowAddModal(true)
              }}
              className="mt-4 text-blue-400 hover:text-blue-300"
            >
              Add your first field →
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredFields.map((field) => (
              <div
                key={field.id}
                className="flex items-center gap-4 p-4 bg-gray-700 rounded-lg"
              >
                <GripVertical className="h-4 w-4 text-gray-500" />
                
                <div className="flex items-center gap-2">
                  {getFieldIcon(field.group)}
                  {field.group && (
                    <span className="text-xs px-2 py-1 bg-gray-600 rounded text-gray-300">
                      {field.group}
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{field.field_label}</span>
                    {field.is_required && (
                      <span className="text-xs text-red-400">Required</span>
                    )}
                    <span className="text-xs px-2 py-0.5 bg-gray-600 rounded text-gray-400">
                      {field.field_type}
                    </span>
                  </div>
                  {field.help_text && (
                    <p className="text-xs text-gray-400 mt-1">{field.help_text}</p>
                  )}
                  {field.options && field.options.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Options: {field.options.join(', ')}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggleActive(field.id, field.is_active)}
                    className={`px-3 py-1 rounded text-xs font-medium ${
                      field.is_active
                        ? 'bg-green-900 text-green-300'
                        : 'bg-gray-600 text-gray-400'
                    }`}
                  >
                    {field.is_active ? 'Active' : 'Inactive'}
                  </button>
                  
                  <button
                    onClick={() => {
                      setEditingField(field)
                      setNewField(field)
                      setShowAddModal(true)
                    }}
                    className="p-1 hover:bg-gray-600 rounded"
                  >
                    <Edit2 className="h-4 w-4 text-gray-400" />
                  </button>
                  
                  <button
                    onClick={() => handleDeleteField(field.id)}
                    className="p-1 hover:bg-gray-600 rounded"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Field Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-white mb-4">
              {editingField ? 'Edit Field' : 'Add Custom Field'}
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Field Label *
                  </label>
                  <input
                    type="text"
                    value={newField.field_label}
                    onChange={(e) => setNewField({ ...newField, field_label: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="e.g., Current Weight"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Field Name *
                  </label>
                  <input
                    type="text"
                    value={newField.field_name}
                    onChange={(e) => setNewField({ ...newField, field_name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="e.g., current_weight"
                  />
                  <p className="text-xs text-gray-500 mt-1">Used in forms and API</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Field Type
                  </label>
                  <select
                    value={newField.field_type}
                    onChange={(e) => setNewField({ ...newField, field_type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  >
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="date">Date</option>
                    <option value="select">Dropdown</option>
                    <option value="multiselect">Multi-select</option>
                    <option value="boolean">Yes/No</option>
                    <option value="textarea">Text Area</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Group
                  </label>
                  <input
                    type="text"
                    value={newField.group || ''}
                    onChange={(e) => setNewField({ ...newField, group: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    placeholder="e.g., Fitness Metrics"
                  />
                </div>
              </div>

              {(newField.field_type === 'select' || newField.field_type === 'multiselect') && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Options (one per line)
                  </label>
                  <textarea
                    value={newField.options?.join('\n') || ''}
                    onChange={(e) => setNewField({ ...newField, options: e.target.value.split('\n').filter(o => o.trim()) })}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                    rows={4}
                    placeholder="Option 1&#10;Option 2&#10;Option 3"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Placeholder Text
                </label>
                <input
                  type="text"
                  value={newField.placeholder || ''}
                  onChange={(e) => setNewField({ ...newField, placeholder: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Shown when field is empty"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Help Text
                </label>
                <input
                  type="text"
                  value={newField.help_text || ''}
                  onChange={(e) => setNewField({ ...newField, help_text: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="Additional instructions for this field"
                />
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newField.is_required}
                    onChange={(e) => setNewField({ ...newField, is_required: e.target.checked })}
                    className="rounded border-gray-600 bg-gray-700 text-blue-500"
                  />
                  <span className="text-sm text-gray-300">Required field</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newField.is_active}
                    onChange={(e) => setNewField({ ...newField, is_active: e.target.checked })}
                    className="rounded border-gray-600 bg-gray-700 text-blue-500"
                  />
                  <span className="text-sm text-gray-300">Active</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleSaveField}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {editingField ? 'Update Field' : 'Create Field'}
              </button>
              <button
                onClick={() => {
                  setShowAddModal(false)
                  setEditingField(null)
                  setNewField({
                    field_label: '',
                    field_name: '',
                    field_type: 'text',
                    entity_type: 'client',
                    is_required: false,
                    is_active: true,
                    options: []
                  })
                }}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}