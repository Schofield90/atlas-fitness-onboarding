'use client'

import { Plus } from 'lucide-react'

interface FieldType {
  type: string
  label: string
  icon: string
  description: string
}

interface FieldPaletteProps {
  onAddField: (type: string) => void
}

const FIELD_TYPES: FieldType[] = [
  {
    type: 'text',
    label: 'Text Input',
    icon: '📝',
    description: 'Single line text input'
  },
  {
    type: 'email',
    label: 'Email',
    icon: '📧',
    description: 'Email address input'
  },
  {
    type: 'tel',
    label: 'Phone',
    icon: '📞',
    description: 'Phone number input'
  },
  {
    type: 'textarea',
    label: 'Text Area',
    icon: '📄',
    description: 'Multi-line text input'
  },
  {
    type: 'number',
    label: 'Number',
    icon: '🔢',
    description: 'Numeric input'
  },
  {
    type: 'date',
    label: 'Date',
    icon: '📅',
    description: 'Date picker'
  },
  {
    type: 'select',
    label: 'Dropdown',
    icon: '📋',
    description: 'Dropdown selection'
  },
  {
    type: 'checkbox',
    label: 'Checkboxes',
    icon: '☑️',
    description: 'Multiple choice checkboxes'
  },
  {
    type: 'radio',
    label: 'Radio Buttons',
    icon: '🔘',
    description: 'Single choice radio buttons'
  },
  {
    type: 'signature',
    label: 'Signature',
    icon: '✍️',
    description: 'Digital signature field'
  }
]

export default function FieldPalette({ onAddField }: FieldPaletteProps) {
  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Form Fields</h3>
      <div className="grid grid-cols-1 gap-2">
        {FIELD_TYPES.map((fieldType) => (
          <button
            key={fieldType.type}
            onClick={() => onAddField(fieldType.type)}
            className="flex items-center space-x-3 p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left group"
          >
            <span className="text-xl">{fieldType.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-white font-medium group-hover:text-blue-300 transition-colors">
                {fieldType.label}
              </div>
              <div className="text-xs text-gray-400 truncate">
                {fieldType.description}
              </div>
            </div>
            <Plus className="w-4 h-4 text-gray-400 group-hover:text-blue-300 transition-colors" />
          </button>
        ))}
      </div>
      
      <div className="mt-6 p-3 bg-blue-900/30 border border-blue-700 rounded-lg">
        <h4 className="text-sm font-medium text-blue-300 mb-2">💡 Quick Tip</h4>
        <p className="text-xs text-blue-200">
          Click any field type to add it to your form. Drag fields to reorder them, and click the settings icon to customize properties.
        </p>
      </div>
    </div>
  )
}