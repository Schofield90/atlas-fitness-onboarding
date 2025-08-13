import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // This is a public endpoint - no auth required
    const supabase = await createClient()
    
    // Get the most recent Facebook integration
    const { data: integration, error: intError } = await supabase
      .from('facebook_integrations')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (intError || !integration) {
      // Try to get any integration, even inactive
      const { data: anyIntegration } = await supabase
        .from('facebook_integrations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()
      
      if (anyIntegration) {
        return NextResponse.json({
          success: false,
          error: 'Integration exists but is not active',
          details: `Last active: ${anyIntegration.last_sync_at || 'Never'}`,
          is_active: false,
          facebook_user: anyIntegration.facebook_user_name
        })
      }
      
      return NextResponse.json({
        success: false,
        error: 'No Facebook integration found in database',
        details: 'You need to connect Facebook first'
      })
    }
    
    // Check if token exists
    if (!integration.access_token) {
      return NextResponse.json({
        success: false,
        error: 'No access token stored',
        details: 'Token was cleared or never saved properly',
        facebook_user: integration.facebook_user_name
      })
    }
    
    // Check token expiration
    if (integration.token_expires_at) {
      const expiresAt = new Date(integration.token_expires_at)
      const now = new Date()
      
      if (expiresAt < now) {
        const daysAgo = Math.floor((now.getTime() - expiresAt.getTime()) / (1000 * 60 * 60 * 24))
        
        return NextResponse.json({
          success: false,
          error: 'Token expired',
          details: `Token expired ${daysAgo} days ago on ${expiresAt.toLocaleDateString()}`,
          expired_at: integration.token_expires_at,
          facebook_user: integration.facebook_user_name
        })
      }
      
      const daysRemaining = Math.floor((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      
      // Token is still valid
      return NextResponse.json({
        success: true,
        message: `Token is valid for ${daysRemaining} more days`,
        expires_at: integration.token_expires_at,
        facebook_user: integration.facebook_user_name,
        last_sync: integration.last_sync_at
      })
    }
    
    // No expiration date set (shouldn't happen)
    return NextResponse.json({
      success: false,
      error: 'Token has no expiration date',
      details: 'This is unusual - token may be invalid',
      facebook_user: integration.facebook_user_name
    })
    
  } catch (error: any) {
    console.error('Public validation error:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to validate token',
      details: error.message
    }, { status: 500 })
  }
}