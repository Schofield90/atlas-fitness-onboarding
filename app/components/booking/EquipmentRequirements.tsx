'use client'

import { useState } from 'react'
import { Plus, Trash2, Dumbbell, Heart, Zap, Target } from 'lucide-react'
import Button from '@/app/components/ui/Button'

interface EquipmentRequirement {
  id: string
  name: string
  type: 'cardio' | 'strength' | 'functional' | 'studio' | 'pool' | 'court'
  required: boolean
  alternatives: string[]
}

interface EquipmentRequirementsProps {
  requirements: EquipmentRequirement[]
  onChange: (requirements: EquipmentRequirement[]) => void
  readonly?: boolean
}

export default function EquipmentRequirements({ 
  requirements, 
  onChange, 
  readonly = false 
}: EquipmentRequirementsProps) {
  const [showAddForm, setShowAddForm] = useState(false)
  const [newRequirement, setNewRequirement] = useState<Partial<EquipmentRequirement>>({
    name: '',
    type: 'strength',
    required: true,
    alternatives: []
  })

  const equipmentTypes = [
    { value: 'cardio', label: 'Cardio Equipment', icon: Heart },
    { value: 'strength', label: 'Strength Training', icon: Dumbbell },
    { value: 'functional', label: 'Functional Training', icon: Zap },
    { value: 'studio', label: 'Studio Space', icon: Target },
    { value: 'pool', label: 'Pool/Aquatic', icon: Target },
    { value: 'court', label: 'Court/Field', icon: Target }
  ] as const

  const handleAddRequirement = () => {
    if (!newRequirement.name) return

    const requirement: EquipmentRequirement = {
      id: Date.now().toString(),
      name: newRequirement.name,
      type: newRequirement.type as EquipmentRequirement['type'],
      required: newRequirement.required || true,
      alternatives: newRequirement.alternatives || []
    }

    onChange([...requirements, requirement])
    setNewRequirement({
      name: '',
      type: 'strength',
      required: true,
      alternatives: []
    })
    setShowAddForm(false)
  }

  const handleRemoveRequirement = (id: string) => {
    onChange(requirements.filter(req => req.id !== id))
  }

  const getTypeIcon = (type: string) => {
    const typeConfig = equipmentTypes.find(t => t.value === type)
    const Icon = typeConfig?.icon || Target
    return <Icon className="w-4 h-4" />
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'cardio': return 'text-red-500 bg-red-100'
      case 'strength': return 'text-blue-500 bg-blue-100'
      case 'functional': return 'text-green-500 bg-green-100'
      case 'studio': return 'text-purple-500 bg-purple-100'
      case 'pool': return 'text-cyan-500 bg-cyan-100'
      case 'court': return 'text-orange-500 bg-orange-100'
      default: return 'text-gray-500 bg-gray-100'
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-md font-semibold text-gray-300">Equipment Requirements</h4>
        {!readonly && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Equipment
          </Button>
        )}
      </div>

      {requirements.length === 0 ? (
        <p className="text-sm text-gray-400">
          {readonly ? 'No specific equipment required' : 'No equipment requirements set'}
        </p>
      ) : (
        <div className="space-y-3">
          {requirements.map((requirement) => (
            <div key={requirement.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${getTypeColor(requirement.type)}`}>
                  {getTypeIcon(requirement.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{requirement.name}</span>
                    {requirement.required && (
                      <span className="text-xs px-2 py-1 bg-red-900 text-red-300 rounded-full">
                        Required
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400 capitalize">
                    {requirement.type.replace('_', ' ')}
                  </div>
                  {requirement.alternatives.length > 0 && (
                    <div className="text-xs text-gray-500 mt-1">
                      Alternatives: {requirement.alternatives.join(', ')}
                    </div>
                  )}
                </div>
              </div>
              {!readonly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemoveRequirement(requirement.id)}
                  className="text-red-400 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add Equipment Form */}
      {showAddForm && !readonly && (
        <div className="bg-gray-700 rounded-lg p-4 space-y-4">
          <h5 className="font-medium text-white">Add Equipment Requirement</h5>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Equipment Name
              </label>
              <input
                type="text"
                value={newRequirement.name || ''}
                onChange={(e) => setNewRequirement({ ...newRequirement, name: e.target.value })}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
                placeholder="e.g., Olympic Barbell"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Equipment Type
              </label>
              <select
                value={newRequirement.type || 'strength'}
                onChange={(e) => setNewRequirement({ ...newRequirement, type: e.target.value as any })}
                className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
              >
                {equipmentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Alternatives (optional)
            </label>
            <input
              type="text"
              value={newRequirement.alternatives?.join(', ') || ''}
              onChange={(e) => setNewRequirement({ 
                ...newRequirement, 
                alternatives: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
              })}
              className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white"
              placeholder="e.g., Dumbbells, Resistance Bands"
            />
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={newRequirement.required || false}
                onChange={(e) => setNewRequirement({ ...newRequirement, required: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-300">Required equipment</span>
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setShowAddForm(false)
                setNewRequirement({
                  name: '',
                  type: 'strength',
                  required: true,
                  alternatives: []
                })
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddRequirement}
              disabled={!newRequirement.name}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Add Equipment
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}