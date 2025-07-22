import { NextRequest, NextResponse } from 'next/server'

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
    // In a real application, you would exchange the code for an access token here
    // For now, we'll just simulate success and redirect to our callback page
    
    console.log('Facebook OAuth code received:', code.substring(0, 10) + '...')
    
    // Simulate successful token exchange
    const callbackUrl = new URL('/integrations/facebook/callback', request.url)
    callbackUrl.searchParams.set('code', code)
    callbackUrl.searchParams.set('state', state)
    
    return NextResponse.redirect(callbackUrl)
    
  } catch (error) {
    console.error('Error processing Facebook OAuth:', error)
    
    const callbackUrl = new URL('/integrations/facebook/callback', request.url)
    callbackUrl.searchParams.set('error', 'processing_error')
    
    return NextResponse.redirect(callbackUrl)
  }
}