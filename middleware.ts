import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/app/lib/supabase/middleware'

// Super admin email for bypass access
const SUPER_ADMIN_EMAIL = 'sam@gymleadhub.co.uk'

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
  '/admin', // Admin routes handle their own auth in layout
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
  '/api/saas-admin', // Admin API handles its own auth
]

// Client-only routes
const clientRoutes = [
  '/client'
]

// Admin routes that require organization (legacy pattern - no /org/ prefix)
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

// Protected route patterns for new path-based routing (/org/{slug}/...)
const protectedPathPatterns = [
  /^\/org\/[^\/]+\/dashboard/,
  /^\/org\/[^\/]+\/customers/,
  /^\/org\/[^\/]+\/leads/,
  /^\/org\/[^\/]+\/messages/,
  /^\/org\/[^\/]+\/conversations/,
  /^\/org\/[^\/]+\/automations/,
  /^\/org\/[^\/]+\/calendar/,
  /^\/org\/[^\/]+\/class-calendar/,
  /^\/org\/[^\/]+\/booking/,
  /^\/org\/[^\/]+\/staff/,
  /^\/org\/[^\/]+\/forms/,
  /^\/org\/[^\/]+\/settings/,
  /^\/org\/[^\/]+\/billing/,
  /^\/org\/[^\/]+\/memberships/,
  /^\/org\/[^\/]+\/members/,
  /^\/org\/[^\/]+\/ai-config/,
  /^\/org\/[^\/]+\/classes/,
  /^\/org\/[^\/]+\/integrations/,
]

// Helper: Extract org slug from path
function extractOrgSlugFromPath(pathname: string): string | null {
  // Match /org/{slug}/... pattern
  const orgSlugMatch = pathname.match(/^\/org\/([a-z0-9-]+)\//)
  return orgSlugMatch?.[1] || null
}

// Helper: Extract org slug from API path
function extractOrgSlugFromApiPath(pathname: string): string | null {
  // Match /api/org/{slug}/... pattern
  const apiOrgMatch = pathname.match(/^\/api\/org\/([a-z0-9-]+)\//)
  return apiOrgMatch?.[1] || null
}

// Helper: Check if user is super admin
function isSuperAdmin(userEmail: string): boolean {
  return userEmail === SUPER_ADMIN_EMAIL
}

// Helper: Verify org access by slug
interface OrgAccessResult {
  organizationId: string | null
  userRole: string
  hasAccess: boolean
}

async function verifyOrgAccessBySlug(
  supabase: any,
  orgSlug: string,
  userId: string
): Promise<OrgAccessResult> {
  try {
    // Call database function to verify access
    const { data, error } = await supabase.rpc('verify_org_access_by_slug', {
      p_slug: orgSlug,
      p_user_id: userId
    })

    if (error) {
      console.error('[Middleware] Error verifying org access:', error)
      return { organizationId: null, userRole: 'none', hasAccess: false }
    }

    // Function returns array with single row
    if (!data || data.length === 0) {
      console.log('[Middleware] Organization not found:', orgSlug)
      return { organizationId: null, userRole: 'none', hasAccess: false }
    }

    const result = data[0]
    return {
      organizationId: result.organization_id,
      userRole: result.user_role,
      hasAccess: result.has_access
    }
  } catch (error) {
    console.error('[Middleware] Exception verifying org access:', error)
    return { organizationId: null, userRole: 'none', hasAccess: false }
  }
}

// Helper: Check if path matches protected pattern
function isProtectedPath(pathname: string): boolean {
  return protectedPathPatterns.some(pattern => pattern.test(pathname))
}

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

  // Extract org slug from path if present (NEW PATH-BASED ROUTING)
  const orgSlug = extractOrgSlugFromPath(pathname) || extractOrgSlugFromApiPath(pathname)

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

  // ========================================================================
  // DUAL-MODE ROUTING: Path-based OR Session-based
  // ========================================================================

  // Check if this is a NEW path-based protected route
  const isPathBasedRoute = orgSlug && (isProtectedPath(pathname) || pathname.startsWith(`/api/org/${orgSlug}/`))

  // Check if this is a LEGACY session-based admin route
  const isLegacyAdminRoute = adminRoutes.some(route => pathname.startsWith(route))

  if (isPathBasedRoute) {
    // ====================================================================
    // NEW PATH-BASED FLOW
    // ====================================================================
    console.log('[Middleware] Path-based routing detected:', { orgSlug, pathname })

    // Session check (already done above, but defensive check)
    if (!session) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const loginUrl = new URL('/owner-login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Super admin bypass - can access any organization
    if (isSuperAdmin(session.user.email || '')) {
      console.log('[Middleware] Super admin access granted for:', orgSlug)

      // Get org ID from slug without access check
      const { data: orgData } = await supabase
        .from('organizations')
        .select('id')
        .eq('slug', orgSlug)
        .single()

      if (!orgData) {
        // Org doesn't exist
        if (pathname.startsWith('/api/')) {
          return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
        }
        return NextResponse.redirect(new URL('/dashboard', request.url))
      }

      // Set headers for super admin
      res.headers.set('x-organization-id', orgData.id)
      res.headers.set('x-user-role', 'super_admin')
      res.headers.set('x-org-slug', orgSlug)
      return res
    }

    // Regular user - verify access
    const orgAccess = await verifyOrgAccessBySlug(supabase, orgSlug, session.user.id)

    if (!orgAccess.hasAccess || !orgAccess.organizationId) {
      // User doesn't have access to this organization
      console.log('[Middleware] Access denied to org:', { orgSlug, userId: session.user.id })

      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Forbidden: Access to this organization denied' }, { status: 403 })
      }

      // Redirect to their own dashboard (fallback to session-based)
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    // Access granted - set headers
    console.log('[Middleware] Path-based access granted:', {
      orgSlug,
      orgId: orgAccess.organizationId,
      role: orgAccess.userRole
    })

    res.headers.set('x-organization-id', orgAccess.organizationId)
    res.headers.set('x-user-role', orgAccess.userRole)
    res.headers.set('x-org-slug', orgSlug)
    return res

  } else if (isLegacyAdminRoute) {
    // ====================================================================
    // LEGACY SESSION-BASED FLOW (Backward Compatibility)
    // ====================================================================
    console.log('[Middleware] Legacy session-based routing:', pathname)

    // 🚨 CRITICAL: Check for session BEFORE accessing session.user
    if (!session) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const loginUrl = new URL('/owner-login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }

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
      } else {
        // Fallback: Check organization_staff table
        const { data: staffData } = await supabase
          .from('organization_staff')
          .select('organization_id')
          .eq('user_id', session.user.id)
          .single()

        if (staffData) {
          userOrg = { organization_id: staffData.organization_id, role: 'staff' };
        }
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

    // Store organization ID in headers for API routes (legacy mode - no slug)
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