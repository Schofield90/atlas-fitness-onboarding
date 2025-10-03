'use client'

import { useState } from 'react'
import { Phone, MessageSquare, Mic, MessageCircle, Crown, Settings, Trash2, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react'

interface PhoneNumber {
  id: string
  phone_number: string
  country_code: string
  number_type: string
  status: string
  is_primary: boolean
  capabilities: {
    sms: boolean
    voice: boolean
    whatsapp: boolean
  }
  monthly_cost_pence: number
}

interface PhoneNumberStatusProps {
  phoneNumber: PhoneNumber
  onUpdate?: () => void
}

export default function PhoneNumberStatus({ phoneNumber, onUpdate }: PhoneNumberStatusProps) {
  const [showActions, setShowActions] = useState(false)
  const [loading, setLoading] = useState(false)

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-400" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-400" />
      case 'suspended':
        return <AlertCircle className="h-4 w-4 text-orange-400" />
      case 'cancelled':
        return <XCircle className="h-4 w-4 text-red-400" />
      default:
        return <Clock className="h-4 w-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-900 text-green-300 border-green-700'
      case 'pending':
        return 'bg-yellow-900 text-yellow-300 border-yellow-700'
      case 'suspended':
        return 'bg-orange-900 text-orange-300 border-orange-700'
      case 'cancelled':
        return 'bg-red-900 text-red-300 border-red-700'
      default:
        return 'bg-gray-700 text-gray-300 border-gray-600'
    }
  }

  const getNumberTypeDisplay = (type: string) => {
    switch (type) {
      case 'uk_local':
        return 'UK Local'
      case 'uk_mobile':
        return 'UK Mobile'
      case 'international':
        return 'International'
      case 'alphanumeric':
        return 'Alphanumeric'
      default:
        return type
    }
  }

  const formatPhoneNumber = (number: string) => {
    if (number.startsWith('+44')) {
      // UK number formatting
      const cleaned = number.replace('+44', '0')
      return cleaned.replace(/(\d{4})(\d{3})(\d{4})/, '$1 $2 $3')
    }
    return number
  }

  const formatCurrency = (pence: number) => {
    return `£${(pence / 100).toFixed(2)}`
  }

  const handleSetPrimary = async () => {
    if (phoneNumber.is_primary) return
    
    setLoading(true)
    try {
      const response = await fetch('/api/sms/numbers/set-primary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumberId: phoneNumber.id })
      })

      if (response.ok) {
        onUpdate?.()
      } else {
        throw new Error('Failed to set as primary')
      }
    } catch (error) {
      console.error('Error setting primary number:', error)
      alert('Failed to set as primary number')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleCapability = async (capability: 'sms' | 'voice' | 'whatsapp') => {
    setLoading(true)
    try {
      const newCapabilities = {
        ...phoneNumber.capabilities,
        [capability]: !phoneNumber.capabilities[capability]
      }

      const response = await fetch('/api/sms/numbers/update-capabilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          phoneNumberId: phoneNumber.id,
          capabilities: newCapabilities
        })
      })

      if (response.ok) {
        onUpdate?.()
      } else {
        throw new Error('Failed to update capabilities')
      }
    } catch (error) {
      console.error('Error updating capabilities:', error)
      alert('Failed to update number capabilities')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelNumber = async () => {
    if (!confirm('Are you sure you want to cancel this phone number? This action cannot be undone and you will lose the number permanently.')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/sms/numbers/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumberId: phoneNumber.id })
      })

      if (response.ok) {
        onUpdate?.()
      } else {
        throw new Error('Failed to cancel number')
      }
    } catch (error) {
      console.error('Error cancelling number:', error)
      alert('Failed to cancel phone number')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Number and Status */}
          <div className="flex items-center space-x-3 mb-3">
            <div className="flex items-center space-x-2">
              <Phone className="h-5 w-5 text-blue-400" />
              <span className="text-lg font-mono text-white">
                {formatPhoneNumber(phoneNumber.phone_number)}
              </span>
              {phoneNumber.is_primary && (
                <div className="flex items-center space-x-1 px-2 py-1 bg-yellow-900 text-yellow-300 rounded text-xs">
                  <Crown className="h-3 w-3" />
                  <span>Primary</span>
                </div>
              )}
            </div>
            
            <div className={`flex items-center space-x-1 px-2 py-1 rounded text-xs border ${getStatusColor(phoneNumber.status)}`}>
              {getStatusIcon(phoneNumber.status)}
              <span className="capitalize">{phoneNumber.status}</span>
            </div>
          </div>

          {/* Number Type and Country */}
          <div className="flex items-center space-x-4 mb-3 text-sm text-gray-400">
            <span>{getNumberTypeDisplay(phoneNumber.number_type)}</span>
            <span>•</span>
            <span>{phoneNumber.country_code}</span>
            <span>•</span>
            <span>{formatCurrency(phoneNumber.monthly_cost_pence)}/month</span>
          </div>

          {/* Capabilities */}
          <div className="flex items-center space-x-3">
            <div className="text-sm text-gray-400">Capabilities:</div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleToggleCapability('sms')}
                disabled={loading || phoneNumber.status !== 'active'}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${
                  phoneNumber.capabilities.sms
                    ? 'bg-green-900 text-green-300 border border-green-700'
                    : 'bg-gray-700 text-gray-400 border border-gray-600'
                } ${phoneNumber.status === 'active' ? 'hover:opacity-80 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
              >
                <MessageSquare className="h-3 w-3" />
                <span>SMS</span>
              </button>

              <button
                onClick={() => handleToggleCapability('voice')}
                disabled={loading || phoneNumber.status !== 'active'}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${
                  phoneNumber.capabilities.voice
                    ? 'bg-blue-900 text-blue-300 border border-blue-700'
                    : 'bg-gray-700 text-gray-400 border border-gray-600'
                } ${phoneNumber.status === 'active' ? 'hover:opacity-80 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
              >
                <Mic className="h-3 w-3" />
                <span>Voice</span>
              </button>

              <button
                onClick={() => handleToggleCapability('whatsapp')}
                disabled={loading || phoneNumber.status !== 'active'}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-xs transition-colors ${
                  phoneNumber.capabilities.whatsapp
                    ? 'bg-green-900 text-green-300 border border-green-700'
                    : 'bg-gray-700 text-gray-400 border border-gray-600'
                } ${phoneNumber.status === 'active' ? 'hover:opacity-80 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
              >
                <MessageCircle className="h-3 w-3" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="relative">
          <button
            onClick={() => setShowActions(!showActions)}
            disabled={loading}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
          >
            <Settings className="h-4 w-4" />
          </button>

          {showActions && (
            <div className="absolute right-0 mt-2 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10">
              <div className="py-1">
                {!phoneNumber.is_primary && phoneNumber.status === 'active' && (
                  <button
                    onClick={handleSetPrimary}
                    disabled={loading}
                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                  >
                    Set as Primary
                  </button>
                )}
                
                <button
                  onClick={() => {
                    setShowActions(false)
                    // Navigate to number settings
                    window.location.href = `/settings/sms/numbers/${phoneNumber.id}`
                  }}
                  className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
                >
                  Configure
                </button>

                <hr className="my-1 border-gray-700" />

                <button
                  onClick={handleCancelNumber}
                  disabled={loading || phoneNumber.is_primary}
                  className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center space-x-2">
                    <Trash2 className="h-3 w-3" />
                    <span>Cancel Number</span>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Status-specific information */}
      {phoneNumber.status === 'pending' && (
        <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-700 rounded">
          <p className="text-sm text-yellow-300">
            This number is being provisioned. This usually takes 1-2 business days.
          </p>
        </div>
      )}

      {phoneNumber.status === 'suspended' && (
        <div className="mt-3 p-3 bg-orange-900/20 border border-orange-700 rounded">
          <p className="text-sm text-orange-300">
            This number has been suspended. Contact support to resolve any issues.
          </p>
        </div>
      )}

      {phoneNumber.status === 'cancelled' && (
        <div className="mt-3 p-3 bg-red-900/20 border border-red-700 rounded">
          <p className="text-sm text-red-300">
            This number has been cancelled and is no longer available for use.
          </p>
        </div>
      )}

      {loading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  )
}