import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// Google OAuth2 configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const GOOGLE_REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/calendar/google/callback`

const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email'
].join(' ')

// Initiate Google Calendar OAuth flow
export async function GET(request: NextRequest) {
  try {
    // Generate OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    
    const params = {
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_REDIRECT_URI,
      response_type: 'code',
      scope: GOOGLE_OAUTH_SCOPES,
      access_type: 'offline',
      prompt: 'consent',
      state: 'gymleadhub_calendar_auth' // Add state for security
    }
    
    Object.entries(params).forEach(([key, value]) => {
      authUrl.searchParams.append(key, value)
    })
    
    // Redirect to Google OAuth
    return NextResponse.redirect(authUrl.toString())
    
  } catch (error) {
    console.error('Error initiating Google Calendar auth:', error)
    return NextResponse.json({
      error: 'Failed to initiate Google Calendar connection',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}