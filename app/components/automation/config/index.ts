// Enhanced Communication Action Configuration Components
export { default as EnhancedEmailActionConfig } from './EnhancedEmailActionConfig'
export { default as EnhancedSMSActionConfig } from './EnhancedSMSActionConfig'
export { default as EnhancedWhatsAppActionConfig } from './EnhancedWhatsAppActionConfig'

// Unified Configuration Panels
export { default as CommunicationActionConfigPanel } from './CommunicationActionConfigPanel'
export { default as UnifiedNodeConfigPanel } from './UnifiedNodeConfigPanel'

// Legacy/Basic Configuration Components (for backward compatibility)
export { default as EmailActionConfig } from './EmailActionConfig'
export { default as SMSActionConfig } from './SMSActionConfig'

// Trigger Configuration Components
export { default as LeadTriggerConfig } from './LeadTriggerConfig'
export { default as BirthdayTriggerConfig } from './BirthdayTriggerConfig'
export { default as ContactTagTriggerConfig } from './ContactTagTriggerConfig'
export { default as WebhookTriggerConfig } from './WebhookTriggerConfig'
export { default as AppointmentTriggerConfig } from './AppointmentTriggerConfig'
export { default as ContactChangedTriggerConfig } from './ContactChangedTriggerConfig'
export { default as CustomDateTriggerConfig } from './CustomDateTriggerConfig'
export { default as CallStatusTriggerConfig } from './CallStatusTriggerConfig'
export { default as CallBookingTriggerConfig } from './CallBookingTriggerConfig'
export { default as EmailEventTriggerConfig } from './EmailEventTriggerConfig'
export { default as OpportunityCreatedTriggerConfig } from './OpportunityCreatedTriggerConfig'
export { default as OpportunityStageChangedTriggerConfig } from './OpportunityStageChangedTriggerConfig'
export { default as TaskAddedTriggerConfig } from './TaskAddedTriggerConfig'
export { default as TaskReminderTriggerConfig } from './TaskReminderTriggerConfig'
export { default as NoteAddedTriggerConfig } from './NoteAddedTriggerConfig'
export { default as FormSubmittedTriggerConfig } from './FormSubmittedTriggerConfig'
export { default as SurveySubmittedTriggerConfig } from './SurveySubmittedTriggerConfig'
export { default as CustomerRepliedTriggerConfig } from './CustomerRepliedTriggerConfig'

// Other Action Configuration Components
export { default as WaitActionConfig } from './WaitActionConfig'

// Advanced Configuration Components
export { DeepNodeConfigPanel } from './DeepNodeConfigPanel'
export { ConditionBuilder } from './ConditionBuilder'

// Re-export action definitions and helper functions
export {
  enhancedCommunicationActions,
  enhancedEmailAction,
  enhancedSMSAction,
  enhancedWhatsAppAction,
  getEnhancedCommunicationAction,
  getEnhancedCommunicationActionIds,
  enhancedCommunicationNodePaletteItems
} from '@/app/lib/automation/communication-actions'

// Type definitions for enhanced communication actions
export interface EnhancedCommunicationActionConfig {
  // Email specific config
  mode?: 'template' | 'custom'
  templateId?: string
  customEmail?: {
    subject: string
    body: string
  }
  fromName?: string
  replyToEmail?: string
  abTestConfig?: {
    enabled: boolean
    variants: Array<{
      id: string
      name: string
      subject: string
      body: string
      weight: number
    }>
    testMetric: 'open_rate' | 'click_rate' | 'conversion_rate'
    testDuration: number
    winnerSelection: 'automatic' | 'manual'
  }
  deliveryConfig?: {
    sendTime: 'immediate' | 'optimal' | 'scheduled'
    scheduledTime?: string
    timeZoneOptimization: boolean
    frequencyCapping: {
      enabled: boolean
      maxEmailsPerDay: number
      maxEmailsPerWeek: number
    }
    suppressionLists: string[]
  }
  trackingConfig?: {
    openTracking: boolean
    clickTracking: boolean
    unsubscribeTracking: boolean
    conversionTracking: boolean
    utmParameters: {
      campaign: string
      source: string
      medium: string
      term?: string
      content?: string
    }
    customTrackingPixel?: string
  }

  // SMS specific config
  message?: string
  senderName?: string
  priority?: 'low' | 'normal' | 'high'
  mmsConfig?: {
    enabled: boolean
    mediaUrl?: string
    mediaType?: 'image' | 'video' | 'document'
    caption?: string
    filename?: string
  }
  optOutConfig?: {
    includeOptOut: boolean
    customOptOutMessage?: string
    automaticOptOutHandling: boolean
    suppressionListSync: boolean
  }
  retryConfig?: {
    enabled: boolean
    maxRetries: number
    retryDelay: number
    retryOnFailureTypes: string[]
  }
  businessHoursConfig?: {
    enabled: boolean
    timeZone: string
    workingDays: string[]
    startTime: string
    endTime: string
    holidayRespect: boolean
  }

  // WhatsApp specific config
  phoneNumber?: string
  templateParameters?: Record<string, any>
  mediaConfig?: {
    enabled: boolean
    type?: 'image' | 'video' | 'document'
    url?: string
    caption?: string
    filename?: string
  }
  interactiveConfig?: {
    enabled: boolean
    type?: 'list' | 'buttons' | 'flow'
    title?: string
    body?: string
    footer?: string
    action?: {
      buttons?: Array<{
        type: 'reply'
        reply: {
          id: string
          title: string
        }
      }>
      sections?: Array<{
        title: string
        rows: Array<{
          id: string
          title: string
          description?: string
        }>
      }>
    }
  }
  conversationConfig?: {
    trackConversations: boolean
    autoResponses: boolean
    conversationTimeout: number
    handoverToHuman: boolean
    businessHours: {
      enabled: boolean
      timezone: string
      schedule: Record<string, { start: string; end: string }>
    }
  }

  // Common compliance config
  complianceConfig?: {
    region: string
    consentRequired?: boolean
    optInRequired?: boolean
    businessVerification?: boolean
    templateRequired?: boolean
    dataRetention?: number
    gdprCompliant?: boolean
    rateLimiting?: {
      enabled: boolean
      messagesPerSecond: number
      messagesPerDay: number
    }
  }

  // Common fields
  attachments?: Array<{
    name: string
    size: number
    type: string
  }>
}

// Configuration panel props interface
export interface ConfigPanelProps {
  config: any
  onChange: (config: any) => void
  organizationId: string
}

// Node configuration result interface
export interface NodeConfigResult {
  success: boolean
  config?: any
  errors?: Record<string, string>
  warnings?: string[]
}

// Helper functions for configuration management
export const configHelpers = {
  /**
   * Validate enhanced email configuration
   */
  validateEmailConfig: (config: EnhancedCommunicationActionConfig): NodeConfigResult => {
    const errors: Record<string, string> = {}

    if (!config.mode) {
      errors.mode = 'Email mode is required'
    }

    if (config.mode === 'template' && !config.templateId) {
      errors.templateId = 'Template selection is required'
    }

    if (config.mode === 'custom') {
      if (!config.customEmail?.subject) {
        errors.subject = 'Email subject is required'
      }
      if (!config.customEmail?.body) {
        errors.body = 'Email body is required'
      }
    }

    if (!config.fromName) {
      errors.fromName = 'From name is required'
    }

    return {
      success: Object.keys(errors).length === 0,
      config,
      errors
    }
  },

  /**
   * Validate enhanced SMS configuration
   */
  validateSMSConfig: (config: EnhancedCommunicationActionConfig): NodeConfigResult => {
    const errors: Record<string, string> = {}
    const warnings: string[] = []

    if (!config.message) {
      errors.message = 'SMS message is required'
    }

    if (config.message && config.message.length > 1600) {
      errors.message = 'SMS message is too long (max 1600 characters)'
    }

    if (config.message && config.message.length > 160) {
      warnings.push('Message will be split into multiple SMS parts')
    }

    if (config.mmsConfig?.enabled && !config.mmsConfig.mediaUrl) {
      errors.mediaUrl = 'Media URL is required when MMS is enabled'
    }

    return {
      success: Object.keys(errors).length === 0,
      config,
      errors,
      warnings
    }
  },

  /**
   * Validate enhanced WhatsApp configuration
   */
  validateWhatsAppConfig: (config: EnhancedCommunicationActionConfig): NodeConfigResult => {
    const errors: Record<string, string> = {}
    const warnings: string[] = []

    if (!config.phoneNumber) {
      errors.phoneNumber = 'Phone number is required'
    }

    if (!config.message && config.mode !== 'template') {
      errors.message = 'WhatsApp message is required for freeform messages'
    }

    if (config.mode === 'template' && !config.templateId) {
      errors.templateId = 'Template selection is required'
    }

    if (config.mode === 'freeform') {
      warnings.push('Freeform messages can only be sent within 24 hours of customer contact')
    }

    if (config.mediaConfig?.enabled && !config.mediaConfig.url) {
      errors.mediaUrl = 'Media URL is required when media is enabled'
    }

    if (config.interactiveConfig?.enabled && config.interactiveConfig.type === 'buttons') {
      if (!config.interactiveConfig.action?.buttons || config.interactiveConfig.action.buttons.length === 0) {
        errors.buttons = 'At least one button is required when interactive buttons are enabled'
      }
    }

    return {
      success: Object.keys(errors).length === 0,
      config,
      errors,
      warnings
    }
  },

  /**
   * Get default configuration for an action type
   */
  getDefaultConfig: (actionType: string): EnhancedCommunicationActionConfig => {
    switch (actionType) {
      case 'enhanced_email':
        return {
          mode: 'custom',
          fromName: 'Atlas Fitness Team',
          trackingConfig: {
            openTracking: true,
            clickTracking: true,
            unsubscribeTracking: true,
            conversionTracking: false,
            utmParameters: {
              source: 'automation',
              medium: 'email',
              campaign: ''
            }
          },
          deliveryConfig: {
            sendTime: 'immediate',
            timeZoneOptimization: false,
            frequencyCapping: {
              enabled: false,
              maxEmailsPerDay: 3,
              maxEmailsPerWeek: 10
            },
            suppressionLists: []
          }
        }

      case 'enhanced_sms':
        return {
          priority: 'normal',
          optOutConfig: {
            includeOptOut: true,
            automaticOptOutHandling: true,
            suppressionListSync: true
          },
          retryConfig: {
            enabled: true,
            maxRetries: 3,
            retryDelay: 5,
            retryOnFailureTypes: ['network_error', 'rate_limit', 'temporary_failure']
          },
          complianceConfig: {
            region: 'UK',
            consentRequired: true,
            gdprCompliant: true
          }
        }

      case 'enhanced_whatsapp':
        return {
          mode: 'freeform',
          conversationConfig: {
            trackConversations: true,
            autoResponses: false,
            conversationTimeout: 24,
            handoverToHuman: false,
            businessHours: {
              enabled: false,
              timezone: 'Europe/London',
              schedule: {}
            }
          },
          complianceConfig: {
            region: 'global',
            optInRequired: true,
            businessVerification: false,
            templateRequired: false,
            rateLimiting: {
              enabled: true,
              messagesPerSecond: 1,
              messagesPerDay: 1000
            }
          }
        }

      default:
        return {}
    }
  }
}