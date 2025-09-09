import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./supabase/database.types";

let _client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Singleton Supabase browser client to avoid "Multiple GoTrueClient instances" warning
 * Uses a unique storage key to prevent conflicts
 */
export function getSupabaseBrowser() {
  if (_client) return _client;

  _client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        storageKey: "sb-atlas-onboarding-auth",
        storage:
          typeof window !== "undefined" ? window.localStorage : undefined,
      },
    },
  );

  return _client;
}

// Export a ready-to-use instance
export const supabaseBrowser =
  typeof window !== "undefined" ? getSupabaseBrowser() : null;
