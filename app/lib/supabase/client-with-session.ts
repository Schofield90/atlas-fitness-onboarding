import { createBrowserClient } from "@supabase/ssr";

// Create a Supabase client with proper cookie handling for SSR
export function createSessionClient() {
  // Return null during SSR to prevent hydration mismatches
  if (typeof window === "undefined") {
    return null;
  }

  // Determine if we're in production based on hostname
  const isProduction = window.location.hostname.includes("gymleadhub.co.uk");

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
