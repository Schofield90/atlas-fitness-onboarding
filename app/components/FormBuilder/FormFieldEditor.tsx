'use client'

import { useState } from 'react'
import { Trash2, GripVertical, Settings } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

interface FormField {
  id: string
  label: string
  type: string
  required: boolean
  placeholder?: string
  options?: string[]
  description?: string
}

interface FormFieldEditorProps {
  field: FormField
  onUpdate: (fieldId: string, updates: Partial<FormField>) => void
  onDelete: (fieldId: string) => void
}

const FIELD_TYPES = [
  { value: 'text', label: 'Text Input' },
  { value: 'email', label: 'Email' },
  { value: 'tel', label: 'Phone' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'signature', label: 'Signature' }
]

export default function FormFieldEditor({ field, onUpdate, onDelete }: FormFieldEditorProps) {
  const [showProperties, setShowProperties] = useState(false)
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const renderFieldPreview = () => {
    const commonProps = {
      placeholder: field.placeholder,
      className: "w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    }

    switch (field.type) {
      case 'text':
      case 'email':
      case 'tel':
      case 'number':
        return <input type={field.type} {...commonProps} />
      
      case 'date':
        return <input type="date" {...commonProps} />
      
      case 'textarea':
        return <textarea rows={3} {...commonProps} />
      
      case 'select':
        return (
          <select {...commonProps}>
            <option value="">Select an option...</option>
            {field.options?.map((option, index) => (
              <option key={index} value={option}>{option}</option>
            ))}
          </select>
        )
      
      case 'checkbox':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center space-x-2">
                <input type="checkbox" className="text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500" />
                <span className="text-white">{option}</span>
              </label>
            ))}
          </div>
        )
      
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center space-x-2">
                <input type="radio" name={field.id} className="text-blue-500 bg-gray-700 border-gray-600 focus:ring-blue-500" />
                <span className="text-white">{option}</span>
              </label>
            ))}
          </div>
        )
      
      case 'signature':
        return (
          <div className="w-full h-24 bg-gray-700 border-2 border-dashed border-gray-600 rounded-md flex items-center justify-center text-gray-400">
            Signature Area
          </div>
        )
      
      default:
        return <input type="text" {...commonProps} />
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4 group hover:border-blue-500 transition-colors"
    >
      {/* Field Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-700 transition-colors"
          >
            <GripVertical className="w-4 h-4 text-gray-500" />
          </div>
          <div>
            <input
              type="text"
              value={field.label}
              onChange={(e) => onUpdate(field.id, { label: e.target.value })}
              className="bg-transparent border-none text-white font-medium focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1"
              placeholder="Field Label"
            />
            {field.required && <span className="text-red-400 ml-1">*</span>}
          </div>
        </div>
        
        <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setShowProperties(!showProperties)}
            className="p-1 rounded hover:bg-gray-700 transition-colors"
            title="Field Properties"
          >
            <Settings className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={() => onDelete(field.id)}
            className="p-1 rounded hover:bg-red-600 transition-colors"
            title="Delete Field"
          >
            <Trash2 className="w-4 h-4 text-gray-400 hover:text-white" />
          </button>
        </div>
      </div>

      {/* Field Preview */}
      <div className="mb-3">
        <label className="block text-sm text-gray-300 mb-2">
          {field.label}
          {field.required && <span className="text-red-400 ml-1">*</span>}
        </label>
        {renderFieldPreview()}
        {field.description && (
          <p className="text-xs text-gray-400 mt-1">{field.description}</p>
        )}
      </div>

      {/* Field Properties Panel */}
      {showProperties && (
        <div className="border-t border-gray-700 pt-3 mt-3 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Field Type</label>
              <select
                value={field.type}
                onChange={(e) => onUpdate(field.id, { type: e.target.value })}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
              >
                {FIELD_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => onUpdate(field.id, { required: e.target.checked })}
                  className="text-blue-500 bg-gray-700 border-gray-600 rounded"
                />
                <span className="text-xs text-gray-400">Required</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Placeholder</label>
            <input
              type="text"
              value={field.placeholder || ''}
              onChange={(e) => onUpdate(field.id, { placeholder: e.target.value })}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
              placeholder="Enter placeholder text"
            />
          </div>

          {(field.type === 'select' || field.type === 'checkbox' || field.type === 'radio') && (
            <div>
              <label className="block text-xs text-gray-400 mb-1">Options (one per line)</label>
              <textarea
                value={field.options?.join('\n') || ''}
                onChange={(e) => onUpdate(field.id, { 
                  options: e.target.value.split('\n').filter(o => o.trim()) 
                })}
                className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                rows={3}
                placeholder="Option 1&#10;Option 2&#10;Option 3"
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-gray-400 mb-1">Help Text</label>
            <input
              type="text"
              value={field.description || ''}
              onChange={(e) => onUpdate(field.id, { description: e.target.value })}
              className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
              placeholder="Optional help text"
            />
          </div>
        </div>
      )}
    </div>
  )
}