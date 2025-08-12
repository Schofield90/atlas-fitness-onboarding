import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getCurrentUserOrganization } from '@/app/lib/organization-server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated', details: userError }, { status: 401 })
    }

    // Get organization
    const { organizationId, error: orgError } = await getCurrentUserOrganization()
    
    // Check facebook_integrations table
    const { data: integrations, error: intError } = await supabase
      .from('facebook_integrations')
      .select('*')
      .eq('organization_id', organizationId || '63589490-8f55-4157-bd3a-e141594b748e')

    // Check facebook_pages table
    const { data: pages, error: pagesError } = await supabase
      .from('facebook_pages')
      .select('*')
      .eq('organization_id', organizationId || '63589490-8f55-4157-bd3a-e141594b748e')

    // Check if tables exist
    const { data: tables } = await supabase
      .rpc('get_table_names', {})
      .select('*')
      .catch(() => ({ data: null }))

    // Try to fetch from Meta API if we have a token
    let metaApiTest = null
    if (integrations && integrations.length > 0 && integrations[0].access_token) {
      try {
        const token = integrations[0].access_token
        const meResponse = await fetch(`https://graph.facebook.com/v18.0/me?access_token=${token}`)
        const meData = await meResponse.json()
        
        const pagesResponse = await fetch(`https://graph.facebook.com/v18.0/me/accounts?access_token=${token}`)
        const pagesData = await pagesResponse.json()
        
        metaApiTest = {
          me: meData,
          pages: pagesData,
          tokenValid: !meData.error
        }
      } catch (apiError) {
        metaApiTest = { error: apiError.message }
      }
    }

    return NextResponse.json({
      debug: {
        user: {
          id: user.id,
          email: user.email
        },
        organization: {
          id: organizationId,
          error: orgError
        },
        facebook_integrations: {
          count: integrations?.length || 0,
          data: integrations,
          error: intError
        },
        facebook_pages: {
          count: pages?.length || 0,
          data: pages,
          error: pagesError
        },
        metaApiTest,
        localStorage: {
          hint: 'Check browser console for localStorage values',
          keys: ['facebook_connected', 'facebook_user_id', 'facebook_user_name']
        }
      }
    })

  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}