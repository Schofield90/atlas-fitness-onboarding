import { createClient } from '@/app/lib/supabase/client'

interface MonitoringConfig {
  healthCheckInterval: number // milliseconds
  alertCheckInterval: number // milliseconds
  enabledIntegrations: string[]
  alertWebhookUrl?: string
  emailAlerts: boolean
}

interface IntegrationMetrics {
  integration: string
  timestamp: Date
  errorRate: number
  successRate: number
  responseTime: number
  quota: {
    used: number
    limit: number
    percentage: number
  }
  rateLimit: {
    current: number
    limit: number
    percentage: number
  }
  status: 'healthy' | 'degraded' | 'error' | 'disconnected'
}

export class IntegrationMonitor {
  private config: MonitoringConfig
  private healthCheckTimer?: NodeJS.Timeout
  private alertCheckTimer?: NodeJS.Timeout
  private isRunning = false

  constructor(config: MonitoringConfig) {
    this.config = config
  }

  start(): void {
    if (this.isRunning) {
      console.log('Integration monitor is already running')
      return
    }

    this.isRunning = true
    console.log('Starting integration monitoring service...')

    // Start health checks
    this.healthCheckTimer = setInterval(
      () => this.runHealthChecks(),
      this.config.healthCheckInterval
    )

    // Start alert checks
    this.alertCheckTimer = setInterval(
      () => this.checkAlertConditions(),
      this.config.alertCheckInterval
    )

    // Run initial checks
    this.runHealthChecks()
    this.checkAlertConditions()
  }

  stop(): void {
    if (!this.isRunning) {
      return
    }

    console.log('Stopping integration monitoring service...')
    this.isRunning = false

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer)
    }

    if (this.alertCheckTimer) {
      clearInterval(this.alertCheckTimer)
    }
  }

  private async runHealthChecks(): Promise<void> {
    try {
      console.log('Running scheduled health checks...')
      
      for (const integration of this.config.enabledIntegrations) {
        await this.performHealthCheck(integration)
      }

    } catch (error) {
      console.error('Health check cycle failed:', error)
    }
  }

  private async performHealthCheck(integrationId: string): Promise<void> {
    try {
      const response = await fetch('/api/saas-admin/integrations/health-check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ integrationId })
      })

      if (!response.ok) {
        throw new Error(`Health check API failed: ${response.statusText}`)
      }

      const result = await response.json()
      
      // Store metrics for trend analysis
      await this.storeMetrics({
        integration: integrationId,
        timestamp: new Date(),
        errorRate: 100 - result.metrics.errorRate,
        successRate: result.metrics.errorRate === 0 ? 100 : 0,
        responseTime: result.metrics.responseTime,
        quota: {
          used: 0, // Would be populated from actual health check
          limit: 1000,
          percentage: 0
        },
        rateLimit: {
          current: 0,
          limit: 100,
          percentage: 0
        },
        status: result.status
      })

    } catch (error) {
      console.error(`Health check failed for ${integrationId}:`, error)
      
      // Store error metrics
      await this.storeMetrics({
        integration: integrationId,
        timestamp: new Date(),
        errorRate: 100,
        successRate: 0,
        responseTime: 0,
        quota: { used: 0, limit: 1000, percentage: 0 },
        rateLimit: { current: 0, limit: 100, percentage: 0 },
        status: 'error'
      })
    }
  }

  private async storeMetrics(metrics: IntegrationMetrics): Promise<void> {
    try {
      const supabase = createClient()
      
      await supabase
        .from('integration_metrics')
        .insert({
          integration: metrics.integration,
          timestamp: metrics.timestamp.toISOString(),
          error_rate: metrics.errorRate,
          success_rate: metrics.successRate,
          response_time: metrics.responseTime,
          quota_used: metrics.quota.used,
          quota_limit: metrics.quota.limit,
          quota_percentage: metrics.quota.percentage,
          rate_limit_current: metrics.rateLimit.current,
          rate_limit_max: metrics.rateLimit.limit,
          rate_limit_percentage: metrics.rateLimit.percentage,
          status: metrics.status
        })

    } catch (error) {
      console.error('Failed to store metrics:', error)
    }
  }

  private async checkAlertConditions(): Promise<void> {
    try {
      console.log('Checking alert conditions...')
      
      const supabase = createClient()
      
      // Get active alert rules
      const { data: rules, error } = await supabase
        .from('integration_alert_rules')
        .select('*')
        .eq('enabled', true)

      if (error) {
        throw error
      }

      for (const rule of rules || []) {
        await this.evaluateAlertRule(rule)
      }

    } catch (error) {
      console.error('Alert condition check failed:', error)
    }
  }

  private async evaluateAlertRule(rule: any): Promise<void> {
    try {
      const supabase = createClient()
      
      // Get recent metrics for the integration
      const timeWindow = this.getTimeWindowMinutes(rule.condition.timeWindow)
      const since = new Date(Date.now() - timeWindow * 60 * 1000)

      const { data: metrics, error } = await supabase
        .from('integration_metrics')
        .select('*')
        .eq('integration', rule.integration)
        .gte('timestamp', since.toISOString())
        .order('timestamp', { ascending: false })

      if (error) throw error

      if (!metrics || metrics.length === 0) {
        console.log(`No metrics found for ${rule.integration} in the last ${rule.condition.timeWindow}`)
        return
      }

      // Calculate current value based on condition type
      let currentValue = 0
      
      switch (rule.condition.type) {
        case 'error_rate':
          currentValue = metrics.reduce((sum, m) => sum + m.error_rate, 0) / metrics.length
          break
        case 'success_rate':
          currentValue = metrics.reduce((sum, m) => sum + m.success_rate, 0) / metrics.length
          break
        case 'quota_usage':
          currentValue = metrics[0]?.quota_percentage || 0
          break
        case 'webhook_failures':
          // Would need separate webhook failure metrics
          currentValue = 0
          break
        case 'token_expiry':
          // Would check token expiry status
          currentValue = 0
          break
      }

      // Check if condition is met
      const conditionMet = this.evaluateCondition(
        currentValue,
        rule.condition.threshold,
        rule.condition.comparison
      )

      if (conditionMet) {
        await this.triggerAlert(rule, currentValue, metrics[0])
      }

    } catch (error) {
      console.error(`Failed to evaluate alert rule ${rule.id}:`, error)
    }
  }

  private evaluateCondition(value: number, threshold: number, comparison: string): boolean {
    switch (comparison) {
      case 'greater_than':
        return value > threshold
      case 'less_than':
        return value < threshold
      case 'equals':
        return Math.abs(value - threshold) < 0.1 // Allow small float differences
      default:
        return false
    }
  }

  private async triggerAlert(rule: any, currentValue: number, latestMetrics: any): Promise<void> {
    try {
      const supabase = createClient()
      
      // Check if we recently triggered this same alert (avoid spam)
      const recentTrigger = await supabase
        .from('integration_alert_triggers')
        .select('*')
        .eq('rule_id', rule.id)
        .gte('triggered_at', new Date(Date.now() - 15 * 60 * 1000).toISOString()) // 15 minutes
        .is('resolved_at', null)
        .single()

      if (recentTrigger.data) {
        console.log(`Alert rule ${rule.id} already triggered recently, skipping...`)
        return
      }

      // Determine severity
      const severity = this.calculateSeverity(rule.condition.type, currentValue, rule.condition.threshold)

      // Create alert trigger
      const { data: trigger, error } = await supabase
        .from('integration_alert_triggers')
        .insert({
          rule_id: rule.id,
          integration: rule.integration,
          message: this.generateAlertMessage(rule, currentValue),
          severity,
          data: {
            rule: rule.name,
            integration: rule.integration,
            condition: rule.condition,
            currentValue,
            threshold: rule.condition.threshold,
            metrics: latestMetrics
          },
          triggered_at: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error

      console.log(`Alert triggered: ${rule.name} (${severity})`)

      // Send notifications
      await this.sendAlertNotifications(rule, trigger, currentValue)

    } catch (error) {
      console.error('Failed to trigger alert:', error)
    }
  }

  private calculateSeverity(conditionType: string, currentValue: number, threshold: number): string {
    const ratio = Math.abs(currentValue - threshold) / threshold

    if (ratio >= 0.5) return 'critical'
    if (ratio >= 0.3) return 'high'
    if (ratio >= 0.1) return 'medium'
    return 'low'
  }

  private generateAlertMessage(rule: any, currentValue: number): string {
    const condition = rule.condition
    return `${rule.integration}: ${condition.type} is ${currentValue.toFixed(1)}% (threshold: ${condition.threshold}%)`
  }

  private async sendAlertNotifications(rule: any, trigger: any, currentValue: number): Promise<void> {
    try {
      const alertData = {
        rule: rule.name,
        integration: rule.integration,
        severity: trigger.severity,
        message: trigger.message,
        currentValue,
        threshold: rule.condition.threshold,
        timestamp: new Date().toISOString()
      }

      // Send email alerts
      if (rule.actions.email && this.config.emailAlerts) {
        await this.sendEmailNotification(rule.recipients, alertData)
      }

      // Send webhook alerts
      if (rule.actions.webhook && this.config.alertWebhookUrl) {
        await this.sendWebhookNotification(this.config.alertWebhookUrl, alertData)
      }

    } catch (error) {
      console.error('Failed to send alert notifications:', error)
    }
  }

  private async sendEmailNotification(recipients: string[], alertData: any): Promise<void> {
    // In production, integrate with email service
    console.log('Email alert sent to:', recipients)
    console.log('Alert data:', alertData)
  }

  private async sendWebhookNotification(webhookUrl: string, alertData: any): Promise<void> {
    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Atlas-Fitness-Monitor/1.0'
        },
        body: JSON.stringify(alertData)
      })
    } catch (error) {
      console.error('Webhook notification failed:', error)
    }
  }

  private getTimeWindowMinutes(timeWindow: string): number {
    switch (timeWindow) {
      case '5m': return 5
      case '15m': return 15
      case '1h': return 60
      case '24h': return 24 * 60
      default: return 15
    }
  }
}

// Export singleton instance
export const integrationMonitor = new IntegrationMonitor({
  healthCheckInterval: 5 * 60 * 1000, // 5 minutes
  alertCheckInterval: 2 * 60 * 1000, // 2 minutes
  enabledIntegrations: [
    'google-calendar',
    'whatsapp',
    'facebook',
    'email-smtp',
    'webhooks',
    'stripe'
  ],
  alertWebhookUrl: process.env.ALERT_WEBHOOK_URL,
  emailAlerts: true
})

// Auto-start in production
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  integrationMonitor.start()
}