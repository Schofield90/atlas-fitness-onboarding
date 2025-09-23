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

  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true, // Enable auto-refresh but only in browser
      persistSession: true,
      detectSessionInUrl: true,
      flowType: "pkce", // Use PKCE flow for better mobile support
      storage: {
        getItem: (key) => {
          if (typeof window === "undefined") return null;
          return window.localStorage.getItem(key);
        },
        setItem: (key, value) => {
          if (typeof window === "undefined") return;
          window.localStorage.setItem(key, value);
        },
        removeItem: (key) => {
          if (typeof window === "undefined") return;
          window.localStorage.removeItem(key);
        },
      },
    },
  });
  return browserClient;
}

// Export default
export default createClient;
