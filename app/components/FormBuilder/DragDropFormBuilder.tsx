'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import FormFieldEditor from './FormFieldEditor'
import FieldPalette from './FieldPalette'
import FormPreview from './FormPreview'
import { Save, Eye, EyeOff } from 'lucide-react'

interface FormField {
  id: string
  label: string
  type: string
  required: boolean
  placeholder?: string
  options?: string[]
  description?: string
}

interface FormData {
  id?: string
  title: string
  description: string
  type: string
  is_active: boolean
  schema: {
    fields: FormField[]
  }
}

interface DragDropFormBuilderProps {
  initialFormData?: FormData
  onSave: (formData: FormData) => void
  onCancel: () => void
}

const DEFAULT_FORM_DATA: FormData = {
  title: 'New Form',
  description: 'Form description',
  type: 'custom',
  is_active: true,
  schema: {
    fields: []
  }
}

export default function DragDropFormBuilder({ 
  initialFormData, 
  onSave, 
  onCancel 
}: DragDropFormBuilderProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData || DEFAULT_FORM_DATA)
  const [showPreview, setShowPreview] = useState(true)
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const addField = (type: string) => {
    const newField: FormField = {
      id: `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      label: getDefaultLabel(type),
      type,
      required: false,
      placeholder: getDefaultPlaceholder(type),
      options: type === 'select' || type === 'checkbox' || type === 'radio' 
        ? ['Option 1', 'Option 2', 'Option 3'] 
        : undefined
    }

    setFormData(prev => ({
      ...prev,
      schema: {
        ...prev.schema,
        fields: [...prev.schema.fields, newField]
      }
    }))
  }

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFormData(prev => ({
      ...prev,
      schema: {
        ...prev.schema,
        fields: prev.schema.fields.map(field =>
          field.id === fieldId ? { ...field, ...updates } : field
        )
      }
    }))
  }

  const deleteField = (fieldId: string) => {
    setFormData(prev => ({
      ...prev,
      schema: {
        ...prev.schema,
        fields: prev.schema.fields.filter(field => field.id !== fieldId)
      }
    }))
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (active.id !== over?.id) {
      setFormData(prev => {
        const fields = prev.schema.fields
        const oldIndex = fields.findIndex(field => field.id === active.id)
        const newIndex = fields.findIndex(field => field.id === over?.id)

        return {
          ...prev,
          schema: {
            ...prev.schema,
            fields: arrayMove(fields, oldIndex, newIndex)
          }
        }
      })
    }
  }

  const handleSave = () => {
    if (!formData.title.trim()) {
      alert('Please enter a form title')
      return
    }
    if (formData.schema.fields.length === 0) {
      alert('Please add at least one field to your form')
      return
    }
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-lg w-full max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-start">
            <div className="flex-1 mr-4">
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                className="text-2xl font-bold bg-transparent border-none text-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 w-full"
                placeholder="Form Title"
              />
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                className="mt-2 text-gray-400 bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-blue-500 rounded px-2 py-1 w-full resize-none"
                rows={2}
                placeholder="Form description"
              />
              <div className="flex items-center gap-4 mt-3">
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="px-3 py-1 bg-gray-800 border border-gray-600 rounded text-white text-sm"
                >
                  <option value="custom">Custom</option>
                  <option value="waiver">Waiver</option>
                  <option value="contract">Contract</option>
                  <option value="health">Health</option>
                  <option value="policy">Policy</option>
                </select>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="text-blue-500 bg-gray-800 border-gray-600 rounded"
                  />
                  <span className="text-sm text-gray-300">Active</span>
                </label>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
              >
                {showPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {showPreview ? 'Hide Preview' : 'Show Preview'}
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white"
              >
                <Save className="w-4 h-4" />
                Save Form
              </button>
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Sidebar - Field Palette */}
          <div className="w-72 p-4 border-r border-gray-700 overflow-y-auto">
            <FieldPalette onAddField={addField} />
          </div>

          {/* Center - Form Builder */}
          <div className="flex-1 p-4 overflow-y-auto">
            <div className="max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-white mb-4">Form Builder</h3>
              
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={formData.schema.fields.map(field => field.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {formData.schema.fields.length === 0 ? (
                      <div className="text-center py-12 text-gray-400 bg-gray-800 rounded-lg border-2 border-dashed border-gray-700">
                        <div className="text-4xl mb-4">📝</div>
                        <h3 className="text-lg font-medium text-white mb-2">Start building your form</h3>
                        <p className="text-sm">Choose field types from the palette on the left to add them to your form</p>
                      </div>
                    ) : (
                      formData.schema.fields.map((field) => (
                        <FormFieldEditor
                          key={field.id}
                          field={field}
                          onUpdate={updateField}
                          onDelete={deleteField}
                        />
                      ))
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </div>
          </div>

          {/* Right Sidebar - Preview */}
          {showPreview && (
            <div className="w-96 p-4 border-l border-gray-700 overflow-y-auto">
              <FormPreview formData={formData} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function getDefaultLabel(type: string): string {
  switch (type) {
    case 'text': return 'Text Field'
    case 'email': return 'Email Address'
    case 'tel': return 'Phone Number'
    case 'textarea': return 'Message'
    case 'number': return 'Number'
    case 'date': return 'Date'
    case 'select': return 'Select Option'
    case 'checkbox': return 'Multiple Choice'
    case 'radio': return 'Single Choice'
    case 'signature': return 'Signature'
    default: return 'Field Label'
  }
}

function getDefaultPlaceholder(type: string): string {
  switch (type) {
    case 'text': return 'Enter text...'
    case 'email': return 'Enter your email address'
    case 'tel': return 'Enter your phone number'
    case 'textarea': return 'Enter your message...'
    case 'number': return 'Enter a number'
    case 'date': return ''
    case 'select': return ''
    case 'checkbox': return ''
    case 'radio': return ''
    case 'signature': return ''
    default: return 'Enter value...'
  }
}