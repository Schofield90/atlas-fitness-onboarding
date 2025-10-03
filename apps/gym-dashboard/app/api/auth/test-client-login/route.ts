import { NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function GET() {
  try {
    const supabase = createAdminClient()
    
    // Find Sam's client record
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('email', 'samschofield90@hotmail.co.uk')
      .single()
    
    if (clientError || !client) {
      return NextResponse.json({ 
        error: 'Sam Schofield not found. Please create the client first.' 
      }, { status: 404 })
    }
    
    // Check if Sam has portal access
    const { data: portalAccess, error: accessError } = await supabase
      .from('client_portal_access')
      .select('*')
      .eq('client_id', client.id)
      .single()
    
    if (accessError || !portalAccess) {
      return NextResponse.json({ 
        error: 'Sam does not have portal access set up',
        suggestion: 'Go to /setup-sam-portal to create portal access'
      }, { status: 404 })
    }
    
    // Generate a direct login link
    const loginUrl = new URL('/client-portal/login', process.env.NEXT_PUBLIC_URL || 'http://localhost:3000')
    
    return NextResponse.json({
      success: true,
      client: {
        name: client.name || `${client.first_name} ${client.last_name}`,
        email: client.email,
        id: client.id
      },
      portalAccess: {
        accessCode: portalAccess.access_code,
        magicLinkToken: portalAccess.magic_link_token,
        isClaimed: portalAccess.is_claimed
      },
      loginOptions: {
        withCode: `${loginUrl}?code=${portalAccess.access_code}`,
        withMagicLink: portalAccess.is_claimed 
          ? 'Use email magic link at /client-portal/login'
          : `${loginUrl.origin}/client-portal/claim?token=${portalAccess.magic_link_token}`,
        directPortalLogin: loginUrl.toString()
      },
      instructions: portalAccess.is_claimed 
        ? 'Sam has already set up their account. Use the access code or request a magic link.'
        : 'This is Sam\'s first login. Use the magic link to set up their password.'
    })
  } catch (error: any) {
    return NextResponse.json({
      error: 'Failed to get client info',
      details: error.message
    }, { status: 500 })
  }
}