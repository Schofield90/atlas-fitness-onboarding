import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

const SUPER_ADMIN_EMAIL = 'sam@gymleadhub.co.uk'

/**
 * Admin Portal Middleware
 * Domain: admin.gymleadhub.co.uk
 * Purpose: Super admin only access for platform administration
 * Routes: /admin/**
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const hostname = request.headers.get('host') || ''
  const isAdminDomain = hostname.includes('admin.gymleadhub') ||
                        (hostname.includes('localhost') && request.nextUrl.pathname.startsWith('/admin'))

  // Only run on admin domain
  if (!isAdminDomain) {
    return NextResponse.redirect(new URL('https://login.gymleadhub.co.uk', request.url))
  }

  // Add admin-specific CORS headers
  response.headers.set('X-Portal-Type', 'admin')
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')

  const supabase = createMiddlewareClient(request, response)

  // Try to get session
  let session = null
  try {
    const { data: { session: currentSession }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('[Admin Middleware] Session error:', error.message)
    }

    session = currentSession

    // If no session but we have user cookies, try to refresh
    if (!session) {
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()

      if (!refreshError && refreshedSession) {
        session = refreshedSession
        console.log('[Admin Middleware] Session refreshed')
      }
    }
  } catch (error) {
    console.error('[Admin Middleware] Auth error:', error)
  }

  const isAuthPage = request.nextUrl.pathname.includes('/auth')
  const isProtectedAdminRoute = request.nextUrl.pathname.startsWith('/admin')

  // Redirect unauthenticated users to login
  if (!session && isProtectedAdminRoute && !isAuthPage) {
    console.log('[Admin Middleware] Redirecting unauthenticated user to login')
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Verify super admin access
  if (session && isProtectedAdminRoute) {
    if (session.user.email !== SUPER_ADMIN_EMAIL) {
      console.error('[Admin Middleware] Non-super-admin attempted admin access:', session.user.email)
      return NextResponse.json({
        error: 'Forbidden: Admin portal requires super admin access'
      }, { status: 403 })
    }
  }

  // Redirect authenticated super admin away from auth pages
  if (session && isAuthPage && session.user.email === SUPER_ADMIN_EMAIL) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url))
  }

  // Handle root path
  if (request.nextUrl.pathname === '/') {
    if (session && session.user.email === SUPER_ADMIN_EMAIL) {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    // Only match admin routes and auth pages
    '/admin/:path*',
    '/auth/:path*',
    '/',
  ]
}