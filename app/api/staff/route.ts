import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's organization
    const { data: orgMember, error: orgError } = await supabase
      .from('organization_members')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (orgError || !orgMember) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Get all staff members for the organization
    const { data: staffMembers, error: staffError } = await supabase
      .from('organization_members')
      .select(`
        user_id,
        role,
        users:user_id (
          id,
          full_name,
          email,
          avatar_url,
          title
        )
      `)
      .eq('org_id', orgMember.org_id)

    if (staffError) {
      throw new Error(`Failed to fetch staff members: ${staffError.message}`)
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

    return NextResponse.json({ staff: staffWithSpecializations })

  } catch (error) {
    console.error('Error fetching staff:', error)
    return NextResponse.json(
      { error: 'Failed to fetch staff members' },
      { status: 500 }
    )
  }
}