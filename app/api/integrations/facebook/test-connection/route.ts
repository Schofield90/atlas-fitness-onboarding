import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check environment variables
    const fbAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID
    const fbAppSecret = process.env.FACEBOOK_APP_SECRET
    
    const envCheck = {
      app_id_configured: !!fbAppId,
      app_secret_configured: !!fbAppSecret,
      app_id_value: fbAppId ? fbAppId.substring(0, 5) + '...' : 'NOT SET',
      app_secret_value: fbAppSecret ? 'SET' : 'NOT SET - THIS IS THE ISSUE!'
    }
    
    // Check database for any existing integrations
    const { data: integrations, error: intError } = await supabase
      .from('facebook_integrations')
      .select('*')
      .limit(5)
    
    // Check for organization
    const { data: { user } } = await supabase.auth.getUser()
    let organizationId = null
    
    if (user) {
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .single()
      
      organizationId = userOrg?.organization_id || '63589490-8f55-4157-bd3a-e141594b748e'
    }
    
    return NextResponse.json({
      success: true,
      environment: envCheck,
      database: {
        integrations_found: integrations?.length || 0,
        integrations: integrations || [],
        error: intError?.message
      },
      user: {
        authenticated: !!user,
        user_id: user?.id,
        organization_id: organizationId
      },
      instructions: {
        fix_steps: [
          '1. Add FACEBOOK_APP_SECRET to your environment variables',
          '2. Get the App Secret from https://developers.facebook.com/apps/YOUR_APP_ID/settings/basic/',
          '3. Add to Vercel: Settings -> Environment Variables -> FACEBOOK_APP_SECRET',
          '4. Redeploy the application',
          '5. Clear browser cache and localStorage',
          '6. Try connecting Facebook again'
        ],
        current_issue: !fbAppSecret ? 'FACEBOOK_APP_SECRET is not configured - OAuth will fail!' : 'Configuration looks good'
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}