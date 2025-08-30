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

    // Get staff from organization_staff table
    const { data: staffMembers, error: staffError } = await supabase
      .from('organization_staff')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })

    // If organization_staff table doesn't exist or has no data, return empty array
    if (staffError) {
      console.log('Staff table error:', staffError.message)
      // Return empty staff list instead of erroring
      return NextResponse.json({ 
        success: true,
        staff: [],
        message: 'No staff members found'
      })
    }
    
    if (!staffMembers || staffMembers.length === 0) {
      // No staff members yet - return empty array
      return NextResponse.json({ 
        success: true,
        staff: [],
        message: 'No staff members added yet'
      })
    }

    // Return the staff data in the format expected by the frontend
    return NextResponse.json({ 
      success: true,
      staff: staffMembers
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

    // Get organization ID
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('organization_id')
      .eq('user_id', user.id)
      .single()

    if (!userOrg?.organization_id) {
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

    // Create staff member
    const { data: newStaff, error: insertError } = await supabase
      .from('organization_staff')
      .insert({
        organization_id: userOrg.organization_id,
        user_id: crypto.randomUUID(), // Generate a temporary ID
        email,
        phone_number: phone_number || '',
        role,
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