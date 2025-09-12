import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null =
  null;

export function createClient() {
  // In browser, use global singleton
  if (typeof window !== "undefined") {
    // Store on window to ensure true singleton across all imports
    const globalWindow = window as any;

    if (globalWindow.__supabaseClient) {
      return globalWindow.__supabaseClient;
    }

    // Trim to avoid stray newlines (e.g., %0A) breaking Realtime websocket auth
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
    const supabaseAnonKey = (
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
    ).trim();

    const client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        storageKey: "atlas-fitness-auth",
        storage: window.localStorage,
      },
    });

    globalWindow.__supabaseClient = client;
    return client;
  }

  // For SSR, create new instance each time (this shouldn't run in browser)
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const supabaseAnonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  ).trim();

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
