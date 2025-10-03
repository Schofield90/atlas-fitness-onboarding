import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { Database } from "./database.types";

export function createMiddlewareClient(
  request: NextRequest,
  response: NextResponse,
) {
  // Determine if we're in production based on hostname
  const hostname = request.headers.get("host") || "";
  const isProduction = hostname.includes("vercel.app") ||
                      process.env.NODE_ENV === "production" ||
                      process.env.VERCEL_ENV === "production";

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Enhanced cookie options for cross-subdomain support
          const enhancedOptions: CookieOptions = {
            ...options,
            // Don't set domain - causes issues on Vercel
            // Browser will automatically set appropriate domain
            domain: undefined,
            // Use 'lax' for better subdomain support while maintaining security
            sameSite: "lax",
            // Always use secure in production, false for localhost
            secure: isProduction,
            // Use httpOnly for security - this is required for auth cookies
            httpOnly: true,
            // Set path to root
            path: "/",
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
            domain: undefined,
            path: "/",
            sameSite: "lax",
            secure: isProduction,
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
