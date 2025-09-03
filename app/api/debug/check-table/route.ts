import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Service Unavailable', message: 'Missing Supabase configuration' }, { status: 503 })
    }
    const supabaseAdmin = createAdminClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // Get all users
    const { data: allUsers, error: usersError } = await supabaseAdmin
      .from('users')
      .select('*')
      .limit(5)
    
    // Get organizations
    const { data: orgs, error: orgsError } = await supabaseAdmin
      .from('organizations')
      .select('*')
    
    // Get table info using raw SQL
    const { data: tableInfo, error: tableError } = await supabaseAdmin
      .rpc('get_table_info', { table_name: 'users' })
      .single()
    
    return NextResponse.json({
      users: {
        count: allUsers?.length || 0,
        sample: allUsers,
        error: usersError?.message
      },
      organizations: {
        count: orgs?.length || 0,
        data: orgs,
        error: orgsError?.message
      },
      tableStructure: tableInfo,
      tableError: tableError?.message,
      targetUser: {
        id: 'ea1fc8e3-35a2-4c59-80af-5fde557391a1',
        shouldHaveOrgId: '63589490-8f55-4157-bd3a-e141594b748e'
      }
    })
    
  } catch (error) {
    // If RPC doesn't exist, just return basic info
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Service Unavailable', message: 'Missing Supabase configuration' }, { status: 503 })
    }
    const supabaseAdmin = createAdminClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    const { data: users } = await supabaseAdmin.from('users').select('*').limit(5)
    const { data: orgs } = await supabaseAdmin.from('organizations').select('*')
    
    return NextResponse.json({
      users: {
        count: users?.length || 0,
        sample: users
      },
      organizations: {
        count: orgs?.length || 0,
        data: orgs
      },
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}