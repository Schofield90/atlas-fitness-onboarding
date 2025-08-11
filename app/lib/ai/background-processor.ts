import { enhancedLeadProcessor } from './enhanced-lead-processor'
import { createAdminClient } from '@/app/lib/supabase/admin'

export interface BackgroundJobOptions {
  priority: 'low' | 'normal' | 'high'
  maxRetries: number
  delayMs: number
  batchSize: number
}

export interface ProcessingJob {
  id: string
  organizationId: string
  jobType: 'single_lead' | 'bulk_leads' | 'scheduled_refresh' | 'insight_cleanup'
  payload: any
  priority: 'low' | 'normal' | 'high'
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying'
  attempts: number
  maxRetries: number
  createdAt: string
  scheduledFor?: string
  processingStarted?: string
  completedAt?: string
  errorMessage?: string
}

export class BackgroundProcessor {
  private supabase = createAdminClient()
  private isProcessing = false
  private processingInterval: NodeJS.Timeout | null = null
  
  constructor() {}

  /**
   * Start the background processing loop
   */
  startProcessor(intervalMs: number = 30000): void {
    if (this.isProcessing) {
      console.log('Background processor already running')
      return
    }

    console.log('Starting AI background processor with interval:', intervalMs)
    this.isProcessing = true

    this.processingInterval = setInterval(async () => {
      try {
        await this.processNextJobs()
      } catch (error) {
        console.error('Background processor error:', error)
      }
    }, intervalMs)

    // Process immediately on start
    this.processNextJobs()
  }

  /**
   * Stop the background processing loop
   */
  stopProcessor(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval)
      this.processingInterval = null
    }
    this.isProcessing = false
    console.log('Background processor stopped')
  }

  /**
   * Queue a single lead for processing
   */
  async queueLeadProcessing(
    organizationId: string,
    leadId: string,
    options: Partial<BackgroundJobOptions> = {}
  ): Promise<string> {
    const job = {
      organization_id: organizationId,
      job_type: 'single_lead',
      payload: { leadId, options },
      priority: options.priority || 'normal',
      status: 'pending',
      attempts: 0,
      max_retries: options.maxRetries || 3,
      created_at: new Date().toISOString(),
      scheduled_for: options.delayMs 
        ? new Date(Date.now() + options.delayMs).toISOString()
        : new Date().toISOString()
    }

    const { data: insertedJob, error } = await this.supabase
      .from('ai_processing_jobs')
      .insert(job)
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to queue job: ${error.message}`)
    }

    console.log('Queued lead processing job:', insertedJob.id)
    return insertedJob.id
  }

  /**
   * Queue bulk lead processing
   */
  async queueBulkProcessing(
    organizationId: string,
    leadIds: string[],
    options: Partial<BackgroundJobOptions> = {}
  ): Promise<string> {
    const job = {
      organization_id: organizationId,
      job_type: 'bulk_leads',
      payload: { leadIds, options },
      priority: options.priority || 'low',
      status: 'pending',
      attempts: 0,
      max_retries: options.maxRetries || 2,
      created_at: new Date().toISOString(),
      scheduled_for: options.delayMs 
        ? new Date(Date.now() + options.delayMs).toISOString()
        : new Date().toISOString()
    }

    const { data: insertedJob, error } = await this.supabase
      .from('ai_processing_jobs')
      .insert(job)
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to queue bulk job: ${error.message}`)
    }

    console.log(`Queued bulk processing job for ${leadIds.length} leads:`, insertedJob.id)
    return insertedJob.id
  }

  /**
   * Queue scheduled refresh of lead insights
   */
  async queueScheduledRefresh(organizationId: string): Promise<string> {
    const job = {
      organization_id: organizationId,
      job_type: 'scheduled_refresh',
      payload: { refreshType: 'stale_insights' },
      priority: 'low',
      status: 'pending',
      attempts: 0,
      max_retries: 1,
      created_at: new Date().toISOString(),
      scheduled_for: new Date().toISOString()
    }

    const { data: insertedJob, error } = await this.supabase
      .from('ai_processing_jobs')
      .insert(job)
      .select('id')
      .single()

    if (error) {
      throw new Error(`Failed to queue scheduled refresh: ${error.message}`)
    }

    return insertedJob.id
  }

  /**
   * Process the next batch of queued jobs
   */
  private async processNextJobs(): Promise<void> {
    try {
      // Get next jobs to process, ordered by priority and created date
      const { data: jobs, error } = await this.supabase
        .from('ai_processing_jobs')
        .select('*')
        .in('status', ['pending', 'retrying'])
        .lte('scheduled_for', new Date().toISOString())
        .order('priority', { ascending: true }) // high = 0, normal = 1, low = 2
        .order('created_at', { ascending: true })
        .limit(5) // Process up to 5 jobs at once

      if (error) {
        console.error('Failed to fetch processing jobs:', error)
        return
      }

      if (!jobs || jobs.length === 0) {
        return // No jobs to process
      }

      console.log(`Processing ${jobs.length} background AI jobs`)

      // Process jobs in parallel with appropriate concurrency limits
      const highPriorityJobs = jobs.filter(job => job.priority === 'high')
      const normalPriorityJobs = jobs.filter(job => job.priority === 'normal')
      const lowPriorityJobs = jobs.filter(job => job.priority === 'low')

      // Process high priority jobs immediately
      if (highPriorityJobs.length > 0) {
        await Promise.all(highPriorityJobs.map(job => this.processJob(job)))
      }

      // Process normal priority jobs
      if (normalPriorityJobs.length > 0) {
        await Promise.all(normalPriorityJobs.slice(0, 3).map(job => this.processJob(job)))
      }

      // Process low priority jobs one at a time
      if (lowPriorityJobs.length > 0) {
        await this.processJob(lowPriorityJobs[0])
      }

    } catch (error) {
      console.error('Error in processNextJobs:', error)
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: any): Promise<void> {
    const jobId = job.id
    
    try {
      console.log(`Processing job ${jobId} (${job.job_type}, priority: ${job.priority})`)

      // Mark job as processing
      await this.supabase
        .from('ai_processing_jobs')
        .update({
          status: 'processing',
          processing_started: new Date().toISOString(),
          attempts: (job.attempts || 0) + 1
        })
        .eq('id', jobId)

      const startTime = Date.now()
      let result = null

      // Process based on job type
      switch (job.job_type) {
        case 'single_lead':
          result = await this.processSingleLead(job.payload)
          break
        case 'bulk_leads':
          result = await this.processBulkLeads(job.payload)
          break
        case 'scheduled_refresh':
          result = await this.processScheduledRefresh(job.organization_id)
          break
        case 'insight_cleanup':
          result = await this.processInsightCleanup(job.organization_id)
          break
        default:
          throw new Error(`Unknown job type: ${job.job_type}`)
      }

      const processingTime = Date.now() - startTime

      // Mark job as completed
      await this.supabase
        .from('ai_processing_jobs')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          processing_result: result,
          processing_time_ms: processingTime
        })
        .eq('id', jobId)

      console.log(`Completed job ${jobId} in ${processingTime}ms`)

    } catch (error) {
      console.error(`Job ${jobId} failed:`, error)
      
      const attempts = (job.attempts || 0) + 1
      const maxRetries = job.max_retries || 3

      if (attempts >= maxRetries) {
        // Job failed permanently
        await this.supabase
          .from('ai_processing_jobs')
          .update({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: error.message
          })
          .eq('id', jobId)
      } else {
        // Retry job with exponential backoff
        const retryDelay = Math.min(1000 * Math.pow(2, attempts), 300000) // Max 5 minutes
        const scheduledFor = new Date(Date.now() + retryDelay).toISOString()

        await this.supabase
          .from('ai_processing_jobs')
          .update({
            status: 'retrying',
            scheduled_for: scheduledFor,
            error_message: error.message
          })
          .eq('id', jobId)

        console.log(`Job ${jobId} will retry in ${retryDelay}ms (attempt ${attempts}/${maxRetries})`)
      }
    }
  }

  private async processSingleLead(payload: any): Promise<any> {
    const { leadId, options = {} } = payload
    
    const analysis = await enhancedLeadProcessor.processLead(leadId, {
      forceRefresh: options.forceRefresh || false,
      useClaudeForAnalysis: options.useClaudeForAnalysis !== false,
      includeHistoricalData: options.includeHistoricalData !== false,
      realTimeProcessing: false
    })

    return {
      leadId,
      conversionLikelihood: analysis.conversionLikelihood.percentage,
      sentiment: analysis.sentiment.overall,
      urgencyLevel: analysis.conversionLikelihood.urgencyLevel
    }
  }

  private async processBulkLeads(payload: any): Promise<any> {
    const { leadIds, options = {} } = payload
    
    const results = await enhancedLeadProcessor.processBulkLeads(leadIds, {
      forceRefresh: options.forceRefresh || false,
      useClaudeForAnalysis: options.useClaudeForAnalysis !== false,
      includeHistoricalData: options.includeHistoricalData !== false,
      realTimeProcessing: false
    })

    return {
      totalLeads: leadIds.length,
      successful: results.successful.length,
      failed: results.failed.length,
      failedLeads: results.failed
    }
  }

  private async processScheduledRefresh(organizationId: string): Promise<any> {
    // Find leads with stale insights (older than 24 hours)
    const { data: staleLeads } = await this.supabase
      .from('leads')
      .select(`
        id,
        lead_ai_insights!inner(created_at)
      `)
      .eq('organization_id', organizationId)
      .lt('lead_ai_insights.created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(50) // Limit to prevent overwhelming the system

    if (!staleLeads || staleLeads.length === 0) {
      return { refreshed: 0, message: 'No stale insights found' }
    }

    const leadIds = staleLeads.map(lead => lead.id)
    const results = await this.processBulkLeads({ leadIds, options: { forceRefresh: true } })

    return {
      refreshed: results.successful,
      failed: results.failed,
      totalChecked: staleLeads.length
    }
  }

  private async processInsightCleanup(organizationId: string): Promise<any> {
    // Clean up expired insights
    const { data: deleted, error } = await this.supabase
      .from('lead_ai_insights')
      .delete()
      .eq('organization_id', organizationId)
      .lt('expires_at', new Date().toISOString())

    if (error) {
      throw new Error(`Failed to clean up insights: ${error.message}`)
    }

    return {
      deletedInsights: deleted?.length || 0,
      cleanupDate: new Date().toISOString()
    }
  }

  /**
   * Get job statistics for monitoring
   */
  async getJobStatistics(organizationId?: string): Promise<any> {
    let query = this.supabase
      .from('ai_processing_jobs')
      .select('status, job_type, priority, processing_time_ms, created_at')

    if (organizationId) {
      query = query.eq('organization_id', organizationId)
    }

    // Get jobs from last 24 hours
    query = query.gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const { data: jobs, error } = await query

    if (error) {
      throw new Error(`Failed to get job statistics: ${error.message}`)
    }

    const stats = {
      totalJobs: jobs?.length || 0,
      byStatus: {},
      byType: {},
      byPriority: {},
      avgProcessingTime: 0,
      successRate: 0
    }

    if (!jobs || jobs.length === 0) {
      return stats
    }

    // Calculate statistics
    jobs.forEach(job => {
      stats.byStatus[job.status] = (stats.byStatus[job.status] || 0) + 1
      stats.byType[job.job_type] = (stats.byType[job.job_type] || 0) + 1
      stats.byPriority[job.priority] = (stats.byPriority[job.priority] || 0) + 1
    })

    const completedJobs = jobs.filter(job => job.status === 'completed' && job.processing_time_ms)
    if (completedJobs.length > 0) {
      stats.avgProcessingTime = completedJobs.reduce((sum, job) => sum + job.processing_time_ms, 0) / completedJobs.length
    }

    const successfulJobs = (stats.byStatus['completed'] || 0)
    const totalProcessedJobs = successfulJobs + (stats.byStatus['failed'] || 0)
    if (totalProcessedJobs > 0) {
      stats.successRate = Math.round((successfulJobs / totalProcessedJobs) * 100)
    }

    return stats
  }
}

// Export singleton instance
export const backgroundProcessor = new BackgroundProcessor()