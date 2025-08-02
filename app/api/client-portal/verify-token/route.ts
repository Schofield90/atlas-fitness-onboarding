import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()
    
    if (!token) {
      return NextResponse.json({ 
        error: 'Token is required' 
      }, { status: 400 })
    }

    const adminSupabase = createAdminClient()
    
    // Look up the token
    const { data: portalAccess, error } = await adminSupabase
      .from('client_portal_access')
      .select(`
        *,
        clients (
          id,
          first_name,
          last_name,
          name,
          email,
          phone,
          client_type,
          user_id
        )
      `)
      .eq('magic_link_token', token)
      .single()

    if (error || !portalAccess) {
      console.error('Token lookup error:', error)
      return NextResponse.json({ 
        error: 'Invalid or expired link',
        details: error?.message 
      }, { status: 400 })
    }

    // Check if expired
    if (portalAccess.expires_at && new Date(portalAccess.expires_at) < new Date()) {
      return NextResponse.json({ 
        error: 'This link has expired' 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      portalAccess
    })
  } catch (error: any) {
    console.error('Error verifying token:', error)
    return NextResponse.json({ 
      error: 'Failed to verify token',
      details: error.message 
    }, { status: 500 })
  }
}