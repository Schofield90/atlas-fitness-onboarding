/**
 * Facebook Connection Status Checker
 * Single source of truth for Facebook connection status
 */

import { createClient } from '@/app/lib/supabase/server'

interface StatusCheckParams {
  organizationId: string
  userId: string
}

interface StatusCheckResult {
  connected: boolean
  integration?: {
    id: string
    facebook_user_id: string
    facebook_user_name: string | null
    facebook_user_email: string | null
    token_expires_at: string
    is_active: boolean
    last_sync_at: string | null
  }
  error?: string
}

/**
 * Check if a Facebook integration exists and is valid
 */
export async function checkFacebookStatus(params: StatusCheckParams): Promise<StatusCheckResult> {
  const { organizationId, userId } = params

  console.log('🔍 Checking Facebook connection status...')

  try {
    const supabase = await createClient()

    // Query for active integration for this specific user
    const { data: integration, error } = await supabase
      .from('facebook_integrations')
      .select(`
        id,
        facebook_user_id,
        facebook_user_name,
        facebook_user_email,
        token_expires_at,
        is_active,
        last_sync_at
      `)
      .eq('organization_id', organizationId)
      .eq('user_id', userId)
      .eq('is_active', true)
      .single()

    if (error) {
      // Check for RLS policy violation
      if (error.code === '42501' || error.message?.includes('row-level security')) {
        console.error('❌ RLS policy blocked access:', error)
        return {
          connected: false,
          error: `RLS policy prevents access for user ${userId} to organization ${organizationId}`
        }
      }

      // No integration found
      if (error.code === 'PGRST116') {
        console.log('ℹ️ No Facebook integration found')
        return {
          connected: false
        }
      }

      console.error('❌ Database query error:', error)
      return {
        connected: false,
        error: error.message
      }
    }

    if (!integration) {
      console.log('ℹ️ No active integration found')
      return {
        connected: false
      }
    }

    // Check if token is expired (if expiry date is set)
    if (integration.token_expires_at) {
      const tokenExpiry = new Date(integration.token_expires_at)
      const now = new Date()

      if (tokenExpiry < now) {
        console.log('⏰ Token has expired:', tokenExpiry)
        return {
          connected: false,
          integration,
          error: 'Token expired. Please reconnect your Facebook account.'
        }
      }

      // Check if token is expiring soon (within 7 days)
      const expiryWarning = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      if (tokenExpiry < expiryWarning) {
        console.log('⚠️ Token expiring soon:', tokenExpiry)
        // Still connected but warn about upcoming expiry
        return {
          connected: true,
          integration,
          error: `Token expires on ${tokenExpiry.toLocaleDateString()}. Consider reconnecting soon.`
        }
      }
    }

    console.log('✅ Facebook integration is active')
    return {
      connected: true,
      integration
    }

  } catch (error) {
    console.error('❌ Unexpected error checking status:', error)
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Invalidate a Facebook integration (mark as inactive)
 */
export async function invalidateFacebookIntegration(params: StatusCheckParams): Promise<boolean> {
  const { organizationId } = params

  console.log('🗑️ Invalidating Facebook integration...')

  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('facebook_integrations')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('organization_id', organizationId)

    if (error) {
      console.error('❌ Failed to invalidate integration:', error)
      return false
    }

    console.log('✅ Integration invalidated')
    return true

  } catch (error) {
    console.error('❌ Unexpected error invalidating integration:', error)
    return false
  }
}