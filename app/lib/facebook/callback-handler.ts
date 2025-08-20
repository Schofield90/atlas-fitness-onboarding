/**
 * Facebook OAuth Callback Handler
 * Handles the OAuth callback flow and persists connection to database
 */

import { createClient } from '@/app/lib/supabase/server'

interface CallbackParams {
  code: string
  state: string
  organizationId: string
  userId: string
}

interface CallbackResult {
  success: boolean
  data?: any
  error?: string
}

/**
 * Validates environment configuration for Facebook OAuth
 */
export function validateFacebookEnv(): { valid: boolean; error?: string } {
  const required = {
    FACEBOOK_APP_SECRET: process.env.FACEBOOK_APP_SECRET,
    NEXT_PUBLIC_FACEBOOK_APP_ID: process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '715100284200848',
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  }

  const missing = Object.entries(required)
    .filter(([key, value]) => !value && key === 'FACEBOOK_APP_SECRET')
    .map(([key]) => key)

  if (missing.length > 0) {
    return {
      valid: false,
      error: `Missing required environment variables: ${missing.join(', ')}`
    }
  }

  return { valid: true }
}

/**
 * Exchange OAuth code for access token
 */
async function exchangeCodeForToken(code: string): Promise<{ 
  access_token: string
  expires_in: number
  error?: string 
}> {
  const appId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '715100284200848'
  const appSecret = process.env.FACEBOOK_APP_SECRET
  const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/auth/facebook/callback`

  const tokenUrl = new URL('https://graph.facebook.com/v19.0/oauth/access_token')
  tokenUrl.searchParams.append('client_id', appId)
  tokenUrl.searchParams.append('client_secret', appSecret!)
  tokenUrl.searchParams.append('redirect_uri', redirectUri)
  tokenUrl.searchParams.append('code', code)

  console.log('📞 Exchanging OAuth code for token...')
  
  try {
    const response = await fetch(tokenUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Token exchange failed:', data)
      return {
        access_token: '',
        expires_in: 0,
        error: data.error?.message || 'Failed to exchange code for token'
      }
    }

    console.log('✅ Token exchange successful')
    return {
      access_token: data.access_token,
      expires_in: data.expires_in || 5183999 // Default to 60 days
    }
  } catch (error) {
    console.error('❌ Token exchange error:', error)
    return {
      access_token: '',
      expires_in: 0,
      error: error instanceof Error ? error.message : 'Network error during token exchange'
    }
  }
}

/**
 * Fetch Facebook user data
 */
async function fetchFacebookUser(accessToken: string): Promise<{
  id?: string
  name?: string
  email?: string
  error?: string
}> {
  const meUrl = `https://graph.facebook.com/v19.0/me?fields=id,name,email&access_token=${accessToken}`

  console.log('📞 Fetching Facebook user data...')

  try {
    const response = await fetch(meUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Failed to fetch user data:', data)
      return {
        error: data.error?.message || 'Failed to fetch user data'
      }
    }

    console.log('✅ User data fetched:', { id: data.id, name: data.name })
    return data
  } catch (error) {
    console.error('❌ User data fetch error:', error)
    return {
      error: error instanceof Error ? error.message : 'Network error fetching user data'
    }
  }
}

/**
 * Main callback handler function
 */
export async function handleFacebookCallback(params: CallbackParams): Promise<CallbackResult> {
  const { code, state, organizationId, userId } = params

  console.log('🔄 Processing Facebook OAuth callback...')

  // Step 1: Validate environment
  const envCheck = validateFacebookEnv()
  if (!envCheck.valid) {
    console.error('❌ Environment validation failed:', envCheck.error)
    return {
      success: false,
      error: envCheck.error
    }
  }

  // Step 2: Validate OAuth state
  if (state !== 'atlas_fitness_oauth') {
    console.error('❌ Invalid OAuth state:', state)
    return {
      success: false,
      error: 'Invalid OAuth state parameter'
    }
  }

  // Step 3: Exchange code for token
  const tokenResult = await exchangeCodeForToken(code)
  if (tokenResult.error) {
    return {
      success: false,
      error: tokenResult.error
    }
  }

  // Step 4: Fetch user data
  const userData = await fetchFacebookUser(tokenResult.access_token)
  if (userData.error || !userData.id) {
    return {
      success: false,
      error: userData.error || 'Failed to get user ID'
    }
  }

  // Step 5: Calculate token expiration
  const tokenExpiresAt = new Date(Date.now() + tokenResult.expires_in * 1000)

  // Step 6: Persist to database
  const supabase = await createClient()
  
  const integrationData = {
    organization_id: organizationId,
    user_id: userId,
    facebook_user_id: userData.id,
    facebook_user_name: userData.name || null,
    facebook_user_email: userData.email || null,
    access_token: tokenResult.access_token,
    token_expires_at: tokenExpiresAt.toISOString(),
    granted_scopes: ['email', 'public_profile', 'leads_retrieval', 'pages_show_list', 'pages_read_engagement'],
    is_active: true,
    settings: {},
    updated_at: new Date().toISOString()
  }

  console.log('💾 Upserting Facebook integration...')

  const { data, error } = await supabase
    .from('facebook_integrations')
    .upsert(integrationData, {
      onConflict: 'organization_id,facebook_user_id',
      ignoreDuplicates: false // Update on conflict
    })
    .select()
    .single()

  if (error) {
    console.error('❌ Database upsert failed:', error)
    
    // Check for RLS policy violation
    if (error.code === '42501' || error.message?.includes('row-level security')) {
      return {
        success: false,
        error: `RLS_DENIED: User ${userId} cannot access organization ${organizationId}`
      }
    }

    return {
      success: false,
      error: `Database error: ${error.message}`
    }
  }

  console.log('✅ Facebook integration saved successfully')

  return {
    success: true,
    data: {
      ...integrationData,
      id: data?.id
    }
  }
}