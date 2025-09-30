import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@/lib/supabase/middleware'

/**
 * Member Portal Middleware
 * Domain: members.gymleadhub.co.uk
 * Purpose: Client/member self-service portal
 * Routes: /client/**, /booking/**, /profile/**, /nutrition/**
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const hostname = request.headers.get('host') || ''
  const isMembersDomain = hostname.includes('members.gymleadhub') ||
                          (hostname.includes('localhost') && request.nextUrl.pathname.startsWith('/client'))

  // Only run on members domain
  if (!isMembersDomain) {
    // If trying to access client routes from wrong domain, redirect
    if (request.nextUrl.pathname.startsWith('/client')) {
      return NextResponse.redirect(new URL('https://members.gymleadhub.co.uk' + request.nextUrl.pathname, request.url))
    }
  }

  // Add member portal headers
  response.headers.set('X-Portal-Type', 'member')
  response.headers.set('X-Frame-Options', 'SAMEORIGIN')
  response.headers.set('X-Content-Type-Options', 'nosniff')

  const supabase = createMiddlewareClient(request, response)

  // Try to get session
  let session = null
  try {
    const { data: { session: currentSession }, error } = await supabase.auth.getSession()

    if (error) {
      console.error('[Member Middleware] Session error:', error.message)
    }

    session = currentSession

    // If no session but we have user cookies, try to refresh
    if (!session) {
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()

      if (!refreshError && refreshedSession) {
        session = refreshedSession
        console.log('[Member Middleware] Session refreshed')
      }
    }
  } catch (error) {
    console.error('[Member Middleware] Auth error:', error)
  }

  // Get client context from session
  if (session) {
    // Fetch client's organization
    const { data: clientData } = await supabase
      .from('clients')
      .select('organization_id, id')
      .eq('id', session.user.id)
      .single()

    if (clientData) {
      response.headers.set('X-Organization-Id', clientData.organization_id)
      response.headers.set('X-Client-Id', clientData.id)
      console.log('[Member Middleware] Client context:', clientData.organization_id)
    }
  }

  const isAuthPage = request.nextUrl.pathname.includes('/auth') ||
                     request.nextUrl.pathname.includes('/client-portal/login') ||
                     request.nextUrl.pathname.includes('/client-portal/claim')

  const isProtectedClientPath = request.nextUrl.pathname.startsWith('/client/dashboard') ||
                                 request.nextUrl.pathname.startsWith('/client/booking') ||
                                 request.nextUrl.pathname.startsWith('/client/profile') ||
                                 request.nextUrl.pathname.startsWith('/client/nutrition') ||
                                 request.nextUrl.pathname.startsWith('/booking') ||
                                 request.nextUrl.pathname.startsWith('/profile') ||
                                 request.nextUrl.pathname.startsWith('/nutrition')

  const isProtectedAPI = request.nextUrl.pathname.startsWith('/api/client/') ||
                         request.nextUrl.pathname.startsWith('/api/booking/') ||
                         request.nextUrl.pathname.startsWith('/api/nutrition/')

  // Redirect unauthenticated users to client login
  if (!session && (isProtectedClientPath || isProtectedAPI)) {
    console.log('[Member Middleware] Redirecting unauthenticated client to login')
    return NextResponse.redirect(new URL('/client-portal/login', request.url))
  }

  // Block staff/admin users from accessing member portal
  if (session && isProtectedClientPath) {
    // Check if this is a staff user (not a client)
    const { data: staffUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', session.user.id)
      .single()

    if (staffUser) {
      console.error('[Member Middleware] Staff user attempted member portal access')
      return NextResponse.json({
        error: 'Forbidden: Staff users cannot access member portal. Please use login.gymleadhub.co.uk'
      }, { status: 403 })
    }
  }

  // Redirect authenticated clients away from auth pages
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL('/client/dashboard', request.url))
  }

  // Handle root path
  if (request.nextUrl.pathname === '/') {
    if (session) {
      return NextResponse.redirect(new URL('/client/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/client-portal/login', request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    // Match client routes
    '/client/:path*',
    '/booking/:path*',
    '/profile/:path*',
    '/nutrition/:path*',
    '/client-portal/:path*',
    '/',
  ]
}