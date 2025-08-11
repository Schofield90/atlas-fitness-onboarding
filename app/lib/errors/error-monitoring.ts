/**
 * Error Monitoring and Analytics for Atlas Fitness CRM
 * 
 * This module provides real-time error monitoring, alerting, and analytics
 * for production monitoring and debugging across organizations.
 */

import { AppError } from './error-classes'
import { errorLogger, LogLevel, ErrorStats } from './error-logger'
import { createAdminClient } from '@/app/lib/supabase/admin'

// Alert configuration
export interface AlertConfig {
  enabled: boolean
  threshold: number
  timeWindow: number // minutes
  recipients: string[]
  channels: ('email' | 'slack' | 'sms' | 'webhook')[]
}

// Monitoring configuration
export interface MonitoringConfig {
  errorRateThreshold: number // errors per minute
  responseTimeThreshold: number // milliseconds
  criticalErrorAlert: AlertConfig
  errorRateAlert: AlertConfig
  performanceAlert: AlertConfig
  organizationAlerts: Record<string, AlertConfig>
}

// Error trend data
export interface ErrorTrend {
  timestamp: string
  count: number
  errorRate: number
  avgResponseTime?: number
  criticalErrors: number
}

// Alert payload
export interface AlertPayload {
  type: 'critical_error' | 'error_rate' | 'performance' | 'organization_threshold'
  severity: 'low' | 'medium' | 'high' | 'critical'
  title: string
  message: string
  organizationId?: string
  errorCode?: string
  threshold?: number
  current?: number
  timestamp: Date
  metadata: Record<string, any>
}

/**
 * Error Monitoring System
 */
export class ErrorMonitor {
  private static instance: ErrorMonitor
  private config: MonitoringConfig
  private alertHistory: Map<string, Date> = new Map()
  private readonly alertCooldownMinutes = 15 // Prevent spam

  private constructor() {
    this.config = this.loadConfig()
    this.startPeriodicChecks()
  }

  public static getInstance(): ErrorMonitor {
    if (!ErrorMonitor.instance) {
      ErrorMonitor.instance = new ErrorMonitor()
    }
    return ErrorMonitor.instance
  }

  /**
   * Load monitoring configuration
   */
  private loadConfig(): MonitoringConfig {
    return {
      errorRateThreshold: Number(process.env.ERROR_RATE_THRESHOLD) || 10,
      responseTimeThreshold: Number(process.env.RESPONSE_TIME_THRESHOLD) || 5000,
      criticalErrorAlert: {
        enabled: process.env.CRITICAL_ERROR_ALERTS === 'true',
        threshold: 1,
        timeWindow: 1,
        recipients: (process.env.ALERT_RECIPIENTS || '').split(',').filter(Boolean),
        channels: (process.env.ALERT_CHANNELS || 'email,slack').split(',') as any[]
      },
      errorRateAlert: {
        enabled: process.env.ERROR_RATE_ALERTS === 'true',
        threshold: 10,
        timeWindow: 5,
        recipients: (process.env.ALERT_RECIPIENTS || '').split(',').filter(Boolean),
        channels: ['email', 'slack']
      },
      performanceAlert: {
        enabled: process.env.PERFORMANCE_ALERTS === 'true',
        threshold: 5000, // 5 seconds
        timeWindow: 5,
        recipients: (process.env.ALERT_RECIPIENTS || '').split(',').filter(Boolean),
        channels: ['slack']
      },
      organizationAlerts: {}
    }
  }

  /**
   * Start periodic monitoring checks
   */
  private startPeriodicChecks(): void {
    // Check error rates every minute
    setInterval(() => {
      this.checkErrorRates().catch(console.error)
    }, 60 * 1000)

    // Check performance metrics every 5 minutes
    setInterval(() => {
      this.checkPerformanceMetrics().catch(console.error)
    }, 5 * 60 * 1000)

    // Generate daily reports
    setInterval(() => {
      this.generateDailyReport().catch(console.error)
    }, 24 * 60 * 60 * 1000)
  }

  /**
   * Process error for monitoring
   */
  async processError(error: AppError, organizationId?: string): Promise<void> {
    try {
      // Check for critical error alerts
      if (this.isCriticalError(error)) {
        await this.sendCriticalErrorAlert(error, organizationId)
      }

      // Update real-time metrics
      await this.updateRealTimeMetrics(error, organizationId)

      // Check organization-specific thresholds
      if (organizationId) {
        await this.checkOrganizationThresholds(organizationId)
      }
    } catch (monitoringError) {
      console.error('Error in monitoring system:', monitoringError)
    }
  }

  /**
   * Check error rates across the system
   */
  private async checkErrorRates(): Promise<void> {
    if (!this.config.errorRateAlert.enabled) return

    try {
      const supabase = createAdminClient()
      const timeWindow = this.config.errorRateAlert.timeWindow
      const threshold = this.config.errorRateAlert.threshold
      
      const startTime = new Date(Date.now() - timeWindow * 60 * 1000)
      
      const { data: errors } = await supabase
        .from('error_logs')
        .select('organization_id')
        .eq('level', 'error')
        .gte('timestamp', startTime.toISOString())

      const errorRate = errors ? errors.length / timeWindow : 0

      if (errorRate > threshold) {
        const alertKey = `error_rate_${Math.floor(Date.now() / (60 * 1000))}`
        
        if (!this.shouldSendAlert(alertKey)) return

        await this.sendAlert({
          type: 'error_rate',
          severity: errorRate > threshold * 2 ? 'critical' : 'high',
          title: 'High Error Rate Detected',
          message: `Error rate of ${errorRate.toFixed(2)} errors/minute exceeds threshold of ${threshold}`,
          threshold,
          current: errorRate,
          timestamp: new Date(),
          metadata: {
            timeWindow,
            totalErrors: errors?.length || 0
          }
        })
      }
    } catch (error) {
      console.error('Failed to check error rates:', error)
    }
  }

  /**
   * Check performance metrics
   */
  private async checkPerformanceMetrics(): Promise<void> {
    if (!this.config.performanceAlert.enabled) return

    try {
      const supabase = createAdminClient()
      const timeWindow = this.config.performanceAlert.timeWindow
      const threshold = this.config.performanceAlert.threshold
      
      const startTime = new Date(Date.now() - timeWindow * 60 * 1000)
      
      const { data: logs } = await supabase
        .from('error_logs')
        .select('response_time')
        .not('response_time', 'is', null)
        .gte('timestamp', startTime.toISOString())

      if (!logs || logs.length === 0) return

      const avgResponseTime = logs.reduce((sum, log) => sum + (log.response_time || 0), 0) / logs.length

      if (avgResponseTime > threshold) {
        const alertKey = `performance_${Math.floor(Date.now() / (60 * 1000))}`
        
        if (!this.shouldSendAlert(alertKey)) return

        await this.sendAlert({
          type: 'performance',
          severity: avgResponseTime > threshold * 2 ? 'critical' : 'high',
          title: 'Performance Degradation Detected',
          message: `Average response time of ${avgResponseTime.toFixed(0)}ms exceeds threshold of ${threshold}ms`,
          threshold,
          current: avgResponseTime,
          timestamp: new Date(),
          metadata: {
            timeWindow,
            sampleSize: logs.length
          }
        })
      }
    } catch (error) {
      console.error('Failed to check performance metrics:', error)
    }
  }

  /**
   * Check organization-specific error thresholds
   */
  private async checkOrganizationThresholds(organizationId: string): Promise<void> {
    const alertConfig = this.config.organizationAlerts[organizationId]
    if (!alertConfig?.enabled) return

    try {
      const supabase = createAdminClient()
      const startTime = new Date(Date.now() - alertConfig.timeWindow * 60 * 1000)
      
      const { data: errors } = await supabase
        .from('error_logs')
        .select('id')
        .eq('organization_id', organizationId)
        .eq('level', 'error')
        .gte('timestamp', startTime.toISOString())

      const errorCount = errors?.length || 0

      if (errorCount > alertConfig.threshold) {
        const alertKey = `org_${organizationId}_${Math.floor(Date.now() / (60 * 1000))}`
        
        if (!this.shouldSendAlert(alertKey)) return

        await this.sendAlert({
          type: 'organization_threshold',
          severity: errorCount > alertConfig.threshold * 2 ? 'critical' : 'medium',
          title: 'Organization Error Threshold Exceeded',
          message: `Organization ${organizationId} has ${errorCount} errors in ${alertConfig.timeWindow} minutes`,
          organizationId,
          threshold: alertConfig.threshold,
          current: errorCount,
          timestamp: new Date(),
          metadata: {
            timeWindow: alertConfig.timeWindow
          }
        })
      }
    } catch (error) {
      console.error('Failed to check organization thresholds:', error)
    }
  }

  /**
   * Send critical error alert immediately
   */
  private async sendCriticalErrorAlert(error: AppError, organizationId?: string): Promise<void> {
    if (!this.config.criticalErrorAlert.enabled) return

    const alertKey = `critical_${error.errorCode}_${organizationId || 'global'}`
    
    if (!this.shouldSendAlert(alertKey)) return

    await this.sendAlert({
      type: 'critical_error',
      severity: 'critical',
      title: 'Critical Error Detected',
      message: `Critical error occurred: ${error.message}`,
      organizationId,
      errorCode: error.errorCode,
      timestamp: new Date(),
      metadata: {
        statusCode: error.statusCode,
        stack: error.stack,
        context: error.context
      }
    })
  }

  /**
   * Send alert through configured channels
   */
  private async sendAlert(alert: AlertPayload): Promise<void> {
    const channels = this.getAlertChannels(alert.type)
    
    await Promise.allSettled([
      ...channels.includes('email') ? [this.sendEmailAlert(alert)] : [],
      ...channels.includes('slack') ? [this.sendSlackAlert(alert)] : [],
      ...channels.includes('sms') ? [this.sendSMSAlert(alert)] : [],
      ...channels.includes('webhook') ? [this.sendWebhookAlert(alert)] : []
    ])

    // Record alert in database
    await this.recordAlert(alert)
  }

  /**
   * Get alert channels for alert type
   */
  private getAlertChannels(alertType: string): ('email' | 'slack' | 'sms' | 'webhook')[] {
    switch (alertType) {
      case 'critical_error':
        return this.config.criticalErrorAlert.channels
      case 'error_rate':
        return this.config.errorRateAlert.channels
      case 'performance':
        return this.config.performanceAlert.channels
      default:
        return ['slack']
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: AlertPayload): Promise<void> {
    // Implementation would integrate with your email service
    console.log('Sending email alert:', {
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      message: alert.message,
      organizationId: alert.organizationId,
      timestamp: alert.timestamp
    })
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(alert: AlertPayload): Promise<void> {
    if (!process.env.SLACK_WEBHOOK_URL) return

    const color = this.getAlertColor(alert.severity)
    const emoji = this.getAlertEmoji(alert.severity)

    try {
      await fetch(process.env.SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `${emoji} ${alert.title}`,
          attachments: [{
            color,
            fields: [
              {
                title: 'Message',
                value: alert.message,
                short: false
              },
              {
                title: 'Severity',
                value: alert.severity.toUpperCase(),
                short: true
              },
              {
                title: 'Organization',
                value: alert.organizationId || 'Global',
                short: true
              },
              {
                title: 'Time',
                value: alert.timestamp.toISOString(),
                short: true
              }
            ]
          }]
        })
      })
    } catch (error) {
      console.error('Failed to send Slack alert:', error)
    }
  }

  /**
   * Send SMS alert
   */
  private async sendSMSAlert(alert: AlertPayload): Promise<void> {
    // Implementation would integrate with Twilio or similar
    console.log('Sending SMS alert:', {
      message: `${alert.title}: ${alert.message}`,
      severity: alert.severity
    })
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(alert: AlertPayload): Promise<void> {
    if (!process.env.MONITORING_WEBHOOK_URL) return

    try {
      await fetch(process.env.MONITORING_WEBHOOK_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.MONITORING_WEBHOOK_TOKEN || ''}`
        },
        body: JSON.stringify({
          service: 'atlas-fitness-crm',
          environment: process.env.NODE_ENV,
          alert
        })
      })
    } catch (error) {
      console.error('Failed to send webhook alert:', error)
    }
  }

  /**
   * Record alert in database
   */
  private async recordAlert(alert: AlertPayload): Promise<void> {
    try {
      const supabase = createAdminClient()
      
      await supabase.from('alert_history').insert({
        type: alert.type,
        severity: alert.severity,
        title: alert.title,
        message: alert.message,
        organization_id: alert.organizationId,
        error_code: alert.errorCode,
        threshold: alert.threshold,
        current_value: alert.current,
        timestamp: alert.timestamp.toISOString(),
        metadata: alert.metadata
      })
    } catch (error) {
      console.error('Failed to record alert:', error)
    }
  }

  /**
   * Check if alert should be sent (cooldown logic)
   */
  private shouldSendAlert(alertKey: string): boolean {
    const lastSent = this.alertHistory.get(alertKey)
    const now = new Date()
    const cooldownMs = this.alertCooldownMinutes * 60 * 1000

    if (lastSent && now.getTime() - lastSent.getTime() < cooldownMs) {
      return false
    }

    this.alertHistory.set(alertKey, now)
    return true
  }

  /**
   * Update real-time metrics
   */
  private async updateRealTimeMetrics(error: AppError, organizationId?: string): Promise<void> {
    try {
      const supabase = createAdminClient()
      const minute = new Date()
      minute.setSeconds(0, 0)
      
      await supabase.rpc('update_realtime_metrics', {
        p_timestamp: minute.toISOString(),
        p_organization_id: organizationId,
        p_error_code: error.errorCode,
        p_is_critical: this.isCriticalError(error)
      })
    } catch (error) {
      console.error('Failed to update real-time metrics:', error)
    }
  }

  /**
   * Generate daily monitoring report
   */
  private async generateDailyReport(): Promise<void> {
    try {
      const stats = await errorLogger.getErrorStats()
      
      const report = {
        date: new Date().toISOString().split('T')[0],
        totalErrors: stats.totalErrors,
        criticalErrors: stats.criticalErrors,
        topErrors: Object.entries(stats.errorsByCode)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10),
        topOrganizations: Object.entries(stats.errorsByOrganization)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 10),
        trends: await this.getErrorTrends('day')
      }

      // Send daily report via email
      await this.sendDailyReport(report)
      
      // Store report in database
      await this.storeDailyReport(report)
    } catch (error) {
      console.error('Failed to generate daily report:', error)
    }
  }

  /**
   * Send daily report
   */
  private async sendDailyReport(report: any): Promise<void> {
    if (!process.env.DAILY_REPORT_RECIPIENTS) return

    console.log('Sending daily error report:', {
      date: report.date,
      totalErrors: report.totalErrors,
      criticalErrors: report.criticalErrors,
      recipients: process.env.DAILY_REPORT_RECIPIENTS
    })
  }

  /**
   * Store daily report
   */
  private async storeDailyReport(report: any): Promise<void> {
    try {
      const supabase = createAdminClient()
      
      await supabase.from('daily_reports').insert({
        date: report.date,
        report_type: 'error_monitoring',
        data: report,
        generated_at: new Date().toISOString()
      })
    } catch (error) {
      console.error('Failed to store daily report:', error)
    }
  }

  /**
   * Get error trends over time
   */
  async getErrorTrends(
    period: 'hour' | 'day' | 'week' | 'month',
    organizationId?: string
  ): Promise<ErrorTrend[]> {
    try {
      const supabase = createAdminClient()
      
      let query = supabase.from('realtime_metrics')
        .select('*')
        .order('timestamp', { ascending: true })
        .gte('timestamp', this.getPeriodStart(period))

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data: metrics } = await query

      return this.aggregateMetrics(metrics || [], period)
    } catch (error) {
      console.error('Failed to get error trends:', error)
      return []
    }
  }

  /**
   * Get real-time error dashboard data
   */
  async getDashboardData(organizationId?: string): Promise<{
    currentErrorRate: number
    avgResponseTime: number
    errorDistribution: Record<string, number>
    recentErrors: any[]
    trends: ErrorTrend[]
    alerts: any[]
  }> {
    try {
      const [stats, trends, alerts] = await Promise.all([
        errorLogger.getErrorStats(organizationId, 'hour'),
        this.getErrorTrends('hour', organizationId),
        this.getRecentAlerts(organizationId)
      ])

      return {
        currentErrorRate: stats.errorsByTimeRange.hour,
        avgResponseTime: stats.avgResponseTime || 0,
        errorDistribution: stats.errorsByCode,
        recentErrors: await this.getRecentErrors(organizationId),
        trends,
        alerts
      }
    } catch (error) {
      console.error('Failed to get dashboard data:', error)
      throw error
    }
  }

  /**
   * Get recent alerts
   */
  private async getRecentAlerts(organizationId?: string, limit = 10): Promise<any[]> {
    try {
      const supabase = createAdminClient()
      
      let query = supabase.from('alert_history')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data: alerts } = await query
      return alerts || []
    } catch (error) {
      console.error('Failed to get recent alerts:', error)
      return []
    }
  }

  /**
   * Get recent errors
   */
  private async getRecentErrors(organizationId?: string, limit = 20): Promise<any[]> {
    try {
      const supabase = createAdminClient()
      
      let query = supabase.from('error_logs')
        .select('*')
        .eq('level', 'error')
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data: errors } = await query
      return errors || []
    } catch (error) {
      console.error('Failed to get recent errors:', error)
      return []
    }
  }

  /**
   * Utility methods
   */
  private isCriticalError(error: AppError): boolean {
    const criticalCodes = [
      'DATABASE_ERROR',
      'AUTHENTICATION_ERROR',
      'MULTI_TENANT_ERROR',
      'INTERNAL_ERROR'
    ]
    
    return criticalCodes.includes(error.errorCode) || 
           error.statusCode >= 500 ||
           !error.isOperational
  }

  private getAlertColor(severity: string): string {
    switch (severity) {
      case 'critical': return '#ff0000'
      case 'high': return '#ff8800'
      case 'medium': return '#ffaa00'
      case 'low': return '#ffdd00'
      default: return '#cccccc'
    }
  }

  private getAlertEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🚨'
      case 'high': return '⚠️'
      case 'medium': return '⚡'
      case 'low': return 'ℹ️'
      default: return '📊'
    }
  }

  private getPeriodStart(period: string): string {
    const now = new Date()
    switch (period) {
      case 'hour':
        return new Date(now.getTime() - 60 * 60 * 1000).toISOString()
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()
    }
  }

  private aggregateMetrics(metrics: any[], period: string): ErrorTrend[] {
    // Implementation for aggregating metrics by period
    const grouped = new Map<string, any[]>()
    
    metrics.forEach(metric => {
      const key = this.getTimeKey(metric.timestamp, period)
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(metric)
    })

    return Array.from(grouped.entries()).map(([timestamp, metricGroup]) => ({
      timestamp,
      count: metricGroup.reduce((sum, m) => sum + (m.error_count || 0), 0),
      errorRate: metricGroup.reduce((sum, m) => sum + (m.error_rate || 0), 0) / metricGroup.length,
      avgResponseTime: metricGroup.reduce((sum, m) => sum + (m.avg_response_time || 0), 0) / metricGroup.length,
      criticalErrors: metricGroup.reduce((sum, m) => sum + (m.critical_errors || 0), 0)
    }))
  }

  private getTimeKey(timestamp: string, period: string): string {
    const date = new Date(timestamp)
    switch (period) {
      case 'hour':
        return date.toISOString().substr(0, 13) + ':00:00.000Z'
      case 'day':
        return date.toISOString().substr(0, 10) + 'T00:00:00.000Z'
      case 'week':
        const weekStart = new Date(date)
        weekStart.setDate(date.getDate() - date.getDay())
        return weekStart.toISOString().substr(0, 10) + 'T00:00:00.000Z'
      case 'month':
        return date.toISOString().substr(0, 7) + '-01T00:00:00.000Z'
      default:
        return timestamp
    }
  }
}

// Export singleton instance
export const errorMonitor = ErrorMonitor.getInstance()

// Convenience function for processing errors
export async function processErrorForMonitoring(
  error: AppError,
  organizationId?: string
): Promise<void> {
  return errorMonitor.processError(error, organizationId)
}