import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { requireAuth, createOrgScopedClient } from '@/lib/auth-middleware'
import { 
  getCalendarClient, 
  listCalendarEvents, 
  createCalendarEvent 
} from '@/app/lib/google/calendar'

export async function POST(request: NextRequest) {
  // Authentication check
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  
  // Create organization-scoped Supabase client
  const supabase = createOrgScopedClient(auth.organizationId)
  
  try {
    const supabase = await createClient()
    
    // Get tokens and settings
    const { data: tokenData } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .single()
    
    if (!tokenData) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const { data: settings } = await supabase
      .from('calendar_sync_settings')
      .select('*')
      .single()
    
    if (!settings) {
      return NextResponse.json({ error: 'No sync settings configured' }, { status: 400 })
    }
    
    let syncedCount = 0
    
    // Sync bookings to Google Calendar
    if (settings.sync_bookings && settings.sync_direction !== 'from_google') {
      const { data: bookings } = await supabase
        .from('bookings')
        .select(`
          *,
          class_sessions (
            start_time,
            end_time,
            programs (name)
          ),
          members (
            first_name,
            last_name,
            email
          )
        `)
        .eq('status', 'confirmed')
        .gte('class_sessions.start_time', new Date().toISOString())
      
      if (bookings) {
        for (const booking of bookings) {
          // Check if already synced
          const { data: existing } = await supabase
            .from('calendar_sync_events')
            .select('google_event_id')
            .eq('local_event_id', booking.id)
            .single()
          
          if (!existing) {
            const event = {
              summary: `${booking.class_sessions.programs.name} - ${booking.members.first_name} ${booking.members.last_name}`,
              description: `Booking for ${booking.members.first_name} ${booking.members.last_name}\nEmail: ${booking.members.email}`,
              start: {
                dateTime: booking.class_sessions.start_time,
                timeZone: 'Europe/London'
              },
              end: {
                dateTime: booking.class_sessions.end_time,
                timeZone: 'Europe/London'
              },
              colorId: '2' // Green for bookings
            }
            
            try {
              const createdEvent = await createCalendarEvent(
                tokenData,
                event,
                settings.google_calendar_id
              )
              
              // Record sync
              await supabase
                .from('calendar_sync_events')
                .insert({
                  google_event_id: createdEvent.id,
                  local_event_id: booking.id,
                  local_event_type: 'booking'
                })
              
              syncedCount++
            } catch (error) {
              console.error('Error syncing booking:', error)
            }
          }
        }
      }
    }
    
    // Sync classes to Google Calendar
    if (settings.sync_classes && settings.sync_direction !== 'from_google') {
      const { data: classes } = await supabase
        .from('class_sessions')
        .select(`
          *,
          programs (name),
          instructors (
            first_name,
            last_name
          )
        `)
        .gte('start_time', new Date().toISOString())
      
      if (classes) {
        for (const classSession of classes) {
          // Check if already synced
          const { data: existing } = await supabase
            .from('calendar_sync_events')
            .select('google_event_id')
            .eq('local_event_id', classSession.id)
            .single()
          
          if (!existing) {
            const event = {
              summary: `${classSession.programs.name} Class`,
              description: `Instructor: ${classSession.instructors?.first_name || 'TBD'} ${classSession.instructors?.last_name || ''}\nCapacity: ${classSession.current_participants}/${classSession.max_participants}`,
              start: {
                dateTime: classSession.start_time,
                timeZone: 'Europe/London'
              },
              end: {
                dateTime: classSession.end_time,
                timeZone: 'Europe/London'
              },
              colorId: '5' // Yellow for classes
            }
            
            try {
              const createdEvent = await createCalendarEvent(
                tokenData,
                event,
                settings.google_calendar_id
              )
              
              // Record sync
              await supabase
                .from('calendar_sync_events')
                .insert({
                  google_event_id: createdEvent.id,
                  local_event_id: classSession.id,
                  local_event_type: 'class'
                })
              
              syncedCount++
            } catch (error) {
              console.error('Error syncing class:', error)
            }
          }
        }
      }
    }
    
    return NextResponse.json({ 
      success: true, 
      synced: syncedCount 
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json({ error: 'Sync failed' }, { status: 500 })
  }
}