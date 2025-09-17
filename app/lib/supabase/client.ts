import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null =
  null;

export function createClient() {
  // Don't create client during SSR/build time
  if (typeof window === "undefined") {
    return null as any; // Return null during SSR, components should handle this
  }

  if (browserClient) return browserClient;

  // Trim to avoid stray newlines (e.g., %0A) breaking Realtime websocket auth
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const supabaseAnonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  ).trim();

  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false, // Disable auto-refresh to prevent SSR issues
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
  return browserClient;
}

// Export default
export default createClient;
