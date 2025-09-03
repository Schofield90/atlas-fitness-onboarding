import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/landing',
  '/login',
  '/signin',
  '/signup',
  '/signup-simple',     // Add simplified signup page
  '/auth/callback',
  '/client-portal/login',
  '/client-portal/claim',
  '/client-access',
  '/onboarding',
  '/portal',            // Add member portal routes
  '/dashboard-direct',  // Add simplified dashboard to public routes
  '/quick-dashboard',   // Add quick access dashboard (no auth)
  '/real-dashboard',    // Real dashboard with no auth checks
  '/test-auth',         // Add test auth page
  '/book',              // Public booking pages for customers (all slugs)
  '/api/auth',
  '/api/client-portal',
  '/api/client-access',
  '/api/webhooks',
  '/api/public-api',    // Public API endpoints
  '/api/booking-by-slug', // Public booking API endpoints for widget embedding
  '/api/analytics',     // Add analytics endpoint as public
  '/admin-debug',       // Debug page for admin access
  '/saas-admin',        // Standalone SaaS admin dashboard (bypasses all middleware)
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
  
  // Also block debug API routes
  const isDebugApiRoute = pathname.startsWith('/api/debug/') || 
                         pathname.startsWith('/api/test/') ||
                         pathname.startsWith('/api/quick-add-class')
  
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

  // Edge-safe auth check using cookies only (no Supabase client)
  const accessToken = request.cookies.get('sb-access-token')?.value
  if (!accessToken) {
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
    return res
  }

  // Check if user is trying to access admin routes
  const isAdminRoute = adminRoutes.some(route => 
    pathname.startsWith(route)
  )

  if (isAdminRoute) {
    // Skip DB lookups in Edge middleware — APIs/pages should enforce org checks
    return res
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