import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null =
  null;

/**
 * Safe Supabase client that properly handles SSR/CSR boundaries
 * This replaces the standard client to prevent "document is not defined" errors
 */
export function createSafeClient() {
  // During SSR, return a mock client that won't crash
  if (typeof window === "undefined") {
    return {
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
        signInWithPassword: async () => ({
          data: null,
          error: new Error("SSR context"),
        }),
        signOut: async () => ({ error: null }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
        refreshSession: async () => ({ data: { session: null }, error: null }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: null,
              error: new Error("SSR context"),
            }),
          }),
        }),
      }),
    } as any;
  }

  // In browser, return singleton client
  if (browserClient) return browserClient;

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const supabaseAnonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  ).trim();

  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storage: {
        getItem: (key) => {
          try {
            return window?.localStorage?.getItem(key) || null;
          } catch {
            return null;
          }
        },
        setItem: (key, value) => {
          try {
            window?.localStorage?.setItem(key, value);
          } catch {
            // Ignore storage errors
          }
        },
        removeItem: (key) => {
          try {
            window?.localStorage?.removeItem(key);
          } catch {
            // Ignore storage errors
          }
        },
      },
    },
  });

  return browserClient;
}

// Export as default for easy migration
export default createSafeClient;
