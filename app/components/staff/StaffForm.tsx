'use client'

import { useState, useEffect } from 'react'
import Button from '../ui/Button'
import { AlertCircle, Save, X, User, Mail, Phone, Calendar, MapPin, FileText } from 'lucide-react'
import { StaffProfile, CreateStaffProfileRequest, UpdateStaffProfileRequest, StaffAPIResponse } from '../../lib/types/staff'

interface StaffFormProps {
  staff?: StaffProfile | null
  onSuccess: () => void
  onCancel: () => void
  mode?: 'create' | 'edit'
}

interface FormData {
  first_name: string
  last_name: string
  email: string
  phone_number: string
  position: string
  department: string
  hire_date: string
  employment_type: 'full_time' | 'part_time' | 'contract' | 'intern'
  status: 'active' | 'inactive' | 'terminated' | 'on_leave'
  hourly_rate: string
  salary: string
  emergency_contact_name: string
  emergency_contact_phone: string
  address_line_1: string
  address_line_2: string
  city: string
  state: string
  postal_code: string
  country: string
  notes: string
}

const initialFormData: FormData = {
  first_name: '',
  last_name: '',
  email: '',
  phone_number: '',
  position: '',
  department: '',
  hire_date: '',
  employment_type: 'full_time',
  status: 'active',
  hourly_rate: '',
  salary: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  address_line_1: '',
  address_line_2: '',
  city: '',
  state: '',
  postal_code: '',
  country: 'United Kingdom',
  notes: ''
}

export default function StaffForm({ staff, onSuccess, onCancel, mode = 'create' }: StaffFormProps) {
  const [formData, setFormData] = useState<FormData>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTab, setCurrentTab] = useState<'basic' | 'contact' | 'compensation' | 'additional'>('basic')
  const [validationErrors, setValidationErrors] = useState<Partial<FormData>>({})

  useEffect(() => {
    if (staff && mode === 'edit') {
      setFormData({
        first_name: staff.first_name || '',
        last_name: staff.last_name || '',
        email: staff.email || '',
        phone_number: staff.phone_number || '',
        position: staff.position || '',
        department: staff.department || '',
        hire_date: staff.hire_date ? staff.hire_date.split('T')[0] : '',
        employment_type: staff.employment_type || 'full_time',
        status: staff.status || 'active',
        hourly_rate: staff.hourly_rate ? staff.hourly_rate.toString() : '',
        salary: staff.salary ? staff.salary.toString() : '',
        emergency_contact_name: staff.emergency_contact_name || '',
        emergency_contact_phone: staff.emergency_contact_phone || '',
        address_line_1: staff.address_line_1 || '',
        address_line_2: staff.address_line_2 || '',
        city: staff.city || '',
        state: staff.state || '',
        postal_code: staff.postal_code || '',
        country: staff.country || 'United Kingdom',
        notes: staff.notes || ''
      })
    }
  }, [staff, mode])

  const validateForm = (): boolean => {
    const errors: Partial<FormData> = {}

    if (!formData.first_name.trim()) {
      errors.first_name = 'First name is required'
    }

    if (!formData.last_name.trim()) {
      errors.last_name = 'Last name is required'
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email format'
    }

    if (!formData.position.trim()) {
      errors.position = 'Position is required'
    }

    if (!formData.hire_date) {
      errors.hire_date = 'Hire date is required'
    }

    if (formData.phone_number && !/^[\+]?[0-9\s\-\(\)]+$/.test(formData.phone_number)) {
      errors.phone_number = 'Invalid phone number format'
    }

    if (formData.emergency_contact_phone && !/^[\+]?[0-9\s\-\(\)]+$/.test(formData.emergency_contact_phone)) {
      errors.emergency_contact_phone = 'Invalid phone number format'
    }

    if (formData.hourly_rate && (isNaN(Number(formData.hourly_rate)) || Number(formData.hourly_rate) < 0)) {
      errors.hourly_rate = 'Invalid hourly rate'
    }

    if (formData.salary && (isNaN(Number(formData.salary)) || Number(formData.salary) < 0)) {
      errors.salary = 'Invalid salary amount'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      setError('Please fix the validation errors before submitting.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const requestData = mode === 'create' ? {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone_number: formData.phone_number.trim() || undefined,
        position: formData.position.trim(),
        department: formData.department.trim() || undefined,
        hire_date: formData.hire_date,
        employment_type: formData.employment_type,
        status: formData.status,
        hourly_rate: formData.hourly_rate ? Number(formData.hourly_rate) : undefined,
        salary: formData.salary ? Number(formData.salary) : undefined,
        emergency_contact_name: formData.emergency_contact_name.trim() || undefined,
        emergency_contact_phone: formData.emergency_contact_phone.trim() || undefined,
        address_line_1: formData.address_line_1.trim() || undefined,
        address_line_2: formData.address_line_2.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        postal_code: formData.postal_code.trim() || undefined,
        country: formData.country.trim(),
        notes: formData.notes.trim() || undefined
      } as CreateStaffProfileRequest : {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email.trim().toLowerCase(),
        phone_number: formData.phone_number.trim() || undefined,
        position: formData.position.trim(),
        department: formData.department.trim() || undefined,
        hire_date: formData.hire_date,
        employment_type: formData.employment_type,
        status: formData.status,
        hourly_rate: formData.hourly_rate ? Number(formData.hourly_rate) : undefined,
        salary: formData.salary ? Number(formData.salary) : undefined,
        emergency_contact_name: formData.emergency_contact_name.trim() || undefined,
        emergency_contact_phone: formData.emergency_contact_phone.trim() || undefined,
        address_line_1: formData.address_line_1.trim() || undefined,
        address_line_2: formData.address_line_2.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        postal_code: formData.postal_code.trim() || undefined,
        country: formData.country.trim(),
        notes: formData.notes.trim() || undefined
      } as UpdateStaffProfileRequest

      const url = mode === 'create' ? '/api/staff' : `/api/staff/${staff?.id}`
      const method = mode === 'create' ? 'POST' : 'PUT'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      const data: StaffAPIResponse<StaffProfile> = await response.json()

      if (!data.success) {
        throw new Error(data.error || `Failed to ${mode} staff profile`)
      }

      onSuccess()
    } catch (err: any) {
      console.error(`Error ${mode === 'create' ? 'creating' : 'updating'} staff:`, err)
      setError(err.message || `Failed to ${mode} staff profile`)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const tabs = [
    { id: 'basic', label: 'Basic Info', icon: User },
    { id: 'contact', label: 'Contact', icon: Mail },
    { id: 'compensation', label: 'Compensation', icon: Calendar },
    { id: 'additional', label: 'Additional', icon: FileText }
  ]

  const renderField = (
    field: keyof FormData,
    label: string,
    type: string = 'text',
    placeholder?: string,
    required?: boolean,
    options?: { value: string; label: string }[]
  ) => {
    const error = validationErrors[field]
    
    return (
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label} {required && <span className="text-red-400">*</span>}
        </label>
        {options ? (
          <select
            value={formData[field]}
            onChange={(e) => handleInputChange(field, e.target.value)}
            className={`w-full px-3 py-2 bg-slate-700 border ${error ? 'border-red-500' : 'border-slate-600'} rounded-lg text-white focus:outline-none focus:border-orange-500`}
            required={required}
          >
            {options.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : type === 'textarea' ? (
          <textarea
            value={formData[field]}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={placeholder}
            rows={3}
            className={`w-full px-3 py-2 bg-slate-700 border ${error ? 'border-red-500' : 'border-slate-600'} rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500`}
            required={required}
          />
        ) : (
          <input
            type={type}
            value={formData[field]}
            onChange={(e) => handleInputChange(field, e.target.value)}
            placeholder={placeholder}
            className={`w-full px-3 py-2 bg-slate-700 border ${error ? 'border-red-500' : 'border-slate-600'} rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-orange-500`}
            required={required}
          />
        )}
        {error && (
          <p className="mt-1 text-sm text-red-400 flex items-center gap-1">
            <AlertCircle className="h-4 w-4" />
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Tab Navigation */}
      <div className="border-b border-slate-700">
        <nav className="flex space-x-8">
          {tabs.map(tab => {
            const IconComponent = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCurrentTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
                  currentTab === tab.id
                    ? 'border-orange-500 text-orange-500'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <IconComponent className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {error && (
        <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Basic Information Tab */}
      {currentTab === 'basic' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('first_name', 'First Name', 'text', 'John', true)}
            {renderField('last_name', 'Last Name', 'text', 'Doe', true)}
          </div>

          {renderField('email', 'Email Address', 'email', 'john.doe@example.com', true)}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('position', 'Position', 'text', 'Personal Trainer', true)}
            {renderField('department', 'Department', 'text', 'Fitness')}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('hire_date', 'Hire Date', 'date', '', true)}
            {renderField('employment_type', 'Employment Type', 'text', '', false, [
              { value: 'full_time', label: 'Full Time' },
              { value: 'part_time', label: 'Part Time' },
              { value: 'contract', label: 'Contract' },
              { value: 'intern', label: 'Intern' }
            ])}
          </div>

          {renderField('status', 'Status', 'text', '', false, [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'on_leave', label: 'On Leave' },
            { value: 'terminated', label: 'Terminated' }
          ])}
        </div>
      )}

      {/* Contact Information Tab */}
      {currentTab === 'contact' && (
        <div className="space-y-4">
          {renderField('phone_number', 'Phone Number', 'tel', '+44 7123 456789')}

          <div className="space-y-4">
            <h4 className="text-lg font-medium text-white">Emergency Contact</h4>
            {renderField('emergency_contact_name', 'Emergency Contact Name', 'text', 'Jane Doe')}
            {renderField('emergency_contact_phone', 'Emergency Contact Phone', 'tel', '+44 7987 654321')}
          </div>

          <div className="space-y-4">
            <h4 className="text-lg font-medium text-white">Address</h4>
            {renderField('address_line_1', 'Address Line 1', 'text', '123 Main Street')}
            {renderField('address_line_2', 'Address Line 2', 'text', 'Apartment 4B')}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderField('city', 'City', 'text', 'London')}
              {renderField('state', 'State/County', 'text', 'Greater London')}
              {renderField('postal_code', 'Postal Code', 'text', 'SW1A 1AA')}
            </div>

            {renderField('country', 'Country', 'text', 'United Kingdom')}
          </div>
        </div>
      )}

      {/* Compensation Tab */}
      {currentTab === 'compensation' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('hourly_rate', 'Hourly Rate (£)', 'number', '25.00')}
            {renderField('salary', 'Annual Salary (£)', 'number', '35000')}
          </div>

          <div className="p-4 bg-slate-800 rounded-lg">
            <p className="text-sm text-gray-400">
              <strong>Note:</strong> You can specify either an hourly rate or an annual salary, or both if the staff member works variable hours.
            </p>
          </div>
        </div>
      )}

      {/* Additional Information Tab */}
      {currentTab === 'additional' && (
        <div className="space-y-4">
          {renderField('notes', 'Notes', 'textarea', 'Any additional information about this staff member...')}
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-6 border-t border-slate-700">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          <X className="h-4 w-4 mr-2" />
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2"
        >
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              {mode === 'create' ? 'Creating...' : 'Updating...'}
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              {mode === 'create' ? 'Create Staff Member' : 'Update Staff Member'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}