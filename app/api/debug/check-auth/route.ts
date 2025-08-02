import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ 
        authenticated: false,
        message: 'No user logged in'
      })
    }
    
    // Check user organizations
    const { data: userOrgs, error: orgsError } = await supabase
      .from('user_organizations')
      .select('*')
      .eq('user_id', user.id)
    
    // Check if user exists in organizations table (old setup)
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('*')
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        metadata: user.user_metadata
      },
      userOrganizations: userOrgs || [],
      allOrganizations: organizations || [],
      errors: {
        userOrgs: orgsError,
        organizations: orgError
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to check auth',
      details: error.message
    }, { status: 500 })
  }
}