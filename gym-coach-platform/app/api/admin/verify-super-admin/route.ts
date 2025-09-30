import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const SUPER_ADMIN_EMAIL = 'sam@gymleadhub.co.uk'

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({
        verified: false,
        error: 'Not authenticated'
      }, { status: 401 })
    }

    // Check if this is the super admin email
    const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL

    if (!isSuperAdmin) {
      return NextResponse.json({
        verified: false,
        current_user: user.email,
        message: 'Current user is not the super admin'
      })
    }

    // Get user details from database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        name,
        role,
        organization_id,
        created_at,
        updated_at,
        avatar_url,
        settings
      `)
      .eq('email', SUPER_ADMIN_EMAIL)
      .single()

    if (userError || !userData) {
      return NextResponse.json({
        verified: false,
        error: 'Super admin user not found in database',
        details: userError
      }, { status: 500 })
    }

    // Get organization details
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', userData.organization_id)
      .single()

    if (orgError || !orgData) {
      return NextResponse.json({
        verified: false,
        error: 'Super admin organization not found',
        details: orgError
      }, { status: 500 })
    }

    // Check RLS policies are active
    const { data: rlsPolicies, error: rlsError } = await supabase
      .rpc('pg_policies')
      .select('*')
      .limit(10)

    // Count database records
    const counts: any = {}

    const tables = ['users', 'organizations', 'clients', 'leads', 'membership_plans', 'conversations']
    for (const table of tables) {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true })

      counts[table] = {
        total: count || 0,
        error: error?.message
      }
    }

    // Verify role permissions
    const hasOwnerRole = userData.role === 'owner'
    const hasValidOrg = !!userData.organization_id

    const isFullyVerified = isSuperAdmin && hasOwnerRole && hasValidOrg

    return NextResponse.json({
      verified: isFullyVerified,
      super_admin: {
        auth_uid: user.id,
        email: user.email,
        user_id: userData.id,
        name: userData.name,
        role: userData.role,
        has_owner_role: hasOwnerRole,
        organization_id: userData.organization_id,
        has_valid_org: hasValidOrg,
        created_at: userData.created_at,
        updated_at: userData.updated_at
      },
      organization: {
        id: orgData.id,
        name: orgData.name,
        email: orgData.email,
        subscription_plan: orgData.subscription_plan,
        subscription_status: orgData.subscription_status,
        created_at: orgData.created_at
      },
      database_state: counts,
      rls_status: {
        enabled: !rlsError,
        policies_found: rlsPolicies?.length || 0,
        error: rlsError?.message
      },
      checks: {
        is_super_admin_email: isSuperAdmin,
        has_owner_role: hasOwnerRole,
        has_valid_organization: hasValidOrg,
        user_exists_in_db: !!userData,
        org_exists_in_db: !!orgData
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Super admin verification error:', error)
    return NextResponse.json({
      verified: false,
      error: 'Internal server error during verification',
      details: String(error)
    }, { status: 500 })
  }
}