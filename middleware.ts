import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// Public routes should NEVER be gated by auth
const PUBLIC_PATH_PREFIXES = [
  '/',
  '/landing',
  '/features',
  '/pricing',
  '/integrations',
  '/roadmap',
  '/about',
  '/careers',
  '/blog',
  '/contact',
  '/help',
  '/docs',
  '/api',
  '/status',
  '/terms',
  '/privacy',
  '/dpa'
]

// Only these sections are protected
const PROTECTED_PATH_PREFIXES = ['/admin', '/portal', '/settings']

function isPublicPath(pathname: string): boolean {
  // Treat exact root '/' as public
  if (pathname === '/') return true
  return PUBLIC_PATH_PREFIXES.some(prefix =>
    pathname === prefix || pathname.startsWith(prefix + '/')
  )
}

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PREFIXES.some(prefix => pathname.startsWith(prefix))
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow public paths through
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // If not protected, allow
  if (!isProtectedPath(pathname)) {
    return NextResponse.next()
  }

  // Protected routes: require Supabase auth
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options })
        }
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  // Run on all pages and API routes by default
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)'
  ]
}