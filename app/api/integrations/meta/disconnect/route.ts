import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getCurrentUserOrganization } from '@/app/lib/organization-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { organizationId } = await getCurrentUserOrganization()
    
    if (!organizationId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 })
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    // Start a transaction to safely disconnect the integration
    const { data: integration } = await supabase
      .from('facebook_integrations')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()

    if (!integration) {
      return NextResponse.json({ 
        success: true,
        message: 'No active integration found to disconnect' 
      })
    }

    // Deactivate the integration (don't delete to preserve historical data)
    const { error: deactivateError } = await supabase
      .from('facebook_integrations')
      .update({ 
        is_active: false,
        access_token: '', // Clear the token for security
        updated_at: new Date().toISOString()
      })
      .eq('id', integration.id)

    if (deactivateError) {
      console.error('Failed to deactivate integration:', deactivateError)
      return NextResponse.json({ 
        error: 'Failed to disconnect integration',
        details: deactivateError.message
      }, { status: 500 })
    }

    // Deactivate associated pages
    await supabase
      .from('facebook_pages')
      .update({ is_active: false })
      .eq('integration_id', integration.id)

    // Deactivate associated lead forms
    await supabase
      .from('facebook_lead_forms')
      .update({ is_active: false })
      .eq('organization_id', organizationId)

    // Deactivate associated ad accounts
    await supabase
      .from('facebook_ad_accounts')
      .update({ is_active: false })
      .eq('integration_id', integration.id)

    // Note: We keep the historical data (leads, webhooks, etc.) for reporting purposes
    // but mark the integration as inactive to stop future syncing

    return NextResponse.json({
      success: true,
      message: 'Meta Ads integration disconnected successfully. Historical data has been preserved.'
    })

  } catch (error: any) {
    console.error('Meta disconnect error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to disconnect Meta integration',
        details: error.message
      },
      { status: 500 }
    )
  }
}