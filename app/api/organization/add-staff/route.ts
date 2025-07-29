import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { createAdminClient } from '@/app/lib/supabase/admin'
import { requireAuth } from '@/app/lib/api/auth-check'

export async function POST(request: NextRequest) {
  try {
    const userWithOrg = await requireAuth()
    const adminSupabase = createAdminClient()
    
    // Get the request body
    const body = await request.json()
    const { email, phone_number, role } = body
    
    if (!email || !phone_number) {
      return NextResponse.json({
        error: 'Email and phone number are required'
      }, { status: 400 })
    }
    
    // Check if user exists by email
    const { data: existingUser } = await adminSupabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()
    
    let userId = existingUser?.id
    
    // If user doesn't exist, create a placeholder with a unique ID
    if (!userId) {
      // For now, we'll create a staff record without a user_id
      // In a real app, you'd send an invitation email
      userId = `pending_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    }
    
    // Check if staff member already exists
    const { data: existingStaff } = await adminSupabase
      .from('organization_staff')
      .select('*')
      .eq('organization_id', userWithOrg.organizationId)
      .eq('email', email)
      .single()
    
    if (existingStaff) {
      return NextResponse.json({
        error: 'Staff member with this email already exists'
      }, { status: 400 })
    }
    
    // Create staff record
    const { data: newStaff, error } = await adminSupabase
      .from('organization_staff')
      .insert({
        organization_id: userWithOrg.organizationId,
        user_id: userId,
        phone_number: phone_number,
        email: email,
        role: role || 'staff',
        is_available: true,
        receives_calls: true,
        receives_sms: true,
        receives_whatsapp: true,
        receives_emails: true,
        routing_priority: 100
      })
      .select()
      .single()
    
    if (error) throw error
    
    return NextResponse.json({
      success: true,
      message: 'Staff member added successfully',
      staff: newStaff
    })
    
  } catch (error: any) {
    console.error('Error adding staff:', error)
    return NextResponse.json({
      error: 'Failed to add staff member',
      details: error.message
    }, { status: 500 })
  }
}