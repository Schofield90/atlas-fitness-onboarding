'use client'

import { Fragment } from 'react'
import { X } from 'lucide-react'
import FieldMappingInterface from './FieldMappingInterface'

interface FieldMappingModalProps {
  isOpen: boolean
  onClose: () => void
  formId: string
  formName: string
  organizationId: string
  onSave?: () => void
}

export default function FieldMappingModal({
  isOpen,
  onClose,
  formId,
  formName,
  organizationId,
  onSave
}: FieldMappingModalProps) {
  if (!isOpen) return null

  const handleSave = () => {
    if (onSave) {
      onSave()
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black bg-opacity-30 transition-opacity"
          onClick={onClose}
        />
        
        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <h2 className="text-2xl font-semibold">Configure Field Mappings</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(90vh-80px)] p-6">
            <FieldMappingInterface
              formId={formId}
              formName={formName}
              organizationId={organizationId}
              onSave={handleSave}
              onCancel={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  )
}