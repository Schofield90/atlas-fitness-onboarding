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

  // Determine if we're in production based on the URL
  const isProduction = window.location.hostname.includes("gymleadhub.co.uk");

  browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
      flowType: "pkce",
      // Use default cookie storage for cross-subdomain support
      // This works with the server-side cookie configuration
      storageKey: "sb-auth-token",
      storage: undefined, // Let Supabase use cookies by default
    },
    // Cookie options are handled by the server-side configuration
    // Client just needs to read/write them properly
    cookies: {
      get(name: string) {
        const value = document.cookie
          .split("; ")
          .find((row) => row.startsWith(name + "="))
          ?.split("=")[1];
        return decodeURIComponent(value || "");
      },
      set(name: string, value: string, options?: any) {
        let cookie = `${name}=${encodeURIComponent(value)}`;
        if (options?.maxAge) {
          cookie += `; max-age=${options.maxAge}`;
        }
        if (options?.expires) {
          cookie += `; expires=${options.expires.toUTCString()}`;
        }
        if (isProduction) {
          cookie += "; domain=.gymleadhub.co.uk";
          cookie += "; secure";
        }
        cookie += "; path=/";
        cookie += "; samesite=lax";
        document.cookie = cookie;
      },
      remove(name: string, options?: any) {
        let cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC`;
        if (isProduction) {
          cookie += "; domain=.gymleadhub.co.uk";
        }
        cookie += "; path=/";
        document.cookie = cookie;
      },
    },
  });
  return browserClient;
}

// Export default
export default createClient;
