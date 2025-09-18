import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/app/lib/supabase/middleware'

// Subdomain configuration
const SUBDOMAIN_CONFIG = {
  'admin': {
    name: 'Admin Portal',
    description: 'SaaS business owners only',
    allowedPaths: ['/admin', '/api/admin'],
    redirectPath: '/admin',
    requiresSuperAdmin: true
  },
  'login': {
    name: 'Gym Owner Portal',
    description: 'Gym owners platform',
    allowedPaths: [
      '/dashboard',
      '/booking',
      '/classes',
      '/leads',
      '/analytics',
      '/settings',
      '/messages',
      '/conversations',
      '/automations',
      '/calendar',
      '/staff',
      '/forms',
      '/billing',
      '/memberships',
      '/members',
      '/ai-config',
      '/customers',
      '/integrations',
      '/api'
    ],
    redirectPath: '/dashboard',
    requiresOrganization: true
  },
  'members': {
    name: 'Member Portal',
    description: 'Gym members portal',
    allowedPaths: [
      '/client',
      '/book',
      '/[org]',
      '/api/booking',
      '/api/client',
      '/api/booking-by-slug'
    ],
    redirectPath: '/client/dashboard',
    requiresClient: true,
    allowPublicBooking: true
  }
};

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/landing',
  '/login',
  '/simple-login',
  '/signin',
  '/signup',
  '/signup-simple',
  '/auth/callback',
  '/client-portal/login',
  '/client-access',
  '/login-otp',
  '/join',
  '/book',
  '/meta-review',
  // Public API endpoints
  '/api/auth',
  '/api/client-portal',
  '/api/client-access',
  '/api/webhooks',
  '/api/public-api',
  '/api/booking-by-slug',
  '/api/analytics',
  '/api/login-otp',
  '/api/setup-otp-table',
  '/api/debug-clients',
  '/api/test-client-lookup',
  '/api/check-database',
  '/api/test-nutrition-access',
  '/api/admin/fix-organization-staff',
  '/api/admin/fix-nutrition-schema',
  '/api/admin/create-meal-plans-table',
  '/api/fix-messaging-view',
  '/api/migration',
  '/api/import/goteamup'
]

// Client-only routes
const clientRoutes = [
  '/client'
]

// Debug and test routes - these should be blocked in production
const debugRoutes = [
  '/bypass-login',
  '/test-login',
  '/quick-login',
  '/direct-dashboard',
  '/auth-debug',
  '/auth-check',
  '/whatsapp-debug',
  '/membership-debug',
  '/memberships-debug',
  '/booking-debug',
  '/classes-debug',
  '/facebook-debug',
  '/test-analytics',
  '/call-test',
  '/auth-test',
  '/membership-create-test',
  '/test-memberships',
  '/test-client',
  '/test-whatsapp-ai',
  '/create-test-classes',
  '/test-workflows',
  '/test-styles',
  '/workflow-test',
  '/nutrition-test',
  '/quick-add-class',
  '/sql-check',
  '/seed-knowledge',
  '/fix-messages',
  '/get-started',
  '/emergency'
]

// Admin routes that require organization
const adminRoutes = [
  '/dashboard',
  '/leads',
  '/messages',
  '/conversations',
  '/automations',
  '/calendar',
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

// Super admin routes that bypass organization checks
const superAdminRoutes = [
  '/admin'
]

function extractSubdomain(hostname: string): string {
  // Handle localhost for development
  if (hostname.includes('localhost')) {
    // Check for subdomain in localhost (e.g., admin.localhost:3000)
    const parts = hostname.split('.')
    if (parts.length > 1 && parts[0] !== 'www') {
      return parts[0]
    }
    return ''
  }

  // Handle production domains
  if (hostname.includes('gymleadhub.co.uk')) {
    const parts = hostname.split('.')
    if (parts.length > 2 && parts[0] !== 'www') {
      return parts[0]
    }
  }

  // Handle Vercel preview deployments
  if (hostname.includes('vercel.app')) {
    // For Vercel, we don't enforce subdomains
    return ''
  }

  return ''
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''
  const subdomain = extractSubdomain(hostname)

  // Create response object early
  let res = NextResponse.next()

  // Add subdomain information to headers
  if (subdomain) {
    res.headers.set('x-subdomain', subdomain)
    const config = SUBDOMAIN_CONFIG[subdomain as keyof typeof SUBDOMAIN_CONFIG]
    if (config) {
      res.headers.set('x-subdomain-name', config.name)
    }
  }

  // Emergency bypass - if middleware is causing issues
  if (process.env.BYPASS_MIDDLEWARE === 'true') {
    return res
  }

  // Handle subdomain-specific routing (only in production)
  if (hostname.includes('gymleadhub.co.uk') && subdomain) {
    const config = SUBDOMAIN_CONFIG[subdomain as keyof typeof SUBDOMAIN_CONFIG]

    if (config) {
      // Check if the current path is allowed for this subdomain
      const isAllowedPath = config.allowedPaths.some(path =>
        pathname === path ||
        pathname.startsWith(path + '/') ||
        (path === '/[org]' && pathname.match(/^\/[^\/]+$/)) // Handle dynamic org routes
      )

      // Always allow auth routes, static files, and API routes
      const isAuthRoute = pathname.startsWith('/signin') ||
                         pathname.startsWith('/signup') ||
                         pathname.startsWith('/auth')
      const isStaticFile = pathname.startsWith('/_next') ||
                          pathname.includes('.')

      if (!isAllowedPath && !isAuthRoute && !isStaticFile) {
        // Redirect to the correct subdomain if trying to access wrong area
        if (pathname.startsWith('/admin') && subdomain !== 'admin') {
          return NextResponse.redirect(new URL(pathname, `https://admin.gymleadhub.co.uk`))
        }
        if (pathname.startsWith('/dashboard') && subdomain !== 'login') {
          return NextResponse.redirect(new URL(pathname, `https://login.gymleadhub.co.uk`))
        }
        if (pathname.startsWith('/client') && subdomain !== 'members') {
          return NextResponse.redirect(new URL(pathname, `https://members.gymleadhub.co.uk`))
        }

        // Otherwise, redirect to the subdomain's default page
        if (pathname === '/') {
          return NextResponse.redirect(new URL(config.redirectPath, request.url))
        }
      }

      // Redirect root to appropriate dashboard
      if (pathname === '/' && config.redirectPath) {
        return NextResponse.redirect(new URL(config.redirectPath, request.url))
      }
    }
  }

  // Block debug routes in production or if not explicitly enabled
  const isDebugRoute = debugRoutes.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  )

  // Also block debug API routes - but allow specific test endpoints
  const allowedTestEndpoints = [
    '/api/test-email',
    '/api/test-welcome',
    '/api/debug-welcome',
    '/api/simple-test',
    '/api/ping',
    '/api/email-status',
    '/api/check-magic-link'
  ]

  const isAllowedTestEndpoint = allowedTestEndpoints.some(endpoint => pathname === endpoint)

  const isDebugApiRoute = !isAllowedTestEndpoint && (
    pathname.startsWith('/api/debug/') ||
    pathname.startsWith('/api/test/') ||
    pathname.startsWith('/api/quick-add-class')
  )

  if (isDebugRoute || isDebugApiRoute) {
    // Only allow debug routes in development or if ENABLE_DEBUG_ROUTES=true
    const isDevelopment = process.env.NODE_ENV === 'development'
    const debugEnabled = process.env.ENABLE_DEBUG_ROUTES === 'true'

    if (!isDevelopment && !debugEnabled) {
      if (isDebugApiRoute) {
        return NextResponse.json({ error: 'Debug API routes are disabled in production' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  // Check if route is public
  const isPublicRoute = publicRoutes.some(route =>
    pathname === route || pathname.startsWith(route + '/')
  )

  // Special handling for members subdomain public booking routes
  if (subdomain === 'members' && (pathname.startsWith('/book') || pathname.match(/^\/[^\/]+$/))) {
    // Allow public access to booking pages on members subdomain
    return res
  }

  if (isPublicRoute) {
    return res
  }

  // Create supabase client
  const supabase = createMiddlewareClient(request, res)

  // Wrap in try-catch with timeout to prevent hanging
  let session = null

  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Auth timeout')), 5000)
    )

    // Get session and refresh if needed
    const sessionPromise = supabase.auth.getSession()
    const result = await Promise.race([sessionPromise, timeoutPromise])

    session = (result as any).data?.session
  } catch (error) {
    console.error('Middleware auth error:', error)
    // If auth times out or fails, treat as no session for public routes
    // but allow public routes to continue
    if (isPublicRoute) {
      return res
    }
    // For non-public routes, redirect to login
    if (!pathname.startsWith('/api/')) {
      // Redirect to appropriate login based on subdomain
      const loginUrl = subdomain === 'members'
        ? '/client-portal/login'
        : '/login'
      return NextResponse.redirect(new URL(loginUrl, request.url))
    }
    return NextResponse.json({ error: 'Auth service unavailable' }, { status: 503 })
  }

  // If no session, try to get user and refresh
  if (!session) {
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      // User exists but session expired, try to refresh
      const { data: { session: refreshedSession } } = await supabase.auth.refreshSession()

      if (refreshedSession) {
        // Successfully refreshed, continue with the request
        return res
      }
    }

    // No session and couldn't refresh - return 401 for API, redirect to login for pages
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Redirect to appropriate login based on subdomain
    const loginUrl = subdomain === 'members'
      ? '/client-portal/login'
      : '/login'
    const redirectUrl = new URL(loginUrl, request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // Subdomain-specific authentication checks
  if (subdomain && SUBDOMAIN_CONFIG[subdomain as keyof typeof SUBDOMAIN_CONFIG]) {
    const config = SUBDOMAIN_CONFIG[subdomain as keyof typeof SUBDOMAIN_CONFIG]

    // Check admin subdomain - requires super admin
    if (config.requiresSuperAdmin) {
      // Check if user has super admin access
      // This should be checked in the admin pages themselves
      // For now, just ensure they're authenticated
      return res
    }

    // Check members subdomain - requires client account
    if (config.requiresClient) {
      const { data: client } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', session.user.id)
        .single()

      if (!client && pathname.startsWith('/client')) {
        // Not a client, redirect to appropriate login
        return NextResponse.redirect(new URL('/client-portal/login', request.url))
      }
    }

    // Check login subdomain - requires organization
    if (config.requiresOrganization && !pathname.startsWith('/api/')) {
      // Check if user has an organization
      let userOrg = null;

      // First check organization_staff table (new structure)
      const { data: staffOrg } = await supabase
        .from('organization_staff')
        .select('organization_id, role')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .single()

      if (staffOrg) {
        userOrg = staffOrg;
      } else {
        // Fallback to organization_members table (old structure)
        const { data: memberOrg } = await supabase
          .from('organization_members')
          .select('organization_id, role')
          .eq('user_id', session.user.id)
          .eq('is_active', true)
          .single()

        if (memberOrg) {
          userOrg = memberOrg;
        }
      }

      if (!userOrg && !pathname.startsWith('/onboarding')) {
        // User doesn't belong to any organization
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

  // Check if user is trying to access super admin routes
  const isSuperAdminRoute = superAdminRoutes.some(route =>
    pathname.startsWith(route)
  )

  if (isSuperAdminRoute) {
    // For super admin routes, just check if user is authenticated
    // The page itself will handle specific email checks
    return res
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
      // Not a client, redirect to main dashboard
      return NextResponse.redirect(new URL('/dashboard', request.url))
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
    // Check if user has an organization - check both tables
    let userOrg = null;

    // First check organization_staff table (new structure)
    const { data: staffOrg } = await supabase
      .from('organization_staff')
      .select('organization_id, role')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (staffOrg) {
      userOrg = staffOrg;
    } else {
      // Fallback to organization_members table (old structure)
      const { data: memberOrg } = await supabase
        .from('organization_members')
        .select('organization_id, role')
        .eq('user_id', session.user.id)
        .eq('is_active', true)
        .single()

      if (memberOrg) {
        userOrg = memberOrg;
      }
    }

    if (!userOrg) {
      // User doesn't belong to any organization; require onboarding and do NOT auto-associate
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