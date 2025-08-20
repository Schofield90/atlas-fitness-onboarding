import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getCurrentUserOrganization } from '@/app/lib/organization-server'
import { checkFacebookStatus } from '@/app/lib/facebook/status-checker'

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

    let { organizationId, error: orgError } = await getCurrentUserOrganization()
    
    if (orgError || !organizationId) {
      // Try fallback to user_organizations table
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()
      
      if (userOrg?.organization_id) {
        organizationId = userOrg.organization_id
      } else {
        return NextResponse.json(
          { 
            connected: false,
            error: 'No organization found',
            last_check: new Date().toISOString()
          }, 
          { status: 400 }
        )
      }
    }

    // Use our new status checker
    const statusResult = await checkFacebookStatus({
      organizationId,
      userId: user.id
    })

    // Format response consistently
    const response = {
      connected: statusResult.connected,
      connection_method: 'database_check',
      last_check: new Date().toISOString(),
      user_id: user.id,
      organization_id: organizationId,
      integration: statusResult.integration || null,
      error: statusResult.error
    }

    return NextResponse.json(response, { status: 200 })
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