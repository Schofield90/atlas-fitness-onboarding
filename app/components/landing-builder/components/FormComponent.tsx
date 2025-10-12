'use client'

import React, { useState } from 'react'
import { ComponentProps } from '../types'

interface FormField {
  id: string
  type: 'text' | 'email' | 'tel' | 'textarea' | 'select' | 'checkbox'
  label: string
  placeholder?: string
  required?: boolean
  options?: string[] // For select fields
}

interface FormProps extends ComponentProps {
  title?: string
  description?: string
  fields?: FormField[]
  submitLabel?: string
  successMessage?: string
  layout?: 'single' | 'double'
  backgroundColor?: string
  textColor?: string
  buttonColor?: string // NEW: Color for submit button
}

export const FormComponent: React.FC<FormProps> = ({
  title = 'Contact Us',
  description = 'Fill out the form below and we\'ll get back to you.',
  fields = [
    { id: 'name', type: 'text', label: 'Name', required: true },
    { id: 'email', type: 'email', label: 'Email', required: true },
    { id: 'message', type: 'textarea', label: 'Message', required: false }
  ],
  submitLabel = 'Submit',
  successMessage = 'Thank you! Your submission has been received.',
  layout = 'single',
  className = '',
  backgroundColor = '#ffffff',
  textColor = '#111827',
  buttonColor // NEW: Extract buttonColor prop
}) => {
  const [formData, setFormData] = useState<Record<string, string | boolean>>({})
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // In production, this would submit to your API
    console.log('Form submitted:', formData)
    setSubmitted(true)
    setTimeout(() => setSubmitted(false), 5000)
  }

  const handleChange = (id: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [id]: value }))
  }

  const renderField = (field: FormField) => {
    const baseInputClasses = "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    
    switch (field.type) {
      case 'textarea':
        return (
          <textarea
            id={field.id}
            placeholder={field.placeholder}
            required={field.required}
            rows={4}
            className={baseInputClasses}
            value={(formData[field.id] as string) || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
          />
        )
      
      case 'select':
        return (
          <select
            id={field.id}
            required={field.required}
            className={baseInputClasses}
            value={(formData[field.id] as string) || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
          >
            <option value="">Select...</option>
            {field.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        )
      
      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              type="checkbox"
              id={field.id}
              className="mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              checked={(formData[field.id] as boolean) || false}
              onChange={(e) => handleChange(field.id, e.target.checked)}
            />
            <label htmlFor={field.id} className="text-gray-700">
              {field.label}
            </label>
          </div>
        )
      
      default:
        return (
          <input
            type={field.type}
            id={field.id}
            placeholder={field.placeholder}
            required={field.required}
            className={baseInputClasses}
            value={(formData[field.id] as string) || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
          />
        )
    }
  }

  if (submitted) {
    return (
      <div className="bg-green-50 border border-green-200 text-green-800 px-6 py-4 rounded-lg">
        {successMessage}
      </div>
    )
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg p-8 ${className}`}>
      {title && (
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
      )}
      {description && (
        <p className="text-gray-600 mb-6">{description}</p>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className={`grid gap-4 ${layout === 'double' ? 'md:grid-cols-2' : 'grid-cols-1'}`}>
          {fields.map(field => (
            <div key={field.id} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
              {field.type !== 'checkbox' && (
                <label htmlFor={field.id} className="block text-sm font-medium text-gray-700 mb-1">
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </label>
              )}
              {renderField(field)}
            </div>
          ))}
        </div>
        
        <button
          type="submit"
          className="mt-6 w-full py-3 px-6 rounded-lg font-semibold transition-colors"
          style={{
            backgroundColor: buttonColor || '#3B82F6',
            color: '#FFFFFF'
          }}
        >
          {submitLabel}
        </button>
      </form>
    </div>
  )
}