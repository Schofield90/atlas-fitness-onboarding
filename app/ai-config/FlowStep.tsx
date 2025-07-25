import React, { useState, useEffect } from 'react'
import Button from '@/app/components/ui/Button'
import { Trash2 } from 'lucide-react'

interface FlowStepProps {
  step: { id: number; text: string }
  index: number
  isEditing: boolean
  onUpdate: (text: string) => void
  onRemove: () => void
  color: string
}

export default function FlowStep({ step, index, isEditing, onUpdate, onRemove, color }: FlowStepProps) {
  const [localText, setLocalText] = useState(step.text)

  useEffect(() => {
    setLocalText(step.text)
  }, [step.text])

  const handleBlur = () => {
    if (localText !== step.text) {
      onUpdate(localText)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 ${color} text-white rounded-full flex items-center justify-center flex-shrink-0`}>
        {index + 1}
      </div>
      {isEditing ? (
        <>
          <input
            type="text"
            value={localText}
            onChange={(e) => setLocalText(e.target.value)}
            onBlur={handleBlur}
            className="flex-1 p-2 border rounded text-sm"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={onRemove}
          >
            <Trash2 className="w-4 h-4 text-red-500" />
          </Button>
        </>
      ) : (
        <p className="text-sm">{step.text}</p>
      )}
    </div>
  )
}