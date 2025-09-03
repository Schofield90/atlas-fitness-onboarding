import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'
import { enhancedLeadProcessor } from '@/app/lib/ai/enhanced-lead-processor'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()
    
    const { 
      leadIds,
      filters = {},
      processingOptions = {},
      batchSize = 10
    } = body

    console.log('Starting bulk lead processing:', {
      organizationId: userWithOrg.organizationId,
      leadIdsProvided: leadIds?.length || 0,
      filters,
      processingOptions,
      batchSize
    })

    let leadsToProcess = []

    // If specific lead IDs are provided, use them
    if (leadIds && leadIds.length > 0) {
      // Validate that leads belong to organization
      const { data: validLeads, error } = await supabase
        .from('leads')
        .select('id, name, status, lead_score')
        .in('id', leadIds)
        .eq('organization_id', userWithOrg.organizationId)

      if (error) {
        throw new Error(`Failed to validate leads: ${error.message}`)
      }

      leadsToProcess = validLeads || []
    } else {
      // Build query based on filters
      let query = supabase
        .from('leads')
        .select('id, name, status, lead_score, created_at')
        .eq('organization_id', userWithOrg.organizationId)

      // Apply filters
      if (filters.status) {
        query = query.in('status', Array.isArray(filters.status) ? filters.status : [filters.status])
      }

      if (filters.scoreRange) {
        if (filters.scoreRange.min !== undefined) {
          query = query.gte('lead_score', filters.scoreRange.min)
        }
        if (filters.scoreRange.max !== undefined) {
          query = query.lte('lead_score', filters.scoreRange.max)
        }
      }

      if (filters.createdAfter) {
        query = query.gte('created_at', filters.createdAfter)
      }

      if (filters.createdBefore) {
        query = query.lte('created_at', filters.createdBefore)
      }

      // Limit results to prevent overwhelming the system
      const limit = Math.min(filters.limit || 100, 500) // Max 500 leads at once
      query = query.limit(limit)

      const { data: filteredLeads, error } = await query

      if (error) {
        throw new Error(`Failed to fetch leads: ${error.message}`)
      }

      leadsToProcess = filteredLeads || []
    }

    if (leadsToProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No leads found matching criteria',
        processed: 0,
        failed: 0,
        results: []
      })
    }

    console.log(`Found ${leadsToProcess.length} leads to process`)

    const startTime = Date.now()
    const results = []
    const batchResults = { successful: [], failed: [] }

    // Process in batches to avoid overwhelming the system
    for (let i = 0; i < leadsToProcess.length; i += batchSize) {
      const batch = leadsToProcess.slice(i, i + batchSize)
      const batchStartTime = Date.now()
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(leadsToProcess.length / batchSize)} (${batch.length} leads)`)

      // Process current batch
      const batchProcessingResults = await enhancedLeadProcessor.processBulkLeads(
        batch.map(lead => lead.id),
        processingOptions
      )

      batchResults.successful.push(...batchProcessingResults.successful)
      batchResults.failed.push(...batchProcessingResults.failed)

      const batchTime = Date.now() - batchStartTime
      
      results.push({
        batchNumber: Math.floor(i / batchSize) + 1,
        batchSize: batch.length,
        successful: batchProcessingResults.successful.length,
        failed: batchProcessingResults.failed.length,
        processingTimeMs: batchTime,
        leadsInBatch: batch.map(lead => ({
          id: lead.id,
          name: lead.name,
          previousScore: lead.lead_score
        }))
      })

      // Add small delay between batches to prevent overwhelming the AI APIs
      if (i + batchSize < leadsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)) // 1 second delay
      }
    }

    const totalTime = Date.now() - startTime

    // Log bulk processing completion
    await supabase
      .from('ai_processing_logs')
      .insert({
        organization_id: userWithOrg.organizationId,
        processing_type: 'bulk_enhanced_analysis',
        leads_processed: batchResults.successful.length,
        leads_failed: batchResults.failed.length,
        processing_time_ms: totalTime,
        filters_applied: filters,
        processing_options: processingOptions,
        created_at: new Date().toISOString()
      })

    console.log('Bulk processing completed:', {
      totalLeads: leadsToProcess.length,
      successful: batchResults.successful.length,
      failed: batchResults.failed.length,
      totalTimeMs: totalTime,
      avgTimePerLead: Math.round(totalTime / leadsToProcess.length)
    })

    return NextResponse.json({
      success: true,
      message: `Bulk processing completed: ${batchResults.successful.length} successful, ${batchResults.failed.length} failed`,
      summary: {
        totalLeads: leadsToProcess.length,
        processed: batchResults.successful.length,
        failed: batchResults.failed.length,
        processingTimeMs: totalTime,
        avgTimePerLead: Math.round(totalTime / leadsToProcess.length),
        batches: results.length
      },
      results: {
        successful: batchResults.successful,
        failed: batchResults.failed,
        batchDetails: results
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error in bulk lead processing:', error)
    return createErrorResponse(error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth()
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // Get bulk processing statistics
    const days = parseInt(searchParams.get('days') || '30')
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    const { data: processingStats } = await supabase
      .from('ai_processing_logs')
      .select('*')
      .eq('organization_id', userWithOrg.organizationId)
      .eq('processing_type', 'bulk_enhanced_analysis')
      .gte('created_at', startDate)
      .order('created_at', { ascending: false })

    // Get leads that need AI processing (no recent insights)
    const { data: leadsNeedingProcessing } = await supabase
      .from('leads')
      .select(`
        id, 
        name, 
        status, 
        lead_score, 
        created_at,
        lead_ai_insights!inner(created_at)
      `)
      .eq('organization_id', userWithOrg.organizationId)
      .lt('lead_ai_insights.created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Older than 24 hours
      .limit(100)

    // Calculate statistics
    const totalProcessed = processingStats?.reduce((sum, log) => sum + (log.leads_processed || 0), 0) || 0
    const totalFailed = processingStats?.reduce((sum, log) => sum + (log.leads_failed || 0), 0) || 0
    const avgProcessingTime = processingStats?.length > 0 
      ? processingStats.reduce((sum, log) => sum + (log.processing_time_ms || 0), 0) / processingStats.length 
      : 0

    return NextResponse.json({
      success: true,
      statistics: {
        period: `Last ${days} days`,
        totalBulkJobs: processingStats?.length || 0,
        totalLeadsProcessed: totalProcessed,
        totalFailed: totalFailed,
        successRate: totalProcessed + totalFailed > 0 
          ? Math.round((totalProcessed / (totalProcessed + totalFailed)) * 100) 
          : 0,
        avgProcessingTimeMs: Math.round(avgProcessingTime)
      },
      recentJobs: processingStats?.slice(0, 10) || [],
      leadsNeedingProcessing: {
        count: leadsNeedingProcessing?.length || 0,
        leads: (leadsNeedingProcessing || []).slice(0, 20).map(lead => ({
          id: lead.id,
          name: lead.name,
          status: lead.status,
          leadScore: lead.lead_score,
          daysSinceCreated: Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24))
        }))
      },
      recommendations: {
        suggestedBatchSize: totalProcessed > 0 && avgProcessingTime > 0 
          ? Math.min(Math.max(Math.floor(60000 / (avgProcessingTime / 10)), 5), 20) // Aim for ~1min per batch
          : 10,
        nextProcessingWindow: new Date(Date.now() + 60 * 60 * 1000).toISOString() // Suggest 1 hour from now
      },
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Error getting bulk processing stats:', error)
    return createErrorResponse(error)
  }
}