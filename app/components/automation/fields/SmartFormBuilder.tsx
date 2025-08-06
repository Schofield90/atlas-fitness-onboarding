'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, GripVertical, Eye, Settings, Sparkles, FormInput, MousePointer, Calendar, FileText, CheckSquare, Image, MapPin, Phone, Mail, Hash, Type, ToggleLeft } from 'lucide-react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'

interface FormField {
  id: string
  type: FormFieldType
  label: string
  placeholder?: string
  required: boolean
  options?: string[]
  validation?: FieldValidation
  aiSuggestions?: AISuggestion[]
  conditional?: ConditionalLogic
  styling?: FieldStyling
}

type FormFieldType = 
  | 'text'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'number'
  | 'date'
  | 'select'
  | 'multi_select'
  | 'radio'
  | 'checkbox'
  | 'file_upload'
  | 'rating'
  | 'slider'
  | 'location'
  | 'signature'

interface FieldValidation {
  minLength?: number
  maxLength?: number
  pattern?: string
  custom?: string
}

interface AISuggestion {
  type: 'label' | 'placeholder' | 'options' | 'validation'
  suggestion: string
  confidence: number
}

interface ConditionalLogic {
  showWhen: {
    field: string
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
    value: any
  }[]
}

interface FieldStyling {
  width: 'full' | 'half' | 'third' | 'quarter'
  alignment: 'left' | 'center' | 'right'
  customCSS?: string
}

interface SmartFormConfig {
  title: string
  description?: string
  submitButtonText: string
  successMessage: string
  fields: FormField[]
  styling: FormStyling
  integrations: FormIntegration[]
  analytics: FormAnalytics
}

interface FormStyling {
  theme: 'modern' | 'classic' | 'minimal' | 'bold'
  primaryColor: string
  backgroundColor: string
  fontFamily: string
}

interface FormIntegration {
  type: 'webhook' | 'email' | 'crm' | 'database'
  config: Record<string, any>
}

interface FormAnalytics {
  trackConversions: boolean
  trackFieldInteractions: boolean
  trackTimeToComplete: boolean
}

interface SmartFormBuilderProps {
  value?: SmartFormConfig
  onChange: (config: SmartFormConfig) => void
  aiAssistance?: boolean
  context?: {
    formType?: 'lead_capture' | 'contact' | 'survey' | 'booking' | 'feedback'
    industry?: string
    targetAudience?: string
  }
}

export function SmartFormBuilder({
  value,
  onChange,
  aiAssistance = true,
  context
}: SmartFormBuilderProps) {
  const [formConfig, setFormConfig] = useState<SmartFormConfig>(value || {
    title: 'Contact Form',
    submitButtonText: 'Submit',
    successMessage: 'Thank you for your submission!',
    fields: [],
    styling: {
      theme: 'modern',
      primaryColor: '#3B82F6',
      backgroundColor: '#FFFFFF',
      fontFamily: 'Inter'
    },
    integrations: [],
    analytics: {
      trackConversions: true,
      trackFieldInteractions: false,
      trackTimeToComplete: false
    }
  })
  
  const [selectedField, setSelectedField] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, AISuggestion[]>>({})
  const [isGeneratingAI, setIsGeneratingAI] = useState(false)

  useEffect(() => {
    onChange(formConfig)
  }, [formConfig, onChange])

  useEffect(() => {
    if (aiAssistance && context) {
      generateAIFormSuggestions()
    }
  }, [context, aiAssistance])

  const fieldTypes: { type: FormFieldType; icon: any; label: string; description: string }[] = [
    { type: 'text', icon: Type, label: 'Text Input', description: 'Single line text field' },
    { type: 'textarea', icon: FileText, label: 'Text Area', description: 'Multi-line text field' },
    { type: 'email', icon: Mail, label: 'Email', description: 'Email address input' },
    { type: 'phone', icon: Phone, label: 'Phone', description: 'Phone number input' },
    { type: 'number', icon: Hash, label: 'Number', description: 'Numeric input' },
    { type: 'date', icon: Calendar, label: 'Date', description: 'Date picker' },
    { type: 'select', icon: MousePointer, label: 'Dropdown', description: 'Single selection dropdown' },
    { type: 'multi_select', icon: CheckSquare, label: 'Multi Select', description: 'Multiple selection' },
    { type: 'radio', icon: ToggleLeft, label: 'Radio Buttons', description: 'Single choice options' },
    { type: 'checkbox', icon: CheckSquare, label: 'Checkboxes', description: 'Multiple choice options' },
    { type: 'file_upload', icon: Image, label: 'File Upload', description: 'File upload field' },
    { type: 'location', icon: MapPin, label: 'Location', description: 'Address/location input' }
  ]

  const generateAIFormSuggestions = async () => {
    if (!context) return
    
    setIsGeneratingAI(true)
    try {
      // Mock AI suggestions - would be replaced with actual API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      const suggestions = generateMockAISuggestions(context)
      setAiSuggestions(suggestions)
      
      // Auto-apply highly confident suggestions
      if (formConfig.fields.length === 0) {
        applyAISuggestions(suggestions)
      }
    } catch (error) {
      console.error('AI suggestion generation failed:', error)
    } finally {
      setIsGeneratingAI(false)
    }
  }

  const generateMockAISuggestions = (context: any): Record<string, AISuggestion[]> => {
    const formTypeFields: Record<string, FormField[]> = {
      lead_capture: [
        {
          id: 'name',
          type: 'text',
          label: 'Full Name',
          placeholder: 'Enter your full name',
          required: true
        },
        {
          id: 'email',
          type: 'email',
          label: 'Email Address',
          placeholder: 'your@email.com',
          required: true
        },
        {
          id: 'phone',
          type: 'phone',
          label: 'Phone Number',
          placeholder: '(555) 123-4567',
          required: false
        },
        {
          id: 'interests',
          type: 'multi_select',
          label: 'Areas of Interest',
          required: false,
          options: ['Personal Training', 'Group Classes', 'Nutrition Coaching', 'Weight Loss', 'Strength Training']
        }
      ],
      contact: [
        {
          id: 'name',
          type: 'text',
          label: 'Name',
          required: true
        },
        {
          id: 'email',
          type: 'email',
          label: 'Email',
          required: true
        },
        {
          id: 'subject',
          type: 'text',
          label: 'Subject',
          required: true
        },
        {
          id: 'message',
          type: 'textarea',
          label: 'Message',
          required: true
        }
      ]
    }

    const suggestedFields = formTypeFields[context.formType] || formTypeFields.lead_capture
    
    return {
      form_structure: [{
        type: 'label',
        suggestion: `AI suggests these ${suggestedFields.length} fields for ${context.formType} forms`,
        confidence: 0.9
      }],
      auto_fields: suggestedFields.map(field => ({
        type: 'label',
        suggestion: `${field.label} (${field.type})`,
        confidence: 0.85
      }))
    }
  }

  const applyAISuggestions = (suggestions: Record<string, AISuggestion[]>) => {
    const formTypeFields: Record<string, FormField[]> = {
      lead_capture: [
        {
          id: `field_${Date.now()}_1`,
          type: 'text',
          label: 'Full Name',
          placeholder: 'Enter your full name',
          required: true,
          styling: { width: 'full', alignment: 'left' }
        },
        {
          id: `field_${Date.now()}_2`,
          type: 'email',
          label: 'Email Address',
          placeholder: 'your@email.com',
          required: true,
          styling: { width: 'full', alignment: 'left' }
        },
        {
          id: `field_${Date.now()}_3`,
          type: 'phone',
          label: 'Phone Number',
          placeholder: '(555) 123-4567',
          required: false,
          styling: { width: 'half', alignment: 'left' }
        },
        {
          id: `field_${Date.now()}_4`,
          type: 'multi_select',
          label: 'Areas of Interest',
          required: false,
          options: ['Personal Training', 'Group Classes', 'Nutrition Coaching', 'Weight Loss', 'Strength Training'],
          styling: { width: 'full', alignment: 'left' }
        }
      ]
    }

    const suggestedFields = formTypeFields[context?.formType || 'lead_capture'] || []
    
    setFormConfig(prev => ({
      ...prev,
      fields: suggestedFields,
      title: context?.formType === 'lead_capture' ? 'Get Started Today!' : prev.title
    }))
  }

  const addField = (type: FormFieldType) => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type,
      label: getDefaultLabel(type),
      placeholder: getDefaultPlaceholder(type),
      required: false,
      styling: { width: 'full', alignment: 'left' }
    }

    if (['select', 'multi_select', 'radio', 'checkbox'].includes(type)) {
      newField.options = ['Option 1', 'Option 2', 'Option 3']
    }

    setFormConfig(prev => ({
      ...prev,
      fields: [...prev.fields, newField]
    }))
    
    setSelectedField(newField.id)
  }

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    setFormConfig(prev => ({
      ...prev,
      fields: prev.fields.map(field =>
        field.id === fieldId ? { ...field, ...updates } : field
      )
    }))
  }

  const removeField = (fieldId: string) => {
    setFormConfig(prev => ({
      ...prev,
      fields: prev.fields.filter(field => field.id !== fieldId)
    }))
    
    if (selectedField === fieldId) {
      setSelectedField(null)
    }
  }

  const onDragEnd = (result: any) => {
    if (!result.destination) return

    const items = Array.from(formConfig.fields)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setFormConfig(prev => ({ ...prev, fields: items }))
  }

  const getDefaultLabel = (type: FormFieldType): string => {
    const labels = {
      text: 'Text Field',
      textarea: 'Text Area',
      email: 'Email Address',
      phone: 'Phone Number',
      number: 'Number',
      date: 'Date',
      select: 'Dropdown',
      multi_select: 'Multi Select',
      radio: 'Radio Buttons',
      checkbox: 'Checkboxes',
      file_upload: 'File Upload',
      rating: 'Rating',
      slider: 'Slider',
      location: 'Location',
      signature: 'Signature'
    }
    return labels[type] || 'Field'
  }

  const getDefaultPlaceholder = (type: FormFieldType): string => {
    const placeholders = {
      text: 'Enter text here...',
      textarea: 'Enter your message...',
      email: 'your@email.com',
      phone: '(555) 123-4567',
      number: '0',
      date: 'Select date',
      select: 'Choose an option',
      multi_select: 'Select options',
      location: 'Enter address'
    }
    return placeholders[type] || ''
  }

  const getFieldIcon = (type: FormFieldType) => {
    const fieldType = fieldTypes.find(ft => ft.type === type)
    return fieldType ? fieldType.icon : FormInput
  }

  const selectedFieldData = formConfig.fields.find(f => f.id === selectedField)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <FormInput className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-medium text-gray-900">Smart Form Builder</h3>
          {aiAssistance && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700">
              <Sparkles className="w-3 h-3 mr-1" />
              AI Enhanced
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <Eye className="w-4 h-4 mr-2" />
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
        </div>
      </div>

      {/* AI Suggestions Banner */}
      {aiAssistance && context && Object.keys(aiSuggestions).length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Sparkles className="w-5 h-5 text-blue-600 mr-2" />
              <div>
                <h4 className="font-medium text-blue-900">AI Suggestions Ready</h4>
                <p className="text-sm text-blue-700">
                  Based on your {context.formType} form type, AI has suggested {formConfig.fields.length || 'several'} optimized fields.
                </p>
              </div>
            </div>
            {formConfig.fields.length === 0 && (
              <button
                onClick={() => applyAISuggestions(aiSuggestions)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                Apply Suggestions
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Field Types Panel */}
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900">Add Fields</h4>
          <div className="space-y-2">
            {fieldTypes.map(({ type, icon: Icon, label, description }) => (
              <button
                key={type}
                onClick={() => addField(type)}
                className="w-full flex items-center p-3 text-left border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 group"
              >
                <Icon className="w-5 h-5 text-gray-400 group-hover:text-blue-600 mr-3" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900 group-hover:text-blue-900">{label}</div>
                  <div className="text-sm text-gray-500">{description}</div>
                </div>
                <Plus className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
              </button>
            ))}
          </div>
        </div>

        {/* Form Builder */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Form Fields</h4>
            {isGeneratingAI && (
              <div className="flex items-center text-sm text-blue-600">
                <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                AI working...
              </div>
            )}
          </div>

          {/* Form Configuration */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Form Title</label>
              <input
                type="text"
                value={formConfig.title}
                onChange={(e) => setFormConfig(prev => ({ ...prev, title: e.target.value }))}
                className="block w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Submit Button Text</label>
              <input
                type="text"
                value={formConfig.submitButtonText}
                onChange={(e) => setFormConfig(prev => ({ ...prev, submitButtonText: e.target.value }))}
                className="block w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Fields List */}
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="form-fields">
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                  {formConfig.fields.map((field, index) => (
                    <Draggable key={field.id} draggableId={field.id} index={index}>
                      {(provided) => {
                        const Icon = getFieldIcon(field.type)
                        return (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`flex items-center p-3 bg-white border rounded-lg ${
                              selectedField === field.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                            }`}
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="mr-2 text-gray-400 hover:text-gray-600"
                            >
                              <GripVertical className="w-4 h-4" />
                            </div>
                            <Icon className="w-4 h-4 text-gray-500 mr-2" />
                            <button
                              onClick={() => setSelectedField(field.id)}
                              className="flex-1 text-left"
                            >
                              <div className="font-medium text-gray-900">{field.label}</div>
                              <div className="text-sm text-gray-500">
                                {field.type} {field.required && '• Required'}
                              </div>
                            </button>
                            <button
                              onClick={() => removeField(field.id)}
                              className="ml-2 text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )
                      }}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {formConfig.fields.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <FormInput className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No fields added</h3>
              <p className="mt-1 text-sm text-gray-500">
                Add fields from the panel on the left or use AI suggestions
              </p>
            </div>
          )}
        </div>

        {/* Field Configuration Panel */}
        <div className="space-y-4">
          {selectedFieldData ? (
            <>
              <h4 className="font-medium text-gray-900">Field Settings</h4>
              <div className="bg-gray-50 p-4 rounded-lg space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Label</label>
                  <input
                    type="text"
                    value={selectedFieldData.label}
                    onChange={(e) => updateField(selectedField!, { label: e.target.value })}
                    className="block w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Placeholder</label>
                  <input
                    type="text"
                    value={selectedFieldData.placeholder || ''}
                    onChange={(e) => updateField(selectedField!, { placeholder: e.target.value })}
                    className="block w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    id="required"
                    type="checkbox"
                    checked={selectedFieldData.required}
                    onChange={(e) => updateField(selectedField!, { required: e.target.checked })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="required" className="ml-2 text-sm text-gray-700">
                    Required field
                  </label>
                </div>

                {['select', 'multi_select', 'radio', 'checkbox'].includes(selectedFieldData.type) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Options</label>
                    <div className="space-y-2">
                      {selectedFieldData.options?.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...(selectedFieldData.options || [])]
                              newOptions[index] = e.target.value
                              updateField(selectedField!, { options: newOptions })
                            }}
                            className="flex-1 text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                          />
                          <button
                            onClick={() => {
                              const newOptions = selectedFieldData.options?.filter((_, i) => i !== index) || []
                              updateField(selectedField!, { options: newOptions })
                            }}
                            className="text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const newOptions = [...(selectedFieldData.options || []), `Option ${(selectedFieldData.options?.length || 0) + 1}`]
                          updateField(selectedField!, { options: newOptions })
                        }}
                        className="flex items-center text-sm text-blue-600 hover:text-blue-800"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Option
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Field Width</label>
                  <select
                    value={selectedFieldData.styling?.width || 'full'}
                    onChange={(e) => updateField(selectedField!, { 
                      styling: { ...selectedFieldData.styling, width: e.target.value as any }
                    })}
                    className="block w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="full">Full Width</option>
                    <option value="half">Half Width</option>
                    <option value="third">Third Width</option>
                    <option value="quarter">Quarter Width</option>
                  </select>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Settings className="mx-auto h-8 w-8 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No field selected</h3>
              <p className="mt-1 text-sm text-gray-500">
                Select a field to configure its settings
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Preview Panel */}
      {showPreview && (
        <div className="mt-6 border-t pt-6">
          <h4 className="font-medium text-gray-900 mb-4">Form Preview</h4>
          <div className="max-w-2xl mx-auto bg-white p-6 border rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">{formConfig.title}</h2>
            {formConfig.description && (
              <p className="text-gray-600 mb-6">{formConfig.description}</p>
            )}
            
            <div className="space-y-4">
              {formConfig.fields.map((field) => {
                const Icon = getFieldIcon(field.type)
                const widthClass = {
                  full: 'w-full',
                  half: 'w-1/2',
                  third: 'w-1/3',
                  quarter: 'w-1/4'
                }[field.styling?.width || 'full']

                return (
                  <div key={field.id} className={`${widthClass} inline-block align-top pr-4`}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Icon className="w-4 h-4 inline mr-1" />
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    
                    {field.type === 'textarea' ? (
                      <textarea
                        placeholder={field.placeholder}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        rows={3}
                        disabled
                      />
                    ) : field.type === 'select' ? (
                      <select
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        disabled
                      >
                        <option>{field.placeholder || 'Choose an option'}</option>
                        {field.options?.map((option, index) => (
                          <option key={index}>{option}</option>
                        ))}
                      </select>
                    ) : ['radio', 'checkbox'].includes(field.type) ? (
                      <div className="space-y-2">
                        {field.options?.map((option, index) => (
                          <label key={index} className="flex items-center">
                            <input
                              type={field.type === 'radio' ? 'radio' : 'checkbox'}
                              name={field.id}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              disabled
                            />
                            <span className="ml-2 text-sm text-gray-700">{option}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <input
                        type={field.type}
                        placeholder={field.placeholder}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        disabled
                      />
                    )}
                  </div>
                )
              })}
            </div>
            
            {formConfig.fields.length > 0 && (
              <div className="mt-6">
                <button
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled
                >
                  {formConfig.submitButtonText}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}