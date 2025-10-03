import { google, calendar_v3 } from 'googleapis'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { BookingLink } from './booking-link'

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  start: {
    dateTime: string
    timeZone: string
  }
  end: {
    dateTime: string
    timeZone: string
  }
  attendees?: Array<{
    email: string
    displayName?: string
  }>
  location?: string
  conferenceData?: {
    createRequest?: {
      requestId: string
      conferenceSolutionKey: {
        type: 'hangoutsMeet'
      }
    }
  }
}

export class GoogleCalendarBookingService {
  private supabase = createAdminClient()

  async getCalendarConnection(userId: string): Promise<calendar_v3.Calendar | null> {
    try {
      // Get the user's Google Calendar connection
      const { data: connection, error } = await this.supabase
        .from('calendar_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('provider', 'google')
        .eq('is_active', true)
        .single()

      if (error || !connection) {
        console.log('No Google Calendar connection found for user:', userId)
        return null
      }

      // Check if token is expired
      const now = new Date()
      const expiresAt = new Date(connection.expires_at)
      
      if (now >= expiresAt) {
        // Refresh the token
        const refreshedConnection = await this.refreshAccessToken(connection.id, connection.refresh_token)
        if (!refreshedConnection) return null
        connection.access_token = refreshedConnection.access_token
        connection.expires_at = refreshedConnection.expires_at
      }

      // Create Google Calendar client
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      )

      oauth2Client.setCredentials({
        access_token: connection.access_token,
        refresh_token: connection.refresh_token
      })

      return google.calendar({ version: 'v3', auth: oauth2Client })
    } catch (error) {
      console.error('Error getting calendar connection:', error)
      return null
    }
  }

  async createBookingEvent(
    bookingId: string,
    staffId: string,
    eventData: CalendarEvent
  ): Promise<string | null> {
    try {
      const calendar = await this.getCalendarConnection(staffId)
      if (!calendar) {
        console.log('No calendar connection available for staff:', staffId)
        return null
      }

      // Get the primary calendar
      const { data: calendars, error: calError } = await this.supabase
        .from('calendars')
        .select('google_calendar_id')
        .eq('connection_id', (await this.getConnectionId(staffId)))
        .eq('is_primary', true)
        .single()

      const calendarId = calendars?.google_calendar_id || 'primary'

      // Create the event
      const response = await calendar.events.insert({
        calendarId,
        requestBody: eventData,
        conferenceDataVersion: eventData.conferenceData ? 1 : undefined
      })

      if (response.data.id) {
        // Store the Google event ID in the booking
        await this.supabase
          .from('bookings')
          .update({ google_event_id: response.data.id })
          .eq('id', bookingId)

        return response.data.id
      }

      return null
    } catch (error) {
      console.error('Error creating calendar event:', error)
      return null
    }
  }

  async updateBookingEvent(
    bookingId: string,
    staffId: string,
    eventData: Partial<CalendarEvent>
  ): Promise<boolean> {
    try {
      const calendar = await this.getCalendarConnection(staffId)
      if (!calendar) return false

      // Get the booking with Google event ID
      const { data: booking, error } = await this.supabase
        .from('bookings')
        .select('google_event_id')
        .eq('id', bookingId)
        .single()

      if (error || !booking?.google_event_id) {
        console.log('No Google event ID found for booking:', bookingId)
        return false
      }

      // Get the calendar ID
      const { data: calendars } = await this.supabase
        .from('calendars')
        .select('google_calendar_id')
        .eq('connection_id', (await this.getConnectionId(staffId)))
        .eq('is_primary', true)
        .single()

      const calendarId = calendars?.google_calendar_id || 'primary'

      // Update the event
      await calendar.events.patch({
        calendarId,
        eventId: booking.google_event_id,
        requestBody: eventData
      })

      return true
    } catch (error) {
      console.error('Error updating calendar event:', error)
      return false
    }
  }

  async deleteBookingEvent(bookingId: string, staffId: string): Promise<boolean> {
    try {
      const calendar = await this.getCalendarConnection(staffId)
      if (!calendar) return false

      // Get the booking with Google event ID
      const { data: booking, error } = await this.supabase
        .from('bookings')
        .select('google_event_id')
        .eq('id', bookingId)
        .single()

      if (error || !booking?.google_event_id) {
        console.log('No Google event ID found for booking:', bookingId)
        return false
      }

      // Get the calendar ID
      const { data: calendars } = await this.supabase
        .from('calendars')
        .select('google_calendar_id')
        .eq('connection_id', (await this.getConnectionId(staffId)))
        .eq('is_primary', true)
        .single()

      const calendarId = calendars?.google_calendar_id || 'primary'

      // Delete the event
      await calendar.events.delete({
        calendarId,
        eventId: booking.google_event_id
      })

      // Clear the Google event ID from the booking
      await this.supabase
        .from('bookings')
        .update({ google_event_id: null })
        .eq('id', bookingId)

      return true
    } catch (error) {
      console.error('Error deleting calendar event:', error)
      return false
    }
  }

  async getBusyTimes(
    staffId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ start: string; end: string }>> {
    try {
      const calendar = await this.getCalendarConnection(staffId)
      if (!calendar) return []

      // Get the calendar ID
      const { data: calendars } = await this.supabase
        .from('calendars')
        .select('google_calendar_id')
        .eq('connection_id', (await this.getConnectionId(staffId)))
        .eq('is_enabled', true)

      const calendarIds = calendars?.map(cal => cal.google_calendar_id) || ['primary']

      // Get busy times using freebusy query
      const response = await calendar.freebusy.query({
        requestBody: {
          timeMin: startDate.toISOString(),
          timeMax: endDate.toISOString(),
          items: calendarIds.map(id => ({ id }))
        }
      })

      const busyTimes: Array<{ start: string; end: string }> = []

      Object.values(response.data.calendars || {}).forEach((calendar: any) => {
        if (calendar.busy) {
          calendar.busy.forEach((period: any) => {
            if (period.start && period.end) {
              busyTimes.push({
                start: period.start,
                end: period.end
              })
            }
          })
        }
      })

      return busyTimes
    } catch (error) {
      console.error('Error fetching busy times:', error)
      return []
    }
  }

  async generateBookingEvent(
    booking: any,
    bookingLink: BookingLink,
    appointmentType: any
  ): Promise<CalendarEvent> {
    const attendees = [
      {
        email: booking.attendee_email,
        displayName: booking.attendee_name
      }
    ]

    // Add staff member as attendee
    if (booking.assigned_to) {
      const { data: staff } = await this.supabase
        .from('users')
        .select('email, full_name')
        .eq('id', booking.assigned_to)
        .single()

      if (staff) {
        attendees.push({
          email: staff.email,
          displayName: staff.full_name
        })
      }
    }

    let location = ''
    let conferenceData = undefined

    // Set location based on meeting type
    switch (bookingLink.meeting_location.type) {
      case 'video_call':
        conferenceData = {
          createRequest: {
            requestId: `booking-${booking.id}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet' as const
            }
          }
        }
        location = 'Google Meet'
        break
      case 'phone':
        location = bookingLink.meeting_location.details || 'Phone call'
        break
      case 'in_person':
        location = bookingLink.meeting_location.details || 'In person'
        break
      default:
        location = bookingLink.meeting_location.details || ''
    }

    // Generate description
    const description = `
Booking Details:
• Client: ${booking.attendee_name}
• Email: ${booking.attendee_email}
${booking.attendee_phone ? `• Phone: ${booking.attendee_phone}` : ''}
• Service: ${appointmentType.name}
• Duration: ${appointmentType.duration_minutes} minutes
${booking.notes ? `• Notes: ${booking.notes}` : ''}

Booking ID: ${booking.id}
${bookingLink.cancellation_policy.allowed ? `\nCancellation Policy: ${bookingLink.cancellation_policy.policy_text}` : ''}
    `.trim()

    return {
      id: booking.id,
      summary: booking.title,
      description,
      start: {
        dateTime: booking.start_time,
        timeZone: booking.timezone
      },
      end: {
        dateTime: booking.end_time,
        timeZone: booking.timezone
      },
      attendees,
      location,
      conferenceData
    }
  }

  private async getConnectionId(userId: string): Promise<string | null> {
    const { data: connection } = await this.supabase
      .from('calendar_connections')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', 'google')
      .eq('is_active', true)
      .single()

    return connection?.id || null
  }

  private async refreshAccessToken(
    connectionId: string,
    refreshToken: string
  ): Promise<{ access_token: string; expires_at: string } | null> {
    try {
      const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET
      )

      oauth2Client.setCredentials({
        refresh_token: refreshToken
      })

      const { credentials } = await oauth2Client.refreshAccessToken()
      
      if (credentials.access_token && credentials.expiry_date) {
        const expiresAt = new Date(credentials.expiry_date).toISOString()
        
        // Update the connection with new token
        await this.supabase
          .from('calendar_connections')
          .update({
            access_token: credentials.access_token,
            expires_at: expiresAt,
            updated_at: new Date().toISOString()
          })
          .eq('id', connectionId)

        return {
          access_token: credentials.access_token,
          expires_at: expiresAt
        }
      }

      return null
    } catch (error) {
      console.error('Error refreshing access token:', error)
      
      // Mark connection as inactive if refresh fails
      await this.supabase
        .from('calendar_connections')
        .update({ is_active: false })
        .eq('id', connectionId)

      return null
    }
  }

  async syncAvailability(
    staffId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Array<{ start: string; end: string }>> {
    try {
      // Get busy times from Google Calendar
      const busyTimes = await this.getBusyTimes(staffId, startDate, endDate)
      
      // Get availability rules from database
      const { data: availabilityRules } = await this.supabase
        .from('availability_rules')
        .select('*')
        .eq('user_id', staffId)
        .eq('is_enabled', true)

      // Get availability overrides
      const { data: overrides } = await this.supabase
        .from('availability_overrides')
        .select('*')
        .eq('user_id', staffId)
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])

      // Calculate available slots (this is a simplified version)
      // In a full implementation, this would be more sophisticated
      const availableSlots: Array<{ start: string; end: string }> = []

      // For now, return empty array - full implementation would calculate
      // available times based on rules, overrides, and busy times
      return availableSlots
    } catch (error) {
      console.error('Error syncing availability:', error)
      return []
    }
  }

  async checkCalendarConflicts(
    staffId: string,
    startTime: string,
    endTime: string
  ): Promise<boolean> {
    try {
      const startDate = new Date(startTime)
      const endDate = new Date(endTime)
      
      // Extend the check by a few minutes to account for buffer time
      const checkStart = new Date(startDate.getTime() - 5 * 60 * 1000)
      const checkEnd = new Date(endDate.getTime() + 5 * 60 * 1000)

      const busyTimes = await this.getBusyTimes(staffId, checkStart, checkEnd)

      // Check if the requested time conflicts with any busy period
      for (const busyPeriod of busyTimes) {
        const busyStart = new Date(busyPeriod.start)
        const busyEnd = new Date(busyPeriod.end)

        // Check for overlap
        if (
          (startDate >= busyStart && startDate < busyEnd) ||
          (endDate > busyStart && endDate <= busyEnd) ||
          (startDate <= busyStart && endDate >= busyEnd)
        ) {
          return true // Conflict found
        }
      }

      return false // No conflicts
    } catch (error) {
      console.error('Error checking calendar conflicts:', error)
      return true // Assume conflict on error for safety
    }
  }

  async getStaffCalendarAvailability(
    staffId: string,
    bookingLinkId: string,
    date: Date
  ): Promise<Array<{ start: string; end: string; available: boolean }>> {
    try {
      // Get availability rules for this staff member and booking link
      const { data: availability } = await this.supabase
        .from('booking_availability')
        .select('*')
        .eq('booking_link_id', bookingLinkId)
        .eq('staff_id', staffId)
        .eq('day_of_week', date.getDay())
        .eq('is_available', true)

      if (!availability || availability.length === 0) {
        return [] // No availability rules set
      }

      // Get busy times from Google Calendar for this date
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      const busyTimes = await this.getBusyTimes(staffId, startOfDay, endOfDay)

      // Calculate available slots
      const availableSlots: Array<{ start: string; end: string; available: boolean }> = []

      for (const rule of availability) {
        const ruleStart = new Date(date)
        const [startHour, startMin] = rule.start_time.split(':').map(Number)
        ruleStart.setHours(startHour, startMin, 0, 0)

        const ruleEnd = new Date(date)
        const [endHour, endMin] = rule.end_time.split(':').map(Number)
        ruleEnd.setHours(endHour, endMin, 0, 0)

        // Generate 30-minute slots within the availability window
        let currentTime = new Date(ruleStart)
        while (currentTime < ruleEnd) {
          const slotEnd = new Date(currentTime.getTime() + 30 * 60 * 1000)
          if (slotEnd > ruleEnd) break

          // Check if this slot conflicts with busy times
          const hasConflict = busyTimes.some(busy => {
            const busyStart = new Date(busy.start)
            const busyEnd = new Date(busy.end)
            return (
              (currentTime >= busyStart && currentTime < busyEnd) ||
              (slotEnd > busyStart && slotEnd <= busyEnd) ||
              (currentTime <= busyStart && slotEnd >= busyEnd)
            )
          })

          availableSlots.push({
            start: currentTime.toISOString(),
            end: slotEnd.toISOString(),
            available: !hasConflict
          })

          currentTime = new Date(slotEnd.getTime())
        }
      }

      return availableSlots
    } catch (error) {
      console.error('Error getting staff calendar availability:', error)
      return []
    }
  }

  async createMeetingLink(eventId: string, staffId: string): Promise<string | null> {
    try {
      const calendar = await this.getCalendarConnection(staffId)
      if (!calendar) return null

      // Get the calendar ID
      const { data: calendars } = await this.supabase
        .from('calendars')
        .select('google_calendar_id')
        .eq('connection_id', (await this.getConnectionId(staffId)))
        .eq('is_primary', true)
        .single()

      const calendarId = calendars?.google_calendar_id || 'primary'

      // Get the event to check for meeting link
      const response = await calendar.events.get({
        calendarId,
        eventId
      })

      // Return meeting link if available
      return response.data.hangoutLink || response.data.conferenceData?.entryPoints?.[0]?.uri || null
    } catch (error) {
      console.error('Error getting meeting link:', error)
      return null
    }
  }
}

// Export singleton instance
export const googleCalendarBookingService = new GoogleCalendarBookingService()