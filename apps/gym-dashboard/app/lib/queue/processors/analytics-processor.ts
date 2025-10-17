import { Job } from 'bullmq';
import { createAdminClient } from '@/app/lib/supabase/admin';
import { enhancedQueueManager } from '../enhanced-queue-manager';
import { QUEUE_NAMES, JOB_TYPES, JOB_PRIORITIES, MONITORING_CONFIG } from '../enhanced-config';

interface AnalyticsJobData {
  event: string;
  organizationId: string;
  data: Record<string, any>;
  timestamp: string;
  type?: string;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

interface PerformanceJobData {
  organizationId: string;
  component: string;
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
  timestamp: string;
}

interface ReportGenerationJobData {
  organizationId: string;
  reportType: 'workflow_performance' | 'communication_stats' | 'system_health' | 'custom';
  dateRange: {
    start: string;
    end: string;
  };
  filters?: Record<string, any>;
  recipients?: string[];
  format?: 'json' | 'csv' | 'pdf';
  metadata?: Record<string, any>;
}

export class AnalyticsProcessor {
  private supabase = createAdminClient();
  private metricsBuffer: Map<string, any[]> = new Map();
  private flushInterval: NodeJS.Timeout | null = null;
  
  constructor() {
    this.startMetricsBuffer();
  }

  // Track various analytics events
  async processTrackExecution(job: Job<AnalyticsJobData>): Promise<any> {
    const { event, organizationId, data, timestamp, type, userId, sessionId, metadata } = job.data;
    
    console.log(`📊 Processing analytics event: ${event} for org ${organizationId}`);
    
    try {
      // Store raw event data
      await this.storeAnalyticsEvent({
        event,
        organization_id: organizationId,
        event_type: type || 'workflow',
        data,
        timestamp,
        user_id: userId,
        session_id: sessionId,
        metadata,
      });
      
      // Process specific event types
      switch (event) {
        case 'workflow_execution':
          await this.processWorkflowExecution(organizationId, data);
          break;
        case 'workflow_trigger':
          await this.processWorkflowTrigger(organizationId, data);
          break;
        case 'communication_sent':
          await this.processCommunicationEvent(organizationId, data, 'sent');
          break;
        case 'communication_delivered':
          await this.processCommunicationEvent(organizationId, data, 'delivered');
          break;
        case 'communication_failed':
          await this.processCommunicationEvent(organizationId, data, 'failed');
          break;
        case 'lead_scored':
          await this.processLeadScoring(organizationId, data);
          break;
        case 'user_action':
          await this.processUserAction(organizationId, data);
          break;
        default:
          console.log(`📊 Generic event stored: ${event}`);
      }
      
      // Update real-time statistics
      await this.updateRealTimeStats(organizationId, event, data);
      
      return { processed: true, event };
      
    } catch (error) {
      console.error(`❌ Analytics processing failed for event ${event}:`, error);
      throw error;
    }
  }

  // Track performance metrics
  async processTrackPerformance(job: Job<PerformanceJobData>): Promise<any> {
    const { organizationId, component, operation, duration, success, error, metadata, timestamp } = job.data;
    
    console.log(`⚡ Processing performance metric: ${component}.${operation} (${duration}ms)`);
    
    try {
      // Store performance data
      await this.supabase
        .from('performance_metrics')
        .insert({
          organization_id: organizationId,
          component,
          operation,
          duration,
          success,
          error,
          metadata,
          timestamp,
          created_at: new Date().toISOString(),
        });
      
      // Check for performance alerts
      await this.checkPerformanceThresholds(organizationId, component, operation, duration, success);
      
      // Update performance statistics
      await this.updatePerformanceStats(organizationId, component, operation, duration, success);
      
      return { processed: true, duration };
      
    } catch (error) {
      console.error('❌ Performance tracking failed:', error);
      throw error;
    }
  }

  // Update workflow statistics
  async processUpdateStats(job: Job<AnalyticsJobData>): Promise<any> {
    const { organizationId, data } = job.data;
    
    console.log(`📈 Updating statistics for org ${organizationId}`);
    
    try {
      const { workflowId, executionId, status, duration, nodesExecuted } = data;
      
      // Update workflow statistics
      if (workflowId) {
        await this.updateWorkflowStats(organizationId, workflowId, {
          status,
          duration,
          nodesExecuted,
        });
      }
      
      // Update organization statistics
      await this.updateOrganizationStats(organizationId, {
        executions: status === 'completed' ? 1 : 0,
        failures: status === 'failed' ? 1 : 0,
        totalDuration: duration || 0,
      });
      
      return { processed: true };
      
    } catch (error) {
      console.error('❌ Statistics update failed:', error);
      throw error;
    }
  }

  // Generate reports
  async processGenerateReport(job: Job<ReportGenerationJobData>): Promise<any> {
    const { organizationId, reportType, dateRange, filters, recipients, format, metadata } = job.data;
    
    console.log(`📋 Generating ${reportType} report for org ${organizationId}`);
    
    try {
      let reportData;
      
      switch (reportType) {
        case 'workflow_performance':
          reportData = await this.generateWorkflowPerformanceReport(organizationId, dateRange, filters);
          break;
        case 'communication_stats':
          reportData = await this.generateCommunicationStatsReport(organizationId, dateRange, filters);
          break;
        case 'system_health':
          reportData = await this.generateSystemHealthReport(organizationId, dateRange, filters);
          break;
        case 'custom':
          reportData = await this.generateCustomReport(organizationId, dateRange, filters, metadata);
          break;
        default:
          throw new Error(`Unknown report type: ${reportType}`);
      }
      
      // Format report
      const formattedReport = await this.formatReport(reportData, format || 'json');
      
      // Store report
      const reportRecord = await this.storeReport(organizationId, reportType, formattedReport, metadata);
      
      // Send report to recipients if specified
      if (recipients && recipients.length > 0) {
        await this.sendReportToRecipients(recipients, reportRecord, formattedReport);
      }
      
      console.log(`✅ Report generated: ${reportRecord.id}`);
      
      return {
        processed: true,
        reportId: reportRecord.id,
        reportUrl: reportRecord.url,
        recipientCount: recipients?.length || 0,
      };
      
    } catch (error) {
      console.error(`❌ Report generation failed for ${reportType}:`, error);
      throw error;
    }
  }

  // Private methods

  private startMetricsBuffer() {
    // Flush metrics buffer periodically to reduce database load
    this.flushInterval = setInterval(() => {
      this.flushMetricsBuffer();
    }, 30000); // Every 30 seconds
  }

  private async flushMetricsBuffer() {
    if (this.metricsBuffer.size === 0) return;
    
    try {
      const allMetrics = [];
      
      for (const [key, metrics] of this.metricsBuffer) {
        allMetrics.push(...metrics);
      }
      
      if (allMetrics.length > 0) {
        // Batch insert metrics
        await this.supabase
          .from('analytics_metrics_buffer')
          .insert(allMetrics);
        
        console.log(`📊 Flushed ${allMetrics.length} buffered metrics`);
      }
      
      // Clear buffer
      this.metricsBuffer.clear();
      
    } catch (error) {
      console.error('❌ Failed to flush metrics buffer:', error);
    }
  }

  private async storeAnalyticsEvent(eventData: any) {
    const bufferKey = `${eventData.organization_id}_${eventData.event_type}`;
    
    if (!this.metricsBuffer.has(bufferKey)) {
      this.metricsBuffer.set(bufferKey, []);
    }
    
    this.metricsBuffer.get(bufferKey)!.push({
      ...eventData,
      created_at: new Date().toISOString(),
    });
    
    // If buffer is getting large, flush immediately
    if (this.metricsBuffer.get(bufferKey)!.length >= 100) {
      await this.flushMetricsBuffer();
    }
  }

  private async processWorkflowExecution(organizationId: string, data: any) {
    const { workflowId, executionId, status, duration, nodesExecuted } = data;
    
    // Update workflow execution statistics
    await this.supabase
      .from('workflow_statistics')
      .upsert({
        workflow_id: workflowId,
        organization_id: organizationId,
        total_executions: 1,
        successful_executions: status === 'completed' ? 1 : 0,
        failed_executions: status === 'failed' ? 1 : 0,
        average_duration: duration,
        total_nodes_executed: nodesExecuted || 0,
        last_execution_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'workflow_id,organization_id',
        ignoreDuplicates: false,
      });
  }

  private async processWorkflowTrigger(organizationId: string, data: any) {
    const { triggerType, workflowsMatched } = data;
    
    // Track trigger statistics
    await this.supabase
      .from('trigger_statistics')
      .upsert({
        trigger_type: triggerType,
        organization_id: organizationId,
        trigger_count: 1,
        workflows_matched: workflowsMatched || 0,
        last_triggered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'trigger_type,organization_id',
        ignoreDuplicates: false,
      });
  }

  private async processCommunicationEvent(organizationId: string, data: any, status: 'sent' | 'delivered' | 'failed') {
    const { type, recipientCount, templateName } = data;
    
    // Update communication statistics
    const updateData: any = {};
    updateData[`${status}_count`] = 1;
    updateData[`total_recipients_${status}`] = recipientCount || 1;
    updateData.last_activity_at = new Date().toISOString();
    updateData.updated_at = new Date().toISOString();
    
    await this.supabase
      .from('communication_statistics')
      .upsert({
        communication_type: type,
        organization_id: organizationId,
        template_name: templateName,
        ...updateData,
      }, {
        onConflict: 'communication_type,organization_id,template_name',
        ignoreDuplicates: false,
      });
  }

  private async processLeadScoring(organizationId: string, data: any) {
    const { leadId, oldScore, newScore, scoreChange } = data;
    
    // Track lead scoring statistics
    await this.supabase
      .from('lead_scoring_statistics')
      .insert({
        organization_id: organizationId,
        lead_id: leadId,
        score_change: scoreChange,
        old_score: oldScore,
        new_score: newScore,
        created_at: new Date().toISOString(),
      });
  }

  private async processUserAction(organizationId: string, data: any) {
    const { userId, action, component, metadata } = data;
    
    // Track user actions for usage analytics
    await this.supabase
      .from('user_activity_statistics')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        action,
        component,
        metadata,
        created_at: new Date().toISOString(),
      });
  }

  private async updateRealTimeStats(organizationId: string, event: string, data: any) {
    // Update real-time dashboard statistics
    const cacheKey = `realtime_stats:${organizationId}`;
    
    // This would typically update a Redis cache or real-time database
    // For now, we'll just log it
    console.log(`📈 Real-time update: ${event} for org ${organizationId}`);
  }

  private async checkPerformanceThresholds(
    organizationId: string, 
    component: string, 
    operation: string, 
    duration: number, 
    success: boolean
  ) {
    // Define performance thresholds
    const thresholds = {
      'workflow-execution': 30000, // 30 seconds
      'email-send': 5000,          // 5 seconds
      'sms-send': 3000,            // 3 seconds
      'database-query': 1000,      // 1 second
    };
    
    const thresholdKey = `${component}-${operation}`;
    const threshold = thresholds[thresholdKey] || 10000; // 10 seconds default
    
    if (duration > threshold || !success) {
      // Send performance alert
      await enhancedQueueManager.addJob(
        QUEUE_NAMES.WORKFLOW_ANALYTICS,
        JOB_TYPES.ESCALATE_ERROR,
        {
          type: 'performance_alert',
          organizationId,
          component,
          operation,
          duration,
          threshold,
          success,
          timestamp: new Date().toISOString(),
        },
        {
          priority: JOB_PRIORITIES.HIGH,
        }
      );
    }
  }

  private async updateWorkflowStats(organizationId: string, workflowId: string, stats: any) {
    // Update workflow-specific statistics
    await this.supabase.rpc('update_workflow_stats', {
      p_workflow_id: workflowId,
      p_organization_id: organizationId,
      p_status: stats.status,
      p_duration: stats.duration,
      p_nodes_executed: stats.nodesExecuted,
    });
  }

  private async updateOrganizationStats(organizationId: string, stats: any) {
    // Update organization-level statistics
    await this.supabase.rpc('update_organization_stats', {
      p_organization_id: organizationId,
      p_executions: stats.executions,
      p_failures: stats.failures,
      p_total_duration: stats.totalDuration,
    });
  }

  private async updatePerformanceStats(
    organizationId: string, 
    component: string, 
    operation: string, 
    duration: number, 
    success: boolean
  ) {
    // Update performance statistics
    await this.supabase
      .from('performance_statistics')
      .upsert({
        organization_id: organizationId,
        component,
        operation,
        total_calls: 1,
        successful_calls: success ? 1 : 0,
        failed_calls: success ? 0 : 1,
        total_duration: duration,
        average_duration: duration,
        min_duration: duration,
        max_duration: duration,
        last_call_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'organization_id,component,operation',
        ignoreDuplicates: false,
      });
  }

  // Report generation methods
  private async generateWorkflowPerformanceReport(organizationId: string, dateRange: any, filters: any) {
    const { data } = await this.supabase
      .from('workflow_executions')
      .select(`
        id,
        workflow_id,
        status,
        started_at,
        completed_at,
        result,
        workflows!inner(name)
      `)
      .eq('organization_id', organizationId)
      .gte('started_at', dateRange.start)
      .lte('started_at', dateRange.end);
    
    return {
      title: 'Workflow Performance Report',
      period: `${dateRange.start} to ${dateRange.end}`,
      totalExecutions: data?.length || 0,
      successfulExecutions: data?.filter(e => e.status === 'completed').length || 0,
      failedExecutions: data?.filter(e => e.status === 'failed').length || 0,
      executions: data || [],
    };
  }

  private async generateCommunicationStatsReport(organizationId: string, dateRange: any, filters: any) {
    const { data } = await this.supabase
      .from('communication_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .gte('created_at', dateRange.start)
      .lte('created_at', dateRange.end);
    
    return {
      title: 'Communication Statistics Report',
      period: `${dateRange.start} to ${dateRange.end}`,
      totalCommunications: data?.length || 0,
      byType: this.groupBy(data || [], 'type'),
      byStatus: this.groupBy(data || [], 'status'),
      communications: data || [],
    };
  }

  private async generateSystemHealthReport(organizationId: string, dateRange: any, filters: any) {
    // Get system health metrics
    const queueStats = await enhancedQueueManager.getAllQueueStats();
    
    return {
      title: 'System Health Report',
      period: `${dateRange.start} to ${dateRange.end}`,
      queueStats,
      timestamp: new Date().toISOString(),
    };
  }

  private async generateCustomReport(organizationId: string, dateRange: any, filters: any, metadata: any) {
    // Custom report logic would go here
    return {
      title: 'Custom Report',
      period: `${dateRange.start} to ${dateRange.end}`,
      filters,
      metadata,
      data: [], // Custom data would be populated here
    };
  }

  private async formatReport(reportData: any, format: 'json' | 'csv' | 'pdf'): Promise<any> {
    switch (format) {
      case 'json':
        return {
          format: 'json',
          data: reportData,
          mimeType: 'application/json',
        };
      case 'csv':
        // Convert to CSV (simplified implementation)
        return {
          format: 'csv',
          data: this.convertToCSV(reportData),
          mimeType: 'text/csv',
        };
      case 'pdf':
        // Generate PDF (would require a PDF library)
        return {
          format: 'pdf',
          data: 'PDF generation not implemented',
          mimeType: 'application/pdf',
        };
      default:
        return { format: 'json', data: reportData };
    }
  }

  private async storeReport(organizationId: string, reportType: string, formattedReport: any, metadata: any) {
    const { data, error } = await this.supabase
      .from('generated_reports')
      .insert({
        organization_id: organizationId,
        report_type: reportType,
        format: formattedReport.format,
        data: formattedReport.data,
        metadata,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();
    
    if (error) {
      throw new Error(`Failed to store report: ${error.message}`);
    }
    
    return data;
  }

  private async sendReportToRecipients(recipients: string[], reportRecord: any, formattedReport: any) {
    // Send report via email to recipients
    for (const recipient of recipients) {
      await enhancedQueueManager.addJob(
        QUEUE_NAMES.EMAIL_QUEUE,
        JOB_TYPES.SEND_EMAIL,
        {
          to: recipient,
          subject: `Report: ${reportRecord.report_type}`,
          template: 'report_delivery',
          templateData: {
            reportType: reportRecord.report_type,
            reportUrl: reportRecord.url,
            generatedAt: reportRecord.created_at,
          },
          organizationId: reportRecord.organization_id,
        },
        {
          priority: JOB_PRIORITIES.LOW,
        }
      );
    }
  }

  private groupBy(array: any[], key: string): Record<string, number> {
    return array.reduce((groups, item) => {
      const value = item[key];
      groups[value] = (groups[value] || 0) + 1;
      return groups;
    }, {});
  }

  private convertToCSV(data: any): string {
    // Simplified CSV conversion
    if (Array.isArray(data.executions)) {
      const headers = Object.keys(data.executions[0] || {});
      const rows = data.executions.map(row => headers.map(header => row[header]).join(','));
      return [headers.join(','), ...rows].join('\n');
    }
    
    return JSON.stringify(data);
  }

  // Cleanup method
  cleanup() {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
    
    // Flush any remaining metrics
    this.flushMetricsBuffer();
  }
}

// Create and export processor instance
export const analyticsProcessor = new AnalyticsProcessor();

// Export individual processing functions
export async function processTrackExecution(job: Job<AnalyticsJobData>) {
  return analyticsProcessor.processTrackExecution(job);
}

export async function processTrackPerformance(job: Job<PerformanceJobData>) {
  return analyticsProcessor.processTrackPerformance(job);
}

export async function processUpdateStats(job: Job<AnalyticsJobData>) {
  return analyticsProcessor.processUpdateStats(job);
}

export async function processGenerateReport(job: Job<ReportGenerationJobData>) {
  return analyticsProcessor.processGenerateReport(job);
}