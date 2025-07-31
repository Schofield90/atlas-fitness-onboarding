'use client'

import { useState, useEffect } from 'react'
import { CheckCircle, Circle, ArrowRight, ArrowLeft, AlertCircle, Building, FileText, MessageSquare, Send } from 'lucide-react'
import BusinessVerification from './BusinessVerification'
import DocumentUpload from './DocumentUpload' 
import UseCaseSelector from './UseCaseSelector'

interface SetupWizardProps {
  organizationId: string
  existingBundle: any
  onComplete: () => void
}

interface SetupStep {
  id: number
  title: string
  description: string
  icon: React.ReactNode
  completed: boolean
}

interface FormData {
  setupType: 'uk_number' | 'international' | 'alphanumeric' | null
  businessInfo: {
    company_name: string
    company_number: string
    business_type: string
    address: {
      line1: string
      line2: string
      city: string
      postal_code: string
      country: string
    }
    contact: {
      first_name: string
      last_name: string
      email: string
      phone: string
    }
    website: string
    vat_number: string
  }
  documents: Array<{
    type: string
    file_name: string
    storage_path: string
  }>
  useCases: Array<{
    type: string
    description: string
    sample_messages: string[]
  }>
}

export default function SetupWizard({ organizationId, existingBundle, onComplete }: SetupWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<FormData>({
    setupType: null,
    businessInfo: {
      company_name: '',
      company_number: '',
      business_type: 'gym',
      address: {
        line1: '',
        line2: '',
        city: '',
        postal_code: '',
        country: 'GB'
      },
      contact: {
        first_name: '',
        last_name: '',
        email: '',
        phone: ''
      },
      website: '',
      vat_number: ''
    },
    documents: [],
    useCases: []
  })

  // Initialize form data from existing bundle
  useEffect(() => {
    if (existingBundle) {
      setFormData(prev => ({
        ...prev,
        businessInfo: { ...prev.businessInfo, ...existingBundle.business_info },
        documents: existingBundle.documents || [],
        useCases: existingBundle.use_cases || []
      }))

      // Determine current step based on bundle status
      if (existingBundle.bundle_status === 'draft') {
        if (existingBundle.business_info?.company_name) {
          if (existingBundle.documents?.length > 0) {
            if (existingBundle.use_cases?.length > 0) {
              setCurrentStep(5) // Review step
            } else {
              setCurrentStep(4) // Use cases step
            }
          } else {
            setCurrentStep(3) // Documents step
          }
        } else {
          setCurrentStep(2) // Business verification step
        }
      } else if (['pending-review', 'in-review'].includes(existingBundle.bundle_status)) {
        setCurrentStep(5) // Show review/status
      }
    }

    // Load saved progress from localStorage
    const savedProgress = localStorage.getItem(`sms-setup-${organizationId}`)
    if (savedProgress && !existingBundle) {
      try {
        const parsed = JSON.parse(savedProgress)
        setFormData(prev => ({ ...prev, ...parsed.formData }))
        setCurrentStep(parsed.currentStep || 1)
      } catch (e) {
        console.error('Error loading saved progress:', e)
      }
    }
  }, [existingBundle, organizationId])

  // Save progress to localStorage
  useEffect(() => {
    localStorage.setItem(`sms-setup-${organizationId}`, JSON.stringify({
      formData,
      currentStep,
      timestamp: new Date().toISOString()
    }))
  }, [formData, currentStep, organizationId])

  const steps: SetupStep[] = [
    {
      id: 1,
      title: 'Setup Type',
      description: 'Choose your SMS service type',
      icon: <MessageSquare className="h-5 w-5" />,
      completed: !!formData.setupType
    },
    {
      id: 2,
      title: 'Business Verification', 
      description: 'Verify your business details',
      icon: <Building className="h-5 w-5" />,
      completed: !!formData.businessInfo.company_name && !!formData.businessInfo.company_number
    },
    {
      id: 3,
      title: 'Document Upload',
      description: 'Upload required documents',
      icon: <FileText className="h-5 w-5" />,
      completed: formData.documents.length > 0
    },
    {
      id: 4,
      title: 'Use Cases',
      description: 'Define your SMS use cases',
      icon: <MessageSquare className="h-5 w-5" />,
      completed: formData.useCases.length > 0
    },
    {
      id: 5,
      title: 'Review & Submit',
      description: 'Review and submit application',
      icon: <Send className="h-5 w-5" />,
      completed: false
    }
  ]

  const handleNext = () => {
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFormDataUpdate = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
  }

  const handleSubmitApplication = async () => {
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/sms/setup/submit-to-twilio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          formData,
          bundleId: existingBundle?.id
        })
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit application')
      }

      // Clear saved progress
      localStorage.removeItem(`sms-setup-${organizationId}`)
      
      // Navigate to success/status page or back to settings
      onComplete()

    } catch (error) {
      console.error('Error submitting application:', error)
      setError(error instanceof Error ? error.message : 'Failed to submit application')
    } finally {
      setSubmitting(false)
    }
  }

  const canProceed = () => {
    const step = steps[currentStep - 1]
    return step.completed
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Choose Your Setup Type</h3>
              <p className="text-gray-400 mb-6">
                Select the type of SMS service that best fits your business needs.
              </p>
            </div>

            <div className="space-y-4">
              <label className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                formData.setupType === 'uk_number' 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-gray-700 hover:border-gray-600'
              }`}>
                <div className="flex items-start space-x-3">
                  <input
                    type="radio"
                    name="setupType"
                    value="uk_number"
                    checked={formData.setupType === 'uk_number'}
                    onChange={(e) => handleFormDataUpdate({ setupType: e.target.value as any })}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-white">UK Phone Number</div>
                    <div className="text-sm text-gray-400 mt-1">
                      Get a UK phone number for two-way SMS communication. Best for customer support and bookings.
                    </div>
                    <div className="text-xs text-green-400 mt-2">Recommended for gyms</div>
                  </div>
                </div>
              </label>

              <label className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                formData.setupType === 'alphanumeric' 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-gray-700 hover:border-gray-600'
              }`}>
                <div className="flex items-start space-x-3">
                  <input
                    type="radio"
                    name="setupType"
                    value="alphanumeric"
                    checked={formData.setupType === 'alphanumeric'}
                    onChange={(e) => handleFormDataUpdate({ setupType: e.target.value as any })}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-white">Alphanumeric Sender ID</div>
                    <div className="text-sm text-gray-400 mt-1">
                      Send messages from your business name (e.g., "FITNESSGYM"). One-way messaging only.
                    </div>
                    <div className="text-xs text-blue-400 mt-2">Good for marketing campaigns</div>
                  </div>
                </div>
              </label>

              <label className={`block p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                formData.setupType === 'international' 
                  ? 'border-blue-500 bg-blue-500/10' 
                  : 'border-gray-700 hover:border-gray-600'
              }`}>
                <div className="flex items-start space-x-3">
                  <input
                    type="radio"
                    name="setupType"
                    value="international"
                    checked={formData.setupType === 'international'}
                    onChange={(e) => handleFormDataUpdate({ setupType: e.target.value as any })}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium text-white">International Number</div>
                    <div className="text-sm text-gray-400 mt-1">
                      Use a US or other international number. Faster setup but higher costs for UK recipients.
                    </div>
                    <div className="text-xs text-yellow-400 mt-2">Higher per-message costs</div>
                  </div>
                </div>
              </label>
            </div>
          </div>
        )

      case 2:
        return (
          <BusinessVerification
            businessInfo={formData.businessInfo}
            onUpdate={(businessInfo) => handleFormDataUpdate({ businessInfo })}
          />
        )

      case 3:
        return (
          <DocumentUpload
            organizationId={organizationId}
            documents={formData.documents}
            onUpdate={(documents) => handleFormDataUpdate({ documents })}
          />
        )

      case 4:
        return (
          <UseCaseSelector
            setupType={formData.setupType || 'uk_number'}
            useCases={formData.useCases}
            onUpdate={(useCases) => handleFormDataUpdate({ useCases })}
          />
        )

      case 5:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Review Your Application</h3>
              <p className="text-gray-400 mb-6">
                Please review all information before submitting your application to Twilio for approval.
              </p>
            </div>

            {error && (
              <div className="bg-red-900/50 border border-red-600 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                  <span className="text-red-300">{error}</span>
                </div>
              </div>
            )}

            {/* Summary sections */}
            <div className="space-y-4">
              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-white mb-2">Setup Type</h4>
                <p className="text-gray-300 capitalize">{formData.setupType?.replace('_', ' ')}</p>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-white mb-2">Business Information</h4>
                <div className="space-y-1 text-sm text-gray-300">
                  <p><strong>Company:</strong> {formData.businessInfo.company_name}</p>
                  <p><strong>Registration:</strong> {formData.businessInfo.company_number}</p>
                  <p><strong>Address:</strong> {formData.businessInfo.address.line1}, {formData.businessInfo.address.city}, {formData.businessInfo.address.postal_code}</p>
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-white mb-2">Documents</h4>
                <div className="space-y-1 text-sm text-gray-300">
                  {formData.documents.map((doc, index) => (
                    <p key={index}>• {doc.file_name} ({doc.type})</p>
                  ))}
                </div>
              </div>

              <div className="bg-gray-700 rounded-lg p-4">
                <h4 className="font-medium text-white mb-2">Use Cases</h4>
                <div className="space-y-1 text-sm text-gray-300">
                  {formData.useCases.map((useCase, index) => (
                    <p key={index}>• {useCase.type}: {useCase.description}</p>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4">
              <h4 className="font-medium text-blue-300 mb-2">What happens next?</h4>
              <div className="space-y-1 text-sm text-blue-200">
                <p>1. Your application will be submitted to Twilio for regulatory review</p>
                <p>2. Twilio will review your business information and documents (1-3 business days)</p>
                <p>3. Once approved, we'll automatically provision your UK phone number</p>
                <p>4. You'll receive an email confirmation when your number is ready to use</p>
              </div>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="p-6">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                currentStep === step.id
                  ? 'border-blue-500 bg-blue-500 text-white'
                  : step.completed
                  ? 'border-green-500 bg-green-500 text-white'
                  : 'border-gray-600 text-gray-400'
              }`}>
                {step.completed ? (
                  <CheckCircle className="h-5 w-5" />
                ) : currentStep === step.id ? (
                  <Circle className="h-5 w-5 fill-current" />
                ) : (
                  <span className="text-sm font-medium">{step.id}</span>
                )}
              </div>
              
              <div className={`ml-3 ${currentStep === step.id ? 'text-white' : 'text-gray-400'}`}>
                <div className="text-sm font-medium">{step.title}</div>
                <div className="text-xs">{step.description}</div>
              </div>

              {index < steps.length - 1 && (
                <div className={`flex-1 h-px mx-4 ${
                  step.completed ? 'bg-green-500' : 'bg-gray-600'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="mb-8">
        {renderStepContent()}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={handlePrevious}
          disabled={currentStep === 1}
          className="flex items-center space-x-2 px-4 py-2 text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Previous</span>
        </button>

        <div className="flex space-x-3">
          {currentStep === steps.length ? (
            <button
              onClick={handleSubmitApplication}
              disabled={submitting}
              className="flex items-center space-x-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Submit Application</span>
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}