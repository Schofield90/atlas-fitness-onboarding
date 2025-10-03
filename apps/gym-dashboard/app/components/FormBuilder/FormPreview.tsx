'use client'

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
  title: string
  description: string
  schema: {
    fields: FormField[]
  }
}

interface FormPreviewProps {
  formData: FormData
}

export default function FormPreview({ formData }: FormPreviewProps) {
  const renderField = (field: FormField) => {
    const commonProps = {
      id: field.id,
      required: field.required,
      placeholder: field.placeholder,
      className: "w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        return <textarea rows={4} {...commonProps} />
      
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
                <input 
                  type="checkbox" 
                  className="text-blue-500 bg-white border-gray-300 rounded focus:ring-blue-500" 
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        )
      
      case 'radio':
        return (
          <div className="space-y-2">
            {field.options?.map((option, index) => (
              <label key={index} className="flex items-center space-x-2">
                <input 
                  type="radio" 
                  name={field.id} 
                  className="text-blue-500 bg-white border-gray-300 focus:ring-blue-500" 
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        )
      
      case 'signature':
        return (
          <div className="w-full h-32 bg-gray-50 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="text-2xl mb-2">✍️</div>
              <div className="text-sm">Click to sign</div>
            </div>
          </div>
        )
      
      default:
        return <input type="text" {...commonProps} />
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <h3 className="text-lg font-semibold text-white mb-4">Form Preview</h3>
      
      <div className="bg-white rounded-lg p-6 shadow-lg">
        {/* Form Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {formData.title || 'Untitled Form'}
          </h1>
          {formData.description && (
            <p className="text-gray-600">
              {formData.description}
            </p>
          )}
        </div>

        {/* Form Fields */}
        <div className="space-y-6">
          {formData.schema.fields.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No fields yet</h3>
              <p className="text-sm">Add fields from the palette to build your form</p>
            </div>
          ) : (
            formData.schema.fields.map((field, index) => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {renderField(field)}
                {field.description && (
                  <p className="text-xs text-gray-500 mt-1">{field.description}</p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Submit Button */}
        {formData.schema.fields.length > 0 && (
          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors"
            >
              Submit Form
            </button>
          </div>
        )}
      </div>
    </div>
  )
}