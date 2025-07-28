import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getTokensFromCode } from '@/app/lib/google/calendar'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  
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
    
    // Store tokens in Supabase
    const supabase = await createClient()
    
    // Create or update the google_calendar_tokens record
    const { error: dbError } = await supabase
      .from('google_calendar_tokens')
      .upsert({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
        token_type: tokens.token_type,
        scope: tokens.scope,
        updated_at: new Date().toISOString()
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