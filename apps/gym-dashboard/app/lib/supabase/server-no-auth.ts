import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Server-side Supabase client without auth features
// Used for API routes to avoid "document is not defined" errors
export function createServerClientNoAuth() {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const supabaseServiceKey = (
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  ).trim();

  if (!supabaseUrl || !supabaseServiceKey) {
    console.warn("Supabase environment variables missing");
    // Return a mock client for build time
    return {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({ data: null, error: new Error("Mock client") }),
            limit: () => Promise.resolve({ data: [], error: null }),
          }),
          single: () => Promise.resolve({ data: null, error: null }),
        }),
        insert: () => Promise.resolve({ data: null, error: null }),
        update: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
    } as any;
  }

  // Create client with service role key (bypasses RLS)
  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-supabase-api-version": "2024-01-01",
      },
    },
  });
}
