import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { requireAuth, createErrorResponse } from '@/app/lib/api/auth-check'

export async function POST(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth()
    const supabase = await createClient()
    const body = await request.json()
    
    const { leadId, activityType, activityValue, metadata, batchActivities } = body
    
    if (batchActivities && Array.isArray(batchActivities)) {
      // Handle batch activity recording
      const activities = batchActivities.map(activity => ({
        organization_id: userWithOrg.organizationId,
        lead_id: activity.leadId,
        activity_type: activity.activityType,
        activity_value: activity.activityValue || 1.0,
        activity_metadata: activity.metadata || {}
      }))
      
      const { error } = await supabase
        .from('lead_activities')
        .insert(activities)
      
      if (error) {
        return NextResponse.json({ error: 'Failed to record activities' }, { status: 500 })
      }
      
      return NextResponse.json({
        success: true,
        recorded: activities.length
      })
    }
    
    // Handle single activity recording
    if (!leadId || !activityType) {
      return NextResponse.json({
        error: 'Lead ID and activity type are required'
      }, { status: 400 })
    }
    
    // Validate activity type
    const validTypes = [
      'email_open', 'email_click', 'form_submission', 'website_visit',
      'page_view', 'download', 'video_watch', 'call_answer', 'call_missed',
      'sms_reply', 'whatsapp_reply', 'booking_attempt', 'social_engagement'
    ]
    
    if (!validTypes.includes(activityType)) {
      return NextResponse.json({
        error: 'Invalid activity type',
        validTypes
      }, { status: 400 })
    }
    
    // Verify lead exists and belongs to organization
    const { data: lead } = await supabase
      .from('leads')
      .select('id')
      .eq('id', leadId)
      .eq('organization_id', userWithOrg.organizationId)
      .single()
    
    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }
    
    // Record the activity
    const { data: activity, error } = await supabase
      .from('lead_activities')
      .insert({
        organization_id: userWithOrg.organizationId,
        lead_id: leadId,
        activity_type: activityType,
        activity_value: activityValue || 1.0,
        activity_metadata: metadata || {}
      })
      .select()
      .single()
    
    if (error) {
      return NextResponse.json({ error: 'Failed to record activity' }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      activity
    })
    
  } catch (error) {
    return createErrorResponse(error)
  }
}

export async function GET(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth()
    const supabase = await createClient()
    
    const { searchParams } = new URL(request.url)
    const leadId = searchParams.get('leadId')
    const activityType = searchParams.get('type')
    const limit = parseInt(searchParams.get('limit') || '50')
    const days = parseInt(searchParams.get('days') || '30')
    
    // Build query
    let query = supabase
      .from('lead_activities')
      .select(`
        *,
        leads (name, email)
      `)
      .eq('organization_id', userWithOrg.organizationId)
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false })
      .limit(limit)
    
    if (leadId) {
      query = query.eq('lead_id', leadId)
    }
    
    if (activityType) {
      query = query.eq('activity_type', activityType)
    }
    
    const { data: activities, error } = await query
    
    if (error) {
      return NextResponse.json({ error: 'Failed to fetch activities' }, { status: 500 })
    }
    
    // Get activity statistics
    const stats = await getActivityStats(supabase, userWithOrg.organizationId, leadId, days)
    
    return NextResponse.json({
      success: true,
      activities: activities || [],
      stats
    })
    
  } catch (error) {
    return createErrorResponse(error)
  }
}

async function getActivityStats(supabase: any, organizationId: string, leadId?: string, days: number = 30) {
  try {
    let query = supabase
      .from('lead_activities')
      .select('activity_type, activity_value, created_at')
      .eq('organization_id', organizationId)
      .gte('created_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
    
    if (leadId) {
      query = query.eq('lead_id', leadId)
    }
    
    const { data: activities } = await query
    
    if (!activities) return {}
    
    // Calculate statistics
    const stats = {
      totalActivities: activities.length,
      byType: {} as Record<string, number>,
      totalValue: 0,
      averagePerDay: 0,
      mostActive: ''
    }
    
    activities.forEach(activity => {
      stats.byType[activity.activity_type] = (stats.byType[activity.activity_type] || 0) + 1
      stats.totalValue += activity.activity_value || 0
    })
    
    stats.averagePerDay = Math.round(activities.length / days * 10) / 10
    
    // Find most common activity type
    const maxType = Object.entries(stats.byType).reduce((a, b) => 
      stats.byType[a[0]] > stats.byType[b[0]] ? a : b
    )
    
    if (maxType) {
      stats.mostActive = maxType[0]
    }
    
    return stats
  } catch (error) {
    console.error('Error calculating activity stats:', error)
    return {}
  }
}