/**
 * Configuration and Thresholds for Meta Ads Automation
 * Configurable settings for alerts, thresholds, and system behavior
 */

module.exports = {
  // Alert thresholds for different metrics
  thresholds: {
    costPerLead: {
      warning: 25,    // £25 warning threshold
      critical: 40    // £40 critical threshold
    },
    dailySpend: {
      warning: 100,   // £100 warning threshold
      critical: 200   // £200 critical threshold
    },
    ctr: {
      warning: 0.8,   // 0.8% CTR warning threshold
      critical: 0.5   // 0.5% CTR critical threshold
    },
    // Minimum spend before analyzing performance
    minimumSpend: 20,
    // Days to look back for trend analysis
    trendDays: 7
  },

  // Time periods for data analysis
  timePeriods: {
    yesterday: 'yesterday',
    last3Days: 'last_3d',
    last5Days: 'last_5d',
    last7Days: 'last_7d',
    last14Days: 'last_14d',
    last30Days: 'last_30d'
  },

  // Workflow schedules
  schedules: {
    dailyAnalysis: {
      hour: 9,        // 9 AM daily analysis
      minute: 0,
      timezone: 'Europe/London'
    },
    realTimeAlerts: {
      intervalHours: 2  // Every 2 hours for real-time alerts
    }
  },

  // Email configuration
  email: {
    smtp: {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
      }
    },
    templates: {
      dailyReport: {
        from: process.env.EMAIL_FROM || 'alerts@meta-ads-automation.com',
        to: process.env.EMAIL_TO || 'sam@atlas-gyms.co.uk',
        cc: process.env.EMAIL_CC || '', // Additional recipients
        replyTo: process.env.EMAIL_REPLY_TO || 'no-reply@meta-ads-automation.com'
      },
      alerts: {
        from: process.env.EMAIL_FROM || 'alerts@meta-ads-automation.com',
        to: process.env.EMAIL_TO || 'sam@atlas-gyms.co.uk',
        cc: process.env.EMAIL_CC || '',
        replyTo: process.env.EMAIL_REPLY_TO || 'no-reply@meta-ads-automation.com'
      }
    }
  },

  // Telegram configuration
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    chatId: process.env.TELEGRAM_CHAT_ID,
    parseMode: 'Markdown',
    disableWebPagePreview: true,
    // Message length limits
    maxMessageLength: 4096,
    // Retry configuration
    retryAttempts: 3,
    retryDelay: 1000
  },

  // OpenAI configuration
  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: 'gpt-4',
    maxTokens: 2000,
    temperature: 0.7,
    // Fallback behavior when AI fails
    fallbackEnabled: true,
    // Timeout for AI requests (ms)
    timeout: 30000
  },

  // Meta MCP configuration
  metaMcp: {
    // Default account limit for fetching
    accountLimit: 25,
    // Retry configuration for failed requests
    retryAttempts: 3,
    retryDelay: 2000,
    // Timeout for MCP requests (ms)
    timeout: 15000
  },

  // Performance calculation settings
  performance: {
    // Minimum impressions before calculating CTR
    minImpressions: 100,
    // Minimum spend before flagging as issue
    minSpendForAlert: 20,
    // Percentage threshold for "significant" changes
    significantChangeThreshold: 10,
    // Days to wait before flagging new campaigns
    newCampaignGracePeriod: 2
  },

  // Health score calculation weights
  healthScore: {
    weights: {
      good: 100,
      warning: 60,
      critical: 20
    },
    // Minimum campaigns needed for reliable health score
    minCampaignsForScore: 1
  },

  // Report configuration
  reports: {
    // Number of top/bottom performers to highlight
    topPerformersCount: 3,
    bottomPerformersCount: 3,
    // Maximum number of recommendations to include
    maxRecommendations: 8,
    // Maximum number of priority actions to include
    maxPriorityActions: 5,
    // Include trends in reports
    includeTrends: true,
    // Include AI analysis
    includeAIAnalysis: true
  },

  // Alert configuration
  alerts: {
    // Minimum time between alerts for same campaign (minutes)
    alertCooldown: 30,
    // Maximum number of alerts per hour
    maxAlertsPerHour: 10,
    // Escalation thresholds
    escalation: {
      // Escalate if CPL exceeds this multiplier of the critical threshold
      cplMultiplier: 2,
      // Escalate if spend exceeds this amount with no leads
      spendNoLeads: 500,
      // Escalate if multiple campaigns in same account have issues
      multipleAccountIssues: 3
    }
  },

  // System configuration
  system: {
    // Enable/disable features
    features: {
      dailyReports: true,
      realTimeAlerts: true,
      aiAnalysis: true,
      telegramNotifications: true,
      emailNotifications: true,
      historicalTracking: true
    },
    // Error handling
    errorHandling: {
      maxRetries: 3,
      retryDelay: 1000,
      // Continue on errors vs fail fast
      continueOnError: true,
      // Log level
      logLevel: 'info'
    },
    // Performance settings
    performance: {
      // Parallel processing limits
      maxConcurrentRequests: 5,
      // Timeout for individual operations
      operationTimeout: 30000,
      // Enable caching
      caching: true,
      // Cache duration (ms)
      cacheDuration: 300000 // 5 minutes
    }
  },

  // Data storage configuration
  storage: {
    // Enable historical data storage
    enabled: true,
    // Storage type (local, database, etc.)
    type: 'local',
    // Retention period for historical data (days)
    retentionDays: 90,
    // Backup settings
    backup: {
      enabled: true,
      frequency: 'daily',
      location: './backups'
    }
  },

  // Notification preferences
  notifications: {
    // When to send notifications
    conditions: {
      // Always send daily reports
      dailyReport: true,
      // Send alerts for critical issues
      criticalIssues: true,
      // Send alerts for warning issues
      warningIssues: true,
      // Send success notifications
      successNotifications: false,
      // Send summary at end of day
      endOfDaySummary: true
    },
    // Notification channels
    channels: {
      email: {
        enabled: true,
        priority: ['critical', 'warning', 'info']
      },
      telegram: {
        enabled: true,
        priority: ['critical', 'warning']
      },
      slack: {
        enabled: false,
        webhook: process.env.SLACK_WEBHOOK,
        channel: '#meta-ads-alerts'
      }
    }
  },

  // Business rules specific to gym marketing
  businessRules: {
    // Industry-specific thresholds
    gymIndustry: {
      // Typical CPL ranges for gym leads
      expectedCPL: {
        excellent: 15,
        good: 25,
        acceptable: 35,
        poor: 50
      },
      // Typical CTR ranges for gym ads
      expectedCTR: {
        excellent: 2.0,
        good: 1.5,
        acceptable: 1.0,
        poor: 0.5
      },
      // Seasonal adjustments
      seasonalMultipliers: {
        january: 1.5,    // New Year boost
        february: 1.3,
        march: 1.1,
        april: 0.9,
        may: 0.8,
        june: 0.7,
        july: 0.6,
        august: 0.7,
        september: 1.2,   // Back to school
        october: 1.0,
        november: 0.9,
        december: 0.8
      }
    },
    // Campaign type specific rules
    campaignTypes: {
      leadGeneration: {
        primaryMetric: 'costPerLead',
        secondaryMetrics: ['ctr', 'impressions', 'clicks']
      },
      awareness: {
        primaryMetric: 'ctr',
        secondaryMetrics: ['impressions', 'reach']
      }
    }
  },

  // Development and testing settings
  development: {
    // Enable debug logging
    debug: process.env.NODE_ENV === 'development',
    // Test mode (doesn't send actual notifications)
    testMode: process.env.TEST_MODE === 'true',
    // Mock data for testing
    mockData: process.env.USE_MOCK_DATA === 'true',
    // Verbose logging
    verbose: process.env.VERBOSE === 'true'
  }
};