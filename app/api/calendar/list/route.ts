import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { listCalendars } from '@/app/lib/google/calendar'
import { requireAuth, createOrgScopedClient } from '@/lib/auth-middleware'

export async function GET(request: NextRequest) {
  // Authentication check
  const auth = await requireAuth(request)
  if (auth instanceof NextResponse) return auth
  
  // Create organization-scoped Supabase client
  const supabase = createOrgScopedClient(auth.organizationId)
  
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