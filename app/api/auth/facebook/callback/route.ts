import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

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
    console.error('Invalid OAuth state parameter')
    const callbackUrl = new URL('/integrations/facebook/callback', request.url)
    callbackUrl.searchParams.set('error', 'invalid_state')
    
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
    console.log('Facebook OAuth code received:', code.substring(0, 10) + '...')
    
    // Exchange authorization code for access token
    const fbAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '715100284200848'
    const fbAppSecret = process.env.FACEBOOK_APP_SECRET
    const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://atlas-fitness-onboarding.vercel.app'}/api/auth/facebook/callback`
    
    if (!fbAppSecret) {
      console.error('❌ Facebook App Secret not configured')
      const callbackUrl = new URL('/integrations/facebook/callback', request.url)
      callbackUrl.searchParams.set('error', 'configuration_error')
      callbackUrl.searchParams.set('error_description', 'Please add FACEBOOK_APP_SECRET to your environment variables')
      return NextResponse.redirect(callbackUrl)
    }

    // Step 1: Exchange code for short-lived access token
    const tokenResponse = await fetch('https://graph.facebook.com/v18.0/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: fbAppId,
        client_secret: fbAppSecret,
        redirect_uri: redirectUri,
        code: code,
      }),
    })

    const tokenData = await tokenResponse.json()
    
    if (tokenData.error) {
      console.error('❌ Facebook token exchange error:', tokenData.error)
      const callbackUrl = new URL('/integrations/facebook/callback', request.url)
      callbackUrl.searchParams.set('error', tokenData.error.message || 'token_exchange_failed')
      return NextResponse.redirect(callbackUrl)
    }

    console.log('✅ Facebook access token obtained')

    // Step 2: Exchange short-lived token for long-lived token (60 days)
    const longLivedUrl = `https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${fbAppId}&client_secret=${fbAppSecret}&fb_exchange_token=${tokenData.access_token}`
    
    console.log('🔄 Exchanging for long-lived token...')
    const longLivedResponse = await fetch(longLivedUrl)
    const longLivedData = await longLivedResponse.json()
    
    if (longLivedData.error) {
      console.error('❌ Long-lived token exchange error:', longLivedData.error)
    }

    const finalAccessToken = longLivedData.access_token || tokenData.access_token
    const expiresIn = longLivedData.expires_in || tokenData.expires_in || 3600

    console.log('✅ Long-lived token obtained, expires in:', expiresIn, 'seconds')

    // Step 3: Get user info to verify the token
    const userResponse = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name,email&access_token=${finalAccessToken}`)
    const userData = await userResponse.json()

    if (userData.error) {
      console.error('❌ Facebook user data error:', userData.error)
      const callbackUrl = new URL('/integrations/facebook/callback', request.url)
      callbackUrl.searchParams.set('error', 'user_data_failed')
      return NextResponse.redirect(callbackUrl)
    }

    console.log('✅ Facebook user verified:', userData.name, userData.email)

    // Step 4: Store the integration data in a secure HTTP-only cookie
    // This persists across deployments but should be replaced with a database in production
    const cookieStore = cookies()
    const tokenData = {
      access_token: finalAccessToken,
      expires_in: expiresIn,
      user_id: userData.id,
      user_name: userData.name,
      user_email: userData.email,
      created_at: new Date().toISOString()
    }

    // Store token in HTTP-only cookie (expires in 60 days to match Facebook token)
    cookieStore.set('fb_token_data', JSON.stringify(tokenData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 24 * 60 * 60, // 60 days
      path: '/'
    })

    console.log('💾 Stored Facebook token in secure cookie for user:', userData.id, userData.name)

    const callbackUrl = new URL('/integrations/facebook/callback', request.url)
    callbackUrl.searchParams.set('success', 'true')
    callbackUrl.searchParams.set('user_id', userData.id)
    callbackUrl.searchParams.set('user_name', userData.name)
    callbackUrl.searchParams.set('state', state)
    
    return NextResponse.redirect(callbackUrl)
    
  } catch (error) {
    console.error('Error processing Facebook OAuth:', error)
    
    const callbackUrl = new URL('/integrations/facebook/callback', request.url)
    callbackUrl.searchParams.set('error', 'processing_error')
    
    return NextResponse.redirect(callbackUrl)
  }
}