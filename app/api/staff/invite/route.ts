import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { getCurrentUserOrganization } from '@/app/lib/organization-server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await req.json()
    const { email, role = 'staff', permissions = {} } = body
    
    // Validate input
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    
    // Get organization
    const { organizationId, error: orgError } = await getCurrentUserOrganization()
    if (orgError || !organizationId) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 400 })
    }
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Check if user is owner or admin
    const { data: currentStaff } = await supabase
      .from('organization_staff')
      .select('role')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .single()
    
    if (!currentStaff || !['owner', 'admin'].includes(currentStaff.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }
    
    // Check if email already exists in organization
    const { data: existingStaff } = await supabase
      .from('organization_staff')
      .select('id')
      .eq('email', email)
      .eq('organization_id', organizationId)
      .single()
    
    if (existingStaff) {
      return NextResponse.json({ error: 'Staff member already exists' }, { status: 400 })
    }
    
    // Get organization details for email
    const { data: organization } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', organizationId)
      .single()
    
    // Create invitation token
    const inviteToken = uuidv4()
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry
    
    // Create staff invitation record
    const { data: invitation, error: inviteError } = await supabase
      .from('staff_invitations')
      .insert({
        organization_id: organizationId,
        email,
        role,
        permissions,
        invite_token: inviteToken,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
        status: 'pending'
      })
      .select()
      .single()
    
    if (inviteError) {
      // If table doesn't exist, create a basic staff record instead
      if (inviteError.code === '42P01') {
        // Table doesn't exist, create staff directly
        const { data: newStaff, error: staffError } = await supabase
          .from('organization_staff')
          .insert({
            organization_id: organizationId,
            email,
            role,
            permissions,
            user_id: null, // Will be set when they accept
            phone_number: '',
            is_available: true,
            receives_calls: true,
            receives_sms: true,
            receives_whatsapp: true,
            receives_emails: true,
            routing_priority: 5
          })
          .select()
          .single()
        
        if (staffError) {
          return NextResponse.json({ error: 'Failed to create staff record' }, { status: 500 })
        }
        
        return NextResponse.json({
          success: true,
          message: 'Staff member added (invitation system not yet configured)',
          staff: newStaff
        })
      }
      
      return NextResponse.json({ error: 'Failed to create invitation' }, { status: 500 })
    }
    
    // Send invitation email
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/staff/accept-invite?token=${inviteToken}`
    
    try {
      const emailResponse = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: email,
          subject: `You're invited to join ${organization?.name || 'the team'} on Atlas Fitness`,
          html: `
            <h2>You've been invited!</h2>
            <p>${user.email} has invited you to join ${organization?.name || 'their organization'} as a ${role}.</p>
            <p>Click the link below to accept the invitation and create your account:</p>
            <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #f97316; color: white; text-decoration: none; border-radius: 6px;">Accept Invitation</a>
            <p>This invitation will expire in 7 days.</p>
            <p>If you can't click the button, copy and paste this link: ${inviteUrl}</p>
          `,
          text: `You've been invited to join ${organization?.name || 'the team'}. Accept your invitation here: ${inviteUrl}`
        })
      })
      
      if (!emailResponse.ok) {
        console.error('Failed to send invitation email')
      }
    } catch (emailError) {
      console.error('Error sending email:', emailError)
      // Continue even if email fails
    }
    
    return NextResponse.json({
      success: true,
      message: 'Invitation sent successfully',
      invitation: {
        id: invitation.id,
        email,
        role,
        expires_at: invitation.expires_at
      }
    })
    
  } catch (error: any) {
    console.error('Error inviting staff:', error)
    return NextResponse.json({ 
      error: 'Failed to invite staff member',
      details: error.message 
    }, { status: 500 })
  }
}