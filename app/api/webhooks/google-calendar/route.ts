import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Google Calendar webhook received:', body)
    
    // Google sends a notification with channel info
    const { 
      id: channelId,
      resourceId,
      resourceUri,
      token,
      expiration 
    } = body
    
    // Get X-Goog-* headers for verification
    const state = request.headers.get('X-Goog-Resource-State')
    const resourceIdHeader = request.headers.get('X-Goog-Resource-ID')
    const channelIdHeader = request.headers.get('X-Goog-Channel-ID')
    const messageNumber = request.headers.get('X-Goog-Message-Number')
    
    console.log('Google Calendar webhook headers:', {
      state,
      resourceId: resourceIdHeader,
      channelId: channelIdHeader,
      messageNumber
    })
    
    // Handle different resource states
    if (state === 'sync') {
      // Initial sync message - just acknowledge
      console.log('Initial sync message received')
      return NextResponse.json({ success: true })
    }
    
    if (state === 'exists') {
      // Calendar was updated
      console.log('Calendar update detected')
      
      // Extract user ID from channel token (we'll encode it when setting up the watch)
      const userId = token
      
      if (userId) {
        // Trigger a sync for this user
        await triggerCalendarSync(userId)
      }
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error processing Google Calendar webhook:', error)
    return NextResponse.json(
      { error: 'Failed to process webhook' },
      { status: 500 }
    )
  }
}

// Handle verification for webhook setup
export async function GET(request: NextRequest) {
  // Google Calendar doesn't use GET for verification like some other services
  // This is just for testing the endpoint
  return NextResponse.json({ 
    status: 'ok',
    message: 'Google Calendar webhook endpoint'
  })
}

async function triggerCalendarSync(userId: string) {
  try {
    const adminSupabase = createAdminClient()
    
    // Get user's Google Calendar settings
    const { data: tokens } = await adminSupabase
      .from('google_calendar_tokens')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (!tokens) {
      console.log('No Google Calendar tokens found for user:', userId)
      return
    }
    
    // Get calendar sync settings
    const { data: settings } = await adminSupabase
      .from('calendar_sync_settings')
      .select('*')
      .eq('user_id', userId)
      .single()
    
    if (!settings?.sync_enabled) {
      console.log('Calendar sync not enabled for user:', userId)
      return
    }
    
    // Trigger sync by calling our sync endpoint
    // In a production environment, you might want to use a queue
    const syncUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/sync`
    
    const response = await fetch(syncUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add auth header if needed
      },
      body: JSON.stringify({ userId })
    })
    
    if (!response.ok) {
      throw new Error('Failed to trigger sync')
    }
    
    console.log('Calendar sync triggered for user:', userId)
    
  } catch (error) {
    console.error('Error triggering calendar sync:', error)
  }
}