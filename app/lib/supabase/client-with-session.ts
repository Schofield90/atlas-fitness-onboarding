import { createBrowserClient } from "@supabase/ssr";

// Create a Supabase client with proper cookie handling for SSR
export function createSessionClient() {
  // Return null during SSR to prevent hydration mismatches
  if (typeof window === "undefined") {
    return null;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: "pkce",
      },
      // Add proper headers to avoid 406 errors
      global: {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
      },
    },
  );
}

// Helper function to get session with retry logic
export async function getSessionWithRetry(supabase: any, maxRetries = 3) {
  if (!supabase) return null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (!error && session) {
        return session;
      }
      // Wait a bit before retrying
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, 100 * (i + 1)));
      }
    } catch (error) {
      console.error(`Session fetch attempt ${i + 1} failed:`, error);
    }
  }
  return null;
}
