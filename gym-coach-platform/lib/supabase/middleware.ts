import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function createMiddlewareClient(
  request: NextRequest,
  response: NextResponse,
) {
  // Determine if we're in production based on hostname
  const hostname = request.headers.get("host") || "";
  const isProduction = hostname.includes("gymleadhub.co.uk");
  const isLocalhost = hostname.includes("localhost") || hostname.includes("127.0.0.1");

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Cookie options that work for both localhost and production
          const enhancedOptions: CookieOptions = {
            ...options,
            // Only set domain for production (cross-subdomain support)
            // Omit for localhost to allow cookies to work properly
            domain: isProduction ? ".gymleadhub.co.uk" : undefined,
            // Use 'lax' for better compatibility
            sameSite: isLocalhost ? "lax" : (options.sameSite || "lax"),
            // Secure only in production (localhost doesn't use HTTPS)
            secure: isProduction && !isLocalhost,
            // CRITICAL: Keep httpOnly from Supabase's default for security
            // This prevents JavaScript access to auth cookies (multi-tenant security)
            httpOnly: options.httpOnly !== undefined ? options.httpOnly : true,
            // Set path to root for all cookies
            path: options.path || "/",
            // Preserve maxAge if provided
            maxAge: options.maxAge,
          };

          // Set cookie on both request and response
          request.cookies.set({
            name,
            value,
            ...enhancedOptions,
          });
          response.cookies.set({
            name,
            value,
            ...enhancedOptions,
          });
        },
        remove(name: string, options: CookieOptions) {
          const enhancedOptions: CookieOptions = {
            ...options,
            domain: isProduction ? ".gymleadhub.co.uk" : undefined,
            path: "/",
            sameSite: isLocalhost ? "lax" : "lax",
            secure: isProduction && !isLocalhost,
          };

          // Remove cookie from both request and response
          request.cookies.set({
            name,
            value: "",
            ...enhancedOptions,
            maxAge: 0,
          });
          response.cookies.set({
            name,
            value: "",
            ...enhancedOptions,
            maxAge: 0,
          });
        },
      },
    },
  );
}