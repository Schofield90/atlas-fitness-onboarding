/**
 * GoCardless OAuth Connection API
 * Handles merchant onboarding for direct debit acceptance
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'
import { goCardlessService } from '@/app/lib/gocardless-server'
import { checkAuthAndOrganization } from '@/app/lib/api/auth-check-org'

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await checkAuthAndOrganization(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      )
    }
    
    const { organizationId } = authResult
    
    // Get redirect URI from environment or request
    const redirectUri = process.env.GOCARDLESS_REDIRECT_URI || 
      `${process.env.NEXT_PUBLIC_APP_URL}/api/connect/gocardless/callback`
    
    // Generate OAuth URL
    const authUrl = await goCardlessService.getOAuthUrl(organizationId, redirectUri)
    
    // Return OAuth URL for frontend to redirect
    return NextResponse.json({
      success: true,
      authUrl,
      message: 'Redirect user to GoCardless for authorization'
    })
    
  } catch (error) {
    console.error('Error initiating GoCardless OAuth:', error)
    return NextResponse.json(
      { error: 'Failed to initiate GoCardless connection' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await checkAuthAndOrganization(request)
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: 401 }
      )
    }
    
    const { organizationId } = authResult
    const supabase = await createClient()
    
    // Get connected account
    const { data: account } = await supabase
      .from('connected_accounts')
      .select('gc_organization_id')
      .eq('organization_id', organizationId)
      .single()
    
    if (!account?.gc_organization_id) {
      return NextResponse.json(
        { error: 'No GoCardless account connected' },
        { status: 404 }
      )
    }
    
    // Clear GoCardless connection data
    const { error } = await supabase
      .from('connected_accounts')
      .update({
        gc_organization_id: null,
        gc_access_token: null,
        gc_refresh_token: null,
        gc_webhook_secret: null,
        gc_enabled: false,
        gc_verified: false,
        gc_creditor_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('organization_id', organizationId)
    
    if (error) {
      throw error
    }
    
    return NextResponse.json({
      success: true,
      message: 'GoCardless account disconnected successfully'
    })
    
  } catch (error) {
    console.error('Error disconnecting GoCardless:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect GoCardless account' },
      { status: 500 }
    )
  }
}