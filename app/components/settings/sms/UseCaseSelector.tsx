'use client'

import { useState } from 'react'
import { MessageSquare, Users, Calendar, CreditCard, AlertCircle, Plus, Trash2 } from 'lucide-react'

interface UseCase {
  type: string
  description: string
  sample_messages: string[]
}

interface UseCaseSelectorProps {
  setupType: 'uk_number' | 'international' | 'alphanumeric'
  useCases: UseCase[]
  onUpdate: (useCases: UseCase[]) => void
}

const GYM_USE_CASES = [
  {
    id: 'class_bookings',
    title: 'Class Bookings & Reminders',
    description: 'Send booking confirmations, class reminders, and schedule updates',
    icon: <Calendar className="h-5 w-5" />,
    samples: [
      'Hi {{name}}, your {{class_name}} class is confirmed for {{date}} at {{time}}. See you there!',
      'Reminder: Your {{class_name}} class starts in 1 hour. Studio {{location}}.',
      'Class update: {{class_name}} on {{date}} has been moved to {{new_time}}.'
    ],
    category: 'transactional'
  },
  {
    id: 'membership_management',
    title: 'Membership Management',
    description: 'Handle membership renewals, payments, and account updates',
    icon: <Users className="h-5 w-5" />,
    samples: [
      'Hi {{name}}, your membership renews on {{date}}. Payment of £{{amount}} will be taken automatically.',
      'Welcome to {{gym_name}}! Your membership is now active. Download our app to book classes.',
      'Your membership payment failed. Please update your payment method to avoid service interruption.'
    ],
    category: 'transactional'
  },
  {
    id: 'payment_notifications',
    title: 'Payment Notifications',
    description: 'Send payment confirmations, failed payment alerts, and receipts',
    icon: <CreditCard className="h-5 w-5" />,
    samples: [
      'Payment received: £{{amount}} for {{service}}. Receipt: {{receipt_url}}',
      'Payment failed for £{{amount}}. Please update your payment method: {{link}}',
      'Your direct debit of £{{amount}} will be collected on {{date}}.'
    ],
    category: 'transactional'
  },
  {
    id: 'promotional',
    title: 'Promotional Messages',
    description: 'Marketing campaigns, special offers, and new class announcements',
    icon: <MessageSquare className="h-5 w-5" />,
    samples: [
      '🏋️ New HIIT classes starting Monday! Book now and get 20% off your first session.',
      'Limited time: Bring a friend and both get 1 month free! Ends {{date}}.',
      'New personal trainer {{trainer_name}} joins us Monday. Book a consultation: {{link}}'
    ],
    category: 'marketing'
  },
  {
    id: 'customer_support',
    title: 'Customer Support',
    description: 'Handle enquiries, feedback, and general customer service',
    icon: <MessageSquare className="h-5 w-5" />,
    samples: [
      'Thanks for your message! Our team will get back to you within 2 hours.',
      'Your enquiry has been resolved. Rate your experience: {{feedback_link}}',
      'Our opening hours are Mon-Fri 6am-10pm, Sat-Sun 8am-8pm. How can we help?'
    ],
    category: 'utility'
  }
]

export default function UseCaseSelector({ setupType, useCases, onUpdate }: UseCaseSelectorProps) {
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>(
    useCases.map(uc => uc.type)
  )
  const [customUseCase, setCustomUseCase] = useState('')
  const [customDescription, setCustomDescription] = useState('')
  const [customSamples, setCustomSamples] = useState<string[]>([''])

  const handleUseCaseToggle = (useCaseId: string) => {
    let newSelected: string[]
    
    if (selectedUseCases.includes(useCaseId)) {
      newSelected = selectedUseCases.filter(id => id !== useCaseId)
    } else {
      newSelected = [...selectedUseCases, useCaseId]
    }
    
    setSelectedUseCases(newSelected)
    
    // Update the parent component
    const newUseCases = GYM_USE_CASES
      .filter(uc => newSelected.includes(uc.id))
      .map(uc => ({
        type: uc.id,
        description: uc.description,
        sample_messages: uc.samples
      }))
    
    // Add any existing custom use cases
    const existingCustom = useCases.filter(uc => 
      !GYM_USE_CASES.some(gym => gym.id === uc.type)
    )
    
    onUpdate([...newUseCases, ...existingCustom])
  }

  const addCustomUseCase = () => {
    if (!customUseCase.trim() || !customDescription.trim()) return
    
    const filteredSamples = customSamples.filter(sample => sample.trim() !== '')
    if (filteredSamples.length === 0) return

    const newUseCase: UseCase = {
      type: customUseCase.toLowerCase().replace(/\s+/g, '_'),
      description: customDescription,
      sample_messages: filteredSamples
    }

    onUpdate([...useCases, newUseCase])
    
    // Reset form
    setCustomUseCase('')
    setCustomDescription('')
    setCustomSamples([''])
  }

  const removeCustomUseCase = (type: string) => {
    const filteredUseCases = useCases.filter(uc => uc.type !== type)
    onUpdate(filteredUseCases)
  }

  const addCustomSample = () => {
    setCustomSamples([...customSamples, ''])
  }

  const updateCustomSample = (index: number, value: string) => {
    const updated = [...customSamples]
    updated[index] = value
    setCustomSamples(updated)
  }

  const removeCustomSample = (index: number) => {
    if (customSamples.length > 1) {
      const updated = customSamples.filter((_, i) => i !== index)
      setCustomSamples(updated)
    }
  }

  const getCustomUseCases = () => {
    return useCases.filter(uc => 
      !GYM_USE_CASES.some(gym => gym.id === uc.type)
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-white mb-4">SMS Use Cases</h3>
        <p className="text-gray-400 mb-6">
          Select how you plan to use SMS messaging. This helps us configure the right settings and 
          ensures compliance with UK messaging regulations.
        </p>
      </div>

      {/* Pre-defined Use Cases */}
      <div className="space-y-4">
        <h4 className="font-medium text-white">Common Gym Use Cases</h4>
        <div className="grid gap-4">
          {GYM_USE_CASES.map((useCase) => {
            const isSelected = selectedUseCases.includes(useCase.id)
            
            return (
              <label
                key={useCase.id}
                className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleUseCaseToggle(useCase.id)}
                    className="mt-1 w-4 h-4 text-blue-500 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {useCase.icon}
                      <h5 className="font-medium text-white">{useCase.title}</h5>
                      <span className={`text-xs px-2 py-1 rounded ${
                        useCase.category === 'transactional' 
                          ? 'bg-green-900 text-green-300'
                          : useCase.category === 'marketing'
                          ? 'bg-purple-900 text-purple-300'
                          : 'bg-blue-900 text-blue-300'
                      }`}>
                        {useCase.category}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">{useCase.description}</p>
                    
                    {isSelected && (
                      <div className="bg-gray-800 rounded p-3">
                        <div className="text-xs font-medium text-gray-300 mb-2">Sample Messages:</div>
                        <div className="space-y-1">
                          {useCase.samples.map((sample, index) => (
                            <div key={index} className="text-xs text-gray-400 bg-gray-700 rounded px-2 py-1">
                              {sample}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </label>
            )
          })}
        </div>
      </div>

      {/* Custom Use Cases */}
      {getCustomUseCases().length > 0 && (
        <div className="space-y-4">
          <h4 className="font-medium text-white">Custom Use Cases</h4>
          <div className="space-y-3">
            {getCustomUseCases().map((useCase, index) => (
              <div key={index} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-white capitalize mb-1">
                      {useCase.type.replace(/_/g, ' ')}
                    </h5>
                    <p className="text-sm text-gray-400 mb-2">{useCase.description}</p>
                    <div className="space-y-1">
                      {useCase.sample_messages.map((sample, sIndex) => (
                        <div key={sIndex} className="text-xs text-gray-400 bg-gray-800 rounded px-2 py-1">
                          {sample}
                        </div>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => removeCustomUseCase(useCase.type)}
                    className="p-1 text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Custom Use Case */}
      <div className="border border-gray-700 rounded-lg p-4">
        <h4 className="font-medium text-white mb-3">Add Custom Use Case</h4>
        
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Use Case Name
              </label>
              <input
                type="text"
                value={customUseCase}
                onChange={(e) => setCustomUseCase(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                placeholder="e.g., Equipment Maintenance"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Description
              </label>
              <input
                type="text"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                placeholder="e.g., Notify about equipment issues"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Sample Messages
            </label>
            <div className="space-y-2">
              {customSamples.map((sample, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={sample}
                    onChange={(e) => updateCustomSample(index, e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
                    placeholder="Enter a sample message..."
                  />
                  {customSamples.length > 1 && (
                    <button
                      onClick={() => removeCustomSample(index)}
                      className="p-2 text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            
            <div className="flex items-center space-x-3 mt-2">
              <button
                onClick={addCustomSample}
                className="text-sm text-blue-400 hover:text-blue-300 flex items-center space-x-1"
              >
                <Plus className="h-3 w-3" />
                <span>Add another sample</span>
              </button>
              
              <button
                onClick={addCustomUseCase}
                disabled={!customUseCase.trim() || !customDescription.trim() || customSamples.every(s => !s.trim())}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded text-sm transition-colors"
              >
                Add Use Case
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance Information */}
      <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-4">
        <div className="flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5" />
          <div className="text-sm text-yellow-200">
            <p className="font-medium mb-1">Compliance Requirements</p>
            <div className="space-y-1">
              <p>• <strong>Marketing messages</strong> require explicit consent from recipients</p>
              <p>• <strong>Transactional messages</strong> don't require prior consent but must be service-related</p>
              <p>• All messages must include your business name and opt-out instructions</p>
              <p>• Messages sent between 9pm-8am require special justification</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}