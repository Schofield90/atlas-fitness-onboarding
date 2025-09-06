'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/app/lib/supabase/client'
import { 
  X, 
  FileText, 
  Plus, 
  Send, 
  Mail, 
  Bell, 
  Users, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Loader2
} from 'lucide-react'

interface WaiverAssignmentModalProps {
  isOpen: boolean
  onClose: () => void
  customer: {
    id: string
    name: string
    email: string
    organization_id: string
  }
  onWaiverAssigned: () => void
}

interface AvailableWaiver {
  id: string
  title: string
  waiver_type: string
  is_active: boolean
  requires_witness: boolean
  validity_days: number | null
  content: string
}

export function WaiverAssignmentModal({ 
  isOpen, 
  onClose, 
  customer, 
  onWaiverAssigned 
}: WaiverAssignmentModalProps) {
  const [availableWaivers, setAvailableWaivers] = useState<AvailableWaiver[]>([])
  const [selectedWaiver, setSelectedWaiver] = useState<AvailableWaiver | null>(null)
  const [loading, setLoading] = useState(false)
  const [assignmentLoading, setAssignmentLoading] = useState(false)
  const [step, setStep] = useState<'select' | 'confirm' | 'success'>('select')
  const [sendEmail, setSendEmail] = useState(true)
  const [sendNotification, setSendNotification] = useState(true)
  const [customMessage, setCustomMessage] = useState('')
  const [validityDays, setValidityDays] = useState<number | null>(null)
  const [assignedWaiverId, setAssignedWaiverId] = useState<string | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    if (isOpen) {
      fetchAvailableWaivers()
      setStep('select')
      setSelectedWaiver(null)
      setCustomMessage('')
      setValidityDays(null)
      setAssignedWaiverId(null)
    }
  }, [isOpen])

  const fetchAvailableWaivers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/waivers')
      const result = await response.json()

      if (result.success) {
        // Filter out waivers already assigned to this customer
        const customerWaiversResponse = await fetch(`/api/waivers/customer-waivers?customer_id=${customer.id}`)
        const customerWaiversResult = await customerWaiversResponse.json()
        
        const assignedWaiverIds = customerWaiversResult.success 
          ? (customerWaiversResult.data || [])
              .filter((cw: any) => cw.status !== 'cancelled')
              .map((cw: any) => cw.waiver_id)
          : []

        const availableWaivers = (result.data || []).filter(
          (waiver: AvailableWaiver) => 
            waiver.is_active && !assignedWaiverIds.includes(waiver.id)
        )
        
        setAvailableWaivers(availableWaivers)
      } else {
        console.error('Error fetching available waivers:', result.error)
      }
    } catch (error) {
      console.error('Error fetching available waivers:', error)
    } finally {
      setLoading(false)
    }
  }

  const assignWaiver = async () => {
    if (!selectedWaiver) return

    try {
      setAssignmentLoading(true)

      // Step 1: Assign the waiver
      const assignResponse = await fetch('/api/waivers/customer-waivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_id: customer.id,
          waiver_id: selectedWaiver.id,
          validity_days: validityDays,
          send_email: false, // We'll handle email separately for better control
        }),
      })

      const assignResult = await assignResponse.json()

      if (!assignResult.success) {
        throw new Error(assignResult.error || 'Failed to assign waiver')
      }

      const customerWaiverId = assignResult.data.id
      setAssignedWaiverId(customerWaiverId)

      // Step 2: Send email if requested
      if (sendEmail) {
        const emailResponse = await fetch('/api/waivers/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            customer_waiver_id: customerWaiverId,
            email_type: 'initial',
            custom_message: customMessage || undefined,
          }),
        })

        const emailResult = await emailResponse.json()
        
        if (!emailResult.success) {
          console.warn('Waiver assigned but email failed:', emailResult.error)
        }
      }

      // Step 3: Send internal notification if requested
      if (sendNotification) {
        try {
          await fetch('/api/notifications', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: 'waiver_assigned',
              title: 'Waiver Assigned',
              message: `${selectedWaiver.title} waiver assigned to ${customer.name}`,
              data: {
                customer_id: customer.id,
                customer_name: customer.name,
                waiver_id: selectedWaiver.id,
                waiver_title: selectedWaiver.title,
                customer_waiver_id: customerWaiverId,
              },
            }),
          })
        } catch (notificationError) {
          console.warn('Notification failed:', notificationError)
        }
      }

      setStep('success')
      
      // Call the callback after a short delay to show success state
      setTimeout(() => {
        onWaiverAssigned()
      }, 1500)

    } catch (error) {
      console.error('Error assigning waiver:', error)
      alert('Failed to assign waiver: ' + (error as Error).message)
    } finally {
      setAssignmentLoading(false)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'liability':
        return 'bg-red-500/20 text-red-400'
      case 'medical':
        return 'bg-blue-500/20 text-blue-400'
      case 'photo_release':
        return 'bg-green-500/20 text-green-400'
      case 'membership_agreement':
        return 'bg-purple-500/20 text-purple-400'
      case 'general':
        return 'bg-gray-500/20 text-gray-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  const formatWaiverType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h3 className="text-xl font-bold text-white">Add Waiver</h3>
            <p className="text-gray-400 text-sm">
              Assign a waiver to {customer.name} ({customer.email})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {step === 'select' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">
                  Select a Waiver
                </h4>
                
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-gray-400">Loading waivers...</span>
                  </div>
                ) : availableWaivers.length === 0 ? (
                  <div className="text-center py-8">
                    <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <p className="text-gray-400">
                      No available waivers found for this customer
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {availableWaivers.map((waiver) => (
                      <div
                        key={waiver.id}
                        className={`p-4 rounded-lg cursor-pointer transition-colors ${
                          selectedWaiver?.id === waiver.id
                            ? 'bg-orange-500/20 border-2 border-orange-500'
                            : 'bg-gray-700 hover:bg-gray-600 border-2 border-transparent'
                        }`}
                        onClick={() => {
                          setSelectedWaiver(waiver)
                          setValidityDays(waiver.validity_days)
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h5 className="font-medium text-white mb-1">
                              {waiver.title}
                            </h5>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                              <span
                                className={`px-2 py-0.5 rounded text-xs ${getTypeColor(waiver.waiver_type)}`}
                              >
                                {formatWaiverType(waiver.waiver_type)}
                              </span>
                              {waiver.requires_witness && (
                                <span className="inline-flex items-center gap-1 text-xs text-orange-400">
                                  <Users className="h-3 w-3" />
                                  Requires Witness
                                </span>
                              )}
                              {waiver.validity_days && (
                                <span className="inline-flex items-center gap-1 text-xs text-gray-400">
                                  <Clock className="h-3 w-3" />
                                  Expires in {waiver.validity_days} days
                                </span>
                              )}
                            </div>
                          </div>
                          {selectedWaiver?.id === waiver.id && (
                            <CheckCircle className="h-5 w-5 text-orange-400" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedWaiver && (
                <div className="border-t border-gray-700 pt-6">
                  <button
                    onClick={() => setStep('confirm')}
                    className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                  >
                    <Plus className="h-5 w-5" />
                    Continue with {selectedWaiver.title}
                  </button>
                </div>
              )}
            </div>
          )}

          {step === 'confirm' && selectedWaiver && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-white mb-4">
                  Confirm Assignment
                </h4>
                
                {/* Selected Waiver Summary */}
                <div className="bg-gray-700 rounded-lg p-4 mb-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <h5 className="font-medium text-white mb-2">
                        {selectedWaiver.title}
                      </h5>
                      <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span
                          className={`px-2 py-0.5 rounded text-xs ${getTypeColor(selectedWaiver.waiver_type)}`}
                        >
                          {formatWaiverType(selectedWaiver.waiver_type)}
                        </span>
                        {selectedWaiver.requires_witness && (
                          <span className="inline-flex items-center gap-1 text-xs text-orange-400">
                            <Users className="h-3 w-3" />
                            Requires Witness
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => setStep('select')}
                      className="text-gray-400 hover:text-white text-sm"
                    >
                      Change
                    </button>
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-4">
                  {/* Validity Period */}
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Validity Period (days)
                    </label>
                    <input
                      type="number"
                      value={validityDays || ''}
                      onChange={(e) => setValidityDays(e.target.value ? parseInt(e.target.value) : null)}
                      placeholder={selectedWaiver.validity_days ? `Default: ${selectedWaiver.validity_days}` : 'No expiration'}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Leave empty for no expiration
                    </p>
                  </div>

                  {/* Email Options */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="send-email"
                        checked={sendEmail}
                        onChange={(e) => setSendEmail(e.target.checked)}
                        className="w-4 h-4 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                      />
                      <label htmlFor="send-email" className="flex items-center gap-2 text-white">
                        <Mail className="h-4 w-4" />
                        Send email reminder to customer
                      </label>
                    </div>
                    
                    {sendEmail && (
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          Custom message (optional)
                        </label>
                        <textarea
                          value={customMessage}
                          onChange={(e) => setCustomMessage(e.target.value)}
                          placeholder="Add a personal message to include with the waiver email..."
                          rows={3}
                          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Notification Options */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="send-notification"
                      checked={sendNotification}
                      onChange={(e) => setSendNotification(e.target.checked)}
                      className="w-4 h-4 text-orange-600 bg-gray-700 border-gray-600 rounded focus:ring-orange-500 focus:ring-2"
                    />
                    <label htmlFor="send-notification" className="flex items-center gap-2 text-white">
                      <Bell className="h-4 w-4" />
                      Send internal app notification
                    </label>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-700">
                <button
                  onClick={() => setStep('select')}
                  className="flex-1 px-4 py-2 text-gray-400 hover:text-white border border-gray-600 rounded-lg hover:border-gray-500"
                >
                  Back
                </button>
                <button
                  onClick={assignWaiver}
                  disabled={assignmentLoading}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {assignmentLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4" />
                      Assign Waiver
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="text-center py-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h4 className="text-xl font-bold text-white mb-2">
                Waiver Assigned Successfully!
              </h4>
              <p className="text-gray-400 mb-4">
                {selectedWaiver?.title} has been assigned to {customer.name}
              </p>
              {sendEmail && (
                <p className="text-sm text-gray-400">
                  ✓ Email reminder sent to {customer.email}
                </p>
              )}
              {sendNotification && (
                <p className="text-sm text-gray-400">
                  ✓ Internal notification created
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}