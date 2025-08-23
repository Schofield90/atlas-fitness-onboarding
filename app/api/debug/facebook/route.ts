import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function GET(request: NextRequest) {
  const debug: any = {
    timestamp: new Date().toISOString(),
    checks: {}
  }

  try {
    // 1. Check environment variables
    debug.checks.environment = {
      hasAppId: !!process.env.NEXT_PUBLIC_FACEBOOK_APP_ID,
      appId: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || 'not set',
      hasAppSecret: !!process.env.FACEBOOK_APP_SECRET,
      hasSiteUrl: !!process.env.NEXT_PUBLIC_SITE_URL,
      siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'not set',
      nodeEnv: process.env.NODE_ENV
    }

    // 2. Check Supabase connection
    const supabase = await createClient()
    
    // 3. Check if table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('facebook_integrations')
      .select('id')
      .limit(1)
    
    debug.checks.table = {
      exists: !tableError || !tableError.message?.includes('does not exist'),
      error: tableError?.message,
      canQuery: !!tableCheck
    }

    // 4. Check current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    debug.checks.auth = {
      isAuthenticated: !!user && !userError,
      userId: user?.id,
      email: user?.email,
      error: userError?.message
    }

    // 5. Check for existing integrations
    if (user) {
      const { data: integrations, error: intError } = await supabase
        .from('facebook_integrations')
        .select('*')
        .eq('user_id', user.id)
      
      debug.checks.integrations = {
        count: integrations?.length || 0,
        hasActive: integrations?.some(i => i.is_active) || false,
        error: intError?.message,
        data: integrations?.map(i => ({
          id: i.id,
          fb_user_id: i.facebook_user_id,
          fb_user_name: i.facebook_user_name,
          is_active: i.is_active,
          created: i.created_at,
          expires: i.token_expires_at
        }))
      }
    }

    // 6. Test RLS policies
    if (user) {
      // Try to insert a test record
      const testData = {
        organization_id: '63589490-8f55-4157-bd3a-e141594b748e',
        user_id: user.id,
        facebook_user_id: 'test_debug_' + Date.now(),
        facebook_user_name: 'Debug Test',
        facebook_user_email: 'test@debug.com',
        access_token: 'debug_token',
        is_active: false
      }

      const { data: insertTest, error: insertError } = await supabase
        .from('facebook_integrations')
        .insert(testData)
        .select()
        .single()

      debug.checks.rls = {
        canInsert: !insertError,
        insertError: insertError?.message
      }

      // Clean up test record if it was created
      if (insertTest) {
        await supabase
          .from('facebook_integrations')
          .delete()
          .eq('id', insertTest.id)
      }
    }

    // 7. Build OAuth URL for reference
    const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '715100284200848'
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://atlas-fitness-onboarding.vercel.app'}/api/auth/facebook/callback`
    const scopes = 'pages_show_list,pages_read_engagement,leads_retrieval,ads_management,ads_read'
    
    debug.oauth = {
      authUrl: `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code&state=atlas_fitness_oauth`,
      expectedCallback: redirectUri,
      configuredAppId: appId
    }

    return NextResponse.json(debug, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    })

  } catch (error) {
    debug.error = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(debug, { status: 500 })
  }
}