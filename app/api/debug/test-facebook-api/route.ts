import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getCurrentUserOrganization } from '@/app/lib/organization-server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { organizationId } = await getCurrentUserOrganization()
    
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Get the Facebook integration
    const { data: integration } = await supabase
      .from('facebook_integrations')
      .select('access_token')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()

    if (!integration?.access_token) {
      return NextResponse.json({ error: 'No active Facebook integration found' })
    }

    // Make a direct API call to Facebook
    const results: any = {}
    
    // Test 1: Basic user info
    try {
      const meResponse = await fetch('https://graph.facebook.com/v18.0/me', {
        headers: {
          'Authorization': `Bearer ${integration.access_token}`
        }
      })
      results.me = await meResponse.json()
    } catch (e: any) {
      results.me = { error: e.message }
    }

    // Test 2: User accounts (includes pages)
    try {
      const accountsResponse = await fetch('https://graph.facebook.com/v18.0/me/accounts?fields=id,name,category,access_token', {
        headers: {
          'Authorization': `Bearer ${integration.access_token}`
        }
      })
      const accountsData = await accountsResponse.json()
      results.accounts = accountsData
      results.accounts_count = accountsData.data?.length || 0
    } catch (e: any) {
      results.accounts = { error: e.message }
    }

    // Test 3: Permissions check
    try {
      const permissionsResponse = await fetch('https://graph.facebook.com/v18.0/me/permissions', {
        headers: {
          'Authorization': `Bearer ${integration.access_token}`
        }
      })
      results.permissions = await permissionsResponse.json()
    } catch (e: any) {
      results.permissions = { error: e.message }
    }

    // Test 4: Debug token
    try {
      const debugResponse = await fetch(`https://graph.facebook.com/v18.0/debug_token?input_token=${integration.access_token}&access_token=${integration.access_token}`)
      results.token_debug = await debugResponse.json()
    } catch (e: any) {
      results.token_debug = { error: e.message }
    }

    return NextResponse.json({
      tests_run: ['me', 'accounts', 'permissions', 'token_debug'],
      results,
      summary: {
        has_user_info: !!results.me?.id,
        pages_found: results.accounts_count || 0,
        has_pages_show_list: results.permissions?.data?.some((p: any) => p.permission === 'pages_show_list' && p.status === 'granted'),
        token_valid: results.token_debug?.data?.is_valid
      }
    })

  } catch (error: any) {
    console.error('Test endpoint error:', error)
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error.message 
    }, { status: 500 })
  }
}