import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
  try {
    const { email, password, name, organizationName } = await request.json()
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // First, try the normal auth flow
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: name,
        organization_name: organizationName
      }
    })
    
    if (authError) {
      console.error('Admin create user error:', authError)
      
      // If auth fails, create user directly in database
      const userId = crypto.randomUUID()
      
      // Create user in public.users
      const { error: userError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email,
          full_name: name || email.split('@')[0],
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
      
      if (userError && userError.code !== '23505') {
        return NextResponse.json({ 
          error: 'Failed to create user record',
          details: userError
        }, { status: 500 })
      }
      
      // Create organization if provided
      if (organizationName) {
        const orgSlug = organizationName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
        
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: organizationName,
            slug: orgSlug + '-' + crypto.randomBytes(4).toString('hex'),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single()
        
        if (org && !orgError) {
          // Link user to organization
          await supabase
            .from('organization_members')
            .insert({
              user_id: userId,
              org_id: org.id,
              role: 'owner'
            })
        }
      }
      
      return NextResponse.json({ 
        success: true,
        message: 'User created directly in database. Please sign in.',
        userId
      })
    }
    
    // Auth succeeded
    if (authData?.user) {
      // Ensure user exists in public.users (trigger should handle this)
      await supabase
        .from('users')
        .upsert({
          id: authData.user.id,
          email: authData.user.email,
          full_name: name || email.split('@')[0]
        })
      
      return NextResponse.json({ 
        success: true,
        userId: authData.user.id,
        message: 'Account created successfully'
      })
    }
    
    return NextResponse.json({ 
      error: 'Failed to create account'
    }, { status: 500 })
    
  } catch (error: any) {
    console.error('Direct signup error:', error)
    return NextResponse.json({ 
      error: 'Server error during signup',
      details: error.message
    }, { status: 500 })
  }
}