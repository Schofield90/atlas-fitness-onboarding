import { NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST() {
  try {
    const supabase = await createClient()
    
    // Create admin client to bypass RLS
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
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Not authenticated',
        details: authError?.message 
      }, { status: 401 })
    }
    
    // Check if user already exists in users table using admin client
    const { data: existingUser, error: checkError } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()
    
    if (existingUser && !checkError) {
      return NextResponse.json({
        message: 'User already exists in users table',
        user: existingUser
      })
    }
    
    // Get the Atlas Fitness organization using admin client
    const { data: organization, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('*')
      .eq('name', 'Atlas Fitness')
      .single()
    
    if (orgError || !organization) {
      return NextResponse.json({ 
        error: 'Atlas Fitness organization not found',
        details: orgError?.message 
      }, { status: 404 })
    }
    
    // Create user entry with organization_id using admin client to bypass RLS
    const { data: newUser, error: insertError } = await supabaseAdmin
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        name: user.email?.split('@')[0] || 'User', // Use email prefix as name
        organization_id: organization.id,
        role: 'owner', // Set as owner since this is the main account
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (insertError) {
      return NextResponse.json({ 
        error: 'Failed to create user entry',
        details: insertError.message,
        hint: insertError.hint
      }, { status: 500 })
    }
    
    return NextResponse.json({
      success: true,
      message: 'User successfully linked to Atlas Fitness organization',
      user: newUser
    })
    
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to fix user organization',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}