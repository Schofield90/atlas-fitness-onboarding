import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { getTokensFromCode } from '@/app/lib/google/calendar'
import { requireAuth } from '@/app/lib/api/auth-check'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')
  
  // Verify state parameter for security
  if (state) {
    try {
      const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
      // Verify the state is recent (within 10 minutes)
      if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
        return NextResponse.redirect(
          `${process.env.NEXT_PUBLIC_APP_URL}/calendar-sync?error=state_expired`
        )
      }
    } catch (e) {
      console.error('Invalid state parameter:', e)
    }
  }
  
  if (error) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/calendar-sync?error=${error}`
    )
  }
  
  if (!code) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/calendar-sync?error=no_code`
    )
  }
  
  try {
    // Exchange code for tokens
    const tokens = await getTokensFromCode(code)
    
    // Get the current user
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      console.error('Error getting user:', userError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/calendar-sync?error=auth_required`
      )
    }
    
    // Use admin client to bypass RLS
    const adminSupabase = createAdminClient()
    
    // First, delete any existing tokens for this user
    await adminSupabase
      .from('google_calendar_tokens')
      .delete()
      .eq('user_id', user.id)
    
    // Create new token record
    const { error: dbError } = await adminSupabase
      .from('google_calendar_tokens')
      .insert({
        user_id: user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
        token_type: tokens.token_type,
        scope: tokens.scope
      })
    
    if (dbError) {
      console.error('Error storing tokens:', dbError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/calendar-sync?error=storage_failed`
      )
    }
    
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/calendar-sync?success=true`
    )
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/calendar-sync?error=auth_failed`
    )
  }
}