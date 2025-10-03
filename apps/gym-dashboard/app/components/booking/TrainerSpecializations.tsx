'use client'

import { useState } from 'react'
import { Plus, Trash2, Award, Star, Target, Heart, Zap } from 'lucide-react'
import Button from '@/app/components/ui/Button'

interface TrainerSpecialization {
  id: string
  type: 'personal_training' | 'group_fitness' | 'nutrition' | 'physiotherapy' | 'sports_massage' | 'yoga' | 'pilates' | 'crossfit' | 'powerlifting' | 'bodybuilding'
  certification: string
  certificationBody?: string
  certificationDate?: string
  expiryDate?: string
  active: boolean
}

interface TrainerSpecializationsProps {
  specializations: TrainerSpecialization[]
  onChange: (specializations: TrainerSpecialization[]) => void
  readonly?: boolean
  staffId?: string
}

export default function TrainerSpecializations({ 
  specializations, 
  onChange, 
  readonly = false,
  staffId 
}: TrainerSpecializationsProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newSpecialization, setNewSpecialization] = useState<Partial<TrainerSpecialization>>({
    type: 'personal_training',
    certification: '',
    certificationBody: '',
    certificationDate: '',
    expiryDate: '',
    active: true
  })

  const specializationTypes = [
    { value: 'personal_training', label: 'Personal Training', icon: Target, color: 'text-blue-500 bg-blue-100' },
    { value: 'group_fitness', label: 'Group Fitness', icon: Heart, color: 'text-red-500 bg-red-100' },
    { value: 'nutrition', label: 'Nutrition Coaching', icon: Award, color: 'text-green-500 bg-green-100' },
    { value: 'physiotherapy', label: 'Physiotherapy', icon: Zap, color: 'text-purple-500 bg-purple-100' },
    { value: 'sports_massage', label: 'Sports Massage', icon: Star, color: 'text-pink-500 bg-pink-100' },
    { value: 'yoga', label: 'Yoga Instruction', icon: Target, color: 'text-indigo-500 bg-indigo-100' },
    { value: 'pilates', label: 'Pilates Instruction', icon: Star, color: 'text-teal-500 bg-teal-100' },
    { value: 'crossfit', label: 'CrossFit Coaching', icon: Zap, color: 'text-orange-500 bg-orange-100' },
    { value: 'powerlifting', label: 'Powerlifting Coaching', icon: Target, color: 'text-gray-500 bg-gray-100' },
    { value: 'bodybuilding', label: 'Bodybuilding Coaching', icon: Award, color: 'text-yellow-500 bg-yellow-100' }
  ] as const

  const handleAddSpecialization = async () => {
    if (!newSpecialization.type || !newSpecialization.certification) return

    const specialization: TrainerSpecialization = {
      id: Date.now().toString(),
      type: newSpecialization.type as TrainerSpecialization['type'],
      certification: newSpecialization.certification,
      certificationBody: newSpecialization.certificationBody,
      certificationDate: newSpecialization.certificationDate,
      expiryDate: newSpecialization.expiryDate,
      active: newSpecialization.active || true
    }

    // If we have a staffId, save to database
    if (staffId) {
      try {
        const response = await fetch('/api/staff/specializations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            staff_id: staffId,
            specialization_type: specialization.type,
            certification_name: specialization.certification,
            certification_body: specialization.certificationBody,
            certification_date: specialization.certificationDate,
            expiry_date: specialization.expiryDate,
            is_active: specialization.active
          })
        })

        if (!response.ok) {
          throw new Error('Failed to save specialization')
        }
      } catch (error) {
        console.error('Error saving specialization:', error)
        alert('Failed to save specialization')
        return
      }
    }

    onChange([...specializations, specialization])
    setNewSpecialization({
      type: 'personal_training',
      certification: '',
      certificationBody: '',
      certificationDate: '',
      expiryDate: '',
      active: true
    })
    setShowAddForm(false)
  }

  const handleRemoveSpecialization = async (id: string) => {
    // If we have a staffId, remove from database
    if (staffId) {
      try {
        const response = await fetch(`/api/staff/specializations/${id}`, {
          method: 'DELETE'
        })

        if (!response.ok) {
          throw new Error('Failed to remove specialization')
        }
      } catch (error) {
        console.error('Error removing specialization:', error)
        alert('Failed to remove specialization')
        return
      }
    }

    onChange(specializations.filter(spec => spec.id !== id))
  }

  const getTypeConfig = (type: string) => {
    return specializationTypes.find(t => t.value === type) || specializationTypes[0]
  }

  const isExpiringSoon = (expiryDate?: string) => {
    if (!expiryDate) return false
    const expiry = new Date(expiryDate)
    const today = new Date()
    const daysUntilExpiry = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    return daysUntilExpiry <= 90 && daysUntilExpiry > 0
  }

  const isExpired = (expiryDate?: string) => {
    if (!expiryDate) return false
    return new Date(expiryDate) < new Date()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-md font-semibold text-gray-300">Trainer Specializations</h4>
        {!readonly && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Specialization
          </Button>
        )}
      </div>

      {specializations.length === 0 ? (
        <p className="text-sm text-gray-400">
          {readonly ? 'No specializations listed' : 'No specializations added yet'}
        </p>
      ) : (
        <div className="space-y-3">
          {specializations.map((spec) => {
            const typeConfig = getTypeConfig(spec.type)
            const Icon = typeConfig.icon
            
            return (
              <div key={spec.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${typeConfig.color}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">{typeConfig.label}</span>
                      {!spec.active && (
                        <span className="text-xs px-2 py-1 bg-gray-600 text-gray-400 rounded-full">
                          Inactive
                        </span>
                      )}
                      {isExpired(spec.expiryDate) && (
                        <span className="text-xs px-2 py-1 bg-red-900 text-red-300 rounded-full">
                          Expired
                        </span>
                      )}
                      {isExpiringSoon(spec.expiryDate) && !isExpired(spec.expiryDate) && (
                        <span className="text-xs px-2 py-1 bg-yellow-900 text-yellow-300 rounded-full">
                          Expiring Soon
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-400">
                      {spec.certification}
                      {spec.certificationBody && ` (${spec.certificationBody})`}
                    </div>
                    {(spec.certificationDate || spec.expiryDate) && (
                      <div className="text-xs text-gray-500 mt-1">
                        {spec.certificationDate && `Certified: ${new Date(spec.certificationDate).toLocaleDateString()}`}
                        {spec.certificationDate && spec.expiryDate && ' • '}
                        {spec.expiryDate && `Expires: ${new Date(spec.expiryDate).toLocaleDateString()}`}
                      </div>
                    )}
                  </div>
                </div>
                {!readonly && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveSpecialization(spec.id)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add Specialization Form */}
      {showAddForm && !readonly && (
        <div className="bg-gray-700 rounded-lg p-4 space-y-4">
          <h5 className="font-medium text-white">Add Specialization</h5>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Specialization Type
              </label>
              <select
                value={newSpecialization.type || 'personal_training'}
                onChange={(e) => setNewSpecialization({ ...newSpecialization, type: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
              >
                {specializationTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Certification Name
              </label>
              <input
                type="text"
                value={newSpecialization.certification || ''}
                onChange={(e) => setNewSpecialization({ ...newSpecialization, certification: e.target.value })}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                placeholder="e.g., Level 3 Personal Trainer"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Certifying Body
              </label>
              <input
                type="text"
                value={newSpecialization.certificationBody || ''}
                onChange={(e) => setNewSpecialization({ ...newSpecialization, certificationBody: e.target.value })}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                placeholder="e.g., REPS, NASM, ACSM"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Certification Date
              </label>
              <input
                type="date"
                value={newSpecialization.certificationDate || ''}
                onChange={(e) => setNewSpecialization({ ...newSpecialization, certificationDate: e.target.value })}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Expiry Date
              </label>
              <input
                type="date"
                value={newSpecialization.expiryDate || ''}
                onChange={(e) => setNewSpecialization({ ...newSpecialization, expiryDate: e.target.value })}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
              />
            </div>
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={newSpecialization.active || false}
                onChange={(e) => setNewSpecialization({ ...newSpecialization, active: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-300">Active specialization</span>
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAddForm(false)
                setNewSpecialization({
                  type: 'personal_training',
                  certification: '',
                  certificationBody: '',
                  certificationDate: '',
                  expiryDate: '',
                  active: true
                })
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddSpecialization}
              disabled={!newSpecialization.type || !newSpecialization.certification}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Add Specialization
            </Button>
          </div>
        </div>
      )}

      {/* Certification Renewal Reminders */}
      {!readonly && specializations.some(spec => isExpiringSoon(spec.expiryDate) || isExpired(spec.expiryDate)) && (
        <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
          <h5 className="text-yellow-300 font-medium mb-2">Certification Renewals</h5>
          <div className="space-y-1 text-sm">
            {specializations
              .filter(spec => isExpiringSoon(spec.expiryDate) || isExpired(spec.expiryDate))
              .map(spec => (
                <div key={spec.id} className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${isExpired(spec.expiryDate) ? 'bg-red-500' : 'bg-yellow-500'}`} />
                  <span className="text-yellow-300">
                    {getTypeConfig(spec.type).label} certification {isExpired(spec.expiryDate) ? 'expired' : 'expires soon'}
                    {spec.expiryDate && ` (${new Date(spec.expiryDate).toLocaleDateString()})`}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  )
}

function getTypeConfig(type: string) {
  const specializationTypes = [
    { value: 'personal_training', label: 'Personal Training', icon: Target, color: 'text-blue-500 bg-blue-100' },
    { value: 'group_fitness', label: 'Group Fitness', icon: Heart, color: 'text-red-500 bg-red-100' },
    { value: 'nutrition', label: 'Nutrition Coaching', icon: Award, color: 'text-green-500 bg-green-100' },
    { value: 'physiotherapy', label: 'Physiotherapy', icon: Zap, color: 'text-purple-500 bg-purple-100' },
    { value: 'sports_massage', label: 'Sports Massage', icon: Star, color: 'text-pink-500 bg-pink-100' },
    { value: 'yoga', label: 'Yoga Instruction', icon: Target, color: 'text-indigo-500 bg-indigo-100' },
    { value: 'pilates', label: 'Pilates Instruction', icon: Star, color: 'text-teal-500 bg-teal-100' },
    { value: 'crossfit', label: 'CrossFit Coaching', icon: Zap, color: 'text-orange-500 bg-orange-100' },
    { value: 'powerlifting', label: 'Powerlifting Coaching', icon: Target, color: 'text-gray-500 bg-gray-100' },
    { value: 'bodybuilding', label: 'Bodybuilding Coaching', icon: Award, color: 'text-yellow-500 bg-yellow-100' }
  ]
  
  return specializationTypes.find(t => t.value === type) || specializationTypes[0]
}

function isExpiringSoon(expiryDate?: string): boolean {
  if (!expiryDate) return false
  const expiry = new Date(expiryDate)
  const today = new Date()
  const daysUntilExpiry = (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  return daysUntilExpiry <= 90 && daysUntilExpiry > 0
}

function isExpired(expiryDate?: string): boolean {
  if (!expiryDate) return false
  return new Date(expiryDate) < new Date()
}