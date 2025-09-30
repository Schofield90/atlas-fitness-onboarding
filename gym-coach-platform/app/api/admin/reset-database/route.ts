import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const SUPER_ADMIN_EMAIL = 'sam@gymleadhub.co.uk'

export async function POST(request: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify this is the super admin
    if (user.email !== SUPER_ADMIN_EMAIL) {
      return NextResponse.json({
        error: 'Forbidden: Only super admin can reset database',
        user: user.email
      }, { status: 403 })
    }

    // Get super admin's organization
    const { data: superAdminUser, error: userError } = await supabase
      .from('users')
      .select('id, organization_id, role, email')
      .eq('email', SUPER_ADMIN_EMAIL)
      .single()

    if (userError || !superAdminUser) {
      return NextResponse.json({
        error: 'Super admin user not found in database',
        details: userError
      }, { status: 500 })
    }

    const superAdminOrgId = superAdminUser.organization_id
    const deletionLog: any[] = []

    // PHASE 1: Delete all clients NOT in super admin org
    const { data: deletedClients, error: clientsError } = await supabase
      .from('clients')
      .delete()
      .neq('organization_id', superAdminOrgId)
      .select('id')

    deletionLog.push({
      table: 'clients',
      deleted: deletedClients?.length || 0,
      error: clientsError?.message
    })

    // PHASE 2: Delete all leads NOT in super admin org
    const { data: deletedLeads, error: leadsError } = await supabase
      .from('leads')
      .delete()
      .neq('organization_id', superAdminOrgId)
      .select('id')

    deletionLog.push({
      table: 'leads',
      deleted: deletedLeads?.length || 0,
      error: leadsError?.message
    })

    // PHASE 3: Delete all membership plans NOT in super admin org
    const { data: deletedPlans, error: plansError } = await supabase
      .from('membership_plans')
      .delete()
      .neq('organization_id', superAdminOrgId)
      .select('id')

    deletionLog.push({
      table: 'membership_plans',
      deleted: deletedPlans?.length || 0,
      error: plansError?.message
    })

    // PHASE 4: Delete all conversations NOT in super admin org
    const { data: deletedConversations, error: conversationsError } = await supabase
      .from('conversations')
      .delete()
      .neq('organization_id', superAdminOrgId)
      .select('id')

    deletionLog.push({
      table: 'conversations',
      deleted: deletedConversations?.length || 0,
      error: conversationsError?.message
    })

    // PHASE 5: Delete all users NOT super admin
    const { data: deletedUsers, error: usersError } = await supabase
      .from('users')
      .delete()
      .neq('email', SUPER_ADMIN_EMAIL)
      .select('id, email')

    deletionLog.push({
      table: 'users',
      deleted: deletedUsers?.length || 0,
      emails: deletedUsers?.map(u => u.email),
      error: usersError?.message
    })

    // PHASE 6: Delete all organizations EXCEPT super admin's
    const { data: deletedOrgs, error: orgsError } = await supabase
      .from('organizations')
      .delete()
      .neq('id', superAdminOrgId)
      .select('id, name')

    deletionLog.push({
      table: 'organizations',
      deleted: deletedOrgs?.length || 0,
      names: deletedOrgs?.map(o => o.name),
      error: orgsError?.message
    })

    // PHASE 7: Update super admin user to ensure correct permissions
    const { error: updateError } = await supabase
      .from('users')
      .update({
        role: 'owner',
        updated_at: new Date().toISOString()
      })
      .eq('email', SUPER_ADMIN_EMAIL)

    deletionLog.push({
      table: 'users',
      action: 'update_super_admin',
      success: !updateError,
      error: updateError?.message
    })

    // PHASE 8: Verify final state
    const { data: remainingOrgs } = await supabase
      .from('organizations')
      .select('id, name, email')

    const { data: remainingUsers } = await supabase
      .from('users')
      .select('id, email, role, organization_id')

    return NextResponse.json({
      message: 'Database reset completed successfully',
      super_admin: {
        email: SUPER_ADMIN_EMAIL,
        user_id: superAdminUser.id,
        organization_id: superAdminOrgId,
        role: 'owner'
      },
      deletion_log: deletionLog,
      final_state: {
        organizations: remainingOrgs,
        users: remainingUsers
      },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Database reset error:', error)
    return NextResponse.json({
      error: 'Internal server error during database reset',
      details: String(error)
    }, { status: 500 })
  }
}

// GET endpoint to preview what would be deleted
export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify this is the super admin
    if (user.email !== SUPER_ADMIN_EMAIL) {
      return NextResponse.json({
        error: 'Forbidden: Only super admin can view reset preview',
        user: user.email
      }, { status: 403 })
    }

    // Get super admin's organization
    const { data: superAdminUser } = await supabase
      .from('users')
      .select('organization_id')
      .eq('email', SUPER_ADMIN_EMAIL)
      .single()

    if (!superAdminUser) {
      return NextResponse.json({ error: 'Super admin not found' }, { status: 500 })
    }

    const superAdminOrgId = superAdminUser.organization_id

    // Count what would be deleted
    const preview: any[] = []

    const { count: clientsCount } = await supabase
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .neq('organization_id', superAdminOrgId)

    preview.push({ table: 'clients', would_delete: clientsCount || 0 })

    const { count: leadsCount } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .neq('organization_id', superAdminOrgId)

    preview.push({ table: 'leads', would_delete: leadsCount || 0 })

    const { count: plansCount } = await supabase
      .from('membership_plans')
      .select('*', { count: 'exact', head: true })
      .neq('organization_id', superAdminOrgId)

    preview.push({ table: 'membership_plans', would_delete: plansCount || 0 })

    const { count: usersCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .neq('email', SUPER_ADMIN_EMAIL)

    preview.push({ table: 'users', would_delete: usersCount || 0 })

    const { count: orgsCount } = await supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true })
      .neq('id', superAdminOrgId)

    preview.push({ table: 'organizations', would_delete: orgsCount || 0 })

    return NextResponse.json({
      super_admin: {
        email: SUPER_ADMIN_EMAIL,
        organization_id: superAdminOrgId
      },
      preview,
      warning: 'POST to this endpoint to execute the reset. THIS CANNOT BE UNDONE.',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Reset preview error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      details: String(error)
    }, { status: 500 })
  }
}