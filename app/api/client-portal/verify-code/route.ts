import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { accessCode } = await request.json()
    
    if (!accessCode) {
      return NextResponse.json({ 
        error: 'Access code is required' 
      }, { status: 400 })
    }

    const adminSupabase = createAdminClient()
    
    // Look up the access code
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
      .eq('access_code', accessCode.toUpperCase())
      .single()

    if (error || !portalAccess) {
      console.error('Access code lookup error:', error)
      return NextResponse.json({ 
        error: 'Invalid access code' 
      }, { status: 400 })
    }

    // Check if expired
    if (portalAccess.expires_at && new Date(portalAccess.expires_at) < new Date()) {
      return NextResponse.json({ 
        error: 'This access code has expired' 
      }, { status: 400 })
    }

    return NextResponse.json({ 
      success: true,
      portalAccess,
      client: portalAccess.clients
    })
  } catch (error: any) {
    console.error('Error verifying access code:', error)
    return NextResponse.json({ 
      error: 'Failed to verify access code',
      details: error.message 
    }, { status: 500 })
  }
}