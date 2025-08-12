'use client'

import React, { useState, useRef, useEffect } from 'react'
import { 
  Variable, 
  Braces, 
  Hash, 
  Calendar, 
  User, 
  Mail, 
  Phone, 
  Tag, 
  Star, 
  Database,
  Code,
  Lightbulb,
  ChevronDown,
  X,
  Plus,
  Copy
} from 'lucide-react'

interface VariableItem {
  key: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object'
  category: string
  description?: string
  example?: string
  icon?: React.ComponentType<any>
}

interface VariableGroup {
  id: string
  name: string
  icon: React.ComponentType<any>
  variables: VariableItem[]
}

const variableGroups: VariableGroup[] = [
  {
    id: 'contact',
    name: 'Contact Data',
    icon: User,
    variables: [
      {
        key: 'contact.name',
        label: 'Full Name',
        type: 'string',
        category: 'contact',
        description: 'Contact\'s full name',
        example: 'John Smith',
        icon: User
      },
      {
        key: 'contact.firstName',
        label: 'First Name',
        type: 'string',
        category: 'contact',
        description: 'Contact\'s first name',
        example: 'John'
      },
      {
        key: 'contact.lastName',
        label: 'Last Name',
        type: 'string',
        category: 'contact',
        description: 'Contact\'s last name',
        example: 'Smith'
      },
      {
        key: 'contact.email',
        label: 'Email Address',
        type: 'string',
        category: 'contact',
        description: 'Contact\'s email address',
        example: 'john@example.com',
        icon: Mail
      },
      {
        key: 'contact.phone',
        label: 'Phone Number',
        type: 'string',
        category: 'contact',
        description: 'Contact\'s phone number',
        example: '+1 555-123-4567',
        icon: Phone
      },
      {
        key: 'contact.birthday',
        label: 'Birthday',
        type: 'date',
        category: 'contact',
        description: 'Contact\'s birthday',
        example: '1990-01-15',
        icon: Calendar
      },
      {
        key: 'contact.tags',
        label: 'Tags',
        type: 'array',
        category: 'contact',
        description: 'Contact\'s tags',
        example: '["VIP", "Hot Lead"]',
        icon: Tag
      },
      {
        key: 'contact.leadScore',
        label: 'Lead Score',
        type: 'number',
        category: 'contact',
        description: 'Contact\'s lead score',
        example: '85',
        icon: Star
      }
    ]
  },
  {
    id: 'workflow',
    name: 'Workflow Data',
    icon: Variable,
    variables: [
      {
        key: 'workflow.name',
        label: 'Workflow Name',
        type: 'string',
        category: 'workflow',
        description: 'Name of the current workflow',
        example: 'Welcome Campaign'
      },
      {
        key: 'workflow.executionId',
        label: 'Execution ID',
        type: 'string',
        category: 'workflow',
        description: 'Unique execution identifier',
        example: 'exec_123456789'
      },
      {
        key: 'workflow.startTime',
        label: 'Start Time',
        type: 'date',
        category: 'workflow',
        description: 'When the workflow started',
        example: '2024-01-15 10:30:00'
      },
      {
        key: 'workflow.currentStep',
        label: 'Current Step',
        type: 'string',
        category: 'workflow',
        description: 'Current workflow step',
        example: 'send_email'
      },
      {
        key: 'workflow.triggerData',
        label: 'Trigger Data',
        type: 'object',
        category: 'workflow',
        description: 'Data from the workflow trigger',
        example: '{"source": "website", "page": "/signup"}'
      }
    ]
  },
  {
    id: 'system',
    name: 'System Variables',
    icon: Database,
    variables: [
      {
        key: 'system.currentDate',
        label: 'Current Date',
        type: 'date',
        category: 'system',
        description: 'Current date and time',
        example: '2024-01-15',
        icon: Calendar
      },
      {
        key: 'system.currentTime',
        label: 'Current Time',
        type: 'string',
        category: 'system',
        description: 'Current time',
        example: '14:30:00'
      },
      {
        key: 'system.timezone',
        label: 'Timezone',
        type: 'string',
        category: 'system',
        description: 'System timezone',
        example: 'America/New_York'
      },
      {
        key: 'system.organizationId',
        label: 'Organization ID',
        type: 'string',
        category: 'system',
        description: 'Current organization ID',
        example: 'org_123456'
      },
      {
        key: 'system.userId',
        label: 'User ID',
        type: 'string',
        category: 'system',
        description: 'Current user ID',
        example: 'user_789012'
      }
    ]
  },
  {
    id: 'custom',
    name: 'Custom Variables',
    icon: Code,
    variables: [
      {
        key: 'custom.companyName',
        label: 'Company Name',
        type: 'string',
        category: 'custom',
        description: 'Your company name',
        example: 'Atlas Fitness'
      },
      {
        key: 'custom.supportEmail',
        label: 'Support Email',
        type: 'string',
        category: 'custom',
        description: 'Support email address',
        example: 'support@atlasfit.com'
      },
      {
        key: 'custom.websiteUrl',
        label: 'Website URL',
        type: 'string',
        category: 'custom',
        description: 'Your website URL',
        example: 'https://atlasfit.com'
      }
    ]
  }
]

interface VariableEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  showVariablePanel?: boolean
  onToggleVariablePanel?: () => void
}

export default function VariableEditor({ 
  value, 
  onChange, 
  placeholder = 'Enter text with variables...', 
  className = '',
  showVariablePanel = false,
  onToggleVariablePanel
}: VariableEditorProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [cursorPosition, setCursorPosition] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedVariableIndex, setSelectedVariableIndex] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Flatten all variables for search
  const allVariables = variableGroups.flatMap(group => 
    group.variables.map(variable => ({ ...variable, groupName: group.name, groupIcon: group.icon }))
  )

  // Filter variables based on search term
  const filteredVariables = allVariables.filter(variable =>
    variable.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    variable.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
    variable.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Detect variable syntax and show autocomplete
  useEffect(() => {
    const detectVariableInput = () => {
      if (!textareaRef.current) return

      const text = value
      const position = cursorPosition
      
      // Look for {{ before cursor
      const beforeCursor = text.substring(0, position)
      const lastBraceIndex = beforeCursor.lastIndexOf('{{')
      
      if (lastBraceIndex !== -1) {
        const afterBraces = beforeCursor.substring(lastBraceIndex + 2)
        const hasClosingBraces = text.substring(position).indexOf('}}') !== -1
        
        if (!hasClosingBraces && !afterBraces.includes('}}')) {
          setSearchTerm(afterBraces.trim())
          setShowDropdown(true)
          setSelectedVariableIndex(0)
          return
        }
      }
      
      setShowDropdown(false)
      setSearchTerm('')
    }

    detectVariableInput()
  }, [value, cursorPosition])

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setCursorPosition(e.target.selectionStart)
  }

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showDropdown && filteredVariables.length > 0) {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedVariableIndex(prev => 
            prev < filteredVariables.length - 1 ? prev + 1 : 0
          )
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedVariableIndex(prev => 
            prev > 0 ? prev - 1 : filteredVariables.length - 1
          )
          break
        case 'Enter':
        case 'Tab':
          e.preventDefault()
          insertVariable(filteredVariables[selectedVariableIndex])
          break
        case 'Escape':
          setShowDropdown(false)
          break
      }
    }
  }

  const insertVariable = (variable: VariableItem) => {
    if (!textareaRef.current) return

    const text = value
    const position = cursorPosition
    
    // Find the start of the current variable input
    const beforeCursor = text.substring(0, position)
    const lastBraceIndex = beforeCursor.lastIndexOf('{{')
    
    if (lastBraceIndex !== -1) {
      const beforeVariable = text.substring(0, lastBraceIndex)
      const afterCursor = text.substring(position)
      const variableText = `{{${variable.key}}}`
      
      const newText = beforeVariable + variableText + afterCursor
      onChange(newText)
      
      // Set cursor position after the inserted variable
      const newPosition = lastBraceIndex + variableText.length
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(newPosition, newPosition)
          textareaRef.current.focus()
        }
      }, 0)
    } else {
      // Insert at current position
      const beforeCursor = text.substring(0, position)
      const afterCursor = text.substring(position)
      const variableText = `{{${variable.key}}}`
      
      const newText = beforeCursor + variableText + afterCursor
      onChange(newText)
      
      const newPosition = position + variableText.length
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.setSelectionRange(newPosition, newPosition)
          textareaRef.current.focus()
        }
      }, 0)
    }
    
    setShowDropdown(false)
    setSearchTerm('')
  }

  const insertVariableAtCursor = (variable: VariableItem) => {
    if (!textareaRef.current) return

    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = value
    
    const beforeSelection = text.substring(0, start)
    const afterSelection = text.substring(end)
    const variableText = `{{${variable.key}}}`
    
    const newText = beforeSelection + variableText + afterSelection
    onChange(newText)
    
    // Set cursor after inserted variable
    const newPosition = start + variableText.length
    setTimeout(() => {
      textarea.setSelectionRange(newPosition, newPosition)
      textarea.focus()
    }, 0)
  }

  const highlightVariables = (text: string) => {
    // Simple regex to match {{variable.name}} patterns
    const variableRegex = /\{\{([^}]+)\}\}/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = variableRegex.exec(text)) !== null) {
      // Add text before variable
      if (match.index > lastIndex) {
        parts.push(
          <span key={lastIndex} className="text-gray-900">
            {text.substring(lastIndex, match.index)}
          </span>
        )
      }

      // Add highlighted variable
      const variableKey = match[1]
      const isValidVariable = allVariables.some(v => v.key === variableKey)
      
      parts.push(
        <span
          key={match.index}
          className={`px-1 py-0.5 rounded text-sm font-mono ${
            isValidVariable
              ? 'bg-blue-100 text-blue-800 border border-blue-200'
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}
          title={isValidVariable ? `Valid variable: ${variableKey}` : `Invalid variable: ${variableKey}`}
        >
          {match[0]}
        </span>
      )

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(
        <span key={lastIndex} className="text-gray-900">
          {text.substring(lastIndex)}
        </span>
      )
    }

    return parts
  }

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          <div className="flex items-center">
            <Braces className="w-4 h-4 mr-1" />
            Message with Variables
          </div>
        </label>
        <button
          type="button"
          onClick={onToggleVariablePanel}
          className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
        >
          <Variable className="w-4 h-4 mr-1" />
          {showVariablePanel ? 'Hide' : 'Show'} Variables
        </button>
      </div>

      <div className="relative">
        {/* Textarea for input */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleTextareaChange}
          onKeyDown={handleTextareaKeyDown}
          onSelect={(e) => setCursorPosition(e.currentTarget.selectionStart)}
          onClick={(e) => setCursorPosition(e.currentTarget.selectionStart)}
          placeholder={placeholder}
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 font-mono text-sm resize-vertical"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        />

        {/* Autocomplete dropdown */}
        {showDropdown && filteredVariables.length > 0 && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto"
          >
            {filteredVariables.map((variable, index) => {
              const IconComponent = variable.icon || variable.groupIcon
              return (
                <button
                  key={variable.key}
                  onClick={() => insertVariable(variable)}
                  className={`w-full px-3 py-2 text-left hover:bg-gray-50 flex items-start ${
                    index === selectedVariableIndex ? 'bg-blue-50 border-l-2 border-blue-500' : ''
                  }`}
                >
                  <IconComponent className="w-4 h-4 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900">
                      {variable.label}
                    </div>
                    <div className="text-xs text-gray-500 font-mono">
                      {`{{${variable.key}}}`}
                    </div>
                    {variable.description && (
                      <div className="text-xs text-gray-400 mt-1">
                        {variable.description}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Variable panel */}
      {showVariablePanel && (
        <div className="mt-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="p-3 border-b border-gray-200">
            <h3 className="font-medium text-gray-900">Available Variables</h3>
            <p className="text-sm text-gray-500 mt-1">
              Click to insert or type {{ to search
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {variableGroups.map(group => {
              const GroupIcon = group.icon
              return (
                <div key={group.id} className="p-3 border-b border-gray-100 last:border-b-0">
                  <h4 className="font-medium text-sm text-gray-800 mb-2 flex items-center">
                    <GroupIcon className="w-4 h-4 mr-1" />
                    {group.name}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.variables.map(variable => {
                      const VariableIcon = variable.icon || Variable
                      return (
                        <button
                          key={variable.key}
                          onClick={() => insertVariableAtCursor(variable)}
                          className="text-left p-2 bg-white border border-gray-200 rounded hover:border-blue-300 hover:bg-blue-50 transition-colors"
                        >
                          <div className="flex items-center">
                            <VariableIcon className="w-3 h-3 mr-2 text-gray-500" />
                            <span className="text-sm font-medium text-gray-900">
                              {variable.label}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 font-mono mt-1">
                            {`{{${variable.key}}}`}
                          </div>
                          {variable.example && (
                            <div className="text-xs text-gray-400 mt-1">
                              e.g., {variable.example}
                            </div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Preview with highlighted variables */}
      {value && (
        <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-gray-700">Preview</h4>
            <button
              onClick={() => navigator.clipboard?.writeText(value)}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center"
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy
            </button>
          </div>
          <div className="text-sm leading-relaxed">
            {highlightVariables(value)}
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="mt-2 text-xs text-gray-500">
        <div className="flex items-center">
          <Lightbulb className="w-3 h-3 mr-1" />
          Type <code className="bg-gray-100 px-1 rounded">{{</code> to search variables or click variables above to insert
        </div>
      </div>
    </div>
  )
}