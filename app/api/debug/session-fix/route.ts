import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    // Get current session user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        details: 'Please make sure you are logged in'
      }, { status: 401 })
    }
    
    // Create admin client
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // Delete any existing user entries
    await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', user.id)
    
    // Get Atlas Fitness organization
    const { data: orgs } = await supabaseAdmin
      .from('organizations')
      .select('*')
    
    const atlasOrg = orgs?.find(o => 
      o.name === 'Atlas Fitness' || 
      o.id === '63589490-8f55-4157-bd3a-e141594b748e'
    )
    
    if (!atlasOrg) {
      return NextResponse.json({ 
        error: 'Atlas Fitness organization not found',
        organizations: orgs
      }, { status: 404 })
    }
    
    // Create user entry
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: user.id,
        email: user.email || 'sam@atlas-gyms.co.uk',
        name: 'Sam Schofield',
        organization_id: atlasOrg.id,
        role: 'owner',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (insertError) {
      return NextResponse.json({ 
        error: 'Failed to create user',
        details: insertError.message,
        code: insertError.code,
        hint: insertError.hint
      }, { status: 500 })
    }
    
    // Test creating a lead
    const { data: testLead, error: leadError } = await supabaseAdmin
      .from('leads')
      .insert({
        name: 'Test Lead After Fix',
        email: 'test@afterfix.com',
        phone: '+1234567890',
        source: 'manual',
        status: 'new',
        organization_id: atlasOrg.id,
        created_by: user.id,
        assigned_to: user.id
      })
      .select()
    
    // Clear cache
    const { clearUserCache } = await import('@/app/lib/api/auth-check')
    clearUserCache(user.id)
    
    return NextResponse.json({
      success: true,
      message: 'User successfully created and linked to Atlas Fitness',
      authUser: {
        id: user.id,
        email: user.email
      },
      newUser,
      organization: {
        id: atlasOrg.id,
        name: atlasOrg.name
      },
      testLead: {
        created: !leadError,
        error: leadError?.message,
        data: testLead
      }
    })
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Session fix failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}