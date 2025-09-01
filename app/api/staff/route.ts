import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    // Get user's organization - try multiple tables
    let organizationId: string | null = null
    
    // Try organization_members first
    const { data: orgMember } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()
      
    if (orgMember) {
      organizationId = orgMember.organization_id
    } else {
      // Try user_organizations table
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()
        
      if (userOrg) {
        organizationId = userOrg.organization_id
      }
    }

    if (!organizationId) {
      return NextResponse.json({ 
        success: false,
        error: 'Organization not found' 
      }, { status: 404 })
    }

    // Try to get staff from both tables - organization_staff first, then staff table
    const { data: orgStaffMembers, error: orgStaffError } = await supabase
      .from('organization_staff')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    // Also try the staff table
    const { data: staffMembers, error: staffError } = await supabase
      .from('staff')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    // Also fetch instructors (for fitness classes)
    const { data: instructors, error: instructorsError } = await supabase
      .from('instructors')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    // Combine results from all tables
    let allStaff = []
    
    if (orgStaffMembers && orgStaffMembers.length > 0) {
      allStaff = [...allStaff, ...orgStaffMembers.map(s => ({ ...s, type: 'staff' }))]
    }
    
    if (staffMembers && staffMembers.length > 0) {
      allStaff = [...allStaff, ...staffMembers.map(s => ({ ...s, type: 'staff' }))]
    }

    if (instructors && instructors.length > 0) {
      // Map instructors to staff format
      const instructorStaff = instructors.map(instructor => ({
        id: instructor.id,
        user_id: instructor.user_id || instructor.id,
        name: instructor.name,
        email: instructor.email || '',
        phone_number: instructor.phone || '',
        role: 'instructor',
        specializations: instructor.specializations,
        certifications: instructor.certifications,
        bio: instructor.bio,
        rating: instructor.rating,
        is_active: instructor.is_active,
        type: 'instructor',
        organization_id: instructor.organization_id,
        created_at: instructor.created_at,
        updated_at: instructor.updated_at
      }))
      allStaff = [...allStaff, ...instructorStaff]
    }

    // If all queries failed, log but don't error
    if (orgStaffError && staffError && instructorsError) {
      console.log('Staff table errors:', { 
        orgStaffError: orgStaffError?.message, 
        staffError: staffError?.message,
        instructorsError: instructorsError?.message
      })
    }
    
    if (allStaff.length === 0) {
      // No staff members yet - return empty array
      return NextResponse.json({ 
        success: true,
        staff: [],
        message: 'No staff members added yet'
      })
    }

    // Return the combined staff data
    return NextResponse.json({ 
      success: true,
      staff: allStaff
    })

  } catch (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch staff members',
        data: null
      },
      { status: 500 }
    )
  }
}

// Create new staff member
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    // Get organization ID - try multiple approaches
    let organizationId: string | null = null
    
    // Try user_organizations table first
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()
    
    if (userOrg?.organization_id) {
      organizationId = userOrg.organization_id
    } else {
      // Try organization_members table
      const { data: orgMember } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()
      
      if (orgMember?.organization_id) {
        organizationId = orgMember.organization_id
      } else {
        // Last resort - check if user owns an organization
        const { data: ownedOrg } = await supabase
          .from('organizations')
          .select('id')
          .eq('owner_id', user.id)
          .single()
        
        if (ownedOrg?.id) {
          organizationId = ownedOrg.id
          // Create user_organizations entry for future
          await supabase
            .from('user_organizations')
            .insert({
              user_id: user.id,
              organization_id: ownedOrg.id,
              role: 'owner'
            })
            .then(() => console.log('Created user_organizations entry'))
            .catch(console.error)
        }
      }
    }

    if (!organizationId) {
      return NextResponse.json({ 
        success: false,
        error: 'Organization not found' 
      }, { status: 404 })
    }

    const body = await request.json()
    const { name, email, phone_number, role, hourly_rate } = body

    // Validate required fields
    if (!email || !role) {
      return NextResponse.json({ 
        success: false,
        error: 'Email and role are required' 
      }, { status: 400 })
    }

    // Create staff member - user_id is TEXT and can be any string
    const { data: newStaff, error: insertError } = await supabase
      .from('organization_staff')
      .insert({
        organization_id: organizationId,
        user_id: `pending_${Date.now()}`, // Use a pending ID until user accepts invitation
        name: name || email.split('@')[0], // Use name or email prefix
        email,
        phone_number: phone_number || '',
        role: role || 'staff',
        hourly_rate: hourly_rate || 0,
        is_available: true,
        receives_calls: true,
        receives_sms: true,
        receives_whatsapp: true,
        receives_emails: true,
        routing_priority: 1
      })
      .select()
      .single()

    if (insertError) {
      console.error('Error creating staff member:', insertError)
      return NextResponse.json({ 
        success: false,
        error: 'Failed to create staff member' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      data: newStaff,
      message: 'Staff member added successfully'
    })

  } catch (error) {
    console.error('Error in POST /api/staff:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create staff member'
      },
      { status: 500 }
    )
  }
}

// Update staff member
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json({ 
        success: false,
        error: 'Staff ID is required' 
      }, { status: 400 })
    }

    // Update staff member
    const { data: updatedStaff, error: updateError } = await supabase
      .from('organization_staff')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating staff member:', updateError)
      return NextResponse.json({ 
        success: false,
        error: 'Failed to update staff member' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      data: updatedStaff,
      message: 'Staff member updated successfully'
    })

  } catch (error) {
    console.error('Error in PUT /api/staff:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to update staff member'
      },
      { status: 500 }
    )
  }
}

// Delete staff member
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ 
        success: false,
        error: 'Unauthorized' 
      }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ 
        success: false,
        error: 'Staff ID is required' 
      }, { status: 400 })
    }

    // Delete staff member
    const { error: deleteError } = await supabase
      .from('organization_staff')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting staff member:', deleteError)
      return NextResponse.json({ 
        success: false,
        error: 'Failed to delete staff member' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Staff member removed successfully'
    })

  } catch (error) {
    console.error('Error in DELETE /api/staff:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to delete staff member'
      },
      { status: 500 }
    )
  }
}