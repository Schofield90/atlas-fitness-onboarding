import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/app/lib/supabase/middleware'

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/landing',
  '/login',
  '/owner-login',
  '/member-login',
  '/simple-login',
  '/signin',
  '/signup',
  '/signup-simple',
  '/auth/callback',
  '/auth/verify',
  '/client-portal/login',
  '/client-access',
  '/join',
  '/book',
  '/meta-review',
  '/claim',
  // Public API endpoints
  '/api/auth',
  '/api/client-portal',
  '/api/client-access',
  '/api/members/generate-claim-link',
  '/api/members/validate-claim-token',
  '/api/members/claim-account',
  '/api/webhooks',
  '/api/public-api',
  '/api/booking-by-slug',
  '/api/login-otp',
  '/api/health-check',
]

// Client-only routes
const clientRoutes = [
  '/client'
]

// Admin routes that require organization
const adminRoutes = [
  '/dashboard',
  '/leads',
  '/messages',
  '/conversations',
  '/automations',
  '/calendar',
  '/class-calendar',
  '/booking',
  '/staff',
  '/forms',
  '/settings',
  '/billing',
  '/memberships',
  '/members',
  '/ai-config',
  '/classes',
  '/customers',
  '/integrations'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Create response object early
  let res = NextResponse.next()

  // Always allow static files
  const isStaticFile = pathname.startsWith('/_next') || pathname.includes('.')
  if (isStaticFile) {
    return res
  }

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  )

  if (isPublicRoute) {
    return res
  }

  // Create supabase client
  const supabase = createMiddlewareClient(request, res)

  // Get session with refresh
  let session = null
  try {
    // Get session
    const { data: { session: currentSession } } = await supabase.auth.getSession()
    session = currentSession

    // Always try to refresh session if it's missing or expired
    if (!session) {
      console.log('[Middleware] No session found, attempting refresh...')
      // Try to get user from cookies first
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        console.log('[Middleware] User found in cookies, refreshing session...')
        // Try to refresh the session
        const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
        if (refreshedSession && !refreshError) {
          session = refreshedSession
          console.log('[Middleware] Session refreshed successfully')
          // Update the response with the new session cookies
          res = NextResponse.next({
            request: {
              headers: request.headers,
            }
          })
        } else {
          console.log('[Middleware] Session refresh failed:', refreshError?.message)
        }
      } else {
        console.log('[Middleware] No user found in cookies')
      }
    }
  } catch (error) {
    console.error('Middleware auth error:', error)
  }

  // Check if we have a session
  if (!session) {
    // No session - return 401 for API, redirect to login for pages
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Redirect to appropriate login based on path
    let loginUrl = '/owner-login'  // Default

    // Check if this is a client route
    if (pathname.startsWith('/client')) {
      loginUrl = '/simple-login'  // Client routes always use simple-login
    }

    const redirectUrl = new URL(loginUrl, request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Check if user is trying to access client routes
  const isClientRoute = clientRoutes.some(route =>
    pathname.startsWith(route)
  )

  if (isClientRoute) {
    // Check if user is a client (has client_id in metadata or is linked to a client)
    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('user_id', session.user.id)
      .single()

    if (!client) {
      // Not a client, redirect to SIMPLE LOGIN for members, not dashboard!
      return NextResponse.redirect(new URL('/simple-login', request.url))
    }

    return res
  }

  // Special handling for setup-account route (bypasses org check)
  if (pathname === '/setup-account' || pathname.startsWith('/api/admin/link-sam-account') || pathname.startsWith('/api/admin/setup-sam-account')) {
    return res
  }

  // Check if user is trying to access admin routes
  const isAdminRoute = adminRoutes.some(route =>
    pathname.startsWith(route)
  )

  if (isAdminRoute) {
    // Check if user has an organization
    let userOrg = null;

    // Check user_organizations table first
    const { data: userOrgData } = await supabase
      .from('user_organizations')
      .select('organization_id, role')
      .eq('user_id', session.user.id)
      .single()

    if (userOrgData) {
      userOrg = userOrgData;
    } else {
      // Check if user owns an organization
      const { data: ownedOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('owner_id', session.user.id)
        .single()

      if (ownedOrg) {
        userOrg = { organization_id: ownedOrg.id, role: 'owner' };
      }
    }

    if (!userOrg) {
      // User doesn't belong to any organization; require onboarding
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Organization required' }, { status: 403 })
      }
      const redirectUrl = new URL('/onboarding/create-organization', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Store organization ID in headers for API routes
    if (userOrg) {
      res.headers.set('x-organization-id', userOrg.organization_id)
      res.headers.set('x-user-role', userOrg.role)
    }
  }

  return res
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}