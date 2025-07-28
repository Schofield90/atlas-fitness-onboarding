import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // Create a response object that we can modify
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Create a Supabase client configured to use cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          // If the cookie is updated, update the response headers
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          // If the cookie is removed, update the response headers
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Get the user session
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Check if the request is for an API route
  const isApiRoute = request.nextUrl.pathname.startsWith('/api/')
  const isWebhookRoute = request.nextUrl.pathname.startsWith('/api/webhooks/')
  
  // Handle API route protection
  if (isApiRoute) {
    // Allow webhook routes without authentication
    if (isWebhookRoute) {
      return response
    }
    
    // Block all other API routes if not authenticated
    if (!user) {
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'You must be logged in to access this resource'
        },
        { status: 401 }
      )
    }
  }

  // Protected dashboard routes that require authentication
  const protectedRoutes = [
    '/dashboard',
    '/leads',
    '/analytics',
    '/automations',
    '/ai-config',
    '/ai-training',
    '/booking',
    '/calendar',
    '/calendar-sync',
    '/test-whatsapp',
    '/forms',
    '/embed',
    '/whatsapp-debug',
    '/booking-debug',
    '/booking-live',
    '/memberships',
    '/staff',
    '/discounts',
    '/todos',
    '/settings'
  ]

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route => 
    request.nextUrl.pathname.startsWith(route)
  )

  // If trying to access a protected route without authentication, redirect to login
  if (!user && isProtectedRoute) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirectTo', request.nextUrl.pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If user is logged in and trying to access login/signup/landing pages, redirect to dashboard
  if (user && (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/signup' || request.nextUrl.pathname === '/landing')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return response
}

// Configure which routes the middleware should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * 
     * This now includes API routes for protection
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}