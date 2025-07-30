import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

// Initialize OAuth2 client
export function getOAuth2Client() {
  // Use a consistent redirect URI
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://atlas-fitness-onboarding.vercel.app';
  const redirectUri = `${baseUrl}/api/auth/google/callback`;
  
  console.log('OAuth2Client config:', {
    hasClientId: !!process.env.GOOGLE_CLIENT_ID,
    hasClientSecret: !!process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  });
  
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    redirectUri
  )
}

// Get authorization URL
export function getAuthUrl() {
  const oauth2Client = getOAuth2Client()
  
  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/userinfo.email'
  ]
  
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent',
    // Add state parameter for security
    state: Buffer.from(JSON.stringify({
      timestamp: Date.now(),
      source: 'calendar-sync'
    })).toString('base64'),
    // Explicitly set response_type
    response_type: 'code'
  })
}

// Exchange code for tokens
export async function getTokensFromCode(code: string) {
  const oauth2Client = getOAuth2Client()
  const { tokens } = await oauth2Client.getToken(code)
  return tokens
}

// Create authenticated calendar client
export function getCalendarClient(tokens: any) {
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials(tokens)
  return google.calendar({ version: 'v3', auth: oauth2Client })
}

// List calendars
export async function listCalendars(tokens: any) {
  const calendar = getCalendarClient(tokens)
  const response = await calendar.calendarList.list()
  return response.data.items || []
}

// Create calendar event
export async function createCalendarEvent(tokens: any, event: any, calendarId = 'primary') {
  const calendar = getCalendarClient(tokens)
  
  const response = await calendar.events.insert({
    calendarId,
    requestBody: event
  })
  
  return response.data
}

// List events
export async function listCalendarEvents(
  tokens: any, 
  calendarId = 'primary',
  timeMin?: string,
  timeMax?: string
) {
  const calendar = getCalendarClient(tokens)
  
  const response = await calendar.events.list({
    calendarId,
    timeMin: timeMin || new Date().toISOString(),
    timeMax,
    singleEvents: true,
    orderBy: 'startTime'
  })
  
  return response.data.items || []
}

// Update event
export async function updateCalendarEvent(
  tokens: any,
  eventId: string,
  updates: any,
  calendarId = 'primary'
) {
  const calendar = getCalendarClient(tokens)
  
  const response = await calendar.events.patch({
    calendarId,
    eventId,
    requestBody: updates
  })
  
  return response.data
}

// Delete event
export async function deleteCalendarEvent(
  tokens: any,
  eventId: string,
  calendarId = 'primary'
) {
  const calendar = getCalendarClient(tokens)
  
  await calendar.events.delete({
    calendarId,
    eventId
  })
  
  return true
}

// Watch calendar for changes (webhooks)
export async function watchCalendar(tokens: any, calendarId = 'primary', webhookUrl: string) {
  const calendar = getCalendarClient(tokens)
  
  const response = await calendar.events.watch({
    calendarId,
    requestBody: {
      id: `calendar-${calendarId}-${Date.now()}`,
      type: 'web_hook',
      address: webhookUrl
    }
  })
  
  return response.data
}