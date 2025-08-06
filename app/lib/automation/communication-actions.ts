// Enhanced Communication Action Definitions for Gym Automation Platform

import type { ActionDefinition, JsonSchema } from '../types/automation'

// Enhanced Email Action Definition
export const enhancedEmailAction: ActionDefinition = {
  id: 'enhanced_email',
  category: 'communication',
  name: 'Enhanced Email',
  description: 'Send personalized emails with A/B testing, advanced tracking, and delivery optimization',
  icon: 'Mail',
  isPremium: true,
  isActive: true,
  inputSchema: {
    type: 'object',
    properties: {
      to: {
        type: 'string',
        description: 'Recipient email address or variable'
      },
      mode: {
        type: 'string',
        description: 'Email mode: template or custom'
      },
      templateId: {
        type: 'string', 
        description: 'Template ID if using template mode'
      },
      customEmail: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          body: { type: 'string' }
        }
      },
      fromName: {
        type: 'string',
        description: 'Sender name'
      },
      replyToEmail: {
        type: 'string',
        description: 'Reply-to email address'
      },
      abTestConfig: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          variants: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                subject: { type: 'string' },
                body: { type: 'string' },
                weight: { type: 'number' }
              }
            }
          },
          testMetric: { type: 'string' },
          testDuration: { type: 'number' },
          winnerSelection: { type: 'string' }
        }
      },
      deliveryConfig: {
        type: 'object',
        properties: {
          sendTime: { type: 'string' },
          scheduledTime: { type: 'string' },
          timeZoneOptimization: { type: 'boolean' },
          frequencyCapping: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              maxEmailsPerDay: { type: 'number' },
              maxEmailsPerWeek: { type: 'number' }
            }
          },
          suppressionLists: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      },
      trackingConfig: {
        type: 'object',
        properties: {
          openTracking: { type: 'boolean' },
          clickTracking: { type: 'boolean' },
          unsubscribeTracking: { type: 'boolean' },
          conversionTracking: { type: 'boolean' },
          utmParameters: {
            type: 'object',
            properties: {
              campaign: { type: 'string' },
              source: { type: 'string' },
              medium: { type: 'string' },
              term: { type: 'string' },
              content: { type: 'string' }
            }
          },
          customTrackingPixel: { type: 'string' }
        }
      },
      attachments: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            size: { type: 'number' },
            type: { type: 'string' }
          }
        }
      }
    },
    required: ['to']
  },
  outputSchema: {
    type: 'object',
    properties: {
      messageId: { type: 'string' },
      status: { type: 'string' },
      deliveredAt: { type: 'string' },
      trackingInfo: {
        type: 'object',
        properties: {
          opened: { type: 'boolean' },
          openedAt: { type: 'string' },
          clickedLinks: { type: 'array', items: { type: 'string' } },
          bounced: { type: 'boolean' },
          unsubscribed: { type: 'boolean' }
        }
      },
      abTestResults: {
        type: 'object',
        properties: {
          variantId: { type: 'string' },
          isWinner: { type: 'boolean' },
          conversionRate: { type: 'number' }
        }
      }
    }
  },
  configSchema: {
    type: 'object',
    properties: {
      defaultFromName: { type: 'string' },
      defaultReplyTo: { type: 'string' },
      enableAdvancedFeatures: { type: 'boolean', default: true }
    }
  }
}

// Enhanced SMS Action Definition
export const enhancedSMSAction: ActionDefinition = {
  id: 'enhanced_sms',
  category: 'communication',
  name: 'Enhanced SMS',
  description: 'Send SMS with MMS support, delivery tracking, compliance features, and business hours management',
  icon: 'MessageSquare',
  isPremium: true,
  isActive: true,
  inputSchema: {
    type: 'object',
    properties: {
      to: {
        type: 'string',
        description: 'Recipient phone number or variable'
      },
      message: {
        type: 'string',
        description: 'SMS message content'
      },
      senderName: {
        type: 'string',
        description: 'Alphanumeric sender ID (optional)'
      },
      priority: {
        type: 'string',
        description: 'Message priority level'
      },
      mmsConfig: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          mediaUrl: { type: 'string' },
          mediaType: { type: 'string' },
          caption: { type: 'string' },
          filename: { type: 'string' }
        }
      },
      deliveryConfig: {
        type: 'object',
        properties: {
          trackDelivery: { type: 'boolean' },
          trackClicks: { type: 'boolean' },
          deliveryReports: { type: 'boolean' },
          failureNotifications: { type: 'boolean' }
        }
      },
      optOutConfig: {
        type: 'object',
        properties: {
          includeOptOut: { type: 'boolean' },
          customOptOutMessage: { type: 'string' },
          automaticOptOutHandling: { type: 'boolean' },
          suppressionListSync: { type: 'boolean' }
        }
      },
      retryConfig: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          maxRetries: { type: 'number' },
          retryDelay: { type: 'number' },
          retryOnFailureTypes: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      },
      businessHoursConfig: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          timeZone: { type: 'string' },
          workingDays: {
            type: 'array',
            items: { type: 'string' }
          },
          startTime: { type: 'string' },
          endTime: { type: 'string' },
          holidayRespect: { type: 'boolean' }
        }
      },
      complianceConfig: {
        type: 'object',
        properties: {
          region: { type: 'string' },
          consentRequired: { type: 'boolean' },
          optInConfirmation: { type: 'boolean' },
          dataRetention: { type: 'number' },
          gdprCompliant: { type: 'boolean' }
        }
      }
    },
    required: ['to', 'message']
  },
  outputSchema: {
    type: 'object',
    properties: {
      messageId: { type: 'string' },
      status: { type: 'string' },
      deliveredAt: { type: 'string' },
      cost: { type: 'number' },
      smsCount: { type: 'number' },
      deliveryInfo: {
        type: 'object',
        properties: {
          delivered: { type: 'boolean' },
          deliveredAt: { type: 'string' },
          failureReason: { type: 'string' },
          retryAttempts: { type: 'number' }
        }
      },
      trackingInfo: {
        type: 'object',
        properties: {
          clickedLinks: {
            type: 'array',
            items: { type: 'string' }
          },
          optedOut: { type: 'boolean' }
        }
      }
    }
  },
  configSchema: {
    type: 'object',
    properties: {
      defaultSenderName: { type: 'string' },
      enableMMS: { type: 'boolean', default: false },
      enableComplianceFeatures: { type: 'boolean', default: true }
    }
  }
}

// Enhanced WhatsApp Action Definition
export const enhancedWhatsAppAction: ActionDefinition = {
  id: 'enhanced_whatsapp',
  category: 'communication',
  name: 'Enhanced WhatsApp',
  description: 'Send WhatsApp messages with template support, media, interactive elements, and conversation management',
  icon: 'MessageCircle',
  isPremium: true,
  isActive: true,
  inputSchema: {
    type: 'object',
    properties: {
      phoneNumber: {
        type: 'string',
        description: 'Recipient WhatsApp number'
      },
      mode: {
        type: 'string',
        description: 'Message mode: template or freeform'
      },
      templateId: {
        type: 'string',
        description: 'WhatsApp template ID if using template mode'
      },
      message: {
        type: 'string',
        description: 'Message content for freeform messages'
      },
      templateParameters: {
        type: 'object',
        description: 'Parameters for template variables'
      },
      mediaConfig: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          type: { type: 'string' },
          url: { type: 'string' },
          caption: { type: 'string' },
          filename: { type: 'string' }
        }
      },
      interactiveConfig: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          type: { type: 'string' },
          title: { type: 'string' },
          body: { type: 'string' },
          footer: { type: 'string' },
          action: {
            type: 'object',
            properties: {
              buttons: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    type: { type: 'string' },
                    reply: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        title: { type: 'string' }
                      }
                    }
                  }
                }
              },
              sections: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    rows: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          title: { type: 'string' },
                          description: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      conversationConfig: {
        type: 'object',
        properties: {
          trackConversations: { type: 'boolean' },
          autoResponses: { type: 'boolean' },
          conversationTimeout: { type: 'number' },
          handoverToHuman: { type: 'boolean' },
          businessHours: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              timezone: { type: 'string' },
              schedule: {
                type: 'object',
                properties: {
                  monday: {
                    type: 'object',
                    properties: {
                      start: { type: 'string' },
                      end: { type: 'string' }
                    }
                  },
                  tuesday: {
                    type: 'object', 
                    properties: {
                      start: { type: 'string' },
                      end: { type: 'string' }
                    }
                  },
                  wednesday: {
                    type: 'object',
                    properties: {
                      start: { type: 'string' },
                      end: { type: 'string' }
                    }
                  },
                  thursday: {
                    type: 'object',
                    properties: {
                      start: { type: 'string' },
                      end: { type: 'string' }
                    }
                  },
                  friday: {
                    type: 'object',
                    properties: {
                      start: { type: 'string' },
                      end: { type: 'string' }
                    }
                  },
                  saturday: {
                    type: 'object',
                    properties: {
                      start: { type: 'string' },
                      end: { type: 'string' }
                    }
                  },
                  sunday: {
                    type: 'object',
                    properties: {
                      start: { type: 'string' },
                      end: { type: 'string' }
                    }
                  }
                }
              }
            }
          }
        }
      },
      complianceConfig: {
        type: 'object',
        properties: {
          region: { type: 'string' },
          optInRequired: { type: 'boolean' },
          businessVerification: { type: 'boolean' },
          templateRequired: { type: 'boolean' },
          rateLimiting: {
            type: 'object',
            properties: {
              enabled: { type: 'boolean' },
              messagesPerSecond: { type: 'number' },
              messagesPerDay: { type: 'number' }
            }
          }
        }
      }
    },
    required: ['phoneNumber']
  },
  outputSchema: {
    type: 'object',
    properties: {
      messageId: { type: 'string' },
      status: { type: 'string' },
      timestamp: { type: 'string' },
      conversationId: { type: 'string' },
      messageType: { type: 'string' },
      deliveryInfo: {
        type: 'object',
        properties: {
          delivered: { type: 'boolean' },
          deliveredAt: { type: 'string' },
          read: { type: 'boolean' },
          readAt: { type: 'string' },
          failureReason: { type: 'string' }
        }
      },
      interactionInfo: {
        type: 'object',
        properties: {
          buttonClicked: { type: 'string' },
          listItemSelected: { type: 'string' },
          replyReceived: { type: 'string' },
          mediaDownloaded: { type: 'boolean' }
        }
      },
      conversationContext: {
        type: 'object',
        properties: {
          isNewConversation: { type: 'boolean' },
          lastInteraction: { type: 'string' },
          conversationState: { type: 'string' },
          humanHandoverRequested: { type: 'boolean' }
        }
      },
      complianceInfo: {
        type: 'object',
        properties: {
          withinBusinessHours: { type: 'boolean' },
          consentVerified: { type: 'boolean' },
          rateLimitCompliant: { type: 'boolean' },
          templateApproved: { type: 'boolean' }
        }
      }
    }
  },
  configSchema: {
    type: 'object',
    properties: {
      businessAccountId: { type: 'string' },
      phoneNumberId: { type: 'string' },
      enableInteractiveFeatures: { type: 'boolean', default: true },
      enableConversationTracking: { type: 'boolean', default: true }
    }
  }
}

// Collection of all enhanced communication actions
export const enhancedCommunicationActions: ActionDefinition[] = [
  enhancedEmailAction,
  enhancedSMSAction,
  enhancedWhatsAppAction
]

// Helper function to get action definition by ID
export function getEnhancedCommunicationAction(id: string): ActionDefinition | undefined {
  return enhancedCommunicationActions.find(action => action.id === id)
}

// Helper function to get all enhanced communication action IDs
export function getEnhancedCommunicationActionIds(): string[] {
  return enhancedCommunicationActions.map(action => action.id)
}

// Node palette items for the workflow builder
export const enhancedCommunicationNodePaletteItems = [
  {
    type: 'action' as const,
    actionType: 'enhanced_email',
    category: 'Communication',
    name: 'Enhanced Email',
    description: 'Send emails with A/B testing, tracking, and optimization',
    icon: 'Mail',
    defaultConfig: {
      mode: 'custom',
      fromName: 'Atlas Fitness Team',
      trackingConfig: {
        openTracking: true,
        clickTracking: true,
        unsubscribeTracking: true,
        conversionTracking: false,
        utmParameters: {
          source: 'automation',
          medium: 'email'
        }
      },
      deliveryConfig: {
        sendTime: 'immediate',
        timeZoneOptimization: false,
        frequencyCapping: {
          enabled: false,
          maxEmailsPerDay: 3,
          maxEmailsPerWeek: 10
        }
      }
    }
  },
  {
    type: 'action' as const,
    actionType: 'enhanced_sms',
    category: 'Communication',
    name: 'Enhanced SMS',
    description: 'Send SMS with MMS, tracking, and compliance features',
    icon: 'MessageSquare',
    defaultConfig: {
      priority: 'normal',
      deliveryConfig: {
        trackDelivery: true,
        trackClicks: false,
        deliveryReports: true,
        failureNotifications: true
      },
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
  },
  {
    type: 'action' as const,
    actionType: 'enhanced_whatsapp',
    category: 'Communication',
    name: 'Enhanced WhatsApp',
    description: 'Send WhatsApp with templates, media, and interactive elements',
    icon: 'MessageCircle',
    defaultConfig: {
      mode: 'freeform',
      conversationConfig: {
        trackConversations: true,
        autoResponses: false,
        conversationTimeout: 24,
        handoverToHuman: false
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
  }
]