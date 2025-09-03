import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()
    
    // Only allow for specific email
    if (email !== 'sam@gymleadhub.co.uk') {
      return NextResponse.json({ 
        error: 'This endpoint is only for sam@gymleadhub.co.uk' 
      }, { status: 403 })
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    // Generate a UUID for the user
    const userId = crypto.randomUUID()
    
    // First, try to create the user record directly in public.users
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()
    
    let finalUserId = userId
    
    if (existingUser) {
      console.log('User already exists in public.users:', existingUser.id)
      finalUserId = existingUser.id
    } else {
      // Create new user record (handle different possible column names)
      const userData: any = {
        id: userId,
        email: email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
      
      // Try with full_name first, if that fails try name
      userData.full_name = 'Sam'
      
      const { error: insertError } = await supabase
        .from('users')
        .insert(userData)
      
      if (insertError) {
        console.error('Error creating user:', insertError)
        return NextResponse.json({ 
          error: 'Failed to create user record',
          details: insertError
        }, { status: 500 })
      }
      
      console.log('Created new user with ID:', userId)
    }
    
    // Create or get organization
    const { data: existingOrg } = await supabase
      .from('organizations')
      .select('*')
      .eq('owner_id', finalUserId)
      .single()
    
    let orgId
    
    if (existingOrg) {
      orgId = existingOrg.id
      console.log('Organization already exists:', orgId)
    } else {
      // Create organization
      const { data: newOrg, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: 'GymLeadHub',
          owner_id: finalUserId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (orgError) {
        console.error('Error creating organization:', orgError)
      } else {
        orgId = newOrg.id
        console.log('Created organization:', orgId)
        
        // Link user to organization
        await supabase
          .from('user_organizations')
          .upsert({
            user_id: finalUserId,
            organization_id: orgId,
            role: 'owner'
          })
      }
    }
    
    // Create a session token (simplified - in production use proper JWT)
    const sessionToken = crypto.randomBytes(32).toString('hex')
    
    // Store session (you might want to use a different mechanism)
    // For now, we'll return the data needed for manual login
    
    return NextResponse.json({ 
      success: true,
      message: 'Emergency setup completed',
      userId: finalUserId,
      organizationId: orgId,
      sessionToken: sessionToken,
      instructions: 'User and organization created. Use the manual login on /signup-simple page.'
    })
    
  } catch (error: any) {
    console.error('Emergency setup error:', error)
    return NextResponse.json({ 
      error: 'Emergency setup failed',
      details: error.message
    }, { status: 500 })
  }
}