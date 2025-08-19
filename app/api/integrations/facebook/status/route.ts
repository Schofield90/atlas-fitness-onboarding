import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getCurrentUserOrganization } from '@/app/lib/organization-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { 
          connected: false,
          error: 'User not authenticated',
          last_check: new Date().toISOString()
        }, 
        { status: 401 }
      )
    }

    const { organizationId, error: orgError } = await getCurrentUserOrganization()
    
    if (orgError || !organizationId) {
      return NextResponse.json(
        { 
          connected: false,
          error: 'No organization found',
          last_check: new Date().toISOString()
        }, 
        { status: 400 }
      )
    }

    // Check for active Facebook integration
    const { data: integration, error: dbError } = await supabase
      .from('facebook_integrations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()

    if (dbError && dbError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Database error checking Facebook integration:', dbError)
      return NextResponse.json(
        { 
          connected: false,
          error: 'Database error',
          details: dbError.message,
          last_check: new Date().toISOString()
        }, 
        { status: 500 }
      )
    }

    const connected = !!integration
    const status = {
      connected,
      connection_method: 'database_check',
      last_check: new Date().toISOString(),
      user_id: user.id,
      organization_id: organizationId,
      integration: connected ? {
        facebook_user_id: integration.facebook_user_id,
        facebook_user_name: integration.facebook_user_name,
        facebook_user_email: integration.facebook_user_email,
        connected_at: integration.created_at,
        last_sync_at: integration.last_sync_at,
        token_expires_at: integration.token_expires_at
      } : null
    }

    return NextResponse.json(status, { status: 200 })
  } catch (error) {
    console.error('Status check error:', error)
    return NextResponse.json(
      { 
        connected: false,
        error: 'Failed to check status', 
        details: error instanceof Error ? error.message : 'Unknown error',
        last_check: new Date().toISOString()
      }, 
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' }, 
        { status: 401 }
      )
    }

    const { organizationId, error: orgError } = await getCurrentUserOrganization()
    
    if (orgError || !organizationId) {
      return NextResponse.json(
        { error: 'No organization found' }, 
        { status: 400 }
      )
    }

    // Deactivate Facebook integration
    const { error: deleteError } = await supabase
      .from('facebook_integrations')
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('organization_id', organizationId)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error('Database error deleting Facebook integration:', deleteError)
      return NextResponse.json(
        { error: 'Failed to disconnect', details: deleteError.message }, 
        { status: 500 }
      )
    }

    const resetInfo = {
      success: true,
      message: 'Facebook integration disconnected successfully',
      timestamp: new Date().toISOString(),
      user_id: user.id,
      organization_id: organizationId
    }

    return NextResponse.json(resetInfo, { status: 200 })
  } catch (error) {
    console.error('Reset connection error:', error)
    return NextResponse.json(
      { error: 'Failed to reset connection', details: error instanceof Error ? error.message : 'Unknown error' }, 
      { status: 500 }
    )
  }
}