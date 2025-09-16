import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null =
  null;

export function createClient() {
  // Throw explicit error if used in server context
  if (typeof window === "undefined") {
    throw new Error(
      "Browser Supabase client cannot be used in server/API routes. Use createClient() from '@/app/lib/supabase/server' or createAdminClient() from '@/app/lib/supabase/admin' instead.",
    );
  }

  if (browserClient) return browserClient;

  // Trim to avoid stray newlines (e.g., %0A) breaking Realtime websocket auth
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const supabaseAnonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  ).trim();

  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  return browserClient;
}

// Export default
export default createClient;
