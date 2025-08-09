import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export const runtime = 'nodejs'

// Google OAuth2 configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!
const GOOGLE_REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/calendar/google/callback`

// Handle Google Calendar OAuth callback
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    
    // Check for errors from Google
    if (error) {
      console.error('Google OAuth error:', error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/calendar?error=${encodeURIComponent(error)}`
      )
    }
    
    // Verify state for security
    if (state !== 'gymleadhub_calendar_auth') {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/calendar?error=invalid_state`
      )
    }
    
    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/calendar?error=no_code`
      )
    }
    
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    })
    
    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json()
      console.error('Token exchange error:', errorData)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/calendar?error=token_exchange_failed`
      )
    }
    
    const tokens = await tokenResponse.json()
    
    // Get user info to identify the calendar
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    })
    
    if (!userInfoResponse.ok) {
      console.error('Failed to get user info')
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/calendar?error=user_info_failed`
      )
    }
    
    const userInfo = await userInfoResponse.json()
    
    // Store tokens in Supabase
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Auth error:', authError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/calendar?error=not_authenticated`
      )
    }
    
    // Get user's organization
    const { data: userWithOrg } = await supabase
      .from('organization_members')
      .select('org_id')
      .eq('user_id', user.id)
      .single()
    
    const organizationId = userWithOrg?.org_id || user.id

    // Use admin client for calendar connection operations
    const adminSupabase = createAdminClient()

    // Check if calendar connection already exists
    const { data: existingConnection } = await adminSupabase
      .from('calendar_connections')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .eq('email', userInfo.email)
      .single()
    
    let connectionId: string

    if (existingConnection) {
      // Update existing connection
      const { error: updateError } = await adminSupabase
        .from('calendar_connections')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || undefined,
          expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
          is_active: true,
          last_sync: new Date().toISOString(),
          sync_errors: 0
        })
        .eq('id', existingConnection.id)
      
      if (updateError) {
        console.error('Failed to update calendar connection:', updateError)
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/calendar?error=update_failed`
        )
      }
      connectionId = existingConnection.id
    } else {
      // Create new connection
      const { data: newConnection, error: insertError } = await adminSupabase
        .from('calendar_connections')
        .insert({
          user_id: user.id,
          organization_id: organizationId,
          provider: 'google',
          email: userInfo.email,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
          scope: 'https://www.googleapis.com/auth/calendar',
          is_active: true,
          last_sync: new Date().toISOString(),
          sync_errors: 0
        })
        .select('id')
        .single()
      
      if (insertError || !newConnection) {
        console.error('Failed to save calendar connection:', insertError)
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/calendar?error=save_failed`
        )
      }
      connectionId = newConnection.id
    }

    // Fetch and store user's calendars
    try {
      const calendarListResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      })

      if (calendarListResponse.ok) {
        const calendarList = await calendarListResponse.json()
        
        // Store each calendar
        for (const calendar of calendarList.items || []) {
          await adminSupabase
            .from('calendars')
            .upsert({
              connection_id: connectionId,
              google_calendar_id: calendar.id,
              name: calendar.summary,
              description: calendar.description,
              timezone: calendar.timeZone || 'Europe/London',
              is_primary: calendar.primary || false,
              is_enabled: calendar.selected !== false,
              color: calendar.colorId,
              metadata: {
                accessRole: calendar.accessRole,
                kind: calendar.kind
              }
            }, {
              onConflict: 'connection_id,google_calendar_id',
              ignoreDuplicates: false
            })
        }
      }
    } catch (calendarError) {
      console.error('Failed to fetch calendar list:', calendarError)
      // Don't fail the whole flow for this
    }
    
    // Create default availability rules if they don't exist
    const { data: existingRules } = await supabase
      .from('availability_rules')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)

    if (!existingRules || existingRules.length === 0) {
      // Create default Monday-Friday 9 AM to 5 PM availability
      const defaultRules = []
      for (let dayOfWeek = 1; dayOfWeek <= 5; dayOfWeek++) { // Monday to Friday
        defaultRules.push({
          user_id: user.id,
          organization_id: organizationId,
          day_of_week: dayOfWeek,
          start_time: '09:00',
          end_time: '17:00',
          is_enabled: true,
          timezone: 'Europe/London',
          buffer_before: 0,
          buffer_after: 15
        })
      }

      await adminSupabase
        .from('availability_rules')
        .insert(defaultRules)
    }
    
    // Redirect back to calendar page with success
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/calendar?success=google_connected`
    )
    
  } catch (error) {
    console.error('Error in Google Calendar callback:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/calendar?error=callback_error`
    )
  }
}