import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// IMPORTANT: This is a synchronous function - do NOT make it async
export function createClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // Important: allow SSR to persist/refresh auth cookies
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: "", ...options, maxAge: 0 });
      },
    },
    // Don't override auth settings - let SSR helper handle it
  });
}

// For backward compatibility
export { createClient as createServerSupabaseClient };
export { createClient as createServerClient };

// Helper to get authenticated client and user
export async function getAuthenticatedClient() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // Return null user instead of throwing
  if (error || !user) {
    return { supabase, user: null, error };
  }

  return { supabase, user, error: null };
}
