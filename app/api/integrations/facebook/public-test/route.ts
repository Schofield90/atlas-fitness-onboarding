import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    // This is a public endpoint - no auth required
    const supabase = await createClient()
    
    // Check environment variables
    const fbAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '715100284200848'
    const fbAppSecret = process.env.FACEBOOK_APP_SECRET
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://atlas-fitness-onboarding.vercel.app'
    
    // Check database without auth
    let dbStatus = {
      has_integrations: false,
      integrations_count: 0,
      active_count: 0,
      latest_integration: null
    }
    
    try {
      // Use service role to bypass RLS
      const { data: integrations, error } = await supabase
        .from('facebook_integrations')
        .select('facebook_user_name, created_at, is_active, token_expires_at')
        .order('created_at', { ascending: false })
        .limit(5)
      
      if (!error && integrations) {
        dbStatus.has_integrations = integrations.length > 0
        dbStatus.integrations_count = integrations.length
        dbStatus.active_count = integrations.filter(i => i.is_active).length
        dbStatus.latest_integration = integrations[0] || null
      }
    } catch (e) {
      console.log('Database check failed:', e)
    }
    
    return NextResponse.json({
      success: true,
      app_id: fbAppId,
      app_secret_configured: !!fbAppSecret,
      site_url: siteUrl,
      database: dbStatus,
      oauth_redirect_uri: `${siteUrl}/api/auth/facebook/callback`,
      instructions: {
        current_status: !fbAppSecret 
          ? 'FACEBOOK_APP_SECRET not configured - OAuth will fail'
          : 'Configuration looks good',
        next_steps: [
          'Check token status using the button above',
          'If token is invalid, clear data and re-login',
          'Then reconnect Facebook in Settings'
        ]
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}