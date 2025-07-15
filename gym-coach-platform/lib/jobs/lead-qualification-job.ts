import { supabaseAdmin } from '@/lib/api/middleware'
import { qualifyLead } from '@/lib/ai/lead-qualification'

export interface JobConfig {
  enabled: boolean
  intervalMinutes: number
  batchSize: number
  maxDailyAnalysis: number
  onlyNewLeads: boolean
  reanalyzeAfterDays: number
}

const DEFAULT_CONFIG: JobConfig = {
  enabled: true,
  intervalMinutes: 30,
  batchSize: 5,
  maxDailyAnalysis: 100,
  onlyNewLeads: false,
  reanalyzeAfterDays: 7
}

class LeadQualificationJob {
  private config: JobConfig
  private isRunning: boolean = false
  private intervalId: NodeJS.Timeout | null = null

  constructor(config: Partial<JobConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  start() {
    if (this.intervalId || !this.config.enabled) {
      return
    }

    console.log('Starting lead qualification job', this.config)
    
    // Run immediately
    this.runQualificationCycle()
    
    // Schedule recurring runs
    this.intervalId = setInterval(() => {
      this.runQualificationCycle()
    }, this.config.intervalMinutes * 60 * 1000)
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
      console.log('Lead qualification job stopped')
    }
  }

  updateConfig(newConfig: Partial<JobConfig>) {
    this.config = { ...this.config, ...newConfig }
    
    // Restart if running
    if (this.intervalId) {
      this.stop()
      this.start()
    }
  }

  private async runQualificationCycle() {
    if (this.isRunning) {
      console.log('Lead qualification job already running, skipping cycle')
      return
    }

    this.isRunning = true
    console.log('Starting lead qualification cycle')

    try {
      // Check daily quota
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const { count: dailyAnalysisCount } = await supabaseAdmin
        .from('analytics_events')
        .select('id', { count: 'exact' })
        .eq('event_name', 'lead_auto_analyzed')
        .gte('created_at', today.toISOString())

      if ((dailyAnalysisCount || 0) >= this.config.maxDailyAnalysis) {
        console.log(`Daily analysis quota reached: ${dailyAnalysisCount}/${this.config.maxDailyAnalysis}`)
        return
      }

      // Get leads that need qualification
      let query = supabaseAdmin
        .from('leads')
        .select(`
          *,
          organizations!inner(id, settings)
        `)
        .order('created_at', { ascending: true })
        .limit(this.config.batchSize)

      if (this.config.onlyNewLeads) {
        // Only leads without AI analysis
        query = query.is('ai_analysis', null)
      } else {
        // Include leads that need reanalysis
        const reanalyzeDate = new Date()
        reanalyzeDate.setDate(reanalyzeDate.getDate() - this.config.reanalyzeAfterDays)
        
        query = query.or(`ai_analysis.is.null,updated_at.lt.${reanalyzeDate.toISOString()}`)
      }

      const { data: leads, error } = await query

      if (error) {
        console.error('Failed to fetch leads for qualification:', error)
        return
      }

      if (!leads || leads.length === 0) {
        console.log('No leads found for qualification')
        return
      }

      console.log(`Processing ${leads.length} leads for qualification`)

      const results = []
      
      for (const lead of leads) {
        try {
          // Check if we've hit daily quota
          const { count: currentCount } = await supabaseAdmin
            .from('analytics_events')
            .select('id', { count: 'exact' })
            .eq('event_name', 'lead_auto_analyzed')
            .gte('created_at', today.toISOString())

          if ((currentCount || 0) >= this.config.maxDailyAnalysis) {
            console.log('Daily quota reached during processing, stopping')
            break
          }

          // Get lead interactions
          const { data: interactions } = await supabaseAdmin
            .from('interactions')
            .select('*')
            .eq('lead_id', lead.id)
            .order('created_at', { ascending: false })

          // Perform AI analysis
          const analysis = await qualifyLead({
            lead,
            interactions: interactions || [],
            organizationContext: lead.organizations?.settings?.business_profile || {}
          })

          // Update lead with AI analysis
          const { error: updateError } = await supabaseAdmin
            .from('leads')
            .update({
              ai_analysis: analysis,
              lead_score: analysis.score,
              status: analysis.qualification === 'high' ? 'hot' : 
                     analysis.qualification === 'medium' ? 'warm' : 'cold'
            })
            .eq('id', lead.id)

          if (updateError) {
            console.error(`Failed to update lead ${lead.id}:`, updateError)
            continue
          }

          // Log analytics event
          await supabaseAdmin.from('analytics_events').insert({
            organization_id: lead.organization_id,
            event_type: 'ai',
            event_name: 'lead_auto_analyzed',
            properties: {
              lead_id: lead.id,
              ai_score: analysis.score,
              ai_qualification: analysis.qualification,
              confidence: analysis.confidence,
              job_run: true
            },
            lead_id: lead.id
          })

          results.push({
            lead_id: lead.id,
            status: 'success',
            score: analysis.score,
            qualification: analysis.qualification
          })

          // Small delay to avoid overwhelming the API
          await new Promise(resolve => setTimeout(resolve, 200))

        } catch (error) {
          console.error(`Error processing lead ${lead.id}:`, error)
          results.push({
            lead_id: lead.id,
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }

      // Log cycle completion
      await supabaseAdmin.from('analytics_events').insert({
        organization_id: 'system',
        event_type: 'system',
        event_name: 'qualification_cycle_completed',
        properties: {
          leads_processed: results.length,
          successful: results.filter(r => r.status === 'success').length,
          errors: results.filter(r => r.status === 'error').length,
          daily_quota_used: (dailyAnalysisCount || 0) + results.filter(r => r.status === 'success').length,
          daily_quota_max: this.config.maxDailyAnalysis
        }
      })

      console.log(`Qualification cycle completed: ${results.filter(r => r.status === 'success').length} successful, ${results.filter(r => r.status === 'error').length} errors`)

    } catch (error) {
      console.error('Error in lead qualification cycle:', error)
    } finally {
      this.isRunning = false
    }
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      hasInterval: !!this.intervalId
    }
  }
}

// Singleton instance
let qualificationJob: LeadQualificationJob | null = null

export function getQualificationJob(config?: Partial<JobConfig>): LeadQualificationJob {
  if (!qualificationJob) {
    qualificationJob = new LeadQualificationJob(config)
  }
  return qualificationJob
}

export function startQualificationJob(config?: Partial<JobConfig>) {
  const job = getQualificationJob(config)
  job.start()
  return job
}

export function stopQualificationJob() {
  if (qualificationJob) {
    qualificationJob.stop()
  }
}

export async function runManualQualificationCycle(organizationId?: string) {
  const job = new LeadQualificationJob({ ...DEFAULT_CONFIG, batchSize: 10 })
  
  // Override the private method for manual run
  await (job as any).runQualificationCycle()
  
  return job.getStatus()
}