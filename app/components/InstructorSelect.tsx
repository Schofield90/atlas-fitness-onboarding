'use client'

import { useState, useEffect } from 'react'
import { Plus, User } from 'lucide-react'
import { getInstructors, createInstructor, Instructor } from '@/app/lib/services/instructor-service'
import { getCurrentUserOrganization } from '@/app/lib/organization-client'

interface InstructorSelectProps {
  value: string
  onChange: (value: string) => void
  required?: boolean
  className?: string
}

export default function InstructorSelect({ value, onChange, required = false, className = '' }: InstructorSelectProps) {
  const [instructors, setInstructors] = useState<Instructor[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddNew, setShowAddNew] = useState(false)
  const [newInstructorName, setNewInstructorName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadInstructors()
  }, [])

  const loadInstructors = async () => {
    try {
      const { organizationId } = await getCurrentUserOrganization()
      if (organizationId) {
        const data = await getInstructors(organizationId)
        setInstructors(data)
      }
    } catch (error) {
      console.error('Error loading instructors:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNew = async () => {
    if (!newInstructorName.trim()) return

    setCreating(true)
    try {
      const { organizationId } = await getCurrentUserOrganization()
      if (organizationId) {
        const newInstructor = await createInstructor(organizationId, newInstructorName.trim())
        setInstructors([...instructors, newInstructor])
        onChange(newInstructor.name)
        setNewInstructorName('')
        setShowAddNew(false)
      }
    } catch (error: any) {
      alert('Failed to add instructor: ' + error.message)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className={`w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-gray-300 ${className}`}>
        Loading instructors...
      </div>
    )
  }

  if (showAddNew) {
    return (
      <div className="space-y-2">
        <input
          type="text"
          value={newInstructorName}
          onChange={(e) => setNewInstructorName(e.target.value)}
          placeholder="Enter instructor name"
          className={`w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 ${className}`}
          autoFocus
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleAddNew}
            disabled={creating || !newInstructorName.trim()}
            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            {creating ? 'Adding...' : 'Add'}
          </button>
          <button
            type="button"
            onClick={() => {
              setShowAddNew(false)
              setNewInstructorName('')
            }}
            className="px-3 py-1 text-gray-400 hover:text-gray-300 text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => {
          if (e.target.value === '__add_new__') {
            setShowAddNew(true)
          } else {
            onChange(e.target.value)
          }
        }}
        required={required}
        className={`w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none pr-10 ${className}`}
      >
        <option value="">Select instructor...</option>
        {instructors.map(instructor => (
          <option key={instructor.id} value={instructor.name}>
            {instructor.name}
          </option>
        ))}
        <option value="__add_new__" className="font-medium">
          + Add new instructor
        </option>
      </select>
      <User className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
    </div>
  )
}