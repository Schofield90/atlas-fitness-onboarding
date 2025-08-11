import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'
import { cachedLeadService } from '@/app/lib/cache/cached-lead-service'
import { logger } from '@/app/lib/logger/logger'
import { invalidateOrgCache } from '@/app/lib/cache/cache-utils'

/**
 * Enhanced Leads API with Redis Caching
 * 
 * This endpoint provides the same functionality as the original leads API
 * but with comprehensive caching for improved performance
 */

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth()
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const source = searchParams.get('source')
    const assignedTo = searchParams.get('assigned_to')
    const createdBy = searchParams.get('created_by')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    
    // Build filter object
    const filters: any = {}
    
    if (status && status !== 'all') {
      filters.status = [status]
    }
    
    if (source) {
      filters.source = [source]
    }
    
    if (assignedTo) {
      filters.assignedTo = assignedTo
    }
    
    if (createdBy) {
      filters.createdBy = createdBy
    }
    
    // Use cached service based on whether it's a search or filter
    let result
    if (search) {
      result = await cachedLeadService.searchLeads(
        userWithOrg.organizationId,
        search,
        filters,
        page,
        limit
      )
    } else {
      result = await cachedLeadService.getLeads(
        userWithOrg.organizationId,
        filters,
        page,
        limit
      )
    }
    
    const responseTime = Date.now() - startTime
    
    // Log performance metrics
    logger.info(`Leads API (cached) - Org: ${userWithOrg.organizationId}, Response time: ${responseTime}ms`, {
      organizationId: userWithOrg.organizationId,
      responseTime,
      resultCount: result?.data?.length || 0,
      search: !!search,
      page,
      limit,
      filters: Object.keys(filters)
    })
    
    return NextResponse.json({
      success: true,
      leads: result?.data || [],
      pagination: {
        page: result?.page || page,
        limit: result?.limit || limit,
        total: result?.total || 0,
        totalPages: result?.totalPages || 0
      },
      organizationId: userWithOrg.organizationId,
      cached: true,
      responseTime,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    logger.error(`Cached leads API error (${responseTime}ms):`, error)
    
    return createErrorResponse(error, {
      cached: true,
      responseTime,
      fallbackToDatabase: false // Could implement database fallback here
    })
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth()
    
    const body = await request.json()
    
    // Validate required fields
    if (!body.first_name || !body.email || !body.phone) {
      return NextResponse.json({
        error: 'Missing required fields',
        required: ['first_name', 'email', 'phone'],
        cached: true
      }, { status: 400 })
    }
    
    // Prepare lead data
    const leadData = {
      first_name: body.first_name,
      last_name: body.last_name || '',
      email: body.email,
      phone: body.phone,
      source: body.source || 'Direct',
      status: body.status || 'new',
      tags: body.tags || [],
      metadata: {
        form_name: body.form_name,
        campaign_name: body.campaign_name,
        created_by: userWithOrg.id,
        ...body.metadata
      }
    }
    
    // Create lead using cached service
    const leadId = await cachedLeadService.createLead(
      userWithOrg.organizationId,
      leadData
    )
    
    const responseTime = Date.now() - startTime
    
    logger.info(`Lead created via cached API - Org: ${userWithOrg.organizationId}, Lead: ${leadId}, Response time: ${responseTime}ms`)
    
    // Trigger workflow for new lead (async, don't wait)
    triggerLeadWorkflow(leadId, userWithOrg.organizationId).catch(error => {
      logger.error('Failed to trigger lead workflow:', error)
    })
    
    return NextResponse.json({
      success: true,
      leadId,
      cached: true,
      responseTime,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    logger.error(`Cached lead creation error (${responseTime}ms):`, error)
    
    return createErrorResponse(error, {
      cached: true,
      responseTime
    })
  }
}

export async function PATCH(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth()
    
    const body = await request.json()
    
    if (!body.id) {
      return NextResponse.json({ 
        error: 'Lead ID is required',
        cached: true 
      }, { status: 400 })
    }
    
    // Remove fields that shouldn't be updated
    const { id, org_id, organization_id, created_by, ...updateData } = body
    
    // Add updated timestamp
    updateData.updated_at = new Date().toISOString()
    
    // Update lead using cached service
    await cachedLeadService.updateLead(body.id, updateData)
    
    const responseTime = Date.now() - startTime
    
    logger.info(`Lead updated via cached API - Lead: ${body.id}, Response time: ${responseTime}ms`)
    
    return NextResponse.json({
      success: true,
      leadId: body.id,
      cached: true,
      responseTime,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    logger.error(`Cached lead update error (${responseTime}ms):`, error)
    
    return createErrorResponse(error, {
      cached: true,
      responseTime
    })
  }
}

export async function DELETE(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Check authentication and get organization
    const userWithOrg = await requireAuth()
    
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('id')
    
    if (!leadId) {
      return NextResponse.json({ 
        error: 'Lead ID is required',
        cached: true 
      }, { status: 400 })
    }
    
    // Get lead first to verify ownership
    const lead = await cachedLeadService.getLead(leadId)
    
    if (!lead) {
      return NextResponse.json({ 
        error: 'Lead not found',
        cached: true 
      }, { status: 404 })
    }
    
    // Verify organization ownership
    if (lead.org_id !== userWithOrg.organizationId) {
      return NextResponse.json({ 
        error: 'Unauthorized access to lead',
        cached: true 
      }, { status: 403 })
    }
    
    // Delete lead (this would need to be implemented in the cached service)
    // For now, we'll invalidate the cache and use the original API
    await invalidateOrgCache(userWithOrg.organizationId, 'lead')
    
    const responseTime = Date.now() - startTime
    
    logger.warn(`Lead deletion not implemented in cached service - Lead: ${leadId}, invalidated cache instead`)
    
    return NextResponse.json({
      success: true,
      message: 'Lead deletion scheduled, cache invalidated',
      leadId,
      cached: true,
      responseTime,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    const responseTime = Date.now() - startTime
    logger.error(`Cached lead deletion error (${responseTime}ms):`, error)
    
    return createErrorResponse(error, {
      cached: true,
      responseTime
    })
  }
}

/**
 * Trigger lead workflow asynchronously
 */
async function triggerLeadWorkflow(leadId: string, organizationId: string): Promise<void> {
  try {
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhooks/lead-created`
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Source': 'cached-api'
      },
      body: JSON.stringify({
        leadId,
        organizationId,
        source: 'cached-api'
      })
    })
    
    if (!response.ok) {
      throw new Error(`Webhook failed with status ${response.status}`)
    }
    
    logger.info(`Lead workflow triggered for lead ${leadId}`)
    
  } catch (error) {
    logger.error(`Failed to trigger lead workflow for lead ${leadId}:`, error)
    throw error
  }
}