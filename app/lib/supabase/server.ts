import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Helper to determine if we're in production
function isProduction() {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.VERCEL_ENV === "production" ||
    process.env.NEXT_PUBLIC_SITE_URL?.includes("vercel.app") ||
    process.env.NEXT_PUBLIC_VERCEL_URL?.includes("vercel.app") ||
    process.env.VERCEL_URL?.includes("vercel.app")
  );
}

// Next.js 15 - cookies() is async
export async function createClient() {
  const cookieStore = await cookies();
  const isProd = isProduction();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          // Enhanced cookie options for production
          const enhancedOptions: CookieOptions = {
            ...options,
            // Don't set domain for Vercel apps - let browser handle it
            // Setting domain incorrectly can break cookies entirely
            domain: undefined,
            // Use lax for subdomain navigation - critical for preserving auth across pages
            sameSite: "lax",
            // Secure in production only (localhost doesn't use HTTPS)
            secure: isProd,
            // httpOnly for security
            httpOnly: true,
            // Root path for all pages
            path: "/",
            // Extend max age to prevent session loss on navigation
            maxAge: options.maxAge || 86400 * 7, // 7 days default
          };

          // Important: allow SSR to persist/refresh auth cookies
          cookieStore.set({ name, value, ...enhancedOptions });
        } catch (error) {
          // Log cookie setting errors for debugging auth issues
          console.warn(`Failed to set cookie ${name}:`, error);
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          const enhancedOptions: CookieOptions = {
            ...options,
            // Don't set domain - let browser handle it
            domain: undefined,
            path: "/",
          };

          cookieStore.set({ name, value: "", ...enhancedOptions, maxAge: 0 });
        } catch (error) {
          // Silently fail in client-side rendering context
        }
      },
    },
    // Add proper headers to avoid 406 errors
    global: {
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
    },
  });
}

// For backward compatibility
export { createClient as createServerSupabaseClient };
export { createClient as createServerClient };

// Helper to get authenticated client and user
export async function getAuthenticatedClient() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Return null user instead of throwing
  if (error || !user) {
    return { supabase, user: null, error };
  }

  return { supabase, user, error: null };
}

// Service role client for administrative operations
export function createServiceRoleClient() {
  return createServerClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
    cookies: {
      get() {
        return undefined;
      },
      set() {},
      remove() {},
    },
  });
}
