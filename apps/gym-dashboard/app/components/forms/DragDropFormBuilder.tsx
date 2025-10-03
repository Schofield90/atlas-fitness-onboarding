'use client'

import { useState, useRef } from 'react'
import { DndContext, DragEndEvent, DragOverlay, closestCenter, useSensor, useSensors, PointerSensor } from '@dnd-kit/core'
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Type,
  Mail,
  Phone,
  Calendar,
  Hash,
  FileText,
  CheckSquare,
  Circle,
  Square,
  List,
  Star,
  Upload,
  Globe,
  User,
  Building,
  MapPin,
  CreditCard,
  Clock,
  Tag,
  Trash2,
  Settings,
  GripVertical,
  Plus,
  Eye,
  Save
} from 'lucide-react'

interface FormField {
  id: string
  type: string
  label: string
  placeholder?: string
  required?: boolean
  options?: string[]
  validation?: any
  width?: 'full' | 'half' | 'third'
  icon?: any
}

interface DragDropFormBuilderProps {
  onSave: (form: any) => void
  initialForm?: any
  formType: 'lead' | 'health' | 'waiver' | 'consent'
}

const fieldTypes = [
  { type: 'text', label: 'Text Input', icon: Type },
  { type: 'email', label: 'Email', icon: Mail },
  { type: 'phone', label: 'Phone', icon: Phone },
  { type: 'date', label: 'Date', icon: Calendar },
  { type: 'number', label: 'Number', icon: Hash },
  { type: 'textarea', label: 'Text Area', icon: FileText },
  { type: 'select', label: 'Dropdown', icon: List },
  { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
  { type: 'radio', label: 'Radio Button', icon: Circle },
  { type: 'file', label: 'File Upload', icon: Upload },
  { type: 'url', label: 'Website', icon: Globe },
  { type: 'name', label: 'Full Name', icon: User },
  { type: 'address', label: 'Address', icon: MapPin },
  { type: 'rating', label: 'Star Rating', icon: Star },
  { type: 'time', label: 'Time', icon: Clock },
  { type: 'tags', label: 'Tags', icon: Tag }
]

function SortableField({ field, onEdit, onDelete }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  }

  const Icon = field.icon || Square

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-gray-800 border border-gray-700 rounded-lg p-4 ${
        field.width === 'half' ? 'col-span-1' : field.width === 'third' ? 'col-span-1' : 'col-span-2'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3 flex-1">
          <button
            className="mt-1 cursor-move text-gray-500 hover:text-gray-300"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-5 w-5" />
          </button>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="h-4 w-4 text-gray-400" />
              <span className="font-medium text-white">{field.label}</span>
              {field.required && <span className="text-red-400 text-sm">*</span>}
            </div>
            
            {/* Field Preview */}
            {field.type === 'text' || field.type === 'email' || field.type === 'phone' || field.type === 'number' ? (
              <input
                type={field.type}
                placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 text-sm"
                disabled
              />
            ) : field.type === 'textarea' ? (
              <textarea
                placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}`}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 text-sm"
                rows={3}
                disabled
              />
            ) : field.type === 'select' ? (
              <select className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 text-sm" disabled>
                <option>Select {field.label}</option>
                {field.options?.map((opt: string, i: number) => (
                  <option key={i}>{opt}</option>
                ))}
              </select>
            ) : field.type === 'checkbox' ? (
              <div className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4" disabled />
                <span className="text-sm text-gray-300">{field.placeholder || 'Check to agree'}</span>
              </div>
            ) : field.type === 'radio' ? (
              <div className="space-y-2">
                {(field.options || ['Option 1', 'Option 2']).map((opt: string, i: number) => (
                  <label key={i} className="flex items-center gap-2">
                    <input type="radio" name={field.id} className="w-4 h-4" disabled />
                    <span className="text-sm text-gray-300">{opt}</span>
                  </label>
                ))}
              </div>
            ) : field.type === 'date' ? (
              <input type="date" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 text-sm" disabled />
            ) : field.type === 'time' ? (
              <input type="time" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 text-sm" disabled />
            ) : field.type === 'file' ? (
              <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center">
                <Upload className="h-6 w-6 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Click to upload</p>
              </div>
            ) : field.type === 'rating' ? (
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(i => (
                  <Star key={i} className="h-6 w-6 text-gray-600" />
                ))}
              </div>
            ) : field.type === 'name' ? (
              <div className="grid grid-cols-2 gap-2">
                <input type="text" placeholder="First Name" className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 text-sm" disabled />
                <input type="text" placeholder="Last Name" className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 text-sm" disabled />
              </div>
            ) : field.type === 'address' ? (
              <div className="space-y-2">
                <input type="text" placeholder="Street Address" className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 text-sm" disabled />
                <div className="grid grid-cols-2 gap-2">
                  <input type="text" placeholder="City" className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 text-sm" disabled />
                  <input type="text" placeholder="Postcode" className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-gray-300 text-sm" disabled />
                </div>
              </div>
            ) : null}
          </div>
        </div>
        
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(field)}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            onClick={() => onDelete(field.id)}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DragDropFormBuilder({ 
  onSave, 
  initialForm,
  formType = 'lead'
}: DragDropFormBuilderProps) {
  const [formTitle, setFormTitle] = useState(initialForm?.title || '')
  const [formDescription, setFormDescription] = useState(initialForm?.description || '')
  const [fields, setFields] = useState<FormField[]>(initialForm?.fields || [])
  const [editingField, setEditingField] = useState<FormField | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  )

  const addField = (fieldType: any) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: fieldType.type,
      label: fieldType.label,
      required: false,
      width: 'full',
      icon: fieldType.icon,
      options: fieldType.type === 'select' || fieldType.type === 'radio' ? ['Option 1', 'Option 2'] : undefined
    }
    setFields([...fields, newField])
    setEditingField(newField)
  }

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFields(fields.map(f => f.id === fieldId ? { ...f, ...updates } : f))
  }

  const deleteField = (fieldId: string) => {
    setFields(fields.filter(f => f.id !== fieldId))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id)
        const newIndex = items.findIndex(i => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex)
      })
    }
    setActiveFieldId(null)
  }

  const handleDragStart = (event: any) => {
    setActiveFieldId(event.active.id)
  }

  const saveForm = () => {
    const formData = {
      title: formTitle,
      description: formDescription,
      fields,
      type: formType,
      createdAt: new Date().toISOString()
    }
    onSave(formData)
  }

  const getDefaultFields = () => {
    if (formType === 'lead') {
      return [
        { type: 'name', label: 'Full Name', required: true },
        { type: 'email', label: 'Email Address', required: true },
        { type: 'phone', label: 'Phone Number', required: true },
        { type: 'select', label: 'How did you hear about us?', options: ['Google', 'Facebook', 'Instagram', 'Friend', 'Other'] }
      ]
    } else if (formType === 'health') {
      return [
        { type: 'name', label: 'Full Name', required: true },
        { type: 'date', label: 'Date of Birth', required: true },
        { type: 'textarea', label: 'Medical Conditions', placeholder: 'Please list any medical conditions' },
        { type: 'checkbox', label: 'I confirm the information is accurate', required: true }
      ]
    }
    return []
  }

  return (
    <div className="flex h-full">
      {/* Left Sidebar - Field Types */}
      <div className="w-64 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
        <h3 className="text-lg font-semibold text-white mb-4">Form Elements</h3>
        <div className="space-y-2">
          {fieldTypes.map((fieldType) => {
            const Icon = fieldType.icon
            return (
              <button
                key={fieldType.type}
                onClick={() => addField(fieldType)}
                className="w-full flex items-center gap-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left"
              >
                <Icon className="h-5 w-5 text-gray-400" />
                <span className="text-sm text-white">{fieldType.label}</span>
                <Plus className="h-4 w-4 text-gray-400 ml-auto" />
              </button>
            )
          })}
        </div>

        {/* Quick Templates */}
        <div className="mt-6 pt-6 border-t border-gray-700">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Quick Templates</h4>
          <button
            onClick={() => {
              const defaults = getDefaultFields()
              setFields(defaults.map((f, i) => ({
                ...f,
                id: `field_${Date.now()}_${i}`,
                width: 'full',
                icon: fieldTypes.find(ft => ft.type === f.type)?.icon
              })))
            }}
            className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm rounded-lg transition-colors"
          >
            Use {formType === 'lead' ? 'Lead Form' : 'Health Form'} Template
          </button>
        </div>
      </div>

      {/* Main Content - Form Builder */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Form Header */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-white">
                {formType === 'lead' ? 'Lead Capture Form' : formType === 'health' ? 'Health Questionnaire' : 'Custom Form'}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  {showPreview ? 'Edit' : 'Preview'}
                </button>
                <button
                  onClick={saveForm}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  <Save className="h-4 w-4" />
                  Save Form
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Form Title</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Enter form title"
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description (Optional)</label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Describe what this form is for"
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Form Fields */}
          {showPreview ? (
            // Preview Mode
            <div className="bg-white rounded-lg p-8 max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{formTitle || 'Untitled Form'}</h2>
              {formDescription && <p className="text-gray-600 mb-6">{formDescription}</p>}
              
              <div className="space-y-4">
                {fields.map(field => (
                  <div key={field.id} className={field.width === 'half' ? 'inline-block w-1/2 pr-2' : 'w-full'}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {/* Render actual form fields for preview */}
                    {field.type === 'textarea' ? (
                      <textarea className="w-full px-3 py-2 border border-gray-300 rounded-md" rows={3} />
                    ) : field.type === 'select' ? (
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                        <option>Select {field.label}</option>
                        {field.options?.map((opt, i) => <option key={i}>{opt}</option>)}
                      </select>
                    ) : (
                      <input type={field.type} className="w-full px-3 py-2 border border-gray-300 rounded-md" />
                    )}
                  </div>
                ))}
              </div>
              
              <button className="mt-6 w-full bg-blue-600 text-white py-3 rounded-lg font-medium">
                Submit
              </button>
            </div>
          ) : (
            // Edit Mode
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              onDragStart={handleDragStart}
            >
              <SortableContext items={fields} strategy={verticalListSortingStrategy}>
                {fields.length === 0 ? (
                  <div className="bg-gray-800 border-2 border-dashed border-gray-600 rounded-lg p-12 text-center">
                    <Plus className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-300 mb-2">No fields yet</h3>
                    <p className="text-gray-400">Drag fields from the left sidebar or click to add</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {fields.map(field => (
                      <SortableField
                        key={field.id}
                        field={field}
                        onEdit={setEditingField}
                        onDelete={deleteField}
                      />
                    ))}
                  </div>
                )}
              </SortableContext>
              
              <DragOverlay>
                {activeFieldId ? (
                  <div className="bg-gray-800 border border-blue-500 rounded-lg p-4 opacity-80">
                    <div className="text-white">Moving field...</div>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </div>

      {/* Right Sidebar - Field Settings */}
      {editingField && (
        <div className="w-80 bg-gray-800 border-l border-gray-700 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Field Settings</h3>
            <button
              onClick={() => setEditingField(null)}
              className="text-gray-400 hover:text-white"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Label</label>
              <input
                type="text"
                value={editingField.label}
                onChange={(e) => updateField(editingField.id, { label: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Placeholder</label>
              <input
                type="text"
                value={editingField.placeholder || ''}
                onChange={(e) => updateField(editingField.id, { placeholder: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Width</label>
              <select
                value={editingField.width}
                onChange={(e) => updateField(editingField.id, { width: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white"
              >
                <option value="full">Full Width</option>
                <option value="half">Half Width</option>
                <option value="third">One Third</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="required"
                checked={editingField.required}
                onChange={(e) => updateField(editingField.id, { required: e.target.checked })}
                className="w-4 h-4"
              />
              <label htmlFor="required" className="text-sm text-gray-300">Required field</label>
            </div>

            {(editingField.type === 'select' || editingField.type === 'radio') && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Options</label>
                <div className="space-y-2">
                  {editingField.options?.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...(editingField.options || [])]
                          newOptions[index] = e.target.value
                          updateField(editingField.id, { options: newOptions })
                        }}
                        className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm"
                      />
                      <button
                        onClick={() => {
                          const newOptions = editingField.options?.filter((_, i) => i !== index)
                          updateField(editingField.id, { options: newOptions })
                        }}
                        className="p-2 text-red-400 hover:bg-gray-700 rounded"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newOptions = [...(editingField.options || []), `Option ${(editingField.options?.length || 0) + 1}`]
                      updateField(editingField.id, { options: newOptions })
                    }}
                    className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                  >
                    Add Option
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}