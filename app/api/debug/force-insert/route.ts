import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    // Create admin client with service role
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: 'Service Unavailable', message: 'Missing Supabase configuration' }, { status: 503 })
    }
    const supabaseAdmin = createAdminClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )
    
    // First check if user exists
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', 'ea1fc8e3-35a2-4c59-80af-5fde557391a1')
    
    if (existingUser && existingUser.length > 0) {
      return NextResponse.json({
        message: 'User already exists',
        user: existingUser[0]
      })
    }
    
    // Force insert the user
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: 'ea1fc8e3-35a2-4c59-80af-5fde557391a1',
        email: 'sam@atlas-gyms.co.uk',
        name: 'Sam Schofield',
        organization_id: '63589490-8f55-4157-bd3a-e141594b748e',
        role: 'owner',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
    
    if (insertError) {
      // Try without is_active field in case it doesn't exist
      const { data: retryUser, error: retryError } = await supabaseAdmin
        .from('users')
        .insert({
          id: 'ea1fc8e3-35a2-4c59-80af-5fde557391a1',
          email: 'sam@atlas-gyms.co.uk',
          name: 'Sam Schofield',
          organization_id: '63589490-8f55-4157-bd3a-e141594b748e',
          role: 'owner',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
      
      if (retryError) {
        return NextResponse.json({
          error: 'Failed to insert user',
          insertError: insertError.message,
          retryError: retryError.message,
          hint: 'Please check if the users table exists and has the correct columns'
        }, { status: 500 })
      }
      
      return NextResponse.json({
        success: true,
        message: 'User created successfully (without is_active)',
        user: retryUser
      })
    }
    
    // Verify it was created
    const { data: verifyUser } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', 'ea1fc8e3-35a2-4c59-80af-5fde557391a1')
      .single()
    
    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      insertedUser: newUser,
      verifiedUser: verifyUser
    })
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Force insert failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}