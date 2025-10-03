'use client'

import { useState, useEffect } from 'react'
import { X, Save, Mail, MessageSquare, MessageCircle, Settings, Loader2, ChevronDown, ChevronRight, AlertTriangle } from 'lucide-react'
import type { WorkflowNode } from '@/app/lib/types/automation'

// Import our enhanced communication action configs
import EnhancedEmailActionConfig from './EnhancedEmailActionConfig'
import EnhancedSMSActionConfig from './EnhancedSMSActionConfig' 
import EnhancedWhatsAppActionConfig from './EnhancedWhatsAppActionConfig'

// Import existing configs for backward compatibility
import EmailActionConfig from './EmailActionConfig'
import SMSActionConfig from './SMSActionConfig'
import { default as WhatsAppConfig } from '../actions/WhatsAppConfig'

interface CommunicationActionConfigPanelProps {
  node: WorkflowNode | null
  onClose: () => void
  onSave: (nodeId: string, config: any) => void
  organizationId: string
  isEnhanced?: boolean // Toggle between enhanced and basic configs
}

export default function CommunicationActionConfigPanel({ 
  node, 
  onClose, 
  onSave, 
  organizationId,
  isEnhanced = true 
}: CommunicationActionConfigPanelProps) {
  const [config, setConfig] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isDirty, setIsDirty] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (node?.data.config) {
      setConfig(node.data.config)
      setIsDirty(false)
    } else {
      setConfig({})
    }
    setErrors({})
  }, [node])

  if (!node) return null

  const handleConfigChange = (newConfig: any) => {
    setConfig(newConfig)
    setIsDirty(true)
    
    // Clear any existing errors
    setErrors({})
  }

  const validateConfig = (): boolean => {
    const newErrors: Record<string, string> = {}

    // Basic validation based on action type
    switch (node.data.actionType) {
      case 'enhanced_email':
      case 'send_email':
        if (isEnhanced) {
          // Enhanced email validation
          if (!config.mode) {
            newErrors.mode = 'Email mode is required'
          }
          if (config.mode === 'template' && !config.templateId) {
            newErrors.template = 'Template selection is required'
          }
          if (config.mode === 'custom') {
            if (!config.customEmail?.subject) {
              newErrors.subject = 'Email subject is required'
            }
            if (!config.customEmail?.body) {
              newErrors.body = 'Email body is required'
            }
          }
          if (!config.fromName) {
            newErrors.fromName = 'From name is required'
          }
        } else {
          // Basic email validation
          if (!config.subject) {
            newErrors.subject = 'Email subject is required'
          }
          if (!config.body) {
            newErrors.body = 'Email body is required'
          }
        }
        break

      case 'enhanced_sms':
      case 'send_sms':
        if (isEnhanced) {
          // Enhanced SMS validation
          if (!config.message) {
            newErrors.message = 'SMS message is required'
          }
          if (config.message && config.message.length > 1600) {
            newErrors.message = 'SMS message is too long (max 1600 characters)'
          }
          if (config.mmsConfig?.enabled && !config.mmsConfig.mediaUrl) {
            newErrors.mediaUrl = 'Media URL is required when MMS is enabled'
          }
        } else {
          // Basic SMS validation
          if (!config.message) {
            newErrors.message = 'SMS message is required'
          }
        }
        break

      case 'enhanced_whatsapp':
      case 'send_whatsapp':
        if (isEnhanced) {
          // Enhanced WhatsApp validation
          if (!config.phoneNumber) {
            newErrors.phoneNumber = 'Phone number is required'
          }
          if (!config.message) {
            newErrors.message = 'WhatsApp message is required'
          }
          if (config.mode === 'template' && !config.templateId) {
            newErrors.template = 'Template selection is required'
          }
          if (config.mediaConfig?.enabled && !config.mediaConfig.url) {
            newErrors.mediaUrl = 'Media URL is required when media is enabled'
          }
          if (config.interactiveConfig?.enabled && config.interactiveConfig.type === 'buttons' && (!config.interactiveConfig.action?.buttons || config.interactiveConfig.action.buttons.length === 0)) {
            newErrors.buttons = 'At least one button is required when interactive buttons are enabled'
          }
        } else {
          // Basic WhatsApp validation
          if (!config.to) {
            newErrors.to = 'Phone number is required'
          }
          if (!config.message) {
            newErrors.message = 'WhatsApp message is required'
          }
        }
        break

      default:
        newErrors.actionType = 'Unknown action type'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validateConfig()) {
      return
    }

    setLoading(true)
    try {
      onSave(node.id, config)
      setIsDirty(false)
      onClose()
    } catch (error) {
      console.error('Error saving config:', error)
      setErrors({ general: 'Failed to save configuration. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  const getActionIcon = () => {
    switch (node.data.actionType) {
      case 'enhanced_email':
      case 'send_email':
        return <Mail className="w-6 h-6" />
      case 'enhanced_sms':
      case 'send_sms':
        return <MessageSquare className="w-6 h-6" />
      case 'enhanced_whatsapp':
      case 'send_whatsapp':
        return <MessageCircle className="w-6 h-6" />
      default:
        return <Settings className="w-6 h-6" />
    }
  }

  const getActionTitle = () => {
    switch (node.data.actionType) {
      case 'enhanced_email':
        return 'Enhanced Email Action'
      case 'send_email':
        return 'Email Action'
      case 'enhanced_sms':
        return 'Enhanced SMS Action'
      case 'send_sms':
        return 'SMS Action'
      case 'enhanced_whatsapp':
        return 'Enhanced WhatsApp Action'
      case 'send_whatsapp':
        return 'WhatsApp Action'
      default:
        return 'Communication Action'
    }
  }

  const renderConfigComponent = () => {
    if (!isEnhanced) {
      // Render basic/legacy components
      switch (node.data.actionType) {
        case 'send_email':
          return (
            <EmailActionConfig
              config={config}
              onChange={handleConfigChange}
              organizationId={organizationId}
            />
          )
        case 'send_sms':
          return (
            <SMSActionConfig
              config={config}
              onChange={handleConfigChange}
              organizationId={organizationId}
            />
          )
        case 'send_whatsapp':
          return (
            <WhatsAppConfig
              config={config}
              onChange={handleConfigChange}
              availableVariables={['first_name', 'last_name', 'organization_name', 'phone', 'email']}
            />
          )
        default:
          return (
            <div className="text-center py-8 text-gray-500">
              <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>Configuration for this action type is not available.</p>
            </div>
          )
      }
    }

    // Render enhanced components
    switch (node.data.actionType) {
      case 'enhanced_email':
      case 'send_email':
        return (
          <EnhancedEmailActionConfig
            config={config}
            onChange={handleConfigChange}
            organizationId={organizationId}
          />
        )
      case 'enhanced_sms':
      case 'send_sms':
        return (
          <EnhancedSMSActionConfig
            config={config}
            onChange={handleConfigChange}
            organizationId={organizationId}
          />
        )
      case 'enhanced_whatsapp':
      case 'send_whatsapp':
        return (
          <EnhancedWhatsAppActionConfig
            config={config}
            onChange={handleConfigChange}
            organizationId={organizationId}
          />
        )
      default:
        return (
          <div className="text-center py-8 text-gray-500">
            <Settings className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>Enhanced configuration for this action type is not available.</p>
            <p className="text-sm mt-2">Contact support to add enhanced configuration for this action.</p>
          </div>
        )
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50 rounded-t-xl">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-white rounded-lg shadow-sm">
              {getActionIcon()}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                {getActionTitle()}
              </h2>
              <p className="text-sm text-gray-600">
                Configure {node.data.label} settings and behavior
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* Enhanced Mode Toggle */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Enhanced</span>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  isEnhanced ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isEnhanced ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {isDirty && (
              <span className="text-sm text-orange-600 font-medium">
                Unsaved changes
              </span>
            )}

            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Error Messages */}
        {Object.keys(errors).length > 0 && (
          <div className="p-4 bg-red-50 border-l-4 border-red-400">
            <div className="flex">
              <AlertTriangle className="w-5 h-5 text-red-400 mr-2" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  Configuration Errors
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <ul className="list-disc list-inside space-y-1">
                    {Object.entries(errors).map(([field, error]) => (
                      <li key={field}>{error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Configuration Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {renderConfigComponent()}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl">
          <div className="flex items-center space-x-4">
            {Object.keys(errors).length > 0 && (
              <span className="flex items-center text-sm text-red-600">
                <AlertTriangle className="w-4 h-4 mr-1" />
                {Object.keys(errors).length} validation error(s)
              </span>
            )}
            
            {isEnhanced && (
              <span className="flex items-center text-sm text-blue-600">
                <MessageSquare className="w-4 h-4 mr-1" />
                Enhanced features enabled
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            
            <button
              onClick={handleSave}
              disabled={loading || !isDirty}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}