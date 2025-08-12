import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/app/lib/supabase/middleware'

// Public routes that don't require authentication
const publicRoutes = [
  '/',
  '/landing',
  '/login',
  '/signup',
  '/auth/callback',
  '/client-portal/login',
  '/client-portal/claim',
  '/client-access',
  '/onboarding',
  '/api/auth',
  '/api/client-portal',
  '/api/client-access',
  '/api/webhooks'
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
  '/ai-config',
  '/classes',
  '/customers'
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

  // Create supabase client
  const supabase = createMiddlewareClient(request, res)

  // Get session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // No session - redirect to login
  if (!session) {
    const redirectUrl = new URL('/login', request.url)
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
      // No organization - redirect to onboarding
      if (pathname !== '/onboarding') {
        return NextResponse.redirect(new URL('/onboarding', request.url))
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