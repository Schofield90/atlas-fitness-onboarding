import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { requireAdminAccess } from '@/app/lib/admin/impersonation'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { isAdmin } = await requireAdminAccess()
    
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createAdminClient()
    
    const { data: userOrgs } = await supabase
      .from('user_organizations')
      .select(`
        *,
        user:users(
          id,
          email,
          name,
          created_at,
          last_sign_in_at
        )
      `)
      .eq('organization_id', params.id)
      .order('created_at', { ascending: false })

    const users = userOrgs?.map(uo => ({
      id: uo.user?.id,
      email: uo.user?.email,
      name: uo.user?.name,
      role: uo.role,
      is_active: uo.is_active,
      created_at: uo.created_at,
      last_sign_in_at: uo.user?.last_sign_in_at
    }))

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Failed to fetch users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}