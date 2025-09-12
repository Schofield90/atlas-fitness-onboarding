import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

let browserClient: ReturnType<typeof createBrowserClient<Database>> | null =
  null;

export function createClient() {
  if (browserClient) return browserClient;

  // Trim to avoid stray newlines (e.g., %0A) breaking Realtime websocket auth
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const supabaseAnonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  ).trim();

  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
  return browserClient;
}

// Export singleton instance for convenience
export const supabase = createClient();

// Export default
export default supabase;
