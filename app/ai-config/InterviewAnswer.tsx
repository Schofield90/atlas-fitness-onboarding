import React, { useState, useEffect } from 'react'
import Button from '@/app/components/ui/Button'

interface InterviewAnswerProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  onSkip: () => void
  disabled?: boolean
}

export default function InterviewAnswer({ 
  value, 
  onChange, 
  onSubmit, 
  onSkip, 
  disabled = false 
}: InterviewAnswerProps) {
  const [localValue, setLocalValue] = useState(value)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setLocalValue(newValue)
    onChange(newValue)
  }

  return (
    <>
      <textarea
        value={localValue}
        onChange={handleChange}
        placeholder="Type your answer here..."
        className="w-full p-3 border rounded-lg h-32"
        disabled={disabled}
      />

      <div className="flex gap-2">
        <Button
          onClick={onSubmit}
          disabled={!localValue.trim() || disabled}
        >
          Submit Answer
        </Button>
        <Button
          variant="outline"
          onClick={onSkip}
          disabled={disabled}
        >
          Skip Question
        </Button>
      </div>
    </>
  )
}