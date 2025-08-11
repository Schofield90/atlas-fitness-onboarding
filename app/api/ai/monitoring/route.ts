import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'
import { backgroundProcessor } from '@/app/lib/ai/background-processor'

export async function GET(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const days = parseInt(searchParams.get('days') || '7')
    const includeDetails = searchParams.get('includeDetails') === 'true'

    console.log('Fetching AI monitoring data:', {
      organizationId: userWithOrg.organizationId,
      days,
      includeDetails
    })

    // Get comprehensive AI processing statistics
    const { data: aiStats, error: statsError } = await supabase
      .rpc('get_ai_processing_stats', {
        org_id: userWithOrg.organizationId,
        days_back: days
      })

    if (statsError) {
      console.error('Error fetching AI stats:', statsError)
      throw new Error(`Failed to fetch AI statistics: ${statsError.message}`)
    }

    // Get current system status
    const [
      processingJobs,
      recentErrors,
      urgentNotifications,
      pendingTasks,
      leadAnalysisQueue
    ] = await Promise.all([
      // Current processing jobs
      supabase
        .from('ai_processing_jobs')
        .select('*')
        .eq('organization_id', userWithOrg.organizationId)
        .in('status', ['pending', 'processing', 'retrying'])
        .order('created_at', { ascending: false })
        .limit(20),

      // Recent processing errors
      supabase
        .from('ai_processing_errors')
        .select('*')
        .eq('organization_id', userWithOrg.organizationId)
        .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(10),

      // Urgent staff notifications
      supabase
        .from('staff_notifications')
        .select('*')
        .eq('organization_id', userWithOrg.organizationId)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(50),

      // AI-generated tasks
      supabase
        .from('tasks')
        .select(`
          *,
          leads (name, phone, status),
          users (name, email)
        `)
        .eq('organization_id', userWithOrg.organizationId)
        .eq('ai_generated', true)
        .eq('status', 'pending')
        .order('due_date', { ascending: true })
        .limit(20),

      // Leads needing analysis
      supabase
        .rpc('get_leads_needing_ai_analysis', {
          org_id: userWithOrg.organizationId,
          max_age_hours: 24,
          limit_count: 10
        })
    ])

    // Get background processor statistics
    const backgroundStats = await backgroundProcessor.getJobStatistics(userWithOrg.organizationId)

    // Calculate health metrics
    const healthMetrics = calculateHealthMetrics(aiStats, backgroundStats, recentErrors.data)

    // Recent processing performance
    const { data: recentProcessingTimes } = await supabase
      .from('real_time_processing_logs')
      .select('processing_time_ms, created_at')
      .eq('organization_id', userWithOrg.organizationId)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false })
      .limit(100)

    const response = {
      success: true,
      organizationId: userWithOrg.organizationId,
      periodDays: days,
      timestamp: new Date().toISOString(),
      
      // High-level statistics
      statistics: aiStats,
      
      // System health
      health: healthMetrics,
      
      // Current status
      status: {
        processingJobs: {
          total: processingJobs.data?.length || 0,
          pending: processingJobs.data?.filter(j => j.status === 'pending').length || 0,
          processing: processingJobs.data?.filter(j => j.status === 'processing').length || 0,
          retrying: processingJobs.data?.filter(j => j.status === 'retrying').length || 0,
          jobs: includeDetails ? processingJobs.data : undefined
        },
        
        notifications: {
          total: urgentNotifications.data?.length || 0,
          urgent: urgentNotifications.data?.filter(n => n.priority === 'urgent').length || 0,
          high: urgentNotifications.data?.filter(n => n.priority === 'high').length || 0,
          unreadNotifications: includeDetails ? urgentNotifications.data : undefined
        },
        
        tasks: {
          pendingAiTasks: pendingTasks.data?.length || 0,
          overdueTasks: pendingTasks.data?.filter(t => 
            t.due_date && new Date(t.due_date) < new Date()
          ).length || 0,
          tasks: includeDetails ? pendingTasks.data : undefined
        },
        
        analysisQueue: {
          leadsNeedingAnalysis: leadAnalysisQueue.data?.length || 0,
          leads: includeDetails ? leadAnalysisQueue.data : undefined
        }
      },
      
      // Performance metrics
      performance: {
        backgroundProcessor: backgroundStats,
        recentErrors: {
          count: recentErrors.data?.length || 0,
          errors: includeDetails ? recentErrors.data : undefined
        },
        processingTimes: recentProcessingTimes ? {
          count: recentProcessingTimes.length,
          avgMs: recentProcessingTimes.reduce((sum, r) => sum + (r.processing_time_ms || 0), 0) / Math.max(recentProcessingTimes.length, 1),
          minMs: Math.min(...recentProcessingTimes.map(r => r.processing_time_ms || 0)),
          maxMs: Math.max(...recentProcessingTimes.map(r => r.processing_time_ms || 0)),
          p95Ms: calculatePercentile(recentProcessingTimes.map(r => r.processing_time_ms || 0), 0.95)
        } : null
      },
      
      // Recommendations
      recommendations: generateRecommendations(healthMetrics, aiStats, processingJobs.data, leadAnalysisQueue.data)
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Error in AI monitoring API:', error)
    return createErrorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()
    
    const { action, ...actionData } = body

    console.log('AI monitoring action requested:', { action, organizationId: userWithOrg.organizationId })

    let result

    switch (action) {
      case 'cleanup_old_data':
        const daysToKeep = actionData.daysToKeep || 30
        const { data: cleanupResult } = await supabase
          .rpc('cleanup_old_ai_processing_data', { days_to_keep: daysToKeep })
        result = { action: 'cleanup_completed', result: cleanupResult }
        break

      case 'queue_bulk_analysis':
        const leadIds = actionData.leadIds || []
        if (leadIds.length === 0) {
          // Get leads that need analysis
          const { data: leadsToAnalyze } = await supabase
            .rpc('get_leads_needing_ai_analysis', {
              org_id: userWithOrg.organizationId,
              max_age_hours: 24,
              limit_count: actionData.limit || 50
            })
          
          const leadsForProcessing = (leadsToAnalyze || []).map(lead => lead.lead_id)
          
          if (leadsForProcessing.length > 0) {
            const jobId = await backgroundProcessor.queueBulkProcessing(
              userWithOrg.organizationId,
              leadsForProcessing,
              { priority: 'normal' }
            )
            result = { action: 'bulk_analysis_queued', jobId, leadCount: leadsForProcessing.length }
          } else {
            result = { action: 'no_leads_need_analysis', leadCount: 0 }
          }
        } else {
          const jobId = await backgroundProcessor.queueBulkProcessing(
            userWithOrg.organizationId,
            leadIds,
            { priority: actionData.priority || 'normal' }
          )
          result = { action: 'bulk_analysis_queued', jobId, leadCount: leadIds.length }
        }
        break

      case 'retry_failed_jobs':
        // Reset failed jobs to retry
        const { error: retryError } = await supabase
          .from('ai_processing_jobs')
          .update({
            status: 'pending',
            scheduled_for: new Date().toISOString(),
            attempts: 0,
            error_message: null
          })
          .eq('organization_id', userWithOrg.organizationId)
          .eq('status', 'failed')
          .lt('attempts', 'max_retries')

        if (retryError) {
          throw new Error(`Failed to retry jobs: ${retryError.message}`)
        }

        result = { action: 'jobs_retry_initiated' }
        break

      case 'mark_notifications_read':
        const notificationIds = actionData.notificationIds || []
        let updateQuery = supabase
          .from('staff_notifications')
          .update({ read: true, read_at: new Date().toISOString() })
          .eq('organization_id', userWithOrg.organizationId)

        if (notificationIds.length > 0) {
          updateQuery = updateQuery.in('id', notificationIds)
        } else {
          updateQuery = updateQuery.eq('read', false)
        }

        const { error: notificationError } = await updateQuery

        if (notificationError) {
          throw new Error(`Failed to mark notifications as read: ${notificationError.message}`)
        }

        result = { action: 'notifications_marked_read', count: notificationIds.length || 'all' }
        break

      case 'schedule_refresh':
        const refreshJobId = await backgroundProcessor.queueScheduledRefresh(userWithOrg.organizationId)
        result = { action: 'refresh_scheduled', jobId: refreshJobId }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      organizationId: userWithOrg.organizationId,
      timestamp: new Date().toISOString(),
      ...result
    })

  } catch (error) {
    console.error('Error in AI monitoring action:', error)
    return createErrorResponse(error)
  }
}

function calculateHealthMetrics(aiStats: any, backgroundStats: any, recentErrors: any[]): any {
  const now = new Date()
  const errorRate = recentErrors.length / Math.max(aiStats?.real_time_processing?.total_messages || 1, 1)
  const backgroundSuccessRate = backgroundStats.successRate || 0
  
  return {
    overall: errorRate < 0.05 && backgroundSuccessRate > 90 ? 'healthy' : 
             errorRate < 0.15 && backgroundSuccessRate > 70 ? 'warning' : 'critical',
    errorRate: Math.round(errorRate * 100 * 100) / 100, // Round to 2 decimal places
    backgroundSuccessRate,
    avgProcessingTime: aiStats?.real_time_processing?.avg_processing_time_ms || 0,
    lastUpdated: now.toISOString(),
    indicators: {
      realTimeProcessing: errorRate < 0.1 ? 'healthy' : 'warning',
      backgroundProcessing: backgroundSuccessRate > 80 ? 'healthy' : backgroundSuccessRate > 60 ? 'warning' : 'critical',
      responseTime: (aiStats?.real_time_processing?.avg_processing_time_ms || 0) < 2000 ? 'healthy' : 'warning'
    }
  }
}

function generateRecommendations(healthMetrics: any, aiStats: any, processingJobs: any[], leadsNeedingAnalysis: any[]): string[] {
  const recommendations = []
  
  if (healthMetrics.overall === 'critical') {
    recommendations.push('🚨 System health is critical - investigate processing errors immediately')
  }
  
  if (healthMetrics.errorRate > 10) {
    recommendations.push('High error rate detected - check AI service configurations and API keys')
  }
  
  if (processingJobs?.length > 20) {
    recommendations.push('Large processing queue detected - consider increasing background processing capacity')
  }
  
  if (leadsNeedingAnalysis?.length > 50) {
    recommendations.push('Many leads need AI analysis - schedule bulk processing job')
  }
  
  if (healthMetrics.avgProcessingTime > 5000) {
    recommendations.push('Processing times are high - optimize AI queries or increase timeout limits')
  }
  
  if (aiStats?.processing_jobs?.failed > aiStats?.processing_jobs?.completed) {
    recommendations.push('More jobs failing than succeeding - check AI service health and credentials')
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ System is running optimally')
  }
  
  return recommendations
}

function calculatePercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0
  
  const sorted = values.slice().sort((a, b) => a - b)
  const index = Math.ceil(sorted.length * percentile) - 1
  return sorted[Math.max(0, index)] || 0
}