'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { Settings, Plus, Trash2, Edit2, Check, X, Loader2, GripVertical } from 'lucide-react'
import SettingsHeader from '@/app/components/settings/SettingsHeader'

interface CustomField {
  id: string
  name: string
  field_key: string
  field_type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea'
  entity_type: 'lead' | 'customer' | 'booking' | 'staff'
  options?: string[]
  required: boolean
  order: number
  is_active: boolean
}

export default function CustomFieldsPage() {
  const [fields, setFields] = useState<CustomField[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingField, setEditingField] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    field_type: 'text' as 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea',
    entity_type: 'customer' as 'lead' | 'customer' | 'booking' | 'staff',
    options: [] as string[],
    required: false
  })
  const [newOption, setNewOption] = useState('')
  const supabase = createClient()

  useEffect(() => {
    fetchCustomFields()
  }, [])

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

      const { data: fieldsData } = await supabase
        .from('custom_fields')
        .select('*')
        .eq('organization_id', userOrg.organization_id)
        .order('entity_type, order')

      setFields(fieldsData || [])
    } catch (error) {
      console.error('Error fetching custom fields:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateField = async () => {
    if (!formData.name) {
      alert('Please enter a field name')
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

      const fieldKey = formData.name.toLowerCase().replace(/[^a-z0-9]/g, '_')

      const { error } = await supabase
        .from('custom_fields')
        .insert({
          organization_id: userOrg.organization_id,
          name: formData.name,
          field_key: fieldKey,
          field_type: formData.field_type,
          entity_type: formData.entity_type,
          options: formData.field_type === 'select' ? formData.options : null,
          required: formData.required,
          order: fields.filter(f => f.entity_type === formData.entity_type).length,
          is_active: true
        })

      if (error) throw error

      setShowCreateModal(false)
      setFormData({ name: '', field_type: 'text' as 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea', entity_type: 'customer' as 'lead' | 'customer' | 'booking' | 'staff', options: [], required: false })
      fetchCustomFields()
    } catch (error) {
      console.error('Error creating custom field:', error)
    }
  }

  const handleDeleteField = async (fieldId: string) => {
    if (!confirm('Are you sure you want to delete this custom field? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('custom_fields')
        .delete()
        .eq('id', fieldId)

      if (error) throw error
      fetchCustomFields()
    } catch (error) {
      console.error('Error deleting custom field:', error)
    }
  }

  const handleToggleActive = async (fieldId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('custom_fields')
        .update({ is_active: !isActive })
        .eq('id', fieldId)

      if (error) throw error
      fetchCustomFields()
    } catch (error) {
      console.error('Error toggling field:', error)
    }
  }

  const addOption = () => {
    if (newOption.trim()) {
      setFormData({ ...formData, options: [...formData.options, newOption.trim()] })
      setNewOption('')
    }
  }

  const removeOption = (index: number) => {
    setFormData({ 
      ...formData, 
      options: formData.options.filter((_, i) => i !== index) 
    })
  }

  const fieldTypes = [
    { value: 'text', label: 'Text', icon: '📝' },
    { value: 'number', label: 'Number', icon: '🔢' },
    { value: 'date', label: 'Date', icon: '📅' },
    { value: 'select', label: 'Dropdown', icon: '📊' },
    { value: 'checkbox', label: 'Checkbox', icon: '☑️' },
    { value: 'textarea', label: 'Long Text', icon: '📄' }
  ]

  const entityTypes = [
    { value: 'customer', label: 'Customers', color: 'bg-blue-600' },
    { value: 'lead', label: 'Leads', color: 'bg-green-600' },
    { value: 'booking', label: 'Bookings', color: 'bg-purple-600' },
    { value: 'staff', label: 'Staff', color: 'bg-orange-600' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <SettingsHeader 
        title="Custom Fields"
        description="Add custom fields to capture additional information"
        icon={<Settings className="h-6 w-6" />}
        action={
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add Field
          </button>
        }
      />

      {/* Fields by Entity Type */}
      {entityTypes.map((entityType) => {
        const entityFields = fields.filter(f => f.entity_type === entityType.value)
        
        return (
          <div key={entityType.value} className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`px-3 py-1 rounded-lg text-white text-sm font-medium ${entityType.color}`}>
                {entityType.label}
              </div>
              <span className="text-gray-400 text-sm">
                {entityFields.length} custom field{entityFields.length !== 1 ? 's' : ''}
              </span>
            </div>

            {entityFields.length > 0 ? (
              <div className="space-y-3">
                {entityFields.map((field) => {
                  const fieldType = fieldTypes.find(t => t.value === field.field_type)
                  return (
                    <div key={field.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-gray-500 cursor-move" />
                        <span className="text-xl">{fieldType?.icon}</span>
                        <div>
                          <p className="text-white font-medium">{field.name}</p>
                          <p className="text-xs text-gray-400">
                            {fieldType?.label} • {field.field_key}
                            {field.required && ' • Required'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={field.is_active}
                            onChange={() => handleToggleActive(field.id, field.is_active)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                        <button
                          onClick={() => handleDeleteField(field.id)}
                          className="p-1 text-gray-400 hover:text-red-400 hover:bg-gray-600 rounded"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">
                No custom fields for {entityType.label.toLowerCase()} yet
              </p>
            )}
          </div>
        )
      })}

      {/* Create Field Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-bold text-white mb-4">Create Custom Field</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Field Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                  placeholder="e.g., Emergency Contact"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Field Type
                </label>
                <select
                  value={formData.field_type}
                  onChange={(e) => setFormData({ ...formData, field_type: e.target.value as 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'textarea' })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  {fieldTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Applies To
                </label>
                <select
                  value={formData.entity_type}
                  onChange={(e) => setFormData({ ...formData, entity_type: e.target.value as 'lead' | 'customer' | 'booking' | 'staff' })}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                >
                  {entityTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {formData.field_type === 'select' && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Options
                  </label>
                  <div className="space-y-2">
                    {formData.options.map((option, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="text"
                          value={option}
                          readOnly
                          className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                        />
                        <button
                          onClick={() => removeOption(index)}
                          className="p-2 text-red-400 hover:bg-gray-700 rounded"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newOption}
                        onChange={(e) => setNewOption(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
                        placeholder="Add option"
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
                      />
                      <button
                        onClick={addOption}
                        className="p-2 text-green-400 hover:bg-gray-700 rounded"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.required}
                  onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                  className="rounded border-gray-600 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-300">Required field</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 text-gray-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateField}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create Field
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}