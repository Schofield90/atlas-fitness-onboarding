import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminSupabase = createAdminClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user's organization
    const { data: userOrg, error: orgError } = await supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', user.id)
      .single()

    if (orgError || !userOrg || userOrg.role !== 'owner') {
      return NextResponse.json({ 
        error: 'Only organization owners can invite staff' 
      }, { status: 403 })
    }

    const { members } = await request.json()

    if (!Array.isArray(members) || members.length === 0) {
      return NextResponse.json({ 
        error: 'No team members provided' 
      }, { status: 400 })
    }

    // Create invitations
    const invitations = members.map(member => ({
      organization_id: userOrg.organization_id,
      email: member.email.toLowerCase(),
      role: member.role,
      invited_by: user.id,
      token: generateInviteToken(),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    }))

    // Insert invitations
    const { data: insertedInvites, error: inviteError } = await adminSupabase
      .from('staff_invitations')
      .insert(invitations)
      .select()

    if (inviteError) {
      console.error('Error creating invitations:', inviteError)
      return NextResponse.json({ 
        error: 'Failed to create invitations',
        details: inviteError.message 
      }, { status: 500 })
    }

    // Send invitation emails (simplified for now)
    // In production, you would use a proper email service
    for (const invite of insertedInvites || []) {
      console.log(`Would send invitation email to ${invite.email} with token ${invite.token}`)
      // TODO: Implement actual email sending
    }

    return NextResponse.json({
      success: true,
      invitationsSent: insertedInvites?.length || 0,
      message: 'Invitations created successfully'
    })

  } catch (error) {
    console.error('Batch invite error:', error)
    return NextResponse.json({ 
      error: 'Failed to send invitations',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

function generateInviteToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}