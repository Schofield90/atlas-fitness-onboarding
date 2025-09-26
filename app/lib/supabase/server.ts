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
    process.env.NEXT_PUBLIC_SITE_URL?.includes("gymleadhub.co.uk") ||
    process.env.NEXT_PUBLIC_VERCEL_URL?.includes("gymleadhub.co.uk")
  );
}

// Next.js 15 requires awaiting cookies()
export async function createClient() {
  const cookieStore = await cookies();
  const isProd = isProduction();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // Enhanced cookie options for production
        const enhancedOptions: CookieOptions = {
          ...options,
          // Set domain for cross-subdomain support in production
          domain: isProd ? ".gymleadhub.co.uk" : undefined,
          // Use lax for subdomain navigation
          sameSite: "lax",
          // Secure in production
          secure: isProd,
          // httpOnly for security
          httpOnly: true,
          // Root path for all pages
          path: "/",
        };

        // Important: allow SSR to persist/refresh auth cookies
        cookieStore.set({ name, value, ...enhancedOptions });
      },
      remove(name: string, options: CookieOptions) {
        const enhancedOptions: CookieOptions = {
          ...options,
          domain: isProd ? ".gymleadhub.co.uk" : undefined,
          path: "/",
        };

        cookieStore.set({ name, value: "", ...enhancedOptions, maxAge: 0 });
      },
    },
    // Don't override auth settings - let SSR helper handle it
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
