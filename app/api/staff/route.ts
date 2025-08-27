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

    // Try to get staff from organization_staff table first
    const { data: staffMembers, error: staffError } = await supabase
      .from('organization_staff')
      .select(`
        user_id,
        role,
        users!user_id (
          id,
          full_name,
          email,
          avatar_url,
          title
        )
      `)
      .eq('organization_id', organizationId)

    // If organization_staff table doesn't exist or has no data, return empty array
    if (staffError) {
      console.log('Staff table error (might not exist yet):', staffError.message)
      // Return empty staff list instead of erroring
      return NextResponse.json({ 
        success: true,
        data: []
      })
    }
    
    if (!staffMembers || staffMembers.length === 0) {
      // No staff members yet - return empty array
      return NextResponse.json({ 
        success: true,
        data: []
      })
    }

    // Get specializations for each staff member
    const staffWithSpecializations = await Promise.all(
      (staffMembers || []).map(async (member: any) => {
        const { data: specializations, error: specError } = await supabase
          .from('trainer_specializations')
          .select('specialization_type, certification_name, is_active')
          .eq('staff_id', member.user_id)
          .eq('is_active', true)

        if (specError) {
          console.error('Error fetching specializations:', specError)
        }

        return {
          id: member.users.id,
          full_name: member.users.full_name,
          email: member.users.email,
          avatar_url: member.users.avatar_url,
          title: member.users.title,
          role: member.role,
          specializations: (specializations || []).map(spec => ({
            type: spec.specialization_type,
            certification: spec.certification_name || '',
            active: spec.is_active
          }))
        }
      })
    )

    // Return in the format expected by StaffAPIResponse
    return NextResponse.json({ 
      success: true,
      data: staffWithSpecializations.map(staff => ({
        ...staff,
        status: 'active', // Default status
        department: 'Fitness', // Default department
        hire_date: new Date().toISOString(),
        phone: '',
        emergency_contact: null,
        hourly_rate: 0,
        permissions: []
      }))
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