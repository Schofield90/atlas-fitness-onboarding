import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/app/lib/supabase/middleware'

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/landing',
  '/login',
  '/simple-login',
  '/signin',
  '/signup',
  '/signup-simple',     // Simplified signup page
  '/auth/callback',
  '/client-portal/login',
  '/client-portal/claim',
  '/client-access',
  '/book',              // Public booking pages for customers (all slugs)
  '/meta-review',       // Meta App Review test page
  // Public API endpoints
  '/api/auth',
  '/api/client-portal',
  '/api/client-access',
  '/api/webhooks',
  '/api/public-api',
  '/api/booking-by-slug',
  '/api/analytics'
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
  '/automations',
  '/calendar',
  '/booking',
  '/staff',
  '/forms',
  '/settings',
  '/billing',
  '/memberships',
  '/members',      // Add members route
  '/ai-config',
  '/classes',
  '/customers',
  '/integrations'  // Add integrations to admin routes
]

// Super admin routes that bypass organization checks
const superAdminRoutes = [
  '/admin'
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const res = NextResponse.next()
  
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
    '/api/email-status'
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
  
  if (isPublicRoute) {
    return res
  }

  // Create supabase client
  const supabase = createMiddlewareClient(request, res)

  // Get session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // No session - return 401 for API, redirect to login for pages
  if (!session) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
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

  // Check if user is trying to access admin routes
  const isAdminRoute = adminRoutes.some(route => 
    pathname.startsWith(route)
  )

  if (isAdminRoute) {
    // Check if user has an organization
    const { data: userOrg } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .single()

    if (!userOrg) {
      // User doesn't have an organization
      // For now, auto-create an association with the first available organization
      // In production, this should properly onboard users
      
      // Get first available organization
      const { data: firstOrg } = await supabase
        .from('organizations')
        .select('id')
        .limit(1)
        .single()
      
      if (firstOrg) {
        // Create association
        await supabase
          .from('user_organizations')
          .insert({
            user_id: session.user.id,
            organization_id: firstOrg.id,
            role: 'member',
            is_active: true
          })
        
        // Continue to dashboard
        if (pathname === '/onboarding') {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      } else {
        // No organizations exist - this is a critical error
        console.error('No organizations exist in the system')
        // Allow access to dashboard anyway
        if (pathname === '/onboarding') {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      }
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