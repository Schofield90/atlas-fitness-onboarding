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
          // Enhanced cookie options for session persistence
          const enhancedOptions: CookieOptions = {
            ...options,
            // Set domain for production cross-subdomain support
            domain: isProduction ? ".gymleadhub.co.uk" : undefined,
            // Use 'lax' for better compatibility and session persistence
            sameSite: isLocalhost ? "lax" : "lax",
            // Secure in production
            secure: isProduction && !isLocalhost,
            // Maintain httpOnly for security but allow session persistence
            httpOnly: options.httpOnly !== undefined ? options.httpOnly : true,
            // Set path to root for all cookies
            path: options.path || "/",
            // Extend maxAge for better session persistence
            // Changed from 3600s (1h) to 86400s (24h) for production
            maxAge: options.maxAge || (isProduction ? 86400 : 7200), // 24h prod, 2h dev
          };

          // Log cookie operations in development for debugging
          if (!isProduction) {
            console.log(`Setting cookie: ${name} with options:`, enhancedOptions);
          }

          // Set cookie on both request and response
          try {
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
          } catch (error) {
            console.error(`Failed to set cookie ${name}:`, error);
          }
        },
        remove(name: string, options: CookieOptions) {
          const enhancedOptions: CookieOptions = {
            ...options,
            domain: isProduction ? ".gymleadhub.co.uk" : undefined,
            path: "/",
            sameSite: isLocalhost ? "lax" : "lax",
            secure: isProduction && !isLocalhost,
          };

          if (!isProduction) {
            console.log(`Removing cookie: ${name}`);
          }

          // Remove cookie from both request and response
          try {
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
          } catch (error) {
            console.error(`Failed to remove cookie ${name}:`, error);
          }
        },
      },
    },
  );
}