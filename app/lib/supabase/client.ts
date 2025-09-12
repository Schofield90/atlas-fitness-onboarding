import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Create and export a function that returns the singleton client
export function createClient() {
  // During SSR, return null to prevent errors
  if (typeof window === "undefined") {
    return null as any;
  }

  // Use window global for true singleton across all modules
  const globalWindow = window as any;

  // Return existing client if available
  if (globalWindow.__atlasSupabaseClient) {
    return globalWindow.__atlasSupabaseClient;
  }

  // Create the client only once
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const supabaseAnonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  ).trim();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables");
  }

  const client = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      storageKey: "atlas-fitness-auth",
      storage: window.localStorage,
      flowType: "pkce",
    },
    global: {
      headers: {
        "X-Client-Info": "atlas-fitness-onboarding",
      },
    },
  });

  // Store on window for cross-module access
  globalWindow.__atlasSupabaseClient = client;

  return client;
}
