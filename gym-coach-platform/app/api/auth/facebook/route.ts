import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { randomBytes } from 'crypto'

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID || ''
const FACEBOOK_REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://atlas-fitness-onboarding.vercel.app'}/api/auth/facebook/callback`

export async function GET(request: NextRequest) {
  try {
    if (!FACEBOOK_APP_ID) {
      return NextResponse.json(
        { error: 'Facebook integration not configured' },
        { status: 503 }
      )
    }

    // Generate CSRF state parameter
    const state = randomBytes(32).toString('hex')
    
    // Facebook OAuth permissions for gym business
    const scopes = [
      'pages_show_list',        // Access to pages list
      'pages_read_engagement',  // Read page insights
      'leads_retrieval',        // Access to leads from lead gen forms
      'business_management',    // Manage business assets
      'pages_manage_metadata',  // Manage page information
      'pages_read_user_content', // Read user-generated content on pages
    ].join(',')

    // Build Facebook OAuth URL
    const facebookAuthUrl = `https://www.facebook.com/v18.0/dialog/oauth?` +
      `client_id=${FACEBOOK_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(FACEBOOK_REDIRECT_URI)}&` +
      `scope=${encodeURIComponent(scopes)}&` +
      `state=${state}&` +
      `response_type=code&` +
      `auth_type=rerequest` // Force re-permission request

    // Store state in cookie for CSRF protection
    const response = NextResponse.redirect(facebookAuthUrl)
    
    const cookieStore = await cookies()
    response.cookies.set('facebook_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Facebook OAuth initiation error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?error=${encodeURIComponent('Failed to initiate Facebook OAuth')}`
    )
  }
}