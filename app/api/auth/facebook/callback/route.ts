import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/app/lib/supabase/server'
import { getCurrentUserOrganization } from '@/app/lib/organization-server'
import { handleFacebookCallback, validateFacebookEnv } from '@/app/lib/facebook/callback-handler'

export const runtime = 'nodejs' // Force Node.js runtime for better env var support

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')

  // Check for errors from Facebook
  if (error) {
    const errorDescription = searchParams.get('error_description') || 'Unknown error'
    console.error('Facebook OAuth error:', error, errorDescription)
    
    // Redirect to our callback page with error
    const callbackUrl = new URL('/integrations/facebook/callback', request.url)
    callbackUrl.searchParams.set('error', error)
    callbackUrl.searchParams.set('error_description', errorDescription)
    
    return NextResponse.redirect(callbackUrl)
  }

  // Verify state parameter for security
  if (state !== 'atlas_fitness_oauth') {
    console.error('❌ Invalid OAuth state parameter:', state)
    const callbackUrl = new URL('/integrations/facebook/callback', request.url)
    callbackUrl.searchParams.set('error', 'invalid_state')
    callbackUrl.searchParams.set('error_description', 'OAuth state mismatch')
    
    return NextResponse.redirect(callbackUrl)
  }

  // Check if we received an authorization code
  if (!code) {
    console.error('No authorization code received')
    const callbackUrl = new URL('/integrations/facebook/callback', request.url)
    callbackUrl.searchParams.set('error', 'no_code')
    
    return NextResponse.redirect(callbackUrl)
  }

  try {
    console.log('🔄 Facebook OAuth code received:', code.substring(0, 10) + '...')
    
    // Validate environment first
    const envCheck = validateFacebookEnv()
    if (!envCheck.valid) {
      console.error('❌ Environment validation failed:', envCheck.error)
      const callbackUrl = new URL('/integrations/facebook/callback', request.url)
      callbackUrl.searchParams.set('error', 'configuration_error')
      callbackUrl.searchParams.set('error_description', envCheck.error || 'Missing required environment variables')
      return NextResponse.redirect(callbackUrl)
    }

    // Get current user and organization
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.error('❌ User not authenticated during OAuth callback')
      const callbackUrl = new URL('/integrations/facebook/callback', request.url)
      callbackUrl.searchParams.set('error', 'authentication_required')
      return NextResponse.redirect(callbackUrl)
    }

    let { organizationId, error: orgError } = await getCurrentUserOrganization()
    
    if (orgError || !organizationId) {
      console.error('⚠️ No organization found during OAuth callback, checking fallback')
      
      // Try to get organization from user_organizations table
      const { data: userOrg } = await supabase
        .from('user_organizations')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single()
      
      if (userOrg?.organization_id) {
        organizationId = userOrg.organization_id
        console.log('✅ Found organization from user_organizations:', organizationId)
      } else {
        // Use the default Atlas Fitness organization as last resort
        organizationId = '63589490-8f55-4157-bd3a-e141594b748e'
        console.log('⚠️ Using default organization:', organizationId)
        
        // Try to create the user_organizations entry
        try {
          await supabase
            .from('user_organizations')
            .insert({
              user_id: user.id,
              organization_id: organizationId,
              role: 'member',
              is_active: true
            })
          console.log('✅ Created user_organizations entry with default org')
        } catch (e) {
          console.log('⚠️ Could not create user_organizations entry:', e)
        }
      }
    }

    // Use our new handler function
    const result = await handleFacebookCallback({
      code,
      state: state || '',
      organizationId,
      userId: user.id
    })

    if (!result.success) {
      console.error('❌ Callback handler failed:', result.error)
      const callbackUrl = new URL('/integrations/facebook/callback', request.url)
      callbackUrl.searchParams.set('error', 'processing_failed')
      callbackUrl.searchParams.set('error_description', result.error || 'Failed to complete OAuth flow')
      return NextResponse.redirect(callbackUrl)
    }

    console.log('✅ Facebook integration completed successfully')

    // Success - redirect with user data
    const callbackUrl = new URL('/integrations/facebook/callback', request.url)
    callbackUrl.searchParams.set('success', 'true')
    callbackUrl.searchParams.set('user_id', result.data.facebook_user_id)
    callbackUrl.searchParams.set('user_name', result.data.facebook_user_name || '')
    callbackUrl.searchParams.set('state', state || '')
    
    return NextResponse.redirect(callbackUrl)
    
  } catch (error) {
    console.error('Error processing Facebook OAuth:', error)
    
    const callbackUrl = new URL('/integrations/facebook/callback', request.url)
    callbackUrl.searchParams.set('error', 'processing_error')
    
    return NextResponse.redirect(callbackUrl)
  }
}