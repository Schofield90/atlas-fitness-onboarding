import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { 
  extractSubdomain, 
  getAuthClaims, 
  assertRoleForSubdomain,
  getCookieOptions,
  type Portal 
} from '@/app/lib/auth/rbac';

// CSP configurations per portal
const CSP_POLICIES: Record<Portal, string> = {
  admin: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co;",
  owner: "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com;",
  member: "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co https://www.google-analytics.com;",
};

// Security headers per portal
function getSecurityHeaders(portal: Portal): HeadersInit {
  const baseHeaders = {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  };

  return {
    ...baseHeaders,
    'Content-Security-Policy': CSP_POLICIES[portal],
    'X-Portal': portal,
  };
}

// Route group mapping
const ROUTE_GROUPS: Record<Portal, string> = {
  admin: '/(admin)',
  owner: '/(owner)',
  member: '/(member)',
};

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  const portal = extractSubdomain(hostname);

  // Create response object
  let response = NextResponse.next();

  // If no portal detected, redirect to appropriate subdomain in production
  if (!portal && hostname.includes('gymleadhub.co.uk')) {
    return NextResponse.redirect(new URL('https://login.gymleadhub.co.uk' + pathname));
  }

  // Set default portal for development
  const activePortal = portal || 'owner';

  // Get auth claims
  const claims = await getAuthClaims(request, response);
  
  // Store claims in headers for downstream use
  if (claims.user_id) {
    response.headers.set('X-User-Id', claims.user_id);
    response.headers.set('X-User-Role', claims.role);
    if (claims.tenant_id) {
      response.headers.set('X-Tenant-Id', claims.tenant_id);
    }
  }

  // Check RBAC - returns 404 if not allowed
  const rbacResponse = assertRoleForSubdomain(claims, activePortal, pathname);
  if (rbacResponse) {
    return rbacResponse;
  }

  // Apply security headers
  const securityHeaders = getSecurityHeaders(activePortal);
  Object.entries(securityHeaders).forEach(([key, value]) => {
    response.headers.set(key, value as string);
  });

  // Handle route group rewriting
  if (!pathname.startsWith('/_next') && 
      !pathname.startsWith('/api') && 
      !pathname.includes('.')) {
    
    const routeGroup = ROUTE_GROUPS[activePortal];
    
    // Check if we need to rewrite to route group
    if (!pathname.startsWith(routeGroup)) {
      // Special handling for auth routes
      if (pathname.startsWith('/login') || 
          pathname.startsWith('/signin') || 
          pathname.startsWith('/signup')) {
        // These remain in the root
        return response;
      }

      // Rewrite to appropriate route group
      const rewriteUrl = new URL(request.url);
      
      // Map common routes to route groups
      if (activePortal === 'admin' && pathname.startsWith('/admin')) {
        rewriteUrl.pathname = `/(admin)${pathname}`;
      } else if (activePortal === 'owner') {
        if (pathname === '/' || pathname === '') {
          rewriteUrl.pathname = '/(owner)/dashboard';
        } else if (pathname.startsWith('/dashboard') ||
                   pathname.startsWith('/leads') ||
                   pathname.startsWith('/booking') ||
                   pathname.startsWith('/settings')) {
          rewriteUrl.pathname = `/(owner)${pathname}`;
        }
      } else if (activePortal === 'member') {
        if (pathname === '/' || pathname === '') {
          rewriteUrl.pathname = '/(member)/client';
        } else if (pathname.startsWith('/client') ||
                   pathname.startsWith('/book')) {
          rewriteUrl.pathname = `/(member)${pathname}`;
        }
      }

      // Only rewrite if pathname changed
      if (rewriteUrl.pathname !== pathname) {
        return NextResponse.rewrite(rewriteUrl, {
          headers: response.headers,
        });
      }
    }
  }

  // Set analytics cookie based on portal
  const analyticsCookie = `${activePortal}_analytics_id`;
  if (!request.cookies.get(analyticsCookie)) {
    const analyticsId = `${activePortal}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    response.cookies.set(analyticsCookie, analyticsId, getCookieOptions(activePortal, hostname));
  }

  return response;
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
};