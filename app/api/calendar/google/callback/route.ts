import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

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
    
    // Check if calendar integration already exists
    const { data: existingIntegration } = await supabase
      .from('calendar_integrations')
      .select('id')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .single()
    
    if (existingIntegration) {
      // Update existing integration
      const { error: updateError } = await supabase
        .from('calendar_integrations')
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token || undefined,
          expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
          calendar_email: userInfo.email,
          calendar_name: userInfo.name,
          is_active: true,
          last_synced_at: new Date().toISOString()
        })
        .eq('id', existingIntegration.id)
      
      if (updateError) {
        console.error('Failed to update calendar integration:', updateError)
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/calendar?error=update_failed`
        )
      }
    } else {
      // Create new integration
      const { error: insertError } = await supabase
        .from('calendar_integrations')
        .insert({
          user_id: user.id,
          organization_id: user.user_metadata?.organization_id || user.id,
          provider: 'google',
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null,
          calendar_email: userInfo.email,
          calendar_name: userInfo.name,
          is_active: true,
          last_synced_at: new Date().toISOString()
        })
      
      if (insertError) {
        console.error('Failed to save calendar integration:', insertError)
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/calendar?error=save_failed`
        )
      }
    }
    
    // Update user's calendar settings
    const { error: settingsError } = await supabase
      .from('calendar_settings')
      .upsert({
        user_id: user.id,
        organization_id: user.user_metadata?.organization_id || user.id,
        google_calendar_connected: true,
        updated_at: new Date().toISOString()
      })
    
    if (settingsError) {
      console.error('Failed to update calendar settings:', settingsError)
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