import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/api/middleware'
import { cookies } from 'next/headers'

const FACEBOOK_APP_ID = process.env.FACEBOOK_APP_ID!
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET!
const FACEBOOK_REDIRECT_URI = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://atlas-fitness-onboarding.vercel.app'}/api/auth/facebook/callback`

interface FacebookAccessTokenResponse {
  access_token: string
  token_type: string
  expires_in?: number
  error?: {
    message: string
    type: string
    code: number
  }
}

interface FacebookUserResponse {
  id: string
  name: string
  email?: string
  error?: {
    message: string
    type: string
    code: number
  }
}

interface FacebookPageResponse {
  data: Array<{
    id: string
    name: string
    access_token: string
    category: string
    category_list?: Array<{ id: string; name: string }>
    perms?: string[]
  }>
  paging?: {
    cursors: {
      before: string
      after: string
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')
    const errorDescription = searchParams.get('error_description')

    // Handle OAuth errors
    if (error) {
      console.error('Facebook OAuth error:', error, errorDescription)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?facebook_error=${encodeURIComponent(errorDescription || error)}`
      )
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?error=no_authorization_code`
      )
    }

    // Verify state parameter (CSRF protection)
    const cookieStore = await cookies()
    const storedState = cookieStore.get('facebook_oauth_state')?.value
    if (!state || state !== storedState) {
      console.error('State mismatch:', { state, storedState })
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?error=invalid_state`
      )
    }

    // Get user ID from session/cookie (you'll need to implement your auth logic here)
    const userId = cookieStore.get('user_id')?.value
    const organizationId = cookieStore.get('organization_id')?.value

    if (!userId || !organizationId) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/auth/login?error=authentication_required`
      )
    }

    // Step 1: Exchange authorization code for access token
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?` +
      `client_id=${FACEBOOK_APP_ID}&` +
      `redirect_uri=${encodeURIComponent(FACEBOOK_REDIRECT_URI)}&` +
      `client_secret=${FACEBOOK_APP_SECRET}&` +
      `code=${code}`

    const tokenResponse = await fetch(tokenUrl)
    const tokenData: FacebookAccessTokenResponse = await tokenResponse.json()

    if (tokenData.error) {
      console.error('Facebook token exchange error:', tokenData.error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?facebook_error=${encodeURIComponent(tokenData.error.message)}`
      )
    }

    const { access_token, expires_in } = tokenData
    const tokenExpiresAt = expires_in 
      ? new Date(Date.now() + expires_in * 1000) 
      : null

    // Step 2: Get user information
    const userUrl = `https://graph.facebook.com/v18.0/me?` +
      `fields=id,name,email&` +
      `access_token=${access_token}`

    const userResponse = await fetch(userUrl)
    const userData: FacebookUserResponse = await userResponse.json()

    if (userData.error) {
      console.error('Facebook user info error:', userData.error)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?facebook_error=${encodeURIComponent(userData.error.message)}`
      )
    }

    // Step 3: Save integration to database
    const { data: integration, error: integrationError } = await supabaseAdmin
      .from('facebook_integrations')
      .upsert({
        organization_id: organizationId,
        user_id: userId,
        facebook_user_id: userData.id,
        facebook_user_name: userData.name,
        facebook_user_email: userData.email || null,
        access_token: access_token,
        token_expires_at: tokenExpiresAt?.toISOString() || null,
        granted_scopes: ['pages_show_list', 'pages_read_engagement', 'leads_retrieval'], // You can extract this from the token
        is_active: true,
        settings: {},
        last_sync_at: new Date().toISOString()
      }, {
        onConflict: 'organization_id,facebook_user_id'
      })
      .select()
      .single()

    if (integrationError) {
      console.error('Database error saving integration:', integrationError)
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?facebook_error=${encodeURIComponent('Database error: ' + integrationError.message)}`
      )
    }

    // Step 4: Get and save user's Facebook Pages
    try {
      const pagesUrl = `https://graph.facebook.com/v18.0/me/accounts?` +
        `fields=id,name,access_token,category,category_list,perms&` +
        `access_token=${access_token}`

      const pagesResponse = await fetch(pagesUrl)
      const pagesData: FacebookPageResponse = await pagesResponse.json()

      if (pagesData.data && pagesData.data.length > 0) {
        // Save each page
        const pageInserts = pagesData.data.map(page => ({
          integration_id: integration.id,
          organization_id: organizationId,
          facebook_page_id: page.id,
          page_name: page.name,
          page_username: null, // You might want to fetch this separately
          page_category: page.category,
          access_token: page.access_token,
          token_expires_at: null, // Page tokens typically don't expire
          is_active: true,
          is_primary: false, // User can set this later
          page_info: {
            category_list: page.category_list || [],
            permissions: page.perms || []
          },
          permissions: page.perms || []
        }))

        const { error: pagesError } = await supabaseAdmin
          .from('facebook_pages')
          .upsert(pageInserts, {
            onConflict: 'organization_id,facebook_page_id'
          })

        if (pagesError) {
          console.error('Database error saving pages:', pagesError)
          // Don't fail the whole integration for this
        }

        // If no primary page is set, set the first one as primary
        const { data: existingPrimary } = await supabaseAdmin
          .from('facebook_pages')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('is_primary', true)
          .limit(1)

        if (!existingPrimary || existingPrimary.length === 0) {
          await supabaseAdmin
            .from('facebook_pages')
            .update({ is_primary: true })
            .eq('organization_id', organizationId)
            .eq('facebook_page_id', pagesData.data[0].id)
        }
      }
    } catch (pagesError) {
      console.error('Error fetching pages:', pagesError)
      // Don't fail the integration for this
    }

    // Step 5: Log analytics event
    await supabaseAdmin.from('analytics_events').insert({
      organization_id: organizationId,
      event_type: 'integration',
      event_name: 'facebook_connected',
      properties: {
        facebook_user_id: userData.id,
        facebook_user_name: userData.name,
        integration_id: integration.id,
        pages_count: 0 // You could update this with actual count
      },
      user_id: userId
    })

    // Clean up state cookie
    const response = NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?facebook_success=true`
    )
    
    response.cookies.set('facebook_oauth_state', '', {
      expires: new Date(0),
      path: '/'
    })

    return response

  } catch (error) {
    console.error('Facebook OAuth callback error:', error)
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_SITE_URL}/dashboard?facebook_error=${encodeURIComponent('Internal server error')}`
    )
  }
}