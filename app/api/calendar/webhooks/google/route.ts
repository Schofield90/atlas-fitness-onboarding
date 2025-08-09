import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { googleCalendarService } from '@/app/lib/google-calendar-enhanced'

export const runtime = 'nodejs'

// POST /api/calendar/webhooks/google - Handle Google Calendar webhook notifications
export async function POST(request: NextRequest) {
  try {
    // Get webhook headers
    const channelId = request.headers.get('x-goog-channel-id')
    const resourceId = request.headers.get('x-goog-resource-id')
    const resourceState = request.headers.get('x-goog-resource-state')
    const resourceUri = request.headers.get('x-goog-resource-uri')
    const messageNumber = request.headers.get('x-goog-message-number')

    console.log('Google Calendar webhook received:', {
      channelId,
      resourceId,
      resourceState,
      resourceUri,
      messageNumber
    })

    // Validate webhook
    if (!channelId || !resourceId || !resourceState) {
      console.log('Invalid Google Calendar webhook - missing headers')
      return NextResponse.json({ success: true }, { status: 200 })
    }

    const adminSupabase = createAdminClient()

    // Find the calendar connection for this webhook
    const { data: connection, error: connectionError } = await adminSupabase
      .from('calendar_connections')
      .select('user_id, organization_id, metadata')
      .eq('provider', 'google')
      .eq('is_active', true)
      .single()

    if (connectionError || !connection) {
      console.log('No active Google Calendar connection found for webhook')
      return NextResponse.json({ success: true }, { status: 200 })
    }

    // Check if this webhook matches our stored channel
    const watchChannelId = connection.metadata?.watchChannelId
    if (watchChannelId !== channelId) {
      console.log('Webhook channel ID does not match stored channel ID')
      return NextResponse.json({ success: true }, { status: 200 })
    }

    // Handle different resource states
    switch (resourceState) {
      case 'sync':
        console.log('Google Calendar sync started')
        break

      case 'exists':
        console.log('Google Calendar event change detected')
        await handleCalendarChange(connection.user_id, connection.organization_id)
        break

      case 'not_exists':
        console.log('Google Calendar event deleted')
        await handleCalendarChange(connection.user_id, connection.organization_id)
        break

      default:
        console.log('Unknown Google Calendar resource state:', resourceState)
    }

    return NextResponse.json({ success: true }, { status: 200 })

  } catch (error) {
    console.error('Error handling Google Calendar webhook:', error)
    return NextResponse.json({ success: true }, { status: 200 })
  }
}

// Handle calendar changes by syncing affected bookings
async function handleCalendarChange(userId: string, organizationId: string) {
  try {
    const adminSupabase = createAdminClient()

    // Get recent bookings that might be affected
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: bookings } = await adminSupabase
      .from('bookings')
      .select('*')
      .eq('assigned_to', userId)
      .eq('organization_id', organizationId)
      .in('booking_status', ['confirmed', 'pending'])
      .gte('start_time', twentyFourHoursAgo)
      .lte('start_time', thirtyDaysFromNow)
      .not('google_event_id', 'is', null)

    if (!bookings || bookings.length === 0) {
      console.log('No bookings to sync')
      return
    }

    console.log(`Syncing ${bookings.length} bookings with Google Calendar`)

    // Get Google Calendar events to compare
    const accessToken = await googleCalendarService.getValidAccessToken(userId)
    if (!accessToken) {
      console.log('No valid access token for Google Calendar sync')
      return
    }

    // Fetch Google Calendar events
    const calendarEventsResponse = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${twentyFourHoursAgo}&timeMax=${thirtyDaysFromNow}&singleEvents=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!calendarEventsResponse.ok) {
      console.log('Failed to fetch Google Calendar events')
      return
    }

    const calendarData = await calendarEventsResponse.json()
    const googleEvents = calendarData.items || []

    // Create a map of Google events by ID
    const googleEventMap = new Map()
    googleEvents.forEach((event: any) => {
      if (event.id && event.extendedProperties?.private?.bookingId) {
        googleEventMap.set(event.id, event)
      }
    })

    // Check each booking against Google Calendar
    for (const booking of bookings) {
      const googleEvent = googleEventMap.get(booking.google_event_id)

      if (!googleEvent) {
        // Google Calendar event was deleted - mark booking as cancelled
        console.log(`Google event ${booking.google_event_id} not found - cancelling booking ${booking.id}`)
        
        await adminSupabase
          .from('bookings')
          .update({
            booking_status: 'cancelled',
            cancelled_at: new Date().toISOString(),
            cancellation_reason: 'Event deleted from Google Calendar',
            notes: booking.notes ? 
              `${booking.notes}\n\nAuto-cancelled: Google Calendar event deleted` :
              'Auto-cancelled: Google Calendar event deleted'
          })
          .eq('id', booking.id)

        // Create audit record
        await adminSupabase
          .from('booking_audit')
          .insert({
            booking_id: booking.id,
            organization_id: organizationId,
            action: 'cancelled',
            actor_type: 'system',
            reason: 'Google Calendar event deleted',
            new_data: { booking_status: 'cancelled' }
          })

        // Send cancellation notification
        await adminSupabase
          .from('notifications')
          .insert({
            organization_id: organizationId,
            booking_id: booking.id,
            type: 'email',
            template: 'booking_cancelled_auto',
            recipient_email: booking.attendee_email,
            recipient_name: booking.attendee_name,
            subject: `Booking Cancelled: ${booking.title}`,
            body: generateAutoCancellationEmail(booking),
            send_at: new Date().toISOString()
          })

      } else {
        // Check if Google Calendar event was updated
        const googleStart = new Date(googleEvent.start?.dateTime || googleEvent.start?.date)
        const googleEnd = new Date(googleEvent.end?.dateTime || googleEvent.end?.date)
        const bookingStart = new Date(booking.start_time)
        const bookingEnd = new Date(booking.end_time)

        const timeChanged = googleStart.getTime() !== bookingStart.getTime() || 
                          googleEnd.getTime() !== bookingEnd.getTime()

        if (timeChanged) {
          console.log(`Google event ${booking.google_event_id} time changed - updating booking ${booking.id}`)
          
          // Update booking with new times
          await adminSupabase
            .from('bookings')
            .update({
              start_time: googleStart.toISOString(),
              end_time: googleEnd.toISOString(),
              reschedule_count: booking.reschedule_count + 1,
              notes: booking.notes ? 
                `${booking.notes}\n\nAuto-updated: Google Calendar event time changed` :
                'Auto-updated: Google Calendar event time changed'
            })
            .eq('id', booking.id)

          // Create audit record
          await adminSupabase
            .from('booking_audit')
            .insert({
              booking_id: booking.id,
              organization_id: organizationId,
              action: 'rescheduled',
              actor_type: 'system',
              reason: 'Google Calendar event time changed',
              previous_data: { 
                start_time: booking.start_time, 
                end_time: booking.end_time 
              },
              new_data: { 
                start_time: googleStart.toISOString(), 
                end_time: googleEnd.toISOString() 
              }
            })

          // Send reschedule notification
          await adminSupabase
            .from('notifications')
            .insert({
              organization_id: organizationId,
              booking_id: booking.id,
              type: 'email',
              template: 'booking_rescheduled_auto',
              recipient_email: booking.attendee_email,
              recipient_name: booking.attendee_name,
              subject: `Booking Updated: ${booking.title}`,
              body: generateAutoRescheduleEmail(booking, googleStart, googleEnd),
              send_at: new Date().toISOString()
            })
        }
      }
    }

    console.log('Google Calendar sync completed')

  } catch (error) {
    console.error('Error handling calendar change:', error)
  }
}

// Helper function to generate auto-cancellation email
function generateAutoCancellationEmail(booking: any): string {
  return `
    <h2>Important: Your booking has been cancelled</h2>
    <p>Hi ${booking.attendee_name},</p>
    <p>We're writing to inform you that your ${booking.title} appointment scheduled for ${new Date(booking.start_time).toLocaleDateString()} at ${new Date(booking.start_time).toLocaleTimeString()} has been cancelled due to a scheduling change.</p>
    
    <p>We apologize for any inconvenience this may cause. Please contact us to reschedule your appointment.</p>
    
    <p>Thank you for your understanding.</p>
  `
}

// Helper function to generate auto-reschedule email
function generateAutoRescheduleEmail(booking: any, newStart: Date, newEnd: Date): string {
  return `
    <h2>Important: Your booking has been updated</h2>
    <p>Hi ${booking.attendee_name},</p>
    <p>We're writing to inform you that your ${booking.title} appointment has been rescheduled due to a scheduling change.</p>
    
    <h3>New Appointment Details:</h3>
    <ul>
      <li><strong>Date:</strong> ${newStart.toLocaleDateString()}</li>
      <li><strong>Time:</strong> ${newStart.toLocaleTimeString()} - ${newEnd.toLocaleTimeString()}</li>
      ${booking.location_details ? `<li><strong>Location:</strong> ${booking.location_details}</li>` : ''}
    </ul>
    
    <p>If this new time doesn't work for you, please contact us to reschedule.</p>
    
    <p>We apologize for any inconvenience and look forward to seeing you at the new time!</p>
  `
}

// GET /api/calendar/webhooks/google - Webhook verification endpoint
export async function GET(request: NextRequest) {
  // This endpoint can be used for webhook verification if needed
  return NextResponse.json({ 
    success: true, 
    message: 'Google Calendar webhook endpoint is active' 
  })
}