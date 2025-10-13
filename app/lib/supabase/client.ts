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

  // Suppress Supabase Realtime alerts by temporarily overriding window.alert
  // This prevents "Failed to send message" alerts during initialization
  const originalAlert = window.alert;
  window.alert = (message: any) => {
    const msgStr = String(message);
    // Only suppress Supabase authentication errors, allow other alerts
    if (
      msgStr.includes("Failed to send message") ||
      msgStr.includes("Could not resolve authentication") ||
      msgStr.includes("authToken")
    ) {
      console.warn("[Supabase] Suppressed alert:", msgStr);
      return;
    }
    originalAlert(message);
  };

  // Trim to avoid stray newlines (e.g., %0A) breaking Realtime websocket auth
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  const supabaseAnonKey = (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  ).trim();

  // Validate that environment variables are set
  if (!supabaseUrl || !supabaseAnonKey) {
    console.error(
      "[Supabase Client] Missing environment variables:",
      { hasUrl: !!supabaseUrl, hasKey: !!supabaseAnonKey }
    );
    // Return null instead of throwing - let pages handle gracefully
    return null as any;
  }

  try {
    browserClient = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        // Don't override storage - let SSR library handle it
      },
      // Add proper headers to avoid 406 errors
      global: {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
      },
      // Configure Realtime to suppress authentication errors
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });

    // Set up session refresh on client initialization
    if (browserClient) {
      browserClient.auth.onAuthStateChange(async (event, session) => {
        console.log("[Client] Auth state changed:", event, session?.user?.email);
        if (event === "TOKEN_REFRESHED") {
          console.log("[Client] Session token refreshed");
        }
      });

      // Try to refresh session immediately if needed
      browserClient.auth.getSession().then(({ data: { session } }) => {
        if (!session) {
          console.log("[Client] No session found on init, attempting refresh...");
          browserClient?.auth
            .refreshSession()
            .then(({ data: { session: refreshedSession }, error }) => {
              if (refreshedSession) {
                console.log("[Client] Session refreshed on init");
              } else if (error) {
                console.log("[Client] Session refresh failed:", error.message);
              }
            });
        }
      });

      // Add error handling for Realtime connection issues
      // This prevents alerts from showing when Realtime fails to authenticate
      if (typeof window !== "undefined" && browserClient.realtime) {
        try {
          browserClient.realtime.onError((error: any) => {
            // Silently log Realtime errors instead of showing alerts
            console.warn("[Client] Realtime connection error (non-critical):", error?.message || error);
          });

          browserClient.realtime.onDisconnect(() => {
            console.info("[Client] Realtime disconnected");
          });

          browserClient.realtime.onConnect(() => {
            console.info("[Client] Realtime connected successfully");
          });
        } catch (realtimeError) {
          // If Realtime setup fails, log but don't block page load
          console.warn("[Client] Failed to configure Realtime handlers:", realtimeError);
        }
      }
    }

    // Restore original alert function after initialization
    setTimeout(() => {
      window.alert = originalAlert;
    }, 1000);
  } catch (error) {
    console.error("[Supabase Client] Failed to initialize:", error);
    // Restore alert even on error
    window.alert = originalAlert;
    // Return null on error - pages should handle gracefully
    return null as any;
  }

  return browserClient;
}

// Export default
export default createClient;
