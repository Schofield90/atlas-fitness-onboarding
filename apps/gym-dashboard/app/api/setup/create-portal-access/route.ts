import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { clientId } = await request.json()
    
    if (!clientId) {
      return NextResponse.json({ 
        error: 'Client ID is required' 
      }, { status: 400 })
    }

    const adminSupabase = createAdminClient()
    
    // Get client details
    const { data: client, error: clientError } = await adminSupabase
      .from('clients')
      .select('*, organization_id')
      .eq('id', clientId)
      .single()

    if (clientError || !client) {
      return NextResponse.json({ 
        error: 'Client not found' 
      }, { status: 404 })
    }

    // Check if portal access already exists
    const { data: existingAccess } = await adminSupabase
      .from('client_portal_access')
      .select('*')
      .eq('client_id', clientId)
      .single()

    if (existingAccess) {
      return NextResponse.json({ 
        success: true,
        portalAccess: existingAccess,
        message: 'Portal access already exists' 
      })
    }

    // Generate access code
    const generateAccessCode = () => {
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      let code = ''
      for (let i = 0; i < 12; i++) {
        if (i === 4 || i === 8) {
          code += '-'
        } else {
          code += chars[Math.floor(Math.random() * chars.length)]
        }
      }
      return code
    }

    const accessCode = generateAccessCode()

    // Create portal access
    const { data: portalAccess, error: createError } = await adminSupabase
      .from('client_portal_access')
      .insert({
        client_id: clientId,
        organization_id: client.organization_id,
        access_code: accessCode,
        magic_link_token: crypto.randomUUID(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        is_claimed: false
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating portal access:', createError)
      return NextResponse.json({ 
        error: 'Failed to create portal access',
        details: createError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      portalAccess,
      message: 'Portal access created successfully' 
    })
  } catch (error: any) {
    console.error('Error in create-portal-access:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error.message 
    }, { status: 500 })
  }
}