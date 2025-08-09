import { createAdminClient } from '@/app/lib/supabase/admin'

// Google Calendar API base URL
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

// Enhanced Google Calendar service for comprehensive booking system
export class GoogleCalendarService {
  private adminSupabase = createAdminClient()

  // Get valid access token with automatic refresh
  async getValidAccessToken(userId: string, email?: string): Promise<string | null> {
    const { data: connection, error } = await this.adminSupabase
      .from('calendar_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error || !connection) {
      console.error('No Google Calendar connection found:', error)
      return null
    }
    
    // Check if token is expired
    if (connection.expires_at && new Date(connection.expires_at) <= new Date()) {
      // Token is expired, refresh it
      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          refresh_token: connection.refresh_token,
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          grant_type: 'refresh_token',
        }),
      })
      
      if (!refreshResponse.ok) {
        console.error('Failed to refresh Google Calendar token')
        // Mark connection as inactive
        await this.adminSupabase
          .from('calendar_connections')
          .update({ 
            is_active: false, 
            sync_errors: connection.sync_errors + 1 
          })
          .eq('id', connection.id)
        
        return null
      }
      
      const tokens = await refreshResponse.json()
      
      // Update stored tokens
      await this.adminSupabase
        .from('calendar_connections')
        .update({
          access_token: tokens.access_token,
          expires_at: tokens.expires_in 
            ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() 
            : null,
          sync_errors: 0,
          last_sync: new Date().toISOString()
        })
        .eq('id', connection.id)
      
      return tokens.access_token
    }
    
    return connection.access_token
  }

  // Get user's Google Calendar busy times using FreeBusy API
  async getGoogleCalendarBusyTimes(
    userId: string,
    timeMin: string,
    timeMax: string,
    calendarIds?: string[]
  ): Promise<Array<{ start: string; end: string; calendar: string }>> {
    const accessToken = await this.getValidAccessToken(userId)
    if (!accessToken) {
      return []
    }

    // Get user's calendars if not specified
    let calendarsToCheck = calendarIds
    if (!calendarsToCheck) {
      const { data: calendars } = await this.adminSupabase
        .from('calendars')
        .select('google_calendar_id')
        .eq('user_id', userId)
        .eq('is_enabled', true)

      calendarsToCheck = calendars?.map(cal => cal.google_calendar_id) || ['primary']
    }

    const response = await fetch(`${GOOGLE_CALENDAR_API}/freeBusy`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: calendarsToCheck.map(id => ({ id })),
      }),
    })
    
    if (!response.ok) {
      console.error('Failed to get busy times from Google Calendar')
      return []
    }
    
    const data = await response.json()
    const busyTimes: Array<{ start: string; end: string; calendar: string }> = []

    // Process busy times from all calendars
    Object.entries(data.calendars || {}).forEach(([calendarId, calendarData]: [string, any]) => {
      if (calendarData.busy) {
        calendarData.busy.forEach((busyTime: any) => {
          busyTimes.push({
            start: busyTime.start,
            end: busyTime.end,
            calendar: calendarId
          })
        })
      }
    })

    return busyTimes
  }

  // Create Google Calendar event for booking
  async createBookingEvent(
    userId: string,
    booking: {
      id: string
      title: string
      description?: string
      start_time: string
      end_time: string
      attendee_name?: string
      attendee_email?: string
      location_details?: string
      timezone: string
    }
  ): Promise<string | null> {
    const accessToken = await this.getValidAccessToken(userId)
    if (!accessToken) {
      throw new Error('No valid Google Calendar access token')
    }
    
    // Format event for Google Calendar API
    const googleEvent = {
      summary: booking.title,
      description: booking.description,
      start: {
        dateTime: booking.start_time,
        timeZone: booking.timezone,
      },
      end: {
        dateTime: booking.end_time,
        timeZone: booking.timezone,
      },
      attendees: booking.attendee_email ? [{
        email: booking.attendee_email,
        displayName: booking.attendee_name,
        responseStatus: 'accepted'
      }] : undefined,
      location: booking.location_details,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 24 hours
          { method: 'popup', minutes: 30 }, // 30 minutes
        ],
      },
      extendedProperties: {
        private: {
          bookingId: booking.id,
          source: 'atlas-fitness-booking'
        }
      }
    }
    
    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(googleEvent),
      }
    )
    
    if (!response.ok) {
      const error = await response.json()
      console.error('Failed to create Google Calendar event:', error)
      throw new Error('Failed to create Google Calendar event')
    }
    
    const createdEvent = await response.json()
    return createdEvent.id
  }

  // Update Google Calendar event
  async updateBookingEvent(
    userId: string,
    googleEventId: string,
    updates: {
      title?: string
      description?: string
      start_time?: string
      end_time?: string
      attendee_name?: string
      attendee_email?: string
      location_details?: string
      timezone?: string
    }
  ): Promise<void> {
    const accessToken = await this.getValidAccessToken(userId)
    if (!accessToken) {
      throw new Error('No valid Google Calendar access token')
    }
    
    // First get the existing event
    const getResponse = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events/${googleEventId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )
    
    if (!getResponse.ok) {
      throw new Error('Failed to get Google Calendar event')
    }
    
    const existingEvent = await getResponse.json()
    
    // Update event fields
    const updatedEvent = {
      ...existingEvent,
      summary: updates.title || existingEvent.summary,
      description: updates.description !== undefined ? updates.description : existingEvent.description,
      start: updates.start_time ? {
        dateTime: updates.start_time,
        timeZone: updates.timezone || 'Europe/London',
      } : existingEvent.start,
      end: updates.end_time ? {
        dateTime: updates.end_time,
        timeZone: updates.timezone || 'Europe/London',
      } : existingEvent.end,
      location: updates.location_details !== undefined ? updates.location_details : existingEvent.location,
      attendees: updates.attendee_email ? [{
        email: updates.attendee_email,
        displayName: updates.attendee_name,
        responseStatus: 'accepted'
      }] : existingEvent.attendees,
    }
    
    const updateResponse = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events/${googleEventId}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedEvent),
      }
    )
    
    if (!updateResponse.ok) {
      const error = await updateResponse.json()
      console.error('Failed to update Google Calendar event:', error)
      throw new Error('Failed to update Google Calendar event')
    }
  }

  // Delete Google Calendar event
  async deleteBookingEvent(userId: string, googleEventId: string): Promise<void> {
    const accessToken = await this.getValidAccessToken(userId)
    if (!accessToken) {
      throw new Error('No valid Google Calendar access token')
    }
    
    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/primary/events/${googleEventId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )
    
    if (!response.ok && response.status !== 404) {
      const error = await response.json()
      console.error('Failed to delete Google Calendar event:', error)
      throw new Error('Failed to delete Google Calendar event')
    }
  }

  // Setup webhook to watch for calendar changes
  async setupCalendarWatch(
    userId: string,
    calendarId: string = 'primary'
  ): Promise<{ channelId: string; resourceId: string } | null> {
    const accessToken = await this.getValidAccessToken(userId)
    if (!accessToken) {
      return null
    }

    const channelId = `${userId}-${calendarId}-${Date.now()}`
    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/webhooks/google`

    const response = await fetch(
      `${GOOGLE_CALENDAR_API}/calendars/${calendarId}/events/watch`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: channelId,
          type: 'web_hook',
          address: webhookUrl,
          params: {
            ttl: 604800, // 7 days
          },
        }),
      }
    )

    if (!response.ok) {
      console.error('Failed to setup Google Calendar watch')
      return null
    }

    const watchData = await response.json()
    
    // Store watch information for cleanup later
    await this.adminSupabase
      .from('calendar_connections')
      .update({
        metadata: {
          watchChannelId: channelId,
          watchResourceId: watchData.resourceId,
          watchExpiration: watchData.expiration
        }
      })
      .eq('user_id', userId)
      .eq('provider', 'google')

    return {
      channelId,
      resourceId: watchData.resourceId
    }
  }

  // Stop calendar watch
  async stopCalendarWatch(channelId: string, resourceId: string): Promise<void> {
    // This would need a valid access token, but we can use any connection's token
    // since stopping a watch doesn't require specific user permissions
    const { data: connection } = await this.adminSupabase
      .from('calendar_connections')
      .select('access_token')
      .eq('provider', 'google')
      .eq('is_active', true)
      .limit(1)
      .single()

    if (!connection) {
      console.error('No active Google Calendar connection for stopping watch')
      return
    }

    await fetch(`${GOOGLE_CALENDAR_API}/channels/stop`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${connection.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: channelId,
        resourceId: resourceId,
      }),
    })
  }

  // Sync booking with Google Calendar (create, update, or delete)
  async syncBookingWithGoogle(
    userId: string,
    booking: any,
    action: 'create' | 'update' | 'delete'
  ): Promise<void> {
    try {
      switch (action) {
        case 'create':
          if (!booking.google_event_id) {
            const googleEventId = await this.createBookingEvent(userId, booking)
            if (googleEventId) {
              // Update booking with Google event ID
              await this.adminSupabase
                .from('bookings')
                .update({ google_event_id: googleEventId })
                .eq('id', booking.id)
            }
          }
          break

        case 'update':
          if (booking.google_event_id) {
            await this.updateBookingEvent(userId, booking.google_event_id, booking)
          }
          break

        case 'delete':
          if (booking.google_event_id) {
            await this.deleteBookingEvent(userId, booking.google_event_id)
          }
          break
      }
    } catch (error) {
      console.error('Failed to sync booking with Google Calendar:', error)
      // Don't throw error to prevent booking operations from failing
    }
  }
}

// Export singleton instance
export const googleCalendarService = new GoogleCalendarService()