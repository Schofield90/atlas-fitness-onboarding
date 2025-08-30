import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/app/lib/supabase/admin'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const code = searchParams.get('code') || 'VEZG-Y8P-MZ4'
    
    const adminSupabase = createAdminClient()
    
    // Direct query
    const { data, error } = await adminSupabase
      .from('client_portal_access')
      .select('*')
      .eq('access_code', code)
      .single()
    
    if (error) {
      return NextResponse.json({ 
        error: 'Query failed',
        details: error.message,
        code: code
        // Removed SQL query to prevent SQL injection vulnerability exposure
      }, { status: 400 })
    }
    
    // If found, generate the claim URL
    const claimUrl = data ? `${request.nextUrl.origin}/client-portal/claim?token=${data.magic_link_token}` : null
    
    return NextResponse.json({
      success: true,
      accessCode: code,
      found: !!data,
      portalAccess: data,
      claimUrl,
      instructions: data ? 'Use the claimUrl to set up your password' : 'Access code not found'
    })
  } catch (error: any) {
    return NextResponse.json({ 
      error: 'Test failed',
      details: error.message 
    }, { status: 500 })
  }
}