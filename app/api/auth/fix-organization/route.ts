import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }
    
    // Known organization ID for Atlas Fitness
    const organizationId = '63589490-8f55-4157-bd3a-e141594b748e'
    
    console.log('🔧 Fixing organization membership for user:', user.email)
    
    // First, ensure user exists in users table
    const { data: userRecord, error: userError2 } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email || '',
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
        created_at: user.created_at
      }, {
        onConflict: 'id'
      })
      .select()
      .single()
    
    if (userError2) {
      console.error('Error creating user record:', userError2)
    } else {
      console.log('✅ User record ensured')
    }
    
    // Check if organization exists
    const { data: org, error: orgCheckError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single()
    
    if (!org) {
      // Create organization if it doesn't exist
      const { error: orgCreateError } = await supabase
        .from('organizations')
        .insert({
          id: organizationId,
          name: 'Atlas Fitness',
          slug: 'atlas-fitness',
          owner_id: user.id,
          settings: {
            timezone: 'Europe/London',
            currency: 'GBP',
            locale: 'en-GB'
          }
        })
      
      if (orgCreateError) {
        console.error('Error creating organization:', orgCreateError)
      } else {
        console.log('✅ Organization created')
      }
    }
    
    // Create or update organization membership
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .upsert({
        user_id: user.id,
        organization_id: organizationId,
        role: 'owner', // Give owner role since this is Sam
        is_active: true,
        joined_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,organization_id'
      })
      .select()
      .single()
    
    if (membershipError) {
      console.error('Error creating membership:', membershipError)
      return NextResponse.json({ 
        error: 'Failed to create organization membership',
        details: membershipError.message 
      }, { status: 500 })
    }
    
    console.log('✅ Organization membership fixed')
    
    return NextResponse.json({
      success: true,
      message: 'Organization membership has been fixed',
      data: {
        userId: user.id,
        organizationId: organizationId,
        role: membership.role,
        email: user.email
      }
    })
    
  } catch (error: any) {
    console.error('Fix organization error:', error)
    return NextResponse.json({ 
      error: 'Failed to fix organization', 
      details: error.message 
    }, { status: 500 })
  }
}