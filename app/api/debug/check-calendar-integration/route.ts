import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated' 
      }, { status: 401 })
    }

    // Check google_calendar_tokens table
    const { data: googleToken, error: tokenError } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Check calendar_connections table (might be a different table)
    const { data: calendarConnection } = await supabase
      .from('calendar_connections')
      .select('*')
      .eq('user_id', user.id)
      .single()

    // Check integrations table
    const { data: integrations } = await supabase
      .from('integrations')
      .select('*')
      .eq('user_id', user.id)

    // Check if there are any calendar events synced
    const { data: calendarEvents, count } = await supabase
      .from('calendar_events')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .limit(5)
      .order('start_time', { ascending: false })

    // Test if we can actually get busy times
    let testBusyTimes = null
    let busyTimesError = null
    
    try {
      const { getGoogleCalendarBusyTimes } = await import('@/app/lib/google-calendar')
      const now = new Date()
      const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      
      testBusyTimes = await getGoogleCalendarBusyTimes(
        user.id,
        now.toISOString(),
        nextWeek.toISOString()
      )
    } catch (error: any) {
      busyTimesError = error.message
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email
      },
      google_calendar_tokens: {
        exists: !!googleToken,
        data: googleToken ? {
          has_access_token: !!googleToken.access_token,
          has_refresh_token: !!googleToken.refresh_token,
          sync_enabled: googleToken.sync_enabled,
          calendar_id: googleToken.calendar_id,
          expiry_date: googleToken.expiry_date,
          is_expired: googleToken.expiry_date ? new Date(googleToken.expiry_date) < new Date() : null,
          auto_create_events: googleToken.auto_create_events,
          created_at: googleToken.created_at,
          updated_at: googleToken.updated_at
        } : null,
        error: tokenError?.message
      },
      calendar_connections: {
        exists: !!calendarConnection,
        data: calendarConnection
      },
      integrations: {
        count: integrations?.length || 0,
        data: integrations
      },
      calendar_events: {
        count: count || 0,
        recent: calendarEvents
      },
      busy_times_test: {
        success: !!testBusyTimes && !busyTimesError,
        busy_times_count: testBusyTimes?.length || 0,
        error: busyTimesError
      },
      tables_checked: [
        'google_calendar_tokens',
        'calendar_connections', 
        'integrations',
        'calendar_events'
      ]
    })

  } catch (error: any) {
    console.error('Error in calendar integration check:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error?.message 
    }, { status: 500 })
  }
}