import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

/**
 * Staff Dashboard Middleware
 * Domain: login.gymleadhub.co.uk
 * Purpose: Gym staff CRM access (owners, admins, staff, viewers)
 * Routes: /dashboard/**, /leads/**, /clients/**, /bookings/**, /reports/**
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const hostname = request.headers.get('host') || ''
  const isLoginDomain = hostname.includes('login.gymleadhub') ||
                        (hostname.includes('localhost') && !request.nextUrl.pathname.startsWith('/admin') && !request.nextUrl.pathname.startsWith('/client'))

  // Only run on login domain
  if (!isLoginDomain) {
    // If trying to access staff routes from wrong domain, redirect
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('https://login.gymleadhub.co.uk' + request.nextUrl.pathname, request.url))
    }
  }

  // Add staff portal headers
  response.headers.set('X-Portal-Type', 'staff')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')

  const supabase = createMiddlewareClient(request, response)

  // Try to get session
  let session = null
  try {
    const { data: { session: currentSession }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('[Staff Middleware] Session error:', error.message)
    }

    session = currentSession

    // If no session but we have user cookies, try to refresh
    if (!session) {
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()

      if (!refreshError && refreshedSession) {
        session = refreshedSession
        console.log('[Staff Middleware] Session refreshed')
      }
    }
  } catch (error) {
    console.error('[Staff Middleware] Auth error:', error)
  }

  // Get organization context from session
  if (session) {
    // Fetch user's organization
    const { data: userData } = await supabase
      .from('users')
      .select('organization_id, role')
      .eq('id', session.user.id)
      .single()

    if (userData) {
      response.headers.set('X-Organization-Id', userData.organization_id)
      response.headers.set('X-User-Role', userData.role)
      console.log('[Staff Middleware] Org context:', userData.organization_id, 'Role:', userData.role)
    }
  }

  const isAuthPage = request.nextUrl.pathname.includes('/auth')
  const isDashboard = request.nextUrl.pathname.includes('/dashboard') ||
                      request.nextUrl.pathname.includes('/leads') ||
                      request.nextUrl.pathname.includes('/clients') ||
                      request.nextUrl.pathname.includes('/bookings') ||
                      request.nextUrl.pathname.includes('/reports') ||
                      request.nextUrl.pathname.includes('/class-calendar')

  const isProtectedAPI = request.nextUrl.pathname.startsWith('/api/') &&
    !request.nextUrl.pathname.startsWith('/api/auth/') &&
    !request.nextUrl.pathname.startsWith('/api/facebook/webhook') &&
    !request.nextUrl.pathname.startsWith('/api/public/')

  // Redirect unauthenticated users to login
  if (!session && (isDashboard || isProtectedAPI)) {
    console.log('[Staff Middleware] Redirecting unauthenticated user to login')
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Redirect authenticated users away from auth pages
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Handle root path
  if (request.nextUrl.pathname === '/') {
    if (session) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    // Match all routes except admin and client
    '/((?!_next/static|_next/image|favicon.ico|admin|client).*)',
  ]
}