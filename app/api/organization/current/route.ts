import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user's organization
    const { data: userOrg, error: orgError } = await supabase
      .from('user_organizations')
      .select(`
        organization_id,
        organizations (
          id,
          name
        )
      `)
      .eq('user_id', user.id)
      .single()

    if (orgError || !userOrg) {
      return NextResponse.json({ 
        error: 'No organization found',
        organizationId: null 
      }, { status: 200 })
    }

    // Type assertion to handle the nested organization data
    const orgData = userOrg as any

    return NextResponse.json({
      organizationId: userOrg.organization_id,
      organizationName: orgData.organizations?.name || 'Unknown'
    })
  } catch (error) {
    console.error('Error fetching organization:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch organization' 
    }, { status: 500 })
  }
}