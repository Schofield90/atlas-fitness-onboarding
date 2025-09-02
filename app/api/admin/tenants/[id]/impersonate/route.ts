import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { cookies } from 'next/headers'
import { nanoid } from 'nanoid'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin
    const authorizedEmails = ['sam@atlas-gyms.co.uk', 'sam@gymleadhub.co.uk']
    if (!authorizedEmails.includes(user.email?.toLowerCase() || '')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { reason, duration = 15 } = body // duration in minutes

    const organizationId = params.id

    // Get organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .single()

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Create impersonation session
    const sessionId = nanoid()
    const expiresAt = new Date(Date.now() + duration * 60 * 1000)

    // Log to admin_activity_logs
    const { error: logError } = await supabase
      .from('admin_activity_logs')
      .insert({
        admin_user_id: user.id,
        action_type: 'IMPERSONATION_START',
        target_organization_id: organizationId,
        action_details: {
          reason,
          duration_minutes: duration,
          session_id: sessionId,
          organization_name: org.name,
          expires_at: expiresAt.toISOString()
        }
      })

    if (logError) {
      console.error('Failed to log impersonation:', logError)
    }

    // Create impersonation token
    const impersonationToken = {
      sessionId,
      adminId: user.id,
      adminEmail: user.email,
      organizationId,
      organizationName: org.name,
      reason,
      startedAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString()
    }

    // Set impersonation cookie
    const cookieStore = cookies()
    cookieStore.set('impersonation', JSON.stringify(impersonationToken), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/'
    })

    // Also store in localStorage for client-side awareness
    return NextResponse.json({
      success: true,
      session: {
        id: sessionId,
        organizationId,
        organizationName: org.name,
        expiresAt: expiresAt.toISOString(),
        dashboardUrl: `/dashboard?org=${organizationId}`
      }
    })
  } catch (error: any) {
    console.error('Impersonation error:', error)
    return NextResponse.json(
      { error: 'Failed to start impersonation' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get impersonation session from cookie
    const cookieStore = cookies()
    const impersonationCookie = cookieStore.get('impersonation')
    
    if (!impersonationCookie) {
      return NextResponse.json({ error: 'No active impersonation' }, { status: 404 })
    }

    const impersonation = JSON.parse(impersonationCookie.value)

    // Log end of impersonation
    await supabase
      .from('admin_activity_logs')
      .insert({
        admin_user_id: user.id,
        action_type: 'IMPERSONATION_END',
        target_organization_id: impersonation.organizationId,
        action_details: {
          session_id: impersonation.sessionId,
          duration_seconds: Math.floor(
            (Date.now() - new Date(impersonation.startedAt).getTime()) / 1000
          )
        }
      })

    // Clear impersonation cookie
    cookieStore.delete('impersonation')

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('End impersonation error:', error)
    return NextResponse.json(
      { error: 'Failed to end impersonation' },
      { status: 500 }
    )
  }
}