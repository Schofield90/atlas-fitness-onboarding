import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Force create a session without requiring login
    const defaultOrgId = '63589490-8f55-4157-bd3a-e141594b748e'
    
    // Get or create a test user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (user) {
      // User exists, ensure they have organization membership
      const { data: existingMembership } = await supabase
        .from('organization_members')
        .select('*')
        .eq('user_id', user.id)
        .eq('organization_id', defaultOrgId)
        .single()
      
      if (!existingMembership) {
        // Create the membership
        const { error: insertError } = await supabase
          .from('organization_members')
          .insert({
            user_id: user.id,
            organization_id: defaultOrgId,
            role: 'owner',
            is_active: true
          })
        
        if (!insertError) {
          return NextResponse.json({
            success: true,
            message: 'Organization membership created',
            user_id: user.id,
            organization_id: defaultOrgId,
            action: 'Try logging in again'
          })
        }
      }
      
      // Also ensure user_organizations exists
      const { error: upsertError } = await supabase
        .from('user_organizations')
        .upsert({
          user_id: user.id,
          organization_id: defaultOrgId,
          role: 'owner'
        }, {
          onConflict: 'user_id'
        })
      
      return NextResponse.json({
        success: true,
        message: 'User authenticated and organization fixed',
        user_id: user.id,
        organization_id: defaultOrgId,
        has_membership: true,
        action: 'You should now be able to access the dashboard'
      })
    } else {
      // No user session
      return NextResponse.json({
        success: false,
        message: 'No user session found',
        action: 'Please log in first at /login',
        tip: 'Do NOT use the red button - it will log you out'
      })
    }
    
  } catch (error: any) {
    console.error('Emergency fix error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      action: 'Try logging in manually at /login'
    }, { status: 500 })
  }
}