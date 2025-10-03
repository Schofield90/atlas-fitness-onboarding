import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function POST(request: Request) {
  try {
    const { email, password, name, organizationName } = await request.json()
    
    // Only allow for specific email during testing
    if (email !== 'sam@gymleadhub.co.uk') {
      return NextResponse.json({ 
        error: 'This endpoint is currently restricted' 
      }, { status: 403 })
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'auth'
      }
    })
    
    const userId = crypto.randomUUID()
    const hashedPassword = await bcrypt.hash(password || 'TempPassword123!', 10)
    
    // Create user directly in auth.users table
    const { error: authInsertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        encrypted_password: hashedPassword,
        email_confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        raw_user_meta_data: {
          full_name: name || 'Sam',
          organization_name: organizationName || 'GymLeadHub'
        },
        aud: 'authenticated',
        role: 'authenticated',
        confirmation_token: crypto.randomBytes(32).toString('hex')
      })
    
    if (authInsertError) {
      console.error('Error creating auth user:', authInsertError)
      return NextResponse.json({ 
        error: 'Failed to create auth user',
        details: authInsertError
      }, { status: 500 })
    }
    
    // Now create the public.users record
    const publicSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    const { error: publicUserError } = await publicSupabase
      .from('users')
      .insert({
        id: userId,
        email,
        full_name: name || 'Sam',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    
    if (publicUserError && publicUserError.code !== '23505') {
      console.error('Error creating public user:', publicUserError)
      // Continue anyway - auth user exists
    }
    
    // Create organization
    if (organizationName) {
      const orgSlug = organizationName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') + '-' + crypto.randomBytes(4).toString('hex')
      
      const { data: org } = await publicSupabase
        .from('organizations')
        .insert({
          name: organizationName,
          slug: orgSlug,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (org) {
        await publicSupabase
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
      message: 'User created successfully. Please sign in.',
      userId,
      email
    })
    
  } catch (error: any) {
    console.error('Manual create error:', error)
    return NextResponse.json({ 
      error: 'Failed to create user',
      details: error.message
    }, { status: 500 })
  }
}