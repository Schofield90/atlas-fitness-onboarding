import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: Request) {
  try {
    // Get email from request body
    const body = await request.json()
    const email = body.email || 'sam@atlas-gyms.co.uk'
    
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
    
    // 1. Find the auth user by email
    const { data: authUsers, error: authError } = await supabaseAdmin
      .from('auth.users')
      .select('*')
      .eq('email', email)
    
    if (authError || !authUsers || authUsers.length === 0) {
      return NextResponse.json({ 
        error: 'Auth user not found',
        email,
        authError: authError?.message
      }, { status: 404 })
    }
    
    const authUser = authUsers[0]
    
    // 2. Delete any existing user entries
    await supabaseAdmin
      .from('users')
      .delete()
      .eq('id', authUser.id)
    
    // 3. Get Atlas Fitness organization
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
    
    // 4. Create user entry
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authUser.id,
        email: authUser.email,
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
        code: insertError.code
      }, { status: 500 })
    }
    
    // 5. Verify it worked
    const { data: verify } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()
    
    // 6. Test creating a lead
    const { data: testLead, error: leadError } = await supabaseAdmin
      .from('leads')
      .insert({
        name: 'Test Lead After Fix',
        email: 'test@afterfix.com',
        phone: '+1234567890',
        source: 'manual',
        status: 'new',
        organization_id: atlasOrg.id,
        created_by: authUser.id,
        assigned_to: authUser.id
      })
      .select()
    
    return NextResponse.json({
      success: true,
      authUser: {
        id: authUser.id,
        email: authUser.email
      },
      newUser,
      verified: verify,
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
      error: 'Direct fix failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}