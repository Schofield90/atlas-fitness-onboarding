import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/app/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // This is a public endpoint - no auth required
    const supabase = await createClient()
    
    // First, let's check ALL integrations, active or not
    const { data: allIntegrations, error: allError } = await supabase
      .from('facebook_integrations')
      .select('*')
      .order('created_at', { ascending: false })
    
    console.log('Found integrations:', allIntegrations?.length || 0)
    
    if (allIntegrations && allIntegrations.length > 0) {
      // We have integrations, let's analyze them
      const activeOnes = allIntegrations.filter(i => i.is_active)
      const withTokens = allIntegrations.filter(i => i.access_token)
      
      // Return detailed information about what we found
      return NextResponse.json({
        success: false,
        error: 'Found integrations but none are working',
        total_integrations: allIntegrations.length,
        active_count: activeOnes.length,
        with_token_count: withTokens.length,
        integrations: allIntegrations.map(i => ({
          facebook_user: i.facebook_user_name,
          is_active: i.is_active,
          has_token: !!i.access_token,
          created_at: i.created_at,
          last_sync: i.last_sync_at,
          token_expires: i.token_expires_at,
          organization_id: i.organization_id
        })),
        details: activeOnes.length === 0 
          ? 'All integrations are inactive - they were likely disabled'
          : withTokens.length === 0 
          ? 'Tokens were cleared - need to reconnect'
          : 'Integrations exist but may have expired tokens'
      })
    }
    
    // Get the most recent Facebook integration
    const { data: integration, error: intError } = await supabase
      .from('facebook_integrations')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (intError || !integration) {
      return NextResponse.json({
        success: false,
        error: 'No Facebook integration found in database',
        details: 'You need to connect Facebook first',
        checked_table: 'facebook_integrations',
        total_found: 0
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