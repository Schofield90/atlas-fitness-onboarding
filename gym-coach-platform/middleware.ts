import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })
  
  // Extract organization from subdomain or path
  const hostname = request.headers.get('host') || '';
  const subdomain = hostname.split('.')[0];
  const pathSegments = request.nextUrl.pathname.split('/').filter(Boolean);
  
  let organizationSlug: string | null = null;
  
  // Determine organization from URL structure
  // Option 1: Subdomain routing (e.g., atlas-fitness.yourdomain.com)
  if (subdomain && !['app', 'www', 'localhost', '127'].includes(subdomain)) {
    organizationSlug = subdomain;
    response.headers.set('x-organization-slug', subdomain);
  } 
  // Option 2: Path-based routing (e.g., app.yourdomain.com/atlas-fitness/...)
  else if (pathSegments[0] && !['api', 'auth', 'dashboard', '_next', 'public'].includes(pathSegments[0])) {
    organizationSlug = pathSegments[0];
    response.headers.set('x-organization-slug', pathSegments[0]);
  }
  
  // Add CORS headers for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 200, headers: response.headers })
    }
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // Check if this is a client portal route
  const isClientPortal = organizationSlug || request.nextUrl.pathname.includes('/client');
  const isAuthPage = request.nextUrl.pathname.includes('/auth');
  const isDashboard = request.nextUrl.pathname.includes('/dashboard') || request.nextUrl.pathname.includes('/class-calendar');
  const isProtectedAPI = request.nextUrl.pathname.startsWith('/api/') &&
    !request.nextUrl.pathname.startsWith('/api/auth/') &&
    !request.nextUrl.pathname.startsWith('/api/facebook/webhook') &&
    !request.nextUrl.pathname.startsWith('/api/public/')

  // For client portal routes
  if (isClientPortal) {
    const protectedClientPaths = ['/dashboard', '/booking', '/profile', '/payments', '/referrals'];
    const isProtectedClientPath = protectedClientPaths.some(path => 
      request.nextUrl.pathname.includes(path)
    );

    if (isProtectedClientPath && !session) {
      // Build the correct login URL based on routing strategy
      let loginUrl = '/auth/login';
      if (organizationSlug) {
        loginUrl = `/${organizationSlug}/auth/login`;
      }
      const url = new URL(loginUrl, request.url);
      url.searchParams.set('returnUrl', request.nextUrl.pathname);
      return NextResponse.redirect(url);
    }
  }
  // For admin dashboard routes  
  else {
    // Redirect unauthenticated users to login
    if (!session && (isDashboard || isProtectedAPI)) {
      return NextResponse.redirect(new URL('/auth/login', request.url))
    }

    // Redirect authenticated users away from auth pages
    if (session && isAuthPage && !isClientPortal) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  // Handle root path
  if (request.nextUrl.pathname === '/') {
    // If accessing via subdomain, redirect to org-specific login
    if (organizationSlug) {
      return NextResponse.redirect(new URL(`/${organizationSlug}/auth/login`, request.url))
    }
    // Otherwise, redirect to admin dashboard or login
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
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ]
}