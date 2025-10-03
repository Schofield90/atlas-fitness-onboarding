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
    
    const { data: activities } = await supabase
      .from('audit_logs')
      .select(`
        *,
        actor:users(email, name)
      `)
      .eq('org_id', params.id)
      .order('created_at', { ascending: false })
      .limit(50)

    const formattedActivities = activities?.map(activity => ({
      id: activity.id,
      action: activity.action,
      details: activity.details,
      actor_email: activity.actor?.email,
      actor_name: activity.actor?.name,
      ip_address: activity.ip_address,
      created_at: activity.created_at
    }))

    return NextResponse.json({ activities: formattedActivities })
  } catch (error) {
    console.error('Failed to fetch activities:', error)
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
      { status: 500 }
    )
  }
}