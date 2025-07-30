import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

// Google Calendar API base URL
const GOOGLE_CALENDAR_API = 'https://www.googleapis.com/calendar/v3'

// Get valid access token (refresh if needed)
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const adminSupabase = createAdminClient()
  
  // Get calendar integration from google_calendar_tokens table using admin client
  const { data: integration, error } = await adminSupabase
    .from('google_calendar_tokens')
    .select('*')
    .eq('user_id', userId)
    .single()
  
  if (error || !integration) {
    console.error('No Google Calendar tokens found:', error)
    return null
  }
  
  // Check if token is expired
  if (integration.expiry_date && new Date(integration.expiry_date) <= new Date()) {
    // Token is expired, refresh it
    const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        refresh_token: integration.refresh_token,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: 'refresh_token',
      }),
    })
    
    if (!refreshResponse.ok) {
      console.error('Failed to refresh token')
      return null
    }
    
    const tokens = await refreshResponse.json()
    
    // Update stored tokens
    await adminSupabase
      .from('google_calendar_tokens')
      .update({
        access_token: tokens.access_token,
        expiry_date: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
      })
      .eq('id', integration.id)
    
    return tokens.access_token
  }
  
  return integration.access_token
}

// Create Google Calendar event
export async function createGoogleCalendarEvent(
  userId: string,
  event: {
    title: string
    description?: string
    startTime: string
    endTime: string
    attendees?: { email: string; name?: string }[]
    meetingUrl?: string
  }
) {
  const accessToken = await getValidAccessToken(userId)
  if (!accessToken) {
    throw new Error('No valid Google Calendar access token')
  }
  
  // Format event for Google Calendar API
  const googleEvent = {
    summary: event.title,
    description: event.description,
    start: {
      dateTime: event.startTime,
      timeZone: 'Europe/London', // British timezone
    },
    end: {
      dateTime: event.endTime,
      timeZone: 'Europe/London', // British timezone
    },
    attendees: event.attendees?.map(a => ({
      email: a.email,
      displayName: a.name,
    })),
    conferenceData: event.meetingUrl ? {
      createRequest: {
        requestId: `gymleadhub-${Date.now()}`,
        conferenceSolutionKey: {
          type: 'hangoutsMeet'
        }
      }
    } : undefined,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 24 hours
        { method: 'popup', minutes: 30 }, // 30 minutes
      ],
    },
  }
  
  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/calendars/primary/events?conferenceDataVersion=1`,
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
  return {
    googleEventId: createdEvent.id,
    meetingUrl: createdEvent.hangoutLink || event.meetingUrl,
  }
}

// Update Google Calendar event
export async function updateGoogleCalendarEvent(
  userId: string,
  googleEventId: string,
  updates: {
    title?: string
    description?: string
    startTime?: string
    endTime?: string
    attendees?: { email: string; name?: string }[]
  }
) {
  const accessToken = await getValidAccessToken(userId)
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
    start: updates.startTime ? {
      dateTime: updates.startTime,
      timeZone: 'Europe/London',
    } : existingEvent.start,
    end: updates.endTime ? {
      dateTime: updates.endTime,
      timeZone: 'Europe/London',
    } : existingEvent.end,
    attendees: updates.attendees ? updates.attendees.map(a => ({
      email: a.email,
      displayName: a.name,
    })) : existingEvent.attendees,
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
  
  return await updateResponse.json()
}

// Delete Google Calendar event
export async function deleteGoogleCalendarEvent(userId: string, googleEventId: string) {
  const accessToken = await getValidAccessToken(userId)
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

// Get busy times from Google Calendar
export async function getGoogleCalendarBusyTimes(
  userId: string,
  timeMin: string,
  timeMax: string
): Promise<Array<{ start: string; end: string }>> {
  const accessToken = await getValidAccessToken(userId)
  if (!accessToken) {
    return []
  }
  
  const response = await fetch(
    `${GOOGLE_CALENDAR_API}/freeBusy`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: [{ id: 'primary' }],
      }),
    }
  )
  
  if (!response.ok) {
    console.error('Failed to get busy times from Google Calendar')
    return []
  }
  
  const data = await response.json()
  return data.calendars?.primary?.busy || []
}