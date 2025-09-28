import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null =
  null;

export function createClient(forceNew = false) {
  // Don't create client during SSR/build time
  if (typeof window === "undefined") {
    return null as any; // Return null during SSR, components should handle this
  }

  // Force new client if requested (useful for auth state changes)
  if (forceNew) {
    browserClient = null;
  }

  if (browserClient) return browserClient;

  // Trim to avoid stray newlines (e.g., %0A) breaking Realtime websocket auth
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const supabaseAnonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  ).trim();

  // Determine if we're in production based on the URL
  const isProduction = window.location.hostname.includes("gymleadhub.co.uk");

  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      // Don't override storage - let SSR library handle it
    },
    // Add proper headers to avoid 406 errors
    global: {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    }
  });
  return browserClient;
}

// Export default
export default createClient;
