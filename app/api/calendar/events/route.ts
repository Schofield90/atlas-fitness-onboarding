import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { createGoogleCalendarEvent, updateGoogleCalendarEvent, deleteGoogleCalendarEvent } from '@/app/lib/google-calendar'
import type { CalendarEvent } from '@/app/lib/types/calendar'

export const runtime = 'nodejs'

// Get calendar events
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('start')
    const endDate = searchParams.get('end')
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Get user's organization from user_organizations table
    const { data: membership } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()
    
    const organizationId = membership?.organization_id || 
                          user.user_metadata?.organization_id || 
                          '63589490-8f55-4157-bd3a-e141594b748e'
    
    console.log('Fetching events for organization:', organizationId)
    
    // Build query
    let query = supabase
      .from('calendar_events')
      .select('*')
      .eq('organization_id', organizationId)
      .order('start_time', { ascending: true })
    
    if (startDate) {
      query = query.gte('start_time', startDate)
    }
    
    if (endDate) {
      query = query.lte('start_time', endDate)
    }
    
    const { data: events, error } = await query
    
    if (error) {
      console.error('Error fetching events:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    // Transform database events to match CalendarEvent interface
    const transformedEvents = (events || []).map(event => ({
      id: event.id,
      title: event.title,
      description: event.description,
      startTime: event.start_time,
      endTime: event.end_time,
      attendees: event.attendees || [],
      meetingUrl: event.meeting_url,
      status: event.status,
      leadId: event.lead_id,
      organizationId: event.organization_id,
      createdBy: event.created_by,
      googleEventId: event.google_event_id
    }))
    
    return NextResponse.json({ 
      events: transformedEvents,
      total: transformedEvents.length
    })
    
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json({
      error: 'Failed to fetch events',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Create a new calendar event
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    console.log('=== Calendar Event Creation Debug ===')
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('User authenticated:', user.id)
    console.log('User metadata:', user.user_metadata)
    
    // Validate required fields
    if (!body.title || !body.startTime || !body.endTime) {
      return NextResponse.json({
        error: 'Missing required fields',
        required: ['title', 'startTime', 'endTime']
      }, { status: 400 })
    }
    
    // Get organization from user_organizations table (new approach)
    const { data: membership, error: membershipError } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at')
      .limit(1)
      .single()
    
    if (membershipError || !membership) {
      console.error('No organization membership found:', membershipError)
      // Fallback to metadata or default
      const organizationId = user.user_metadata?.organization_id || '63589490-8f55-4157-bd3a-e141594b748e'
      console.log('Using fallback organization ID:', organizationId)
    } else {
      console.log('Found organization membership:', membership.organization_id)
    }
    
    const organizationId = membership?.organization_id || 
                          user.user_metadata?.organization_id || 
                          '63589490-8f55-4157-bd3a-e141594b748e' // Atlas Fitness default
    
    // Prepare event data
    const eventData = {
      title: body.title,
      description: body.description || '',
      start_time: body.startTime,
      end_time: body.endTime,
      attendees: body.attendees || [],
      meeting_url: body.meetingUrl,
      status: body.status || 'confirmed',
      lead_id: body.leadId,
      organization_id: organizationId,
      created_by: user.id,
      google_event_id: null as string | null
    }
    
    // Generate meeting URL for video calls
    if (body.meetingType === 'video' && !eventData.meeting_url) {
      eventData.meeting_url = `https://meet.gymleadhub.com/${Date.now()}`
    }
    
    // Check if Google Calendar is connected by looking for tokens
    const { data: googleTokens } = await supabase
      .from('google_calendar_tokens')
      .select('id')
      .eq('user_id', user.id)
      .single()
    
    console.log('Google Calendar tokens found:', !!googleTokens)
    
    // Create event in Google Calendar if connected
    if (googleTokens) {
      try {
        const googleResult = await createGoogleCalendarEvent(user.id, {
          title: eventData.title,
          description: eventData.description,
          startTime: eventData.start_time,
          endTime: eventData.end_time,
          attendees: eventData.attendees,
          meetingUrl: eventData.meeting_url
        })
        
        eventData.google_event_id = googleResult.googleEventId
        if (googleResult.meetingUrl) {
          eventData.meeting_url = googleResult.meetingUrl
        }
      } catch (error: any) {
        console.error('Failed to create Google Calendar event:', {
          message: error.message,
          code: error.code,
          details: error
        })
        // Continue creating local event even if Google Calendar fails
      }
    }
    
    console.log('Event data to insert:', JSON.stringify(eventData, null, 2))
    
    // Create event in database
    const { data: newEvent, error } = await supabase
      .from('calendar_events')
      .insert(eventData)
      .select()
      .single()
    
    if (error) {
      console.error('Database insert error:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json({ 
        error: 'Failed to create event',
        details: error.message,
        code: error.code,
        hint: error.hint
      }, { status: 500 })
    }
    
    console.log('Event created successfully:', newEvent)
    
    // TODO: Send calendar invite email if requested
    if (body.sendCalendarInvite && body.attendees?.length > 0) {
      // await sendCalendarInvite(newEvent)
    }
    
    return NextResponse.json({
      success: true,
      event: newEvent
    })
    
  } catch (error) {
    console.error('Error creating event:', error)
    return NextResponse.json({
      error: 'Failed to create event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Update an event
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!body.id) {
      return NextResponse.json({
        error: 'Event ID is required'
      }, { status: 400 })
    }
    
    // Get existing event to check permissions and Google Calendar ID
    const { data: existingEvent, error: fetchError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', body.id)
      .single()
    
    if (fetchError || !existingEvent) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    
    // Update Google Calendar if event is synced
    if (existingEvent.google_event_id) {
      const { data: settings } = await supabase
        .from('calendar_settings')
        .select('google_calendar_connected')
        .eq('user_id', user.id)
        .single()
      
      if (settings?.google_calendar_connected) {
        try {
          await updateGoogleCalendarEvent(user.id, existingEvent.google_event_id, {
            title: body.title,
            description: body.description,
            startTime: body.start_time || body.startTime,
            endTime: body.end_time || body.endTime,
            attendees: body.attendees
          })
        } catch (error) {
          console.error('Failed to update Google Calendar event:', error)
          // Continue updating local event even if Google Calendar fails
        }
      }
    }
    
    // Prepare update data (convert camelCase to snake_case)
    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.startTime !== undefined) updateData.start_time = body.startTime
    if (body.endTime !== undefined) updateData.end_time = body.endTime
    if (body.attendees !== undefined) updateData.attendees = body.attendees
    if (body.meetingUrl !== undefined) updateData.meeting_url = body.meetingUrl
    if (body.status !== undefined) updateData.status = body.status
    if (body.leadId !== undefined) updateData.lead_id = body.leadId
    
    // Update event in database
    const { data: updatedEvent, error } = await supabase
      .from('calendar_events')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single()
    
    if (error) {
      console.error('Error updating event:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      event: updatedEvent
    })
    
  } catch (error) {
    console.error('Error updating event:', error)
    return NextResponse.json({
      error: 'Failed to update event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Delete an event
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get('id')
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    if (!eventId) {
      return NextResponse.json({
        error: 'Event ID is required'
      }, { status: 400 })
    }
    
    // Get event to check permissions and Google Calendar ID
    const { data: event, error: fetchError } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('id', eventId)
      .single()
    
    if (fetchError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    
    // Delete from Google Calendar if synced
    if (event.google_event_id) {
      const { data: settings } = await supabase
        .from('calendar_settings')
        .select('google_calendar_connected')
        .eq('user_id', user.id)
        .single()
      
      if (settings?.google_calendar_connected) {
        try {
          await deleteGoogleCalendarEvent(user.id, event.google_event_id)
        } catch (error) {
          console.error('Failed to delete Google Calendar event:', error)
          // Continue deleting local event even if Google Calendar fails
        }
      }
    }
    
    // Delete event from database
    const { error } = await supabase
      .from('calendar_events')
      .delete()
      .eq('id', eventId)
    
    if (error) {
      console.error('Error deleting event:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      deleted: event
    })
    
  } catch (error) {
    console.error('Error deleting event:', error)
    return NextResponse.json({
      error: 'Failed to delete event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}