import { NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    
    const supabase = createAdminClient()
    
    // Get the user ID from auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('Error listing users:', authError)
      return NextResponse.json({ error: 'Failed to list users' }, { status: 500 })
    }
    
    const user = authUser.users.find(u => u.email === email)
    
    if (!user) {
      return NextResponse.json({ error: `User ${email} not found` }, { status: 404 })
    }
    
    // Grant super admin access
    const { data, error } = await supabase
      .from('super_admin_users')
      .upsert({
        user_id: user.id,
        role: 'super_admin',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error granting admin access:', error)
      return NextResponse.json({ error: 'Failed to grant admin access' }, { status: 500 })
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `Admin access granted to ${email}`,
      data 
    })
  } catch (error: any) {
    console.error('Grant access error:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 })
  }
}

// GET endpoint to check current admin status
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    
    const supabase = createAdminClient()
    
    // Get the user ID from auth.users
    const { data: authUser, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      return NextResponse.json({ error: 'Failed to list users' }, { status: 500 })
    }
    
    const user = authUser.users.find(u => u.email === email)
    
    if (!user) {
      return NextResponse.json({ isAdmin: false, message: `User ${email} not found` })
    }
    
    // Check if user has admin access
    const { data: adminUser, error } = await supabase
      .from('super_admin_users')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single()
    
    if (error || !adminUser) {
      return NextResponse.json({ 
        isAdmin: false, 
        userId: user.id,
        message: `User ${email} does not have admin access` 
      })
    }
    
    return NextResponse.json({ 
      isAdmin: true, 
      userId: user.id,
      adminUser,
      message: `User ${email} has ${adminUser.role} access` 
    })
  } catch (error: any) {
    console.error('Check access error:', error)
    return NextResponse.json({ 
      error: 'Server error', 
      details: error.message 
    }, { status: 500 })
  }
}