import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./supabase/database.types";

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Singleton Supabase browser client to avoid "Multiple GoTrueClient instances" warning
 * Uses a unique storage key to prevent conflicts
 */
export function getSupabaseBrowser() {
  // Guard against SSR/build time
  if (typeof window === "undefined") {
    return null as any;
  }

  if (_client) return _client;

  _client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey: "sb-atlas-onboarding-auth",
        storage: window.localStorage,
        autoRefreshToken: false, // Disabled to prevent SSR crashes
        persistSession: true,
        detectSessionInUrl: false, // Disabled to prevent SSR issues
      },
    },
  );

  return _client;
}

// DEPRECATED: Do not use module-level export - call getSupabaseBrowser() instead
// This was causing "document is not defined" errors in server environments
export const supabaseBrowser = null;
