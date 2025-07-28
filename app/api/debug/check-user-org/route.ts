import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        details: authError?.message 
      }, { status: 401 })
    }
    
    // Check users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    
    // Check organizations
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('*')
    
    // Check if organization_id exists in users table
    const hasOrgId = userData?.organization_id ? true : false
    
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        hasOrganizationId: hasOrgId
      },
      userData: userData || null,
      organizations: organizations || [],
      errors: {
        userError: userError?.message,
        orgError: orgError?.message
      }
    })
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to check user organization',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}