import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { listCalendars } from '@/app/lib/google/calendar'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get stored tokens
    const { data: tokenData } = await supabase
      .from('google_calendar_tokens')
      .select('*')
      .single()
    
    if (!tokenData) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    const calendars = await listCalendars(tokenData)
    
    return NextResponse.json({ calendars })
  } catch (error) {
    console.error('Error listing calendars:', error)
    return NextResponse.json({ error: 'Failed to list calendars' }, { status: 500 })
  }
}